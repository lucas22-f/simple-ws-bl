import { describe, expect, it, vi } from "vitest";
import { mapCategoryRow, isCategoryReadError, CategoryReadError, type CategoryRow } from "@/server/categories/queries";

describe("mapCategoryRow", () => {
  it("maps a CategoryRow to a Category with camelCase fields", () => {
    const row: CategoryRow = {
      id: "cat-1",
      name: "Mates",
      slug: "mates",
      description: "Mates y accesorios",
      active: true,
      sort_order: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    };

    const result = mapCategoryRow(row);

    expect(result).toEqual({
      id: "cat-1",
      name: "Mates",
      slug: "mates",
      description: "Mates y accesorios",
      active: true,
      sortOrder: 1,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    });
  });

  it("preserves null description through mapping", () => {
    const row: CategoryRow = {
      id: "cat-2",
      name: "Sin desc",
      slug: "sin-desc",
      description: null,
      active: true,
      sort_order: 2,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    };

    const result = mapCategoryRow(row);

    expect(result.description).toBeNull();
  });
});

describe("CategoryReadError", () => {
  it("creates an error with the default message", () => {
    const error = new CategoryReadError();

    expect(error.message).toBe("No pudimos cargar las categorías. Probá de nuevo en unos minutos.");
    expect(error.name).toBe("CategoryReadError");
  });

  it("captures the cause when provided", () => {
    const cause = new Error("underlying database error");
    const error = new CategoryReadError(cause);

    expect(error.cause).toBe(cause);
  });

  it("is detected by isCategoryReadError type guard", () => {
    const error = new CategoryReadError();

    expect(isCategoryReadError(error)).toBe(true);
    expect(isCategoryReadError(new Error("other"))).toBe(false);
  });
});
