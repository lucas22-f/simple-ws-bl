begin;

select plan(17);

select has_table('public', 'rate_limit_windows', 'rate limit table exists');
select col_type_is('public', 'rate_limit_windows', 'bucket', 'text', 'bucket is text');
select col_type_is('public', 'rate_limit_windows', 'identity', 'text', 'identity is text');
select col_type_is('public', 'rate_limit_windows', 'request_count', 'integer', 'request count is tracked');
select col_type_is('public', 'rate_limit_windows', 'window_starts_at', 'timestamp with time zone', 'window start is tracked');

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'rate_limit_windows'),
  0,
  'rate limit table has no client RLS policies'
);

select ok(
  has_function_privilege('service_role', 'public.consume_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'service_role can execute consume_rate_limit'
);

select ok(
  not has_function_privilege('anon', 'public.consume_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'anon cannot execute consume_rate_limit'
);

select ok(
  not has_function_privilege('authenticated', 'public.consume_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'authenticated cannot execute consume_rate_limit'
);

set local role service_role;

create temporary table first_attempt as
select * from public.consume_rate_limit('checkout:create-preference:ip', '198.51.100.99', 2, 60);

create temporary table second_attempt as
select * from public.consume_rate_limit('checkout:create-preference:ip', '198.51.100.99', 2, 60);

create temporary table third_attempt as
select * from public.consume_rate_limit('checkout:create-preference:ip', '198.51.100.99', 2, 60);

reset role;

select is((select allowed from first_attempt), true, 'first request is allowed');
select is((select remaining from first_attempt), 1, 'first request reports remaining budget');
select is((select allowed from second_attempt), true, 'second request is allowed');
select is((select remaining from second_attempt), 0, 'second request exhausts budget');
select is((select allowed from third_attempt), false, 'third request is rejected');
select ok((select retry_after_seconds from third_attempt) > 0, 'limited request reports retry-after');
select is(
  (select request_count from public.rate_limit_windows where bucket = 'checkout:create-preference:ip' and identity = '198.51.100.99'),
  3,
  'excess attempts are persisted in the distributed store'
);

select throws_like(
  $$select * from public.consume_rate_limit('checkout:create-preference:ip', '198.51.100.100', 0, 60)$$,
  '%rate_limit_policy_invalid%',
  'invalid limit is rejected'
);

select * from finish();

rollback;
