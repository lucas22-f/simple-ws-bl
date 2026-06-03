import { createClient } from "@supabase/supabase-js";
import { createPaginationState, getPaginationRange, type PaginationInput, type PaginationState } from "@/lib/pagination";
import { getPublicEnv } from "@/server/env";

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  description,
  price_cents,
  currency,
  active,
  featured,
  stock_quantity,
  categories(name, slug),
  product_images(storage_path, alt_text, sort_order, active)
`;

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  currency: string;
  active: boolean;
  featured: boolean;
  stock_quantity: number | null;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  product_images: { storage_path: string; alt_text: string | null; sort_order?: number | null; active?: boolean | null }[] | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  featured: boolean;
  stockQuantity: number | null;
  category: { name: string; slug: string } | null;
  images: { storagePath: string; altText: string }[];
};

export type AdminProductRow = Pick<
  ProductRow,
  "id" | "name" | "slug" | "description" | "price_cents" | "currency" | "active" | "featured" | "stock_quantity"
> & Pick<ProductRow, "product_images">;

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  active: boolean;
  featured: boolean;
  stockQuantity: number | null;
  images: { storagePath: string; altText: string }[];
};

export type ProductListState =
  | {
      status: "ready";
      products: StorefrontProduct[];
      pagination?: PaginationState;
    }
  | {
      status: "error";
      products: StorefrontProduct[];
      message: string;
      pagination?: undefined;
    };

export type ProductQueryClient = {
  listProducts: (
    filters?: { search?: string; category?: string } & PaginationInput,
  ) => Promise<{ data: ProductRow[] | null; error: unknown; count?: number | null }>;
};

export type AdminProductQueryClient = {
  listAdminProducts: (pagination?: PaginationInput) => Promise<{ data: AdminProductRow[] | null; error: unknown; count?: number | null }>;
};

export const CATALOG_READ_ERROR_MESSAGE = "No pudimos cargar el catálogo. Probá de nuevo en unos minutos.";

export class ProductCatalogReadError extends Error {
  constructor(cause?: unknown) {
    super(CATALOG_READ_ERROR_MESSAGE);
    this.name = "ProductCatalogReadError";
    this.cause = cause;
  }
}

export function isProductCatalogReadError(error: unknown): error is ProductCatalogReadError {
  return error instanceof ProductCatalogReadError;
}

function isActiveProduct(row: ProductRow) {
  return row.active === true;
}

function normalizeSearch(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function mapProductRow(row: ProductRow): StorefrontProduct {
  const images = (row.product_images ?? [])
    .filter((image) => image.active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((image) => ({
      storagePath: image.storage_path,
      altText: image.alt_text ?? row.name,
    }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    featured: row.featured,
    stockQuantity: row.stock_quantity,
    category: Array.isArray(row.categories) ? (row.categories[0] ?? null) : row.categories,
    images,
  };
}

export function mapAdminProductRow(row: AdminProductRow): AdminProduct {
  const images = (row.product_images ?? [])
    .filter((image) => image.active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((image) => ({
      storagePath: image.storage_path,
      altText: image.alt_text ?? row.name,
    }));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    active: row.active,
    featured: row.featured,
    stockQuantity: row.stock_quantity,
    images,
  };
}

export function createSupabaseProductQueryClient(): ProductQueryClient {
  return {
    async listProducts(filters = {}) {
      const env = getPublicEnv();
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false },
      });
      let query = supabase
        .from("products")
        .select(PRODUCT_SELECT, { count: filters.pageSize ? "exact" : undefined })
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      const search = normalizeSearch(filters.search);
      if (search) {
        const escapedSearch = search.replaceAll("%", "\\%").replaceAll(",", "\\,");
        query = query.or(`name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
      }

      if (filters.category) {
        query = query.eq("categories.slug", filters.category);
      }

      if (filters.pageSize) {
        const { from, to } = getPaginationRange({ page: filters.page ?? 1, pageSize: filters.pageSize });
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      return { data: (data ?? null) as ProductRow[] | null, error, count };
    },
  };
}

