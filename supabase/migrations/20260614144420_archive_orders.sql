-- Add order archive state used by admin hide/delete behavior.

alter table public.orders
  add column if not exists archived_at timestamptz;

create index if not exists orders_unarchived_created_at_idx
  on public.orders (created_at desc)
  where archived_at is null;
