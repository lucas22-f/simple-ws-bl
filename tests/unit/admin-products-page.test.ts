import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AdminProductsView } from "@/app/admin/products/product-management";

const actions = {
  create: "#create",
  update: "#update",
  archive: "#archive",
};

const products = [
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
    description: "",
    priceCents: 9900,
    currency: "ARS",
    active: false,
    featured: false,
    stockQuantity: null,
  },
];

describe("AdminProductsView", () => {
  it("renders existing products with edit and archive actions", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products, actions }));

    expect(html).toContain("Productos actuales");
    expect(html).toContain("Mate camionero");
    expect(html).toContain("Publicado");
    expect(html).toContain("Producto pausado");
    expect(html).toContain("Pausado");
    expect(html).toContain("Actualizar producto");
    expect(html).toContain("Archivar producto");
  });

  it("renders an empty state when there are no products", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products: [], actions }));

    expect(html).toContain("Todavía no hay productos cargados");
    expect(html).toContain("Creá el primero con el formulario");
  });
});

