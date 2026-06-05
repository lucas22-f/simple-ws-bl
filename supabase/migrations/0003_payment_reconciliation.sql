-- Validate and reconcile Mercado Pago payments atomically.

create or replace function public.reconcile_mercado_pago_payment(p_payment jsonb, p_event jsonb)
returns table (
  processed boolean,
  duplicate boolean,
  rejected boolean,
  reason text,
  payment_status public.order_payment_status
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_order public.orders%rowtype;
  reconciliation_provider_event_id text := p_event ->> 'provider_event_id';
  reconciliation_event_type text := coalesce(nullif(p_event ->> 'event_type', ''), 'payment');
  event_payload jsonb := coalesce(p_event -> 'payload', '{}'::jsonb);
  payment_id text := p_payment ->> 'id';
  payment_external_reference text := p_payment ->> 'external_reference';
  preference_id text := p_payment ->> 'preference_id';
  metadata_order_id text := p_payment ->> 'metadata_order_id';
  amount_cents integer := nullif(p_payment ->> 'amount_cents', '')::integer;
  payment_currency text := p_payment ->> 'currency';
  mercado_pago_status text := p_payment ->> 'status';
  incoming_status public.order_payment_status;
  effective_status public.order_payment_status;
  rejection_reason text;
  inserted_event_id uuid;
begin
  if reconciliation_provider_event_id is null then
    raise exception 'provider_event_id is required';
  end if;

  incoming_status := case mercado_pago_status
    when 'approved' then 'paid'::public.order_payment_status
    when 'paid' then 'paid'::public.order_payment_status
    when 'rejected' then 'rejected'::public.order_payment_status
    when 'cancelled' then 'cancelled'::public.order_payment_status
    when 'refunded' then 'refunded'::public.order_payment_status
    else 'pending'::public.order_payment_status
  end;

  select *
  into target_order
  from public.orders
  where orders.external_reference = payment_external_reference
  for update;

  if not found then
    rejection_reason := 'order_not_found';
  elsif target_order.mercado_pago_preference_id is distinct from preference_id then
    rejection_reason := 'preference_mismatch';
  elsif target_order.id::text is distinct from metadata_order_id then
    rejection_reason := 'metadata_order_mismatch';
  elsif target_order.total_cents is distinct from amount_cents then
    rejection_reason := 'amount_mismatch';
  elsif target_order.currency is distinct from payment_currency then
    rejection_reason := 'currency_mismatch';
  end if;

  if rejection_reason is not null then
    insert into public.payment_events (
      provider,
      provider_event_id,
      order_id,
      event_type,
      payload
    )
    values (
      'mercado_pago',
      reconciliation_provider_event_id,
      target_order.id,
      reconciliation_event_type,
      event_payload || jsonb_build_object(
        'payment', p_payment,
        'rejection_reason', rejection_reason
      )
    )
    on conflict on constraint payment_events_provider_provider_event_id_key do nothing
    returning id into inserted_event_id;

    return query select
      false,
      inserted_event_id is null,
      true,
      rejection_reason,
      case when target_order.id is not null then target_order.payment_status else null end;
    return;
  end if;

  effective_status := case
    when target_order.payment_status = 'refunded' then 'refunded'::public.order_payment_status
    when target_order.payment_status = 'paid' and incoming_status <> 'refunded' then 'paid'::public.order_payment_status
    when target_order.payment_status = 'paid' and incoming_status = 'refunded' then 'refunded'::public.order_payment_status
    else incoming_status
  end;

  insert into public.payment_events (
    provider,
    provider_event_id,
    order_id,
    event_type,
    payload
  )
  values (
    'mercado_pago',
    reconciliation_provider_event_id,
    target_order.id,
    reconciliation_event_type,
    event_payload || jsonb_build_object('payment', p_payment)
  )
  on conflict on constraint payment_events_provider_provider_event_id_key do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return query select false, true, false, 'duplicate_event', target_order.payment_status;
    return;
  end if;

  update public.orders
  set
    payment_status = effective_status,
    mercado_pago_payment_id = payment_id,
    updated_at = now()
  where id = target_order.id;

  return query select true, false, false, null::text, effective_status;
end;
$$;

revoke all on function public.reconcile_mercado_pago_payment(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_mercado_pago_payment(jsonb, jsonb)
  to service_role;
