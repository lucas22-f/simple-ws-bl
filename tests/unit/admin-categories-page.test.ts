import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/categories",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminCategoriesView } from "@/app/admin/categories/category-management";
import type { Category } from "@/server/categories/types";

const actions = {
  create: "#create",
  update: "#update",
  delete: "#delete",
};

const categories: Category[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Varios",
    slug: "varios",
    description: "Categoría por defecto",
    active: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Mates",
    slug: "mates",
    description: "Mates artesanales de alpaca",
    active: true,
    sortOrder: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Accesorios",
    slug: "accesorios",
    description: "",
    active: false,
    sortOrder: 2,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("AdminCategoriesView", () => {
  it("renders the page title 'Categorías'", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Categorías");
    expect(html).toContain("Administrá las categorías de productos");
  });

  it("renders categories list with name and slug", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Varios");
    expect(html).toContain("/varios");
    expect(html).toContain("Mates");
    expect(html).toContain("/mates");
    expect(html).toContain("Accesorios");
    expect(html).toContain("/accesorios");
    expect(html).toContain("Mates artesanales de alpaca");
  });

  it("renders create form with required fields", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain('name="name"');
    expect(html).toContain('name="slug"');
    expect(html).toContain("required");
    expect(html).toContain('name="active"');
    expect(html).toContain("type=\"checkbox\"");
    expect(html).toContain("Nueva categoría");
  });

  it("'Varios' does NOT show delete button", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Varios");
    expect(html).not.toContain('aria-label="Eliminar Varios"');
    expect(html).toContain("Categoría por defecto");
  });

  it("non-Varios category shows delete button", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain('aria-label="Eliminar Mates"');
    expect(html).toContain('aria-label="Eliminar Accesorios"');
  });

  it("active badge shows for active categories", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Activa");
    expect(html).toContain("Inactiva");
  });

  it("renders empty state when no categories", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories: [], actions }),
    );

    expect(html).toContain("Todavía no hay categorías");
    expect(html).toContain("Creá la primera usando el formulario de arriba");
    expect(html).not.toContain("Mates artesanales de alpaca");
    expect(html).not.toContain("Categoría por defecto");
  });

  it("renders edit button for each category", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain('aria-label="Editar Mates"');
    expect(html).toContain('aria-label="Editar Accesorios"');
    expect(html).toContain('aria-label="Editar Varios"');
  });

  it("renders category description when present and omits it when empty", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Mates artesanales de alpaca");
    expect(html).toContain("Categoría por defecto");
  });

  it("edit dialog contains hidden categoryId input for update form", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain('name="categoryId"');
    expect(html).toContain('value="550e8400-e29b-41d4-a716-446655440001"');
    expect(html).toContain('value="550e8400-e29b-41d4-a716-446655440002"');
  });

  it("delete form shows confirmation checkbox for non-Varios categories", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain('name="confirmDelete"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('Confirmo que quiero eliminar');
  });

  it("Varios category shows protected notice instead of delete form", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCategoriesView, { categories, actions }),
    );

    expect(html).toContain("Categoría por defecto — no se puede eliminar");
  });
});
