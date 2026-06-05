begin;

select plan(29);

create temporary table privileged_mutation_baseline as
select
  (select count(*) from public.orders) as order_count,
  (select count(*) from public.order_items) as item_count,
  (
    select jsonb_object_agg(id::text, stock_quantity order by id)
    from public.products
  ) as product_stock;

select ok(
  not exists (
    select 1
    from pg_proc
    cross join lateral aclexplode(coalesce(proacl, acldefault('f', proowner)))
    where oid = 'public.create_pending_order(jsonb,jsonb)'::regprocedure
      and grantee = 0
      and privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute create_pending_order'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_pending_order(jsonb,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute create_pending_order'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_pending_order(jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute create_pending_order'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.create_pending_order(jsonb,jsonb)',
    'EXECUTE'
  ),
  'service_role can execute create_pending_order'
);

select ok(
  not has_function_privilege(
    'authenticator',
    'public.create_pending_order(jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticator cannot execute create_pending_order'
);

select is(
  (
    select array_agg(pg_get_userbyid(grantee) order by pg_get_userbyid(grantee))
    from pg_proc
    cross join lateral aclexplode(coalesce(proacl, acldefault('f', proowner)))
    where oid = 'public.create_pending_order(jsonb,jsonb)'::regprocedure
      and privilege_type = 'EXECUTE'
  ),
  array['postgres', 'service_role']::name[],
  'create_pending_order execute allowlist is database owner and service_role'
);

select ok(
  not exists (
    select 1
    from pg_default_acl
    cross join lateral aclexplode(defaclacl)
    where defaclrole = 'postgres'::regrole
      and defaclnamespace = 0
      and defaclobjtype = 'f'
      and grantee = 0
      and privilege_type = 'EXECUTE'
  ),
  'future postgres-owned functions do not default to PUBLIC execute'
);

create function private.future_privileged_helper()
returns boolean
language sql
as $$
  select true;
$$;

select ok(
  not has_function_privilege(
    'authenticated',
    'private.future_privileged_helper()',
    'EXECUTE'
  ),
  'a future private function is not executable by authenticated'
);

select ok(
  not (select prosecdef from pg_proc where oid = 'public.create_pending_order(jsonb,jsonb)'::regprocedure),
  'create_pending_order runs as security invoker'
);

select ok(
  to_regprocedure('public.is_admin(uuid)') is null,
  'is_admin is not exposed in public'
);

select ok(
  to_regprocedure('private.is_admin(uuid)') is not null,
  'is_admin exists in private'
);

select ok(
  to_regprocedure('public.handle_new_user()') is null,
  'handle_new_user is not exposed in public'
);

select ok(
  to_regprocedure('private.handle_new_user()') is not null,
  'handle_new_user exists in private'
);

select ok(
  to_regprocedure('public.set_updated_at()') is null,
  'set_updated_at is not exposed in public'
);

select ok(
  to_regprocedure('private.set_updated_at()') is not null,
  'set_updated_at exists in private'
);

set local role anon;

select throws_like(
  $$select * from public.create_pending_order('{}'::jsonb, '[]'::jsonb)$$,
  '%permission denied for function create_pending_order%',
  'anon execution is denied'
);

reset role;
set local role authenticated;

select throws_like(
  $$select * from public.create_pending_order('{}'::jsonb, '[]'::jsonb)$$,
  '%permission denied for function create_pending_order%',
  'authenticated execution is denied'
);

reset role;

select is(
  (select count(*) from public.orders),
  (select order_count from privileged_mutation_baseline),
  'unauthorized calls create no orders'
);

select is(
  (select count(*) from public.order_items),
  (select item_count from privileged_mutation_baseline),
  'unauthorized calls create no order items'
);

select is(
  (
    select jsonb_object_agg(id::text, stock_quantity order by id)
    from public.products
  ),
  (select product_stock from privileged_mutation_baseline),
  'unauthorized calls do not change product stock'
);

set local role service_role;

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
  '10000000-0000-0000-0000-000000000099',
  'Privilege boundary item',
  'privilege-boundary-item',
  'Privilege boundary stock item',
  1000,
  'ARS',
  true,
  5
);

select lives_ok(
  $$
    select *
    from public.create_pending_order(
      '{
        "buyer_name": "Privilege boundary test",
        "buyer_email": "privilege-boundary@example.com",
        "buyer_phone": null,
        "shipping_address": {},
        "subtotal_cents": 1000,
        "shipping_cents": 0,
        "commission_cents": 0,
        "total_cents": 1000,
        "currency": "ARS",
        "external_reference": "privilege-boundary-test"
      }'::jsonb,
      '[
        {
          "product_id": "10000000-0000-0000-0000-000000000099",
          "product_name": "Privilege boundary item",
          "product_slug": "privilege-boundary-item",
          "unit_price_cents": 1000,
          "quantity": 1,
          "line_total_cents": 1000
        }
      ]'::jsonb
    )
  $$,
  'service_role execution is allowed'
);

reset role;

select is(
  (select count(*) from public.orders),
  (select order_count + 1 from privileged_mutation_baseline),
  'authorized call creates exactly one order'
);

select is(
  (select count(*) from public.order_items),
  (select item_count + 1 from privileged_mutation_baseline),
  'authorized call creates exactly one order item'
);

select is(
  (select stock_quantity from public.products where id = '10000000-0000-0000-0000-000000000099'),
  4,
  'authorized pending-order creation reserves stock after PR3'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'privilege-helper@example.com',
  '',
  '{}'::jsonb,
  '{"full_name":"Privilege Helper"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select full_name
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  'Privilege Helper',
  'private.handle_new_user trigger creates the expected profile'
);

select is(
  private.is_admin('10000000-0000-0000-0000-000000000001'),
  false,
  'private.is_admin rejects a customer'
);

update public.profiles
set role = 'admin'
where id = '10000000-0000-0000-0000-000000000001';

select is(
  private.is_admin('10000000-0000-0000-0000-000000000001'),
  true,
  'private.is_admin recognizes an admin'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select lives_ok(
  $$
    insert into public.categories (name, slug)
    values ('Admin RLS category', 'admin-rls-category')
  $$,
  'authenticated admin can use RLS policies backed by private.is_admin'
);

reset role;

update public.categories
set updated_at = '2000-01-01 00:00:00+00'
where slug = 'admin-rls-category';

update public.categories
set name = 'Admin RLS category updated'
where slug = 'admin-rls-category';

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'::timestamptz
    from public.categories
    where slug = 'admin-rls-category'
  ),
  'private.set_updated_at trigger remains functional'
);

select * from finish();
rollback;
