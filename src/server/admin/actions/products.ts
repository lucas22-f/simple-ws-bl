import "server-only";
import { z } from "zod";
import { calculatePublishedPriceCents, parseCurrencyAmountToCents } from "@/lib/money";
import { assertAdminActionAccess, type AdminActionAuthOptions } from "@/server/admin/actions/auth";
import { buildProductImagePath, PRODUCT_IMAGE_ALLOWED_TYPES, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGES_BUCKET } from "@/server/admin/storage";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const optionalUuidSchema = z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value || null);

export const productInputSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().default(""),
  basePriceAmount: z.union([z.string().trim().min(1), z.coerce.number().nonnegative()]).optional(),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  applyMercadoPagoSurcharge: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).transform((value) => value === true || value === "true"),
  currency: z.string().trim().length(3).default("ARS"),
  active: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).transform((value) => value === true || value === "true"),
  featured: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).transform((value) => value === true || value === "true"),
  stockQuantity: z.union([z.coerce.number().int().nonnegative(), z.literal(""), z.null()]).optional().transform((value) => value === "" || value === undefined ? null : value),
  categoryId: optionalUuidSchema,
});

export type ProductInput = z.infer<typeof productInputSchema>;

export type ProductImageInput = {
  file: File;
  altText: string;
};

export type CreatedProduct = {
  id: string;
  imageUploadFailed?: boolean;
};

export type ProductsRepository = {
  createProduct(product: ProductInput): Promise<CreatedProduct>;
  uploadProductImage(productId: string, image: ProductImageInput): Promise<unknown>;
  updateProduct(productId: string, product: ProductInput): Promise<unknown>;
  archiveProduct(productId: string): Promise<unknown>;
};

type ProductActionOptions<TRepository> = AdminActionAuthOptions & {
  repository?: TRepository;
};

function getBasePriceCents(product: ProductInput) {
  if (product.basePriceAmount !== undefined) {
    return parseCurrencyAmountToCents(product.basePriceAmount);
  }

  if (product.priceCents !== undefined) {
    return product.priceCents;
  }

  throw new Error("Producto inválido");
}

function toProductRow(product: ProductInput) {
  const basePriceCents = getBasePriceCents(product);
  const priceCents = calculatePublishedPriceCents(basePriceCents, product.applyMercadoPagoSurcharge);

  return {
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    base_price_cents: basePriceCents,
    apply_mercado_pago_surcharge: product.applyMercadoPagoSurcharge,
    price_cents: priceCents,
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
      basePriceAmount: rawInput.get("basePriceAmount") ?? rawInput.get("priceAmount") ?? rawInput.get("priceCents"),
      applyMercadoPagoSurcharge: rawInput.get("applyMercadoPagoSurcharge") === "true",
      currency: rawInput.get("currency") ?? "ARS",
      active: rawInput.get("active") === "true",
      featured: rawInput.get("featured") === "true",
      stockQuantity: rawInput.get("stockQuantity") ?? null,
      categoryId: rawInput.get("categoryId") ?? "",
    };
  }
  return rawInput;
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function normalizeProductImageAltText(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseProductImage(rawInput: unknown, productName: string): ProductImageInput | null {
  if (!(rawInput instanceof FormData)) {
    return null;
  }

  const file = rawInput.get("productImage");

  if (!isFileLike(file) || file.size === 0) {
    return null;
  }

  if (!PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_ALLOWED_TYPES)[number])) {
    throw new Error("La imagen debe ser JPG, PNG o WebP");
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("La imagen optimizada no puede superar 5 MB");
  }

  return {
    file,
    altText: normalizeProductImageAltText(rawInput.get("productImageAlt"), productName),
  };
}

export function createSupabaseProductsRepository(): ProductsRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async createProduct(product) {
      const { data, error } = await supabase.from("products").insert(toProductRow(product)).select("*").single();
      if (error) throw new Error("No pudimos crear el producto");
      return data as CreatedProduct;
    },
    async uploadProductImage(productId, image) {
      const path = buildProductImagePath(productId);
      const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, image.file, {
        cacheControl: "31536000",
        contentType: image.file.type,
        upsert: false,
      });

      if (uploadError) {
        throw new Error("No pudimos subir la imagen del producto");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

      const { data, error: imageError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          storage_path: publicUrl,
          alt_text: image.altText,
          sort_order: 0,
          active: true,
        })
        .select("*")
        .single();

      if (imageError) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
        throw new Error("No pudimos asociar la imagen al producto");
      }

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
  try {
    getBasePriceCents(parsed.data);
  } catch {
    throw new Error("Producto inválido");
  }
  return parsed.data;
}

function parseProductId(productId: string) {
  const parsed = z.string().uuid().safeParse(productId);
  if (!parsed.success) throw new Error("ID de producto inválido");
  return parsed.data;
}

export async function createProductAction(rawInput: unknown, options: ProductActionOptions<Pick<ProductsRepository, "createProduct"> & Partial<Pick<ProductsRepository, "uploadProductImage">>> = {}) {
  await assertAdminActionAccess(options);
  const repository = options.repository ?? createSupabaseProductsRepository();
  const product = parseProduct(rawInput);
  const image = parseProductImage(rawInput, product.name);
  const createdProduct = await repository.createProduct(product);

  if (image) {
    if (!repository.uploadProductImage) {
      throw new Error("No pudimos subir la imagen del producto");
    }

    try {
      await repository.uploadProductImage(createdProduct.id, image);
    } catch {
      return { ...createdProduct, imageUploadFailed: true };
    }
  }

  return createdProduct;
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
