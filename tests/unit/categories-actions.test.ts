import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  type CategoryRepository,
} from "@/server/categories/actions";

const VARIOS_ID = "550e8400-e29b-41d4-a716-446655440099";

function createMockRepository(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    create: vi.fn(async (input) => ({
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    getBySlug: vi.fn(async (slug) => {
      if (slug === "varios") {
        return {
          data: {
            id: VARIOS_ID,
            name: "Varios",
            slug: "varios",
            description: "Default",
            active: true,
            sort_order: 9999,
            created_at: "2026-06-01T00:00:00Z",
            updated_at: "2026-06-01T00:00:00Z",
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
    ...overrides,
  };
}

const allowAdmin = vi.fn(async () => {});
const authOptions = { assertAdmin: allowAdmin };

describe("createCategoryAction", () => {
  it("creates a category with valid input", async () => {
    const repository = createMockRepository();
    const result = await createCategoryAction(
      { name: "Nueva Cat", slug: "nueva-cat", description: "Descripción" },
      { ...authOptions, repository },
    );

    expect(result).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Nueva Cat",
      slug: "nueva-cat",
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nueva Cat", slug: "nueva-cat" }),
    );
  });

  it("rejects input with a too-short name", async () => {
    const repository = createMockRepository();

    await expect(
      createCategoryAction({ name: "X", slug: "x" }, { ...authOptions, repository }),
    ).rejects.toThrow("Categoría inválida");
  });

  it("rejects input with an invalid slug format", async () => {
    const repository = createMockRepository();

    await expect(
      createCategoryAction({ name: "Bad Slug", slug: "BAD SLUG!" }, { ...authOptions, repository }),
    ).rejects.toThrow("Categoría inválida");
  });
});

describe("updateCategoryAction", () => {
  it("updates a category with valid input", async () => {
    const repository = createMockRepository();
    const result = await updateCategoryAction(
      "550e8400-e29b-41d4-a716-446655440001",
      { name: "Updated Name" },
      { ...authOptions, repository },
    );

    expect(result).toBeDefined();
    expect(repository.update).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440001",
      expect.objectContaining({ name: "Updated Name" }),
    );
  });

  it("rejects update with invalid slug", async () => {
    const repository = createMockRepository();

    await expect(
      updateCategoryAction("550e8400-e29b-41d4-a716-446655440001", { name: "Name", slug: "bad slug!" }, { ...authOptions, repository }),
    ).rejects.toThrow("Categoría inválida");
  });
});

describe("deleteCategoryAction", () => {
  it("throws when trying to delete the Varios category", async () => {
    const repository = createMockRepository();

    await expect(
      deleteCategoryAction(VARIOS_ID, { ...authOptions, repository }),
    ).rejects.toThrow("No se puede eliminar la categoría por defecto");
  });

  it("succeeds when deleting a non-varios category", async () => {
    const repository = createMockRepository({
      getBySlug: vi.fn(async () => ({ data: null, error: null })),
    });

    const OTHER_ID = "550e8400-e29b-41d4-a716-446655440002";
    await deleteCategoryAction(OTHER_ID, { ...authOptions, repository });

    expect(repository.delete).toHaveBeenCalledWith(OTHER_ID);
  });

  it("rejects delete with invalid category id", async () => {
    const repository = createMockRepository({
      getBySlug: vi.fn(async () => ({ data: null, error: null })),
    });

    await expect(
      deleteCategoryAction("", { ...authOptions, repository }),
    ).rejects.toThrow("ID de categoría inválido");
  });
});
