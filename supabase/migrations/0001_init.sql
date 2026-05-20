-- Bazar Online initial schema, RLS, and storage policies.

create extension if not exists "pgcrypto";

create type profile_role as enum ('admin', 'customer');
create type order_payment_status as enum ('pending', 'paid', 'rejected', 'cancelled', 'refunded');
create type order_fulfillment_status as enum ('pending', 'processing', 'shipped', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'customer',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'ARS',
  active boolean not null default false,
  featured boolean not null default false,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  shipping_address jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  commission_cents integer not null default 0 check (commission_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'ARS',
  payment_status public.order_payment_status not null default 'pending',
  fulfillment_status public.order_fulfillment_status not null default 'pending',
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  external_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago',
  provider_event_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create or replace function public.create_pending_order(p_order jsonb, p_items jsonb)
returns table (id uuid, external_reference text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
begin
  insert into public.orders (
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
    external_reference
  )
  values (
    p_order ->> 'buyer_name',
    p_order ->> 'buyer_email',
    p_order ->> 'buyer_phone',
    p_order -> 'shipping_address',
    (p_order ->> 'subtotal_cents')::integer,
    (p_order ->> 'shipping_cents')::integer,
    (p_order ->> 'commission_cents')::integer,
    (p_order ->> 'total_cents')::integer,
    p_order ->> 'currency',
    'pending',
    'pending',
    p_order ->> 'external_reference'
  )
  returning orders.id into new_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_slug,
    unit_price_cents,
    quantity,
    line_total_cents
  )
  select
    new_order_id,
    nullif(item ->> 'product_id', '')::uuid,
    item ->> 'product_name',
    item ->> 'product_slug',
    (item ->> 'unit_price_cents')::integer,
    (item ->> 'quantity')::integer,
    (item ->> 'line_total_cents')::integer
  from jsonb_array_elements(p_items) as item;

  return query
  select orders.id, orders.external_reference
  from public.orders
  where orders.id = new_order_id;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid default auth.uid())
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
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "admins can read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "admins can manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read active categories"
  on public.categories for select
  to anon, authenticated
  using (active = true);

create policy "admins can manage categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read active products"
  on public.products for select
  to anon, authenticated
  using (active = true);

create policy "admins can manage products"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read active product images"
  on public.product_images for select
  to anon, authenticated
  using (
    active = true
    and exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.active = true
    )
  );

create policy "admins can manage product_images"
  on public.product_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read public settings"
  on public.settings for select
  to anon, authenticated
  using (is_public = true);

create policy "admins can manage settings"
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage orders"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage order_items"
  on public.order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage payment_events"
  on public.payment_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage product images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "storage product images are admin writable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and name like 'products/%'
    and public.is_admin()
  );

create policy "storage product images are admin updatable"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and name like 'products/%' and public.is_admin());

create policy "storage product images are admin deletable"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

