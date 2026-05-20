import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase", "migrations", "0001_init.sql");
const seedPath = join(process.cwd(), "supabase", "seed.sql");

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").toLowerCase();
}

function expectSqlPattern(sql: string, pattern: RegExp) {
  expect(sql).toMatch(pattern);
}

describe("Supabase schema and RLS policy contract", () => {
  it("creates the required ecommerce tables, enums, and product image bucket", () => {
    const sql = normalizeSql(readFileSync(migrationPath, "utf8"));

    for (const enumName of ["profile_role", "order_payment_status", "order_fulfillment_status"]) {
      expect(sql).toContain(`create type ${enumName} as enum`);
    }

    for (const tableName of [
      "profiles",
      "categories",
      "products",
      "product_images",
      "settings",
      "orders",
      "order_items",
      "payment_events",
    ]) {
      expect(sql).toContain(`create table public.${tableName}`);
      expect(sql).toContain(`alter table public.${tableName} enable row level security`);
    }

    expect(sql).toContain("insert into storage.buckets");
    expect(sql).toContain("product-images");
  });

  it("allows anonymous active catalog reads but keeps writes and sensitive data admin-only", () => {
    const sql = normalizeSql(readFileSync(migrationPath, "utf8"));

    expect(sql).toContain("public can read active categories");
    expect(sql).toContain("public can read active products");
    expect(sql).toContain("public can read active product images");
    expect(sql).toContain("active = true");

    for (const tableName of ["products", "categories", "product_images", "settings", "orders", "order_items", "payment_events"]) {
      expect(sql).toContain(`admins can manage ${tableName}`);
      expect(sql).toContain(`on public.${tableName}`);
    }

    expect(sql).toContain("create or replace function public.is_admin");
    expect(sql).toContain("storage product images are admin writable");
  });

  it("creates customer profiles automatically for new Supabase Auth users", () => {
    const sql = normalizeSql(readFileSync(migrationPath, "utf8"));

    expectSqlPattern(
      sql,
      /create or replace function public\.handle_new_user\(\)[\s\S]*returns trigger[\s\S]*security definer[\s\S]*set search_path = public[\s\S]*insert into public\.profiles \(id, full_name\)[\s\S]*values \(new\.id, new\.raw_user_meta_data ->> 'full_name'\)[\s\S]*on conflict \(id\) do nothing[\s\S]*return new/,
    );
    expectSqlPattern(
      sql,
      /create trigger on_auth_user_created after insert on auth\.users for each row execute function public\.handle_new_user\(\)/,
    );
  });

  it("keeps profile role promotion admin-only and blocks customer self-promotion paths", () => {
    const sql = normalizeSql(readFileSync(migrationPath, "utf8"));

    expect(sql).toContain("admins can manage profiles");
    expect(sql).toContain("on public.profiles for all");
    expect(sql).toContain("using (public.is_admin())");
    expect(sql).toContain("with check (public.is_admin())");
    expect(sql).not.toContain("users can insert own profile");
    expect(sql).not.toContain("users can update own profile");
  });

  it("seeds default settings, demo catalog data, and reliable admin bootstrap notes", () => {
    const seed = normalizeSql(readFileSync(seedPath, "utf8"));

    for (const key of ["shipping_zones", "commission", "meta_pixel_id", "gtm_id"]) {
      expect(seed).toContain(key);
    }

    expect(seed).toContain("bazar demo");
    expect(seed).toContain("admin bootstrap note");
    expect(seed).toContain("insert into public.profiles");
    expect(seed).toContain("on conflict (id) do update");
    expect(seed).toContain("role = 'admin'");
  });
});
