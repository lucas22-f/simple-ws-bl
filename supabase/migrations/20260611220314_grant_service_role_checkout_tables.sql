-- `service_role` is the only role allowed to execute privileged checkout and
-- payment RPCs. Those functions intentionally run as SECURITY INVOKER, so the
-- role also needs explicit table privileges for the rows they read and mutate.

grant select, insert, update on table public.products to service_role;
grant select, insert, update on table public.orders to service_role;
grant select, insert on table public.order_items to service_role;
grant select, insert on table public.payment_events to service_role;

-- Existing RLS policies allow public category reads and authenticated admins to
-- manage categories. PostgreSQL still requires matching table privileges before
-- RLS policies are evaluated.
grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;
