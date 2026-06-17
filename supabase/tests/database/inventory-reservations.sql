begin;

select plan(36);

select has_type('public', 'order_inventory_status', 'order inventory status enum exists');

select col_type_is('public', 'orders', 'inventory_status', 'order_inventory_status', 'orders inventory_status uses the inventory enum');

select col_type_is('public', 'orders', 'reservation_expires_at', 'timestamp with time zone', 'orders reservation expiry is tracked');

select ok(
  has_function_privilege(
    'service_role',
    'public.create_pending_order(jsonb,jsonb)',
    'EXECUTE'
  ),
  'service_role can execute inventory-aware pending orders'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.release_orphaned_inventory_reservations(timestamp with time zone)',
    'EXECUTE'
  ),
  'service_role can execute orphaned reservation cleanup'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.release_orphaned_inventory_reservations(timestamp with time zone)',
    'EXECUTE'
  ),
  'anon cannot execute orphaned reservation cleanup'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.release_orphaned_inventory_reservations(timestamp with time zone)',
    'EXECUTE'
  ),
  'authenticated cannot execute orphaned reservation cleanup'
);

insert into public.products (
  id,
  name,
  slug,
  description,
  price_cents,
  currency,
  active,
  stock_quantity
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Inventory Mate',
    'inventory-mate',
    'Inventory test product',
    1000,
    'ARS',
    true,
    10
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Inventory Spoon',
    'inventory-spoon',
    'Inventory test product',
    500,
    'ARS',
    true,
    2
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Inventory Cleanup',
    'inventory-cleanup',
    'Inventory cleanup test product',
    700,
    'ARS',
    true,
    5
  );

set local role service_role;

create temporary table duplicate_order as
select *
from public.create_pending_order(
  '{
    "buyer_name": "Duplicate Buyer",
    "buyer_email": "duplicate@example.com",
    "buyer_phone": null,
    "shipping_address": {},
    "subtotal_cents": 999999,
    "shipping_cents": 100,
    "commission_cents": 50,
    "total_cents": 1000149,
    "currency": "ARS",
    "external_reference": "inventory-duplicate"
  }'::jsonb,
  '[
    {"product_id":"30000000-0000-0000-0000-000000000001","quantity":4},
    {"product_id":"30000000-0000-0000-0000-000000000001","quantity":3}
  ]'::jsonb
);

update public.orders
set mercado_pago_preference_id = 'pref-duplicate'
where id = (select id from duplicate_order);

reset role;

select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  3,
  'duplicate lines reserve their aggregate quantity exactly once'
);

select is(
  (select count(*)::integer from public.order_items where order_id = (select id from duplicate_order)),
  1,
  'duplicate lines are stored as one canonical order item'
);

select is(
  (select quantity from public.order_items where order_id = (select id from duplicate_order)),
  7,
  'canonical order item stores aggregate quantity'
);

select is(
  (select subtotal_cents from public.orders where id = (select id from duplicate_order)),
  7000,
  'pending order uses canonical database prices for subtotal'
);

select is(
  (select inventory_status::text from public.orders where id = (select id from duplicate_order)),
  'reserved',
  'new pending order starts with reserved inventory'
);

select isnt(
  (select reservation_expires_at::text from public.orders where id = (select id from duplicate_order)),
  null::text,
  'reserved order has an expiry timestamp'
);

set local role service_role;

select throws_like(
  $$
    select *
    from public.create_pending_order(
      '{
        "buyer_name": "Oversell Buyer",
        "buyer_email": "oversell@example.com",
        "buyer_phone": null,
        "shipping_address": {},
        "subtotal_cents": 0,
        "shipping_cents": 0,
        "commission_cents": 0,
        "total_cents": 0,
        "currency": "ARS",
        "external_reference": "inventory-oversell"
      }'::jsonb,
      '[{"product_id":"30000000-0000-0000-0000-000000000001","quantity":4}]'::jsonb
    )
  $$,
  '%insufficient_stock%',
  'concurrent demand beyond remaining stock is rejected'
);

