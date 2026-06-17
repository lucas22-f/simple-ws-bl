-- Seed default categories for product categorization.
insert into public.categories (name, slug, description, active, sort_order)
values ('Varios', 'varios', 'Productos sin categoría específica', true, 9999)
on conflict (slug) do nothing;
