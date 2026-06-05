-- Restrict privileged mutations to trusted server execution.

create schema if not exists private;

alter function public.is_admin(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.set_updated_at() set schema private;

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges for role postgres
  revoke execute on functions from public;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin(uuid) to authenticated, service_role;

alter function public.create_pending_order(jsonb, jsonb) security invoker;

revoke all on function public.create_pending_order(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_pending_order(jsonb, jsonb)
  to service_role;
