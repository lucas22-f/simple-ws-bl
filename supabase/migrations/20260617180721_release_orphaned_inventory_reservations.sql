-- Release stock reservations that were created before Mercado Pago returned a preference id.
--
-- This closes the gap where `create_pending_order` successfully reserves stock,
-- but the application crashes or Mercado Pago fails before `mercado_pago_preference_id`
-- is persisted on the order.

create or replace function public.release_orphaned_inventory_reservations(
  p_before timestamptz default now()
)
returns table (order_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select orders.id
    from public.orders
    where orders.inventory_status = 'reserved'
      and orders.payment_status = 'pending'
      and orders.mercado_pago_preference_id is null
      and orders.reservation_expires_at is not null
      and orders.reservation_expires_at <= p_before
    order by orders.reservation_expires_at
    for update of orders skip locked
  ),
  restored_stock as (
    update public.products
    set stock_quantity = products.stock_quantity + order_items.quantity
    from public.order_items
    join candidates on candidates.id = order_items.order_id
    where products.id = order_items.product_id
      and products.stock_quantity is not null
    returning candidates.id
  ),
  released_orders as (
    update public.orders
    set inventory_status = 'released',
        updated_at = now()
    from candidates
    where orders.id = candidates.id
    returning orders.id
  )
  select released_orders.id
  from released_orders;
end;
$$;

revoke all on function public.release_orphaned_inventory_reservations(timestamptz)
  from public, anon, authenticated;
grant execute on function public.release_orphaned_inventory_reservations(timestamptz)
  to service_role;
