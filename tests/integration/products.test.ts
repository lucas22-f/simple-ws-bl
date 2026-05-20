import { describe, expect, it } from "vitest";
import {
  listAdminProducts,
  getActiveProductBySlug,
  getProductListState,
  listActiveProducts,
  type AdminProductQueryClient,
  ProductCatalogReadError,
  type ProductQueryClient,
} from "@/server/products/queries";

const rows = [
  {
    id: "prod-active",
    name: "Mate camionero",
    slug: "mate-camionero",
    description: "Mate grande de calabaza",
    price_cents: 12500,
    currency: "ARS",
    active: true,
    featured: true,
    stock_quantity: 4,
    categories: { name: "Mates", slug: "mates" },
    product_images: [{ storage_path: "products/prod-active/mate.webp", alt_text: "Mate camionero", sort_order: 0 }],
  },
  {
    id: "prod-inactive",
    name: "Producto oculto",
    slug: "producto-oculto",
    description: "No debe aparecer",
    price_cents: 999,
    currency: "ARS",
    active: false,
    featured: false,
    stock_quantity: 1,
    categories: { name: "Ocultos", slug: "ocultos" },
    product_images: [],
  },
];

function createProductsClient(resultRows: typeof rows): ProductQueryClient {
  return {
    async listProducts() {
      return { data: resultRows, error: null };
    },
  };
}

describe("product storefront queries", () => {
  it("returns a controlled catalog error state when product listing fails", async () => {
    const client: ProductQueryClient = {
      async listProducts() {
        return { data: null, error: new Error("remote schema missing") };
      },
    };

    await expect(listActiveProducts({ client })).rejects.toBeInstanceOf(ProductCatalogReadError);
    await expect(getProductListState({ client })).resolves.toEqual({
      status: "error",
      products: [],
      message: "No pudimos cargar el catálogo. Probá de nuevo en unos minutos.",
    });
  });

  it("returns only active products with public catalog fields", async () => {
    const products = await listActiveProducts({ client: createProductsClient(rows) });

    expect(products).toEqual([
      {
        id: "prod-active",
        name: "Mate camionero",
        slug: "mate-camionero",
        description: "Mate grande de calabaza",
        priceCents: 12500,
        currency: "ARS",
        featured: true,
        stockQuantity: 4,
        category: { name: "Mates", slug: "mates" },
        images: [{ storagePath: "products/prod-active/mate.webp", altText: "Mate camionero" }],
      },
    ]);
  });

  it("finds active slugs and returns null for missing or inactive slugs", async () => {
    const client = createProductsClient(rows);

    await expect(getActiveProductBySlug("mate-camionero", { client })).resolves.toMatchObject({
      id: "prod-active",
      slug: "mate-camionero",
    });
    await expect(getActiveProductBySlug("producto-oculto", { client })).resolves.toBeNull();
    await expect(getActiveProductBySlug("no-existe", { client })).resolves.toBeNull();
  });

  it("does not treat catalog read failures as missing product slugs", async () => {
    const client: ProductQueryClient = {
      async listProducts() {
        return { data: null, error: new Error("database unavailable") };
      },
    };

    await expect(getActiveProductBySlug("mate-camionero", { client })).rejects.toBeInstanceOf(ProductCatalogReadError);
  });
});

describe("admin product queries", () => {
  it("returns active and inactive products with admin management fields", async () => {
    const client: AdminProductQueryClient = {
      async listAdminProducts() {
        return {
          data: [
            {
              id: "550e8400-e29b-41d4-a716-446655440010",
              name: "Mate camionero",
              slug: "mate-camionero",
              description: "Mate grande",
              price_cents: 12500,
              currency: "ARS",
              active: true,
              featured: true,
              stock_quantity: 4,
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440011",
              name: "Producto pausado",
              slug: "producto-pausado",
              description: "No publicado",
              price_cents: 9900,
              currency: "ARS",
              active: false,
              featured: false,
              stock_quantity: null,
            },
          ],
          error: null,
        };
      },
    };

    await expect(listAdminProducts({ client })).resolves.toEqual([
      {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "Mate camionero",
        slug: "mate-camionero",
        description: "Mate grande",
        priceCents: 12500,
        currency: "ARS",
        active: true,
        featured: true,
        stockQuantity: 4,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440011",
        name: "Producto pausado",
        slug: "producto-pausado",
        description: "No publicado",
        priceCents: 9900,
        currency: "ARS",
        active: false,
        featured: false,
        stockQuantity: null,
      },
    ]);
  });
});

