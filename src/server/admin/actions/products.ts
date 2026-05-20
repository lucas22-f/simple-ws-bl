import "server-only";
import { z } from "zod";
import { assertAdminActionAccess, type AdminActionAuthOptions } from "@/server/admin/actions/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const optionalUuidSchema = z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value || null);

export const productInputSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().default(""),
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().trim().length(3).default("ARS"),
  active: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).transform((value) => value === true || value === "true"),
  featured: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).transform((value) => value === true || value === "true"),
  stockQuantity: z.union([z.coerce.number().int().nonnegative(), z.literal(""), z.null()]).optional().transform((value) => value === "" || value === undefined ? null : value),
  categoryId: optionalUuidSchema,
});

export type ProductInput = z.infer<typeof productInputSchema>;

export type ProductsRepository = {
  createProduct(product: ProductInput): Promise<unknown>;
  updateProduct(productId: string, product: ProductInput): Promise<unknown>;
  archiveProduct(productId: string): Promise<unknown>;
};

type ProductActionOptions<TRepository> = AdminActionAuthOptions & {
  repository?: TRepository;
};

function toProductRow(product: ProductInput) {
  return {
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price_cents: product.priceCents,
    currency: product.currency,
    active: product.active,
    featured: product.featured,
    stock_quantity: product.stockQuantity,
  };
}

function normalizeRawProductInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return {
      name: rawInput.get("name"),
      slug: rawInput.get("slug"),
      description: rawInput.get("description") ?? "",
      priceCents: rawInput.get("priceCents"),
      currency: rawInput.get("currency") ?? "ARS",
      active: rawInput.get("active") === "true",
      featured: rawInput.get("featured") === "true",
      stockQuantity: rawInput.get("stockQuantity") ?? null,
      categoryId: rawInput.get("categoryId") ?? "",
    };
  }
  return rawInput;
}

export function createSupabaseProductsRepository(): ProductsRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async createProduct(product) {
      const { data, error } = await supabase.from("products").insert(toProductRow(product)).select("*").single();
      if (error) throw new Error("No pudimos crear el producto");
      return data;
    },
    async updateProduct(productId, product) {
      const { data, error } = await supabase.from("products").update(toProductRow(product)).eq("id", productId).select("*").single();
      if (error) throw new Error("No pudimos actualizar el producto");
      return data;
    },
    async archiveProduct(productId) {
      const { data, error } = await supabase.from("products").update({ active: false }).eq("id", productId).select("*").single();
      if (error) throw new Error("No pudimos archivar el producto");
      return data;
    },
  };
}

function parseProduct(rawInput: unknown) {
  const parsed = productInputSchema.safeParse(normalizeRawProductInput(rawInput));
  if (!parsed.success) throw new Error("Producto inválido");
  return parsed.data;
}

function parseProductId(productId: string) {
  const parsed = z.string().uuid().safeParse(productId);
  if (!parsed.success) throw new Error("ID de producto inválido");
  return parsed.data;
}

export async function createProductAction(rawInput: unknown, options: ProductActionOptions<Pick<ProductsRepository, "createProduct">> = {}) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseProductsRepository();
  return repository.createProduct(parseProduct(rawInput));
}

export async function updateProductAction(productId: string, rawInput: unknown, options: ProductActionOptions<Pick<ProductsRepository, "updateProduct">> = {}) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseProductsRepository();
  return repository.updateProduct(parseProductId(productId), parseProduct(rawInput));
}

export async function archiveProductAction(productId: string, options: ProductActionOptions<Pick<ProductsRepository, "archiveProduct">> = {}) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseProductsRepository();
  return repository.archiveProduct(parseProductId(productId));
}
