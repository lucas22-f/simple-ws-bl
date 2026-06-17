import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/server/env";
import type { CategoryQueryClient, CategoryRow, Category } from "@/server/categories/types";

export { type CategoryQueryClient, type CategoryRow } from "@/server/categories/types";

export const CATEGORY_READ_ERROR_MESSAGE = "No pudimos cargar las categorías. Probá de nuevo en unos minutos.";

export class CategoryReadError extends Error {
  constructor(cause?: unknown) {
    super(CATEGORY_READ_ERROR_MESSAGE);
    this.name = "CategoryReadError";
    this.cause = cause;
  }
}

export function isCategoryReadError(error: unknown): error is CategoryReadError {
  return error instanceof CategoryReadError;
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseCategoryQueryClient(): CategoryQueryClient {
  return {
    async listActive() {
      const env = getPublicEnv();
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false },
      });
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name");

      return { data: (data ?? null) as CategoryRow[] | null, error };
    },
    async listAdmin(pagination) {
      const { createSupabaseAdminClient } = await import("@/server/supabase/admin");
      const supabase = createSupabaseAdminClient();
      let query = supabase.from("categories").select("*", { count: pagination?.pageSize ? "exact" : undefined });

      const search = pagination?.search?.trim();
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      query = query.order("sort_order").order("name");

      if (pagination?.pageSize) {
        const page = pagination.page ?? 1;
        const from = (page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      return { data: (data ?? null) as CategoryRow[] | null, error, count };
    },
    async getBySlug(slug: string) {
      const env = getPublicEnv();
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false },
      });
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).single();

      return { data: (data ?? null) as CategoryRow | null, error };
    },
  };
}

export async function listActiveCategories(options: { client?: CategoryQueryClient } = {}) {
  const client = options.client ?? createSupabaseCategoryQueryClient();
  const { data, error } = await client.listActive();

  if (error) {
    throw new CategoryReadError(error);
  }

  return (data ?? []).map(mapCategoryRow);
}

export async function listAdminCategories(options: { client?: CategoryQueryClient; search?: string; page?: number; pageSize?: number } = {}) {
  const client = options.client ?? createSupabaseCategoryQueryClient();
  const { data, error } = await client.listAdmin({ search: options.search, page: options.page, pageSize: options.pageSize });

  if (error) {
    throw new CategoryReadError(error);
  }

  return (data ?? []).map(mapCategoryRow);
}

export async function getCategoryBySlug(slug: string, options: { client?: CategoryQueryClient } = {}) {
  const client = options.client ?? createSupabaseCategoryQueryClient();
  const { data, error } = await client.getBySlug(slug);

  if (error) {
    throw new CategoryReadError(error);
  }

  return data ? mapCategoryRow(data) : null;
}

export async function getVariosCategoryId(options: { client?: CategoryQueryClient } = {}) {
  const category = await getCategoryBySlug("varios", options);

  if (!category) {
    throw new Error("Categoría 'Varios' no encontrada");
  }

  return category.id;
}