reset role;

select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  3,
  'failed demand leaves stock unchanged'
);

select is(
  (select count(*)::integer from public.orders where external_reference = 'inventory-oversell'),
  0,
  'failed demand leaves no partial order'
);

select is(
  (select count(*)::integer from public.order_items where product_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'failed demand leaves no partial item rows'
);

set local role service_role;

create temporary table release_result as
select *
from public.reconcile_mercado_pago_payment(
  jsonb_build_object(
    'id', 'pay-release',
    'status', 'rejected',
    'external_reference', 'inventory-duplicate',
    'preference_id', 'pref-duplicate',
    'metadata_order_id', (select id::text from duplicate_order),
    'amount_cents', 7150,
    'currency', 'ARS'
  ),
  '{"provider_event_id":"evt-release","event_type":"payment","payload":{"source":"inventory"}}'::jsonb
);

reset role;

select is((select processed from release_result), true, 'rejected payment event is processed');
select is(
  (select inventory_status::text from public.orders where id = (select id from duplicate_order)),
  'released',
  'rejected payment releases a reserved order'
);
select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  10,
  'release restores reserved stock exactly once'
);

set local role service_role;

create temporary table release_duplicate_result as
select *
from public.reconcile_mercado_pago_payment(
  jsonb_build_object(
    'id', 'pay-release',
    'status', 'rejected',
    'external_reference', 'inventory-duplicate',
    'preference_id', 'pref-duplicate',
    'metadata_order_id', (select id::text from duplicate_order),
    'amount_cents', 7150,
    'currency', 'ARS'
  ),
  '{"provider_event_id":"evt-release","event_type":"payment","payload":{"source":"duplicate"}}'::jsonb
);

reset role;

select is((select duplicate from release_duplicate_result), true, 'duplicate release event is identified');
select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  10,
  'duplicate release does not restore stock twice'
);

set local role service_role;

create temporary table consume_order as
select *
from public.create_pending_order(
  '{
    "buyer_name": "Consume Buyer",
    "buyer_email": "consume@example.com",
    "buyer_phone": null,
    "shipping_address": {},
    "subtotal_cents": 0,
    "shipping_cents": 0,
    "commission_cents": 0,
    "total_cents": 0,
    "currency": "ARS",
    "external_reference": "inventory-consume"
  }'::jsonb,
  '[{"product_id":"30000000-0000-0000-0000-000000000001","quantity":2}]'::jsonb
);

update public.orders
set mercado_pago_preference_id = 'pref-consume'
where id = (select id from consume_order);

create temporary table consume_result as
select *
from public.reconcile_mercado_pago_payment(
  jsonb_build_object(
    'id', 'pay-consume',
    'status', 'approved',
    'external_reference', 'inventory-consume',
    'preference_id', 'pref-consume',
    'metadata_order_id', (select id::text from consume_order),
    'amount_cents', 2000,
    'currency', 'ARS'
  ),
  '{"provider_event_id":"evt-consume","event_type":"payment","payload":{"source":"inventory"}}'::jsonb
);

reset role;

select is((select processed from consume_result), true, 'approved payment event is processed');
select is(
  (select inventory_status::text from public.orders where id = (select id from consume_order)),
  'consumed',
  'approved payment consumes a reserved order'
);
select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  8,
  'consume keeps previously reserved stock decremented'
);

set local role service_role;

create temporary table consume_duplicate_result as
select *
from public.reconcile_mercado_pago_payment(
  jsonb_build_object(
    'id', 'pay-consume',
    'status', 'approved',
    'external_reference', 'inventory-consume',
    'preference_id', 'pref-consume',
    'metadata_order_id', (select id::text from consume_order),
    'amount_cents', 2000,
    'currency', 'ARS'
  ),
  '{"provider_event_id":"evt-consume","event_type":"payment","payload":{"source":"duplicate"}}'::jsonb
);

reset role;

select is((select duplicate from consume_duplicate_result), true, 'duplicate consume event is identified');
select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  8,
  'duplicate consume does not decrement stock twice'
);

