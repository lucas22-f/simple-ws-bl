-- Bazar Online seed data. Run after 0001_init.sql.

insert into public.settings (key, value, description, is_public)
values
  (
    'shipping_zones',
    '[{"name":"CABA","postalCodePrefix":"C","priceCents":250000},{"name":"GBA","postalCodePrefix":"B","priceCents":350000}]'::jsonb,
    'Default shipping zones used by checkout until the admin configures real prices.',
    false
  ),
  (
    'commission',
    '{"enabled":false,"type":"percentage","value":0}'::jsonb,
    'Default commission/surcharge rule. Disabled for launch seed.',
    false
  ),
  (
    'meta_pixel_id',
    '""'::jsonb,
    'Meta Pixel ID. Empty means no pixel script is rendered.',
    true
  ),
  (
    'gtm_id',
    '""'::jsonb,
    'Google Tag Manager ID. Empty means no GTM script is rendered.',
    true
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();

insert into public.categories (name, slug, description, active, sort_order)
values
  ('Bazar Demo', 'bazar-demo', 'Productos iniciales para validar catálogo y checkout.', true, 10),
  ('Cocina', 'cocina', 'Utensilios y accesorios de cocina.', true, 20)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (category_id, name, slug, description, price_cents, active, featured, stock_quantity)
select c.id, 'Mate cerámico artesanal', 'mate-ceramico-artesanal', 'Mate de cerámica esmaltada para el demo catalog.', 1250000, true, true, 12
from public.categories c
where c.slug = 'bazar-demo'
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  active = excluded.active,
  featured = excluded.featured,
  stock_quantity = excluded.stock_quantity,
  updated_at = now();

insert into public.products (category_id, name, slug, description, price_cents, active, featured, stock_quantity)
select c.id, 'Set de cucharas de madera', 'set-cucharas-madera', 'Set de tres cucharas de madera para cocina diaria.', 890000, true, false, 20
from public.categories c
where c.slug = 'cocina'
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  active = excluded.active,
  featured = excluded.featured,
  stock_quantity = excluded.stock_quantity,
  updated_at = now();

-- Admin bootstrap note:
-- Supabase Auth users are environment-specific, so this seed does not create an auth user.
-- New Auth users get a customer profile automatically through the auth.users trigger.
-- After creating the first admin in Supabase Auth, promote it from a trusted SQL editor/service role context with:
-- insert into public.profiles (id, role)
-- values ('<auth-user-id>', 'admin')
-- on conflict (id) do update set role = 'admin';
