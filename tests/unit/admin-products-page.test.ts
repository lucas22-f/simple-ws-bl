import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AdminProductsView } from "@/app/admin/products/product-management";

const actions = {
  create: "#create",
  update: "#update",
  archive: "#archive",
  delete: "#delete",
};

const products = [
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    name: "Mate camionero",
    slug: "mate-camionero",
    description: "Mate grande",
    priceCents: 13750,
    basePriceCents: 12500,
    applyMercadoPagoSurcharge: true,
    currency: "ARS",
    active: true,
    featured: true,
    stockQuantity: 4,
    images: [{ storagePath: "/images/mate.webp", altText: "Mate camionero artesanal" }],
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440011",
    name: "Producto pausado",
    slug: "producto-pausado",
    description: "",
    priceCents: 9900,
    basePriceCents: 9900,
    applyMercadoPagoSurcharge: false,
    currency: "ARS",
    active: false,
    featured: false,
    stockQuantity: null,
    images: [],
  },
];

describe("AdminProductsView", () => {
  it("renders existing products with edit and archive actions", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products, actions }));

    expect(html).toContain("Inventario actual");
    expect(html).toContain("Mate camionero");
    expect(html).toContain("Publicado");
    expect(html).toContain("Producto pausado");
    expect(html).toContain("Pausado");
    expect(html).toContain("Actualizar producto");
    expect(html).toContain("Archivar producto");
    expect(html).toContain("Precio base");
    expect(html).toContain("Aplicar recargo de Mercado Pago");
    expect(html).toContain("Vista previa del precio");
    expect(html).toContain("Publicado");
    expect(html).toContain("137,50");
    expect(html).toContain("Ver imagen");
    expect(html).toContain("/images/mate.webp");
    expect(html).toContain("Sin imagen disponible");
  });



  it("renders compact product cards with accessible management controls", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products, actions }));

    expect(html).toContain('aria-label="Producto Mate camionero"');
    expect(html).toContain('aria-label="Editar Mate camionero"');
    expect(html).toContain('aria-label="Archivar Mate camionero"');
    expect(html).toContain('aria-label="Eliminar Mate camionero"');
    expect(html).toContain('Confirmo que quiero eliminar');
  });

  it("uses a two-column product grid from the mobile layout", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products, actions }));

    expect(html).toContain("grid grid-cols-2 gap-3");
    expect(html).toContain("aspect-square");
  });

  it("keeps the products overview focused on management without the create form", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products, actions }));

    expect(html).toContain("/admin/products/new");
    expect(html).toContain("Agregar producto");
    expect(html).not.toContain("Crear producto");
    expect(html).not.toContain("Guardar producto");
    expect(html).not.toContain("Imagen del producto");
  });

  it("renders the product creation form on the dedicated new product route", async () => {
    const { default: AdminProductNewPage } = await import("@/app/admin/products/new/page");
    const html = renderToStaticMarkup(await AdminProductNewPage());

    expect(html).toContain("Crear producto");
    expect(html).toContain("Guardar producto");
    expect(html).toContain("Imagen del producto");
  });

  it("renders pagination controls for large product inventories", () => {
    const html = renderToStaticMarkup(
      createElement(AdminProductsView, {
        products,
        pagination: { page: 1, pageSize: 2, totalItems: 15, totalPages: 8 },
        actions,
      }),
    );

    expect(html).toContain("Paginación de productos");
    expect(html).toContain("1-2");
    expect(html).toContain("15");
    expect(html).toContain("/admin/products?page=2");
  });

  it("renders an empty state when there are no products", () => {
    const html = renderToStaticMarkup(createElement(AdminProductsView, { products: [], actions }));

    expect(html).toContain("Todavía no hay productos cargados");
    expect(html).toContain("/admin/products/new");
  });
});

