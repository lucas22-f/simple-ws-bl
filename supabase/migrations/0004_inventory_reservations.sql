-- Reserve inventory atomically at checkout and settle it exactly once on payment outcomes.

create type public.order_inventory_status as enum (
  'not_reserved',
  'reserved',
  'consumed',
  'released',
  'conflict'
);

alter table public.orders
  add column inventory_status public.order_inventory_status not null default 'not_reserved',
  add column reservation_expires_at timestamptz;

alter table public.order_items
  add constraint order_items_order_product_unique unique (order_id, product_id);

create or replace function public.create_pending_order(p_order jsonb, p_items jsonb)
returns table (id uuid, external_reference text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_order_id uuid;
  canonical_subtotal_cents integer;
  canonical_currency text;
  aggregated_items jsonb;
  shipping_cents integer := coalesce(nullif(p_order ->> 'shipping_cents', '')::integer, 0);
  commission_cents integer := coalesce(nullif(p_order ->> 'commission_cents', '')::integer, 0);
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order_items_required';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'product_id', product_id,
      'quantity', quantity
    )
  )
  into aggregated_items
  from (
    select
      (item ->> 'product_id')::uuid as product_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item ->> 'product_id')::uuid
  ) as grouped_items;

  if exists (
    select 1
    from jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
    where item.quantity <= 0
  ) then
    raise exception 'order_item_quantity_invalid';
  end if;

  perform 1
  from public.products
  where products.id in (
    select item.product_id
    from jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
  )
  order by products.id
  for update;

  if (
    select count(*)
    from jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
  ) <> (
    select count(*)
    from public.products
    join jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
      on item.product_id = products.id
    where products.active = true
  ) then
    raise exception 'product_unavailable';
  end if;

  if exists (
    select 1
    from public.products
    join jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
      on item.product_id = products.id
    where products.stock_quantity is not null
      and products.stock_quantity < item.quantity
  ) then
    raise exception 'insufficient_stock';
  end if;

  if (
    select count(distinct products.currency)
    from public.products
    join jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
      on item.product_id = products.id
  ) > 1 then
    raise exception 'mixed_currency_not_supported';
  end if;

  select
    sum(products.price_cents * item.quantity)::integer,
    min(products.currency)
  into canonical_subtotal_cents, canonical_currency
  from public.products
  join jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
    on item.product_id = products.id;

  insert into public.orders (
    buyer_name,
    buyer_email,
    buyer_phone,
    shipping_address,
    subtotal_cents,
    shipping_cents,
    commission_cents,
    total_cents,
    currency,
    payment_status,
    fulfillment_status,
    external_reference,
    inventory_status,
    reservation_expires_at
  )
  values (
    p_order ->> 'buyer_name',
    p_order ->> 'buyer_email',
    p_order ->> 'buyer_phone',
    p_order -> 'shipping_address',
    canonical_subtotal_cents,
    shipping_cents,
    commission_cents,
    canonical_subtotal_cents + shipping_cents + commission_cents,
    coalesce(canonical_currency, p_order ->> 'currency', 'ARS'),
    'pending',
    'pending',
    p_order ->> 'external_reference',
    'reserved',
    now() + interval '30 minutes'
  )
  returning orders.id into new_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_slug,
    unit_price_cents,
    quantity,
    line_total_cents
  )
  select
    new_order_id,
    products.id,
    products.name,
    products.slug,
    products.price_cents,
    item.quantity,
    products.price_cents * item.quantity
  from public.products
  join jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
    on item.product_id = products.id
  order by products.id;

  update public.products
  set stock_quantity = products.stock_quantity - item.quantity
  from jsonb_to_recordset(aggregated_items) as item(product_id uuid, quantity integer)
  where products.id = item.product_id
    and products.stock_quantity is not null;

  return query
  select orders.id, orders.external_reference
  from public.orders
  where orders.id = new_order_id;
end;
$$;

revoke all on function public.create_pending_order(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_pending_order(jsonb, jsonb)
  to service_role;

create or replace function private.apply_order_inventory_transition(
  p_order_id uuid,
  p_payment_status public.order_payment_status
)
returns text
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  current_inventory_status public.order_inventory_status;
begin
  select orders.inventory_status
  into current_inventory_status
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if p_payment_status = 'paid' then
    if current_inventory_status in ('consumed', 'reserved') then
      update public.orders
      set inventory_status = 'consumed',
          updated_at = now()
      where orders.id = p_order_id
        and orders.inventory_status <> 'consumed';
      return null;
    end if;

    if current_inventory_status = 'released' then
      perform 1
      from public.products
      join public.order_items on order_items.product_id = products.id
      where order_items.order_id = p_order_id
      order by products.id
      for update of products;

      if exists (
        select 1
        from public.products
        join public.order_items on order_items.product_id = products.id
        where order_items.order_id = p_order_id
          and products.stock_quantity is not null
          and products.stock_quantity < order_items.quantity
      ) then
        update public.orders
        set inventory_status = 'conflict',
            updated_at = now()
        where orders.id = p_order_id;
        return 'inventory_conflict';
      end if;

      update public.products
      set stock_quantity = products.stock_quantity - order_items.quantity
      from public.order_items
      where order_items.order_id = p_order_id
        and order_items.product_id = products.id
        and products.stock_quantity is not null;

      update public.orders
      set inventory_status = 'consumed',
          updated_at = now()
      where orders.id = p_order_id;
      return null;
    end if;

    if current_inventory_status = 'conflict' then
      return 'inventory_conflict';
    end if;

    return null;
  end if;

  if p_payment_status in ('rejected', 'cancelled') then
    if current_inventory_status = 'reserved' then
      update public.products
      set stock_quantity = products.stock_quantity + order_items.quantity
      from public.order_items
      where order_items.order_id = p_order_id
        and order_items.product_id = products.id
        and products.stock_quantity is not null;

      update public.orders
      set inventory_status = 'released',
          updated_at = now()
      where orders.id = p_order_id;
    end if;

    return null;
  end if;

  return null;
end;
$$;

revoke all on function private.apply_order_inventory_transition(uuid, public.order_payment_status)
  from public, anon, authenticated;
grant execute on function private.apply_order_inventory_transition(uuid, public.order_payment_status)
  to service_role;

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
set search_path = public, private, pg_temp
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
  transition_reason text;
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

  transition_reason := private.apply_order_inventory_transition(target_order.id, effective_status);

  return query select true, false, false, transition_reason, effective_status;
end;
$$;

revoke all on function public.reconcile_mercado_pago_payment(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_mercado_pago_payment(jsonb, jsonb)
  to service_role;
