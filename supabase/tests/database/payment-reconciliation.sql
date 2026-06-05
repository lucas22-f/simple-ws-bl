begin;

select plan(33);

select ok(
  to_regprocedure('public.reconcile_mercado_pago_payment(jsonb,jsonb)') is not null,
  'reconcile_mercado_pago_payment RPC exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.reconcile_mercado_pago_payment(jsonb,jsonb)',
    'EXECUTE'
  ),
  'service_role can execute payment reconciliation'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.reconcile_mercado_pago_payment(jsonb,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute payment reconciliation'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.reconcile_mercado_pago_payment(jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute payment reconciliation'
);

select ok(
  not exists (
    select 1
    from pg_proc
    cross join lateral aclexplode(coalesce(proacl, acldefault('f', proowner)))
    where oid = 'public.reconcile_mercado_pago_payment(jsonb,jsonb)'::regprocedure
      and grantee = 0
      and privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute payment reconciliation'
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
  external_reference
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'Payment approved',
    'approved@example.com',
    null,
    '{}'::jsonb,
    12345,
    0,
    0,
    12345,
    'ARS',
    'pending',
    'pending',
    'pref-approved',
    'ext-approved'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Payment mismatch',
    'mismatch@example.com',
    null,
    '{}'::jsonb,
    12345,
    0,
    0,
    12345,
    'ARS',
    'pending',
    'pending',
    'pref-mismatch',
    'ext-mismatch'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Payment rollback',
    'rollback@example.com',
    null,
    '{}'::jsonb,
    5000,
    0,
    0,
    5000,
    'ARS',
    'pending',
    'pending',
    'pref-rollback',
    'ext-rollback'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'Payment monotonic',
    'monotonic@example.com',
    null,
    '{}'::jsonb,
    7700,
    0,
    0,
    7700,
    'ARS',
    'paid',
    'pending',
    'pref-monotonic',
    'ext-monotonic'
  );

set local role service_role;

create temporary table approved_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-approved",
    "status": "approved",
    "external_reference": "ext-approved",
    "preference_id": "pref-approved",
    "metadata_order_id": "20000000-0000-0000-0000-000000000001",
    "amount_cents": 12345,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-approved","event_type":"payment","payload":{"source":"pgtap"}}'::jsonb
);

reset role;

select is((select processed from approved_result), true, 'approved payment is processed');
select is((select duplicate from approved_result), false, 'first approved event is not duplicate');
select is((select payment_status::text from public.orders where external_reference = 'ext-approved'), 'paid', 'approved payment marks order paid');
select is((select mercado_pago_payment_id from public.orders where external_reference = 'ext-approved'), 'pay-approved', 'approved payment id is stored');
select is((select count(*)::integer from public.payment_events where provider_event_id = 'evt-approved'), 1, 'approved event is recorded once');

set local role service_role;

create temporary table duplicate_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-approved",
    "status": "approved",
    "external_reference": "ext-approved",
    "preference_id": "pref-approved",
    "metadata_order_id": "20000000-0000-0000-0000-000000000001",
    "amount_cents": 12345,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-approved","event_type":"payment","payload":{"source":"duplicate"}}'::jsonb
);

reset role;

select is((select processed from duplicate_result), false, 'duplicate event is not reprocessed');
select is((select duplicate from duplicate_result), true, 'duplicate event is reported');
select is((select count(*)::integer from public.payment_events where provider_event_id = 'evt-approved'), 1, 'duplicate event does not create a second row');

set local role service_role;

create temporary table mismatch_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-mismatch",
    "status": "approved",
    "external_reference": "ext-mismatch",
    "preference_id": "pref-mismatch",
    "metadata_order_id": "20000000-0000-0000-0000-000000000002",
    "amount_cents": 99900,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-mismatch","event_type":"payment","payload":{"source":"mismatch"}}'::jsonb
);

reset role;

select is((select rejected from mismatch_result), true, 'amount mismatch is rejected');
select is((select reason from mismatch_result), 'amount_mismatch', 'amount mismatch reason is recorded');
select is((select payment_status::text from public.orders where external_reference = 'ext-mismatch'), 'pending', 'amount mismatch does not mutate order status');
select is((select count(*)::integer from public.payment_events where provider_event_id = 'evt-mismatch'), 1, 'rejected mismatch is recorded');

set local role service_role;

create temporary table preference_mismatch_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-preference-mismatch",
    "status": "approved",
    "external_reference": "ext-mismatch",
    "preference_id": "pref-wrong",
    "metadata_order_id": "20000000-0000-0000-0000-000000000002",
    "amount_cents": 12345,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-preference-mismatch","event_type":"payment","payload":{"source":"preference-mismatch"}}'::jsonb
);

