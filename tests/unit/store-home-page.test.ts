import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoreHomeView } from "@/components/store/store-home-view";
import type { StorefrontProduct } from "@/server/products/queries";

const featuredProducts: StorefrontProduct[] = [
  {
    id: "prod-mate",
    name: "Mate camionero",
    slug: "mate-camionero",
    description: "Mate grande de calabaza curada para todos los días.",
    priceCents: 12500,
    currency: "ARS",
    featured: true,
    stockQuantity: 4,
    category: { name: "Mates", slug: "mates" },
    images: [],
  },
  {
    id: "prod-cucharas",
    name: "Set cucharas madera",
    slug: "set-cucharas-madera",
    description: "Utensilios simples para una cocina cálida.",
    priceCents: 8900,
    currency: "ARS",
    featured: true,
    stockQuantity: 6,
    category: { name: "Cocina", slug: "cocina" },
    images: [],
  },
];

describe("StoreHomeView", () => {
  it("renders a crafted storefront landing hierarchy with featured products and editorial stories", () => {
    const html = renderToStaticMarkup(
      createElement(StoreHomeView, {
        catalog: { status: "ready", products: featuredProducts },
      }),
    );

    expect(html).toContain("Pequeños detalles.");
    expect(html).toContain("Explorar catálogo");
    expect(html).toContain("Productos destacados");
    expect(html).toContain("Mate camionero");
    expect(html).toContain("Mates");
    expect(html).toContain("/products/mate-camionero");
    expect(html).toContain("Compra segura");
    expect(html).toContain("Ideas para habitar con intención");
    expect(html).toContain("Rituales de cocina");
    expect(html).not.toContain("Ir al catálogo");
    expect(html).toContain("Carrito");
  });

  it("renders explicit empty and error states without hiding the cart summary", () => {
    const emptyHtml = renderToStaticMarkup(
      createElement(StoreHomeView, {
        catalog: { status: "ready", products: [] },
      }),
    );
    const errorHtml = renderToStaticMarkup(
      createElement(StoreHomeView, {
        catalog: { status: "error", products: [], message: "No pudimos cargar el catálogo." },
      }),
    );

    expect(emptyHtml).toContain("La colección está en preparación");
    expect(emptyHtml).toContain("Carrito");
    expect(errorHtml).toContain("No pudimos cargar el catálogo.");
    expect(errorHtml).toContain("Carrito");
  });
});

