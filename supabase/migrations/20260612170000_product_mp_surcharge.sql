-- Add Mercado Pago surcharge pricing metadata while preserving price_cents as the published price.

alter table public.products
  add column if not exists base_price_cents integer,
  add column if not exists apply_mercado_pago_surcharge boolean not null default false;

update public.products
set base_price_cents = price_cents
where base_price_cents is null;

alter table public.products
  alter column base_price_cents set default 0,
  alter column base_price_cents set not null;

create or replace function public.sync_product_mercado_pago_surcharge_price()
returns trigger
language plpgsql
as $$
begin
  if new.apply_mercado_pago_surcharge then
    new.price_cents = ((new.base_price_cents * 110 + 50) / 100);
  else
    new.base_price_cents = new.price_cents;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_product_mercado_pago_surcharge_price on public.products;

create trigger trg_sync_product_mercado_pago_surcharge_price
before insert or update on public.products
for each row
execute function public.sync_product_mercado_pago_surcharge_price();

alter table public.products
  add constraint products_base_price_cents_non_negative
    check (base_price_cents >= 0),
  add constraint products_price_cents_matches_mp_surcharge
    check (
      (
        apply_mercado_pago_surcharge = false
        and price_cents = base_price_cents
      )
      or (
        apply_mercado_pago_surcharge = true
        and price_cents = ((base_price_cents * 110 + 50) / 100)
      )
    );