reset role;

select is((select rejected from preference_mismatch_result), true, 'preference mismatch is rejected');
select is((select reason from preference_mismatch_result), 'preference_mismatch', 'preference mismatch reason is recorded');

set local role service_role;

create temporary table metadata_mismatch_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-metadata-mismatch",
    "status": "approved",
    "external_reference": "ext-mismatch",
    "preference_id": "pref-mismatch",
    "metadata_order_id": "20000000-0000-0000-0000-000000009999",
    "amount_cents": 12345,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-metadata-mismatch","event_type":"payment","payload":{"source":"metadata-mismatch"}}'::jsonb
);

reset role;

select is((select rejected from metadata_mismatch_result), true, 'metadata order mismatch is rejected');
select is((select reason from metadata_mismatch_result), 'metadata_order_mismatch', 'metadata order mismatch reason is recorded');

set local role service_role;

create temporary table currency_mismatch_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-currency-mismatch",
    "status": "approved",
    "external_reference": "ext-mismatch",
    "preference_id": "pref-mismatch",
    "metadata_order_id": "20000000-0000-0000-0000-000000000002",
    "amount_cents": 12345,
    "currency": "USD"
  }'::jsonb,
  '{"provider_event_id":"evt-currency-mismatch","event_type":"payment","payload":{"source":"currency-mismatch"}}'::jsonb
);

reset role;

select is((select rejected from currency_mismatch_result), true, 'currency mismatch is rejected');
select is((select reason from currency_mismatch_result), 'currency_mismatch', 'currency mismatch reason is recorded');
select is((select payment_status::text from public.orders where external_reference = 'ext-mismatch'), 'pending', 'identity and currency mismatches do not mutate order status');

set local role service_role;

create temporary table missing_order_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-missing-order",
    "status": "approved",
    "external_reference": "ext-missing-order",
    "preference_id": "pref-missing",
    "metadata_order_id": "20000000-0000-0000-0000-000000009998",
    "amount_cents": 12345,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-missing-order","event_type":"payment","payload":{"source":"missing-order"}}'::jsonb
);

reset role;

select is((select rejected from missing_order_result), true, 'missing order is rejected');
select is((select reason from missing_order_result), 'order_not_found', 'missing order reason is recorded');

alter table public.orders
  add constraint payment_reconciliation_test_block_paid
  check (payment_status <> 'paid') not valid;

set local role service_role;

select throws_like(
  $$
    select *
    from public.reconcile_mercado_pago_payment(
      '{
        "id": "pay-rollback",
        "status": "approved",
        "external_reference": "ext-rollback",
        "preference_id": "pref-rollback",
        "metadata_order_id": "20000000-0000-0000-0000-000000000003",
        "amount_cents": 5000,
        "currency": "ARS"
      }'::jsonb,
      '{"provider_event_id":"evt-rollback","event_type":"payment","payload":{"source":"rollback"}}'::jsonb
    )
  $$,
  '%payment_reconciliation_test_block_paid%',
  'order status failure rolls back the whole reconciliation'
);

reset role;

select is((select count(*)::integer from public.payment_events where provider_event_id = 'evt-rollback'), 0, 'failed transaction leaves no blocking payment event');

alter table public.orders
  drop constraint payment_reconciliation_test_block_paid;

set local role service_role;

create temporary table retry_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-rollback",
    "status": "approved",
    "external_reference": "ext-rollback",
    "preference_id": "pref-rollback",
    "metadata_order_id": "20000000-0000-0000-0000-000000000003",
    "amount_cents": 5000,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-rollback","event_type":"payment","payload":{"source":"retry"}}'::jsonb
);

reset role;

select is((select processed from retry_result), true, 'retry after rollback can complete');
select is((select payment_status::text from public.orders where external_reference = 'ext-rollback'), 'paid', 'retry marks the order paid');

set local role service_role;

create temporary table monotonic_result as
select *
from public.reconcile_mercado_pago_payment(
  '{
    "id": "pay-monotonic",
    "status": "pending",
    "external_reference": "ext-monotonic",
    "preference_id": "pref-monotonic",
    "metadata_order_id": "20000000-0000-0000-0000-000000000004",
    "amount_cents": 7700,
    "currency": "ARS"
  }'::jsonb,
  '{"provider_event_id":"evt-monotonic","event_type":"payment","payload":{"source":"monotonic"}}'::jsonb
);

reset role;

select is((select processed from monotonic_result), true, 'out-of-order pending event is processed');
select is((select payment_status::text from public.orders where external_reference = 'ext-monotonic'), 'paid', 'out-of-order pending event does not regress paid order');
select is((select payment_status::text from monotonic_result), 'paid', 'monotonic result reports the effective status');

select * from finish();
rollback;
