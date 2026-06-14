begin;

select plan(6);

select has_column('public', 'orders', 'archived_at', 'orders can be archived without deletion');
select col_type_is('public', 'orders', 'archived_at', 'timestamp with time zone', 'orders archived_at stores archive timestamp');

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
values (
  '40000000-0000-0000-0000-000000000001',
  'Archive Mate',
  'archive-mate',
  'Archive test product',
  1000,
  'ARS',
  true,
  5
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
  external_reference,
  created_at
)
values
  (
    '40000000-0000-0000-0000-000000000010',
    'Visible Buyer',
    'visible@example.com',
    null,
    '{}'::jsonb,
    1000,
    0,
    0,
    1000,
    'ARS',
    'paid',
    'processing',
    'archive-visible',
    '2026-06-14T10:00:00Z'
  ),
  (
    '40000000-0000-0000-0000-000000000011',
    'Archived Buyer',
    'archived@example.com',
    null,
    '{}'::jsonb,
    1000,
    0,
    0,
    1000,
    'ARS',
    'paid',
    'processing',
    'archive-hidden',
    '2026-06-14T11:00:00Z'
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
  '40000000-0000-0000-0000-000000000011',
  '40000000-0000-0000-0000-000000000001',
  'Archive Mate',
  'archive-mate',
  1000,
  1,
  1000
);

update public.orders
set archived_at = now()
where id = '40000000-0000-0000-0000-000000000011';

select is(
  (select count(*)::integer from public.orders where archived_at is null),
  1,
  'default unarchived filter finds only visible orders'
);

select is(
  (select buyer_email from public.orders where archived_at is null order by created_at desc limit 1),
  'visible@example.com',
  'unarchived listing excludes archived orders'
);

select is(
  (select count(*)::integer from public.order_items where order_id = '40000000-0000-0000-0000-000000000011'),
  1,
  'archiving preserves order item history'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'orders'
      and indexdef ilike '%archived_at IS NULL%'
      and indexdef ilike '%created_at%'
  ),
  'orders have an unarchived listing index'
);

select * from finish();
rollback;