insert into public.orders (
  id,
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
  mercado_pago_preference_id,
  external_reference,
  inventory_status
)
values (
  '30000000-0000-0000-0000-000000000099',
  'Late Buyer',
  'late@example.com',
  null,
  '{}'::jsonb,
  1500,
  0,
  0,
  1500,
  'ARS',
  'pending',
  'pending',
  'pref-late',
  'inventory-late',
  'released'
);

insert into public.order_items (
  order_id,
  product_id,
  product_name,
  product_slug,
  unit_price_cents,
  quantity,
  line_total_cents
)
values (
  '30000000-0000-0000-0000-000000000099',
  '30000000-0000-0000-0000-000000000002',
  'Inventory Spoon',
  'inventory-spoon',
  500,
  3,
  1500
);

set local role service_role;

create temporary table late_conflict_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-late-conflict",
    "status": "approved",
    "external_reference": "inventory-late",
    "preference_id": "pref-late",
    "metadata_order_id": "30000000-0000-0000-0000-000000000099",
    "amount_cents": 1500,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-late-conflict","event_type":"payment","payload":{"source":"inventory"}}'::jsonb
);

reset role;

select is((select processed from late_conflict_result), true, 'late valid payment is still recorded');
select is((select reason from late_conflict_result), 'inventory_conflict', 'late payment reports inventory conflict');
select is(
  (select inventory_status::text from public.orders where external_reference = 'inventory-late'),
  'conflict',
  'late payment with insufficient stock marks an inventory conflict'
);
select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000002'),
  2,
  'late payment conflict does not make stock negative'
);

set local role service_role;

create temporary table orphan_order as
select *
from public.create_pending_order(
  '{
    "buyer_name": "Orphan Buyer",
    "buyer_email": "orphan@example.com",
    "buyer_phone": null,
    "shipping_address": {},
    "subtotal_cents": 0,
    "shipping_cents": 0,
    "commission_cents": 0,
    "total_cents": 0,
    "currency": "ARS",
    "external_reference": "inventory-orphan"
  }'::jsonb,
  '[{"product_id":"30000000-0000-0000-0000-000000000003","quantity":2}]'::jsonb
);

update public.orders
set reservation_expires_at = now() - interval '1 minute'
where id = (select id from orphan_order);

create temporary table preference_order as
select *
from public.create_pending_order(
  '{
    "buyer_name": "Preference Buyer",
    "buyer_email": "preference@example.com",
    "buyer_phone": null,
    "shipping_address": {},
    "subtotal_cents": 0,
    "shipping_cents": 0,
    "commission_cents": 0,
    "total_cents": 0,
    "currency": "ARS",
    "external_reference": "inventory-preference"
  }'::jsonb,
  '[{"product_id":"30000000-0000-0000-0000-000000000003","quantity":1}]'::jsonb
);

update public.orders
set mercado_pago_preference_id = 'pref-existing',
    reservation_expires_at = now() - interval '1 minute'
where id = (select id from preference_order);

create temporary table orphan_release_result as
select *
from public.release_orphaned_inventory_reservations(now());

reset role;

select is(
  (select count(*)::integer from orphan_release_result),
  1,
  'orphaned reservation cleanup releases only orders without a preference id'
);

select is(
  (select order_id from orphan_release_result),
  (select id from orphan_order),
  'orphaned reservation cleanup returns the released order id'
);

select is(
  (select inventory_status::text from public.orders where id = (select id from orphan_order)),
  'released',
  'orphaned reservation cleanup marks the expired orphan as released'
);

select is(
  (select inventory_status::text from public.orders where id = (select id from preference_order)),
  'reserved',
  'orphaned reservation cleanup does not release orders that already have a preference id'
);

select is(
  (select stock_quantity from public.products where id = '30000000-0000-0000-0000-000000000003'),
  4,
  'orphaned reservation cleanup restores only the orphaned reservation stock'
);

select * from finish();
rollback;
