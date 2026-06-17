-- Add admin approval workflow. Pending admins are blocked by RLS until approved.

create type public.admin_status as enum ('pending', 'approved');

alter table public.profiles
  add column admin_status public.admin_status;

update public.profiles
  set admin_status = 'approved'
  where role = 'admin';

create or replace function private.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
      and (admin_status is null or admin_status = 'approved'::public.admin_status)
  );
$$;
