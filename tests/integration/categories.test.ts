import { describe, expect, it, vi } from "vitest";
import {
  getCategoryBySlug,
  getVariosCategoryId,
  listActiveCategories,
  listAdminCategories,
  CategoryReadError,
  type CategoryQueryClient,
} from "@/server/categories/queries";

const rows = [
  {
    id: "cat-varios",
    name: "Varios",
    slug: "varios",
    description: "Productos sin categoría específica",
    active: true,
    sort_order: 9999,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "cat-mates",
    name: "Mates",
    slug: "mates",
    description: "Mates y accesorios",
    active: true,
    sort_order: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "cat-hidden",
    name: "Categoría oculta",
    slug: "oculta",
    description: null,
    active: false,
    sort_order: 99,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

function createActiveClient(resultRows: typeof rows): CategoryQueryClient {
  return {
    async listActive() {
      return { data: resultRows.filter((r) => r.active), error: null };
    },
    async listAdmin() {
      return { data: resultRows, error: null };
    },
    async getBySlug(slug: string) {
      const row = resultRows.find((r) => r.slug === slug) ?? null;
      return { data: row, error: null };
    },
  };
}

describe("category queries", () => {
  it("returns only active categories with mapped fields", async () => {
    const categories = await listActiveCategories({ client: createActiveClient(rows) });

    expect(categories).toHaveLength(2);
    expect(categories.map((c) => c.name)).toEqual(["Varios", "Mates"]);
    expect(categories[0]).not.toHaveProperty("sort_order");
    expect(categories[0]).toHaveProperty("sortOrder");
    expect(categories[0]).toHaveProperty("createdAt");
    expect(categories[0]).toHaveProperty("updatedAt");
  });

  it("returns all categories when listing as admin", async () => {
    const categories = await listAdminCategories({ client: createActiveClient(rows) });

    expect(categories).toHaveLength(3);
    expect(categories.find((c) => c.slug === "oculta")?.active).toBe(false);
  });

  it("finds category by slug", async () => {
    const category = await getCategoryBySlug("mates", { client: createActiveClient(rows) });

    expect(category).not.toBeNull();
    expect(category?.name).toBe("Mates");
    expect(category?.slug).toBe("mates");
  });

  it("returns null for missing slug", async () => {
    const category = await getCategoryBySlug("no-existe", { client: createActiveClient(rows) });

    expect(category).toBeNull();
  });

  it("returns the Varios category id", async () => {
    const id = await getVariosCategoryId({ client: createActiveClient(rows) });

    expect(id).toBe("cat-varios");
  });

  it("throws when Varios category is not found", async () => {
    const client: CategoryQueryClient = {
      async listActive() {
        return { data: [], error: null };
      },
      async listAdmin() {
        return { data: [], error: null };
      },
      async getBySlug() {
        return { data: null, error: null };
      },
    };

    await expect(getVariosCategoryId({ client })).rejects.toThrow("Categoría 'Varios' no encontrada");
  });

  it("throws a CategoryReadError when the query client errors", async () => {
    const client: CategoryQueryClient = {
      async listActive() {
        return { data: null, error: new Error("database unavailable") };
      },
      async listAdmin() {
        return { data: null, error: new Error("database unavailable") };
      },
      async getBySlug() {
        return { data: null, error: new Error("database unavailable") };
      },
    };

    await expect(listActiveCategories({ client })).rejects.toBeInstanceOf(CategoryReadError);
  });
});