export function createSupabaseAdminProductQueryClient(): AdminProductQueryClient {
  return {
    async listAdminProducts(pagination = {}) {
      const { createSupabaseAdminClient } = await import("@/server/supabase/admin");
      const supabase = createSupabaseAdminClient();
      let query = supabase
        .from("products")
        .select("id, name, slug, description, price_cents, currency, active, featured, stock_quantity, product_images(storage_path, alt_text, sort_order, active)", {
          count: pagination.pageSize ? "exact" : undefined,
        })
        .order("created_at", { ascending: false });

      if (pagination.pageSize) {
        const { from, to } = getPaginationRange({ page: pagination.page ?? 1, pageSize: pagination.pageSize });
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      return { data: (data ?? null) as AdminProductRow[] | null, error, count };
    },
  };
}

function createE2eProductFixtures(): StorefrontProduct[] {
  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Mate cerámico artesanal",
      slug: "mate-ceramico-artesanal",
      description: "Mate cerámico hecho a mano para el smoke E2E.",
      priceCents: 12500,
      currency: "ARS",
      featured: true,
      stockQuantity: 10,
      category: { name: "Mates", slug: "mates" },
      images: [],
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Set cucharas madera",
      slug: "set-cucharas-madera",
      description: "Set de cucharas de madera para cocina.",
      priceCents: 8900,
      currency: "ARS",
      featured: false,
      stockQuantity: 6,
      category: { name: "Cocina", slug: "cocina" },
      images: [],
    },
  ];
}

function shouldUseE2eStoreFixtures() {
  return process.env.E2E_STORE_FIXTURES === "1";
}

export async function listActiveProducts(options: { client?: ProductQueryClient; search?: string; category?: string } = {}) {
  const { products } = await listActiveProductsPage(options);
  return products;
}

export async function listActiveProductsPage(options: { client?: ProductQueryClient; search?: string; category?: string } & PaginationInput = {}) {
  if (!options.client && shouldUseE2eStoreFixtures()) {
    const search = normalizeSearch(options.search)?.toLowerCase();
    const filteredProducts = createE2eProductFixtures().filter((product) => {
      const matchesSearch = search ? `${product.name} ${product.description}`.toLowerCase().includes(search) : true;
      const matchesCategory = options.category ? product.category?.slug === options.category : true;
      return matchesSearch && matchesCategory;
    });

    const products = options.pageSize
      ? filteredProducts.slice((options.page ?? 1) * options.pageSize - options.pageSize, (options.page ?? 1) * options.pageSize)
      : filteredProducts;

    return { products, totalItems: filteredProducts.length };
  }

  const client = options.client ?? createSupabaseProductQueryClient();
  const { data, error, count } = await client.listProducts({
    search: options.search,
    category: options.category,
    page: options.page,
    pageSize: options.pageSize,
  });

  if (error) {
    throw new ProductCatalogReadError(error);
  }

  const products = (data ?? []).filter(isActiveProduct).map(mapProductRow);
  return { products, totalItems: count ?? products.length };
}

export async function getProductListState(options: { client?: ProductQueryClient; search?: string; category?: string } & PaginationInput = {}): Promise<ProductListState> {
  try {
    const { products, totalItems } = await listActiveProductsPage(options);
    return {
      status: "ready" as const,
      products,
      ...(options.pageSize
        ? {
            pagination: createPaginationState({
              page: options.page ?? 1,
              pageSize: options.pageSize,
              totalItems,
            }),
          }
        : {}),
    };
  } catch (error) {
    if (!isProductCatalogReadError(error)) {
      throw error;
    }

    return {
      status: "error" as const,
      products: [],
      message: CATALOG_READ_ERROR_MESSAGE,
    };
  }
}

export async function listAdminProducts(options: { client?: AdminProductQueryClient } = {}) {
  const { products } = await listAdminProductsPage(options);
  return products;
}

export async function listAdminProductsPage(options: { client?: AdminProductQueryClient } & PaginationInput = {}) {
  const client = options.client ?? createSupabaseAdminProductQueryClient();
  const { data, error, count } = await client.listAdminProducts({ page: options.page, pageSize: options.pageSize });

  if (error) {
    throw new ProductCatalogReadError(error);
  }

  const products = (data ?? []).map(mapAdminProductRow);
  return {
    products,
    pagination: createPaginationState({
      page: options.page ?? 1,
      pageSize: options.pageSize ?? Math.max(1, products.length),
      totalItems: count ?? products.length,
    }),
  };
}

export async function listFeaturedProducts(options: { client?: ProductQueryClient; limit?: number } = {}) {
  const products = await listActiveProducts({ client: options.client });
  return products.filter((product) => product.featured).slice(0, options.limit ?? 4);
}

export async function getActiveProductBySlug(slug: string, options: { client?: ProductQueryClient } = {}) {
  const products = await listActiveProducts({ client: options.client });
  return products.find((product) => product.slug === slug) ?? null;
}



