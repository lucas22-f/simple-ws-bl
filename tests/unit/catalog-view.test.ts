import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CatalogView } from "@/components/store/catalog-view";
import type { StorefrontProduct } from "@/server/products/queries";

const products: StorefrontProduct[] = [
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
    featured: false,
    stockQuantity: 6,
    category: { name: "Cocina", slug: "cocina" },
    images: [],
  },
];

describe("CatalogView", () => {
  it("renders boutique catalog hierarchy, persisted search and product card anatomy", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogView, {
        catalog: { status: "ready", products },
        searchQuery: "mate",
      }),
    );

    expect(html).toContain("Catálogo artesanal");
    expect(html).toContain("Una selección cálida");
    expect(html).toContain("Buscar productos");
    expect(html).toContain('name="q"');
    expect(html).toContain('value="mate"');
    expect(html).toContain("Mate camionero");
    expect(html).toContain("Mates");
    expect(html).toContain("Mate grande de calabaza");
    expect(html).toContain("$ 125");
    expect(html).toContain("Ver producto");
    expect(html).toContain("Imagen de Mate camionero");
    expect(html).toContain("Resumen del carrito");
  });

  it("renders the first product image when available instead of the placeholder", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogView, {
        catalog: {
          status: "ready",
          products: [
            {
              ...products[0],
              images: [{ storagePath: "https://cdn.example.com/mate-camionero.jpg", altText: "Mate camionero de calabaza curada" }],
            },
          ],
        },
      }),
    );

    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.example.com/mate-camionero.jpg"');
    expect(html).toContain('alt="Mate camionero de calabaza curada"');
    expect(html).toContain("object-cover");
    expect(html).not.toContain("Imagen de Mate camionero");
  });

  it("renders warm empty and error states without hiding catalog recovery or cart context", () => {
    const emptyHtml = renderToStaticMarkup(
      createElement(CatalogView, {
        catalog: { status: "ready", products: [] },
        searchQuery: "vajilla",
      }),
    );
    const errorHtml = renderToStaticMarkup(
      createElement(CatalogView, {
        catalog: { status: "error", products: [], message: "No pudimos cargar el catálogo." },
        searchQuery: "",
      }),
    );

    expect(emptyHtml).toContain("No encontramos productos para tu búsqueda");
    expect(emptyHtml).toContain("Ver todo el catálogo");
    expect(emptyHtml).toContain("Resumen del carrito");
    expect(errorHtml).toContain("No pudimos cargar el catálogo.");
    expect(errorHtml).toContain("Probá de nuevo en unos minutos");
    expect(errorHtml).toContain("Resumen del carrito");
  });

  it("keeps the catalog error recovery copy concise when the backend message matches the title", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogView, {
        catalog: { status: "error", products: [], message: "No pudimos cargar el catálogo." },
        searchQuery: "",
      }),
    );

    expect(html.match(/No pudimos cargar el catálogo\./g)).toHaveLength(1);
    expect(html.match(/Probá de nuevo en unos minutos\./g)).toHaveLength(1);
  });

  it("keeps touched catalog storefront files free of forbidden neutral color families", () => {
    const repoRoot = process.cwd();
    const touchedStorefrontFiles = [
      "src/app/(store)/catalog/page.tsx",
      "src/components/store/catalog-view.tsx",
      "src/components/cart/cart-summary.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/input.tsx",
      "src/components/ui/card.tsx",
    ];

    const forbiddenTokenPattern = /\b(?:bg|text|border|ring|from|to|via|placeholder|decoration|outline|accent)-(?:gray|blue|purple|stone)-\d{1,3}\b/;

    for (const file of touchedStorefrontFiles) {
      const contents = readFileSync(path.join(repoRoot, file), "utf8");
      expect(contents, `${file} should use store design tokens instead of forbidden neutral color families`).not.toMatch(
        forbiddenTokenPattern,
      );
    }
  });
});
