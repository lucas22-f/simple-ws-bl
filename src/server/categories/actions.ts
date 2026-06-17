import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdminActionAccess, type AdminActionAuthOptions } from "@/server/admin/actions/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { CategoryInput, CategoryRepository, CategoryRow, CategoryUpdateInput } from "@/server/categories/types";

export { type CategoryRepository } from "@/server/categories/types";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().default(""),
  active: z.boolean().default(true),
});

export function createSupabaseCategoryRepository(): CategoryRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async create(input) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          active: input.active ?? true,
          sort_order: input.sortOrder ?? 0,
        })
        .select("*")
        .single();

      if (error) throw new Error("No pudimos crear la categoría");
      return data as CategoryRow;
    },
    async update(id, input) {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.active !== undefined) updateData.active = input.active;
      if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

      const { data, error } = await supabase.from("categories").update(updateData).eq("id", id).select("*").single();
      if (error) throw new Error("No pudimos actualizar la categoría");
      return data;
    },
    async delete(id) {
      const { data: category } = await supabase.from("categories").select("slug").eq("id", id).single();
      if (category?.slug === "varios") {
        throw new Error("No se puede eliminar la categoría por defecto");
      }

      const { data, error } = await supabase.from("categories").delete().eq("id", id).select("*").single();
      if (error) throw new Error("No pudimos eliminar la categoría");
      return data;
    },
    async getBySlug(slug) {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      return { data: (data ?? null) as CategoryRow | null, error };
    },
  };
}

export type CategoryActionOptions<TRepository> = AdminActionAuthOptions & {
  repository?: TRepository;
};

type CategoryActionFullRepository = CategoryRepository;

function parseCategoryId(id: string) {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) throw new Error("ID de categoría inválido");
  return parsed.data;
}

export async function createCategoryAction(
  rawInput: unknown,
  options: CategoryActionOptions<Pick<CategoryActionFullRepository, "create">> = {},
) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseCategoryRepository();
  const parsed = categoryInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error("Categoría inválida");
  const created = await repository.create(parsed.data);
  revalidatePath("/admin/categories");
  return created;
}

export async function updateCategoryAction(
  id: string,
  rawInput: unknown,
  options: CategoryActionOptions<Pick<CategoryActionFullRepository, "update">> = {},
) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseCategoryRepository();
  const parsedId = parseCategoryId(id);
  const parsed = categoryInputSchema.partial().safeParse(rawInput);
  if (!parsed.success) throw new Error("Categoría inválida");
  const result = await repository.update(parsedId, parsed.data);
  revalidatePath("/admin/categories");
  return result;
}

export async function deleteCategoryAction(
  id: string,
  options: CategoryActionOptions<Pick<CategoryActionFullRepository, "delete" | "getBySlug">> = {},
) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseCategoryRepository();
  const parsedId = parseCategoryId(id);

  const { data: variosCategory } = await repository.getBySlug("varios");
  if (variosCategory?.id === parsedId) {
    throw new Error("No se puede eliminar la categoría por defecto");
  }

  const result = await repository.delete(parsedId);
  revalidatePath("/admin/categories");
  return result;
}
