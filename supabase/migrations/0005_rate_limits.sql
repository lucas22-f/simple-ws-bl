-- Store public mutation rate limits in Postgres so limits work across instances.

create table public.rate_limit_windows (
  bucket text not null,
  identity text not null,
  window_starts_at timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket, identity, window_starts_at)
);

create index rate_limit_windows_expires_idx
  on public.rate_limit_windows (bucket, window_starts_at);

alter table public.rate_limit_windows enable row level security;

revoke all on table public.rate_limit_windows from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_windows to service_role;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_identity text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  now_ts timestamptz := clock_timestamp();
  normalized_bucket text := lower(trim(p_bucket));
  normalized_identity text := lower(trim(p_identity));
  window_start timestamptz;
  window_reset timestamptz;
  current_count integer;
begin
  if normalized_bucket = '' or normalized_identity = '' or p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'rate_limit_policy_invalid';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from now_ts) / p_window_seconds) * p_window_seconds
  );
  window_reset := window_start + make_interval(secs => p_window_seconds);

  delete from public.rate_limit_windows
  where bucket = normalized_bucket
    and window_starts_at < window_start - make_interval(secs => p_window_seconds);

  insert into public.rate_limit_windows (
    bucket,
    identity,
    window_starts_at,
    window_seconds,
    request_count
  )
  values (
    normalized_bucket,
    normalized_identity,
    window_start,
    p_window_seconds,
    1
  )
  on conflict (bucket, identity, window_starts_at)
  do update set
    request_count = public.rate_limit_windows.request_count + 1,
    updated_at = now()
  returning request_count into current_count;

  return query
  select
    current_count <= p_limit,
    case
      when current_count <= p_limit then 0
      else greatest(1, ceiling(extract(epoch from (window_reset - now_ts)))::integer)
    end,
    greatest(p_limit - current_count, 0),
    window_reset;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;
