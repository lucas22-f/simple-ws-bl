import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProductDetailView } from "@/components/store/product-detail-view";
import type { StorefrontProduct } from "@/server/products/queries";

const product: StorefrontProduct = {
  id: "prod-mate",
  name: "Mate camionero premium",
  slug: "mate-camionero-premium",
  description: "Mate grande de calabaza curada con virola de alpaca para todos los días.",
  priceCents: 12500,
  currency: "ARS",
  featured: true,
  stockQuantity: 4,
  category: { name: "Mates", slug: "mates" },
  images: [{ storagePath: "https://cdn.example.com/mate-camionero.jpg", altText: "Mate camionero de calabaza curada" }],
};

describe("ProductDetailView", () => {
  it("renders editorial product hierarchy, image gallery, stock copy, cart CTA and catalog breadcrumb", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailView, { state: { status: "ready", product } }));

    expect(html).toContain("Volver al catálogo");
    expect(html).toContain("Mates");
    expect(html).toContain("Mate camionero premium");
    expect(html).toContain("font-heading");
    expect(html).toContain("text-primary");
    expect(html).toMatch(/\$\s*125/);
    expect(html).toContain("4 unidades disponibles");
    expect(html).toContain("Agregar al carrito");
    expect(html).toContain("Resumen del carrito");
    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.example.com/mate-camionero.jpg"');
    expect(html).toContain('alt="Mate camionero de calabaza curada"');
    expect(html).toContain("object-cover");
    expect(html).toContain("focus-visible:ring-ring");
  });

  it("renders a warm accessible no-image placeholder without hiding product details", () => {
    const html = renderToStaticMarkup(
      createElement(ProductDetailView, {
        state: { status: "ready", product: { ...product, images: [], stockQuantity: null, category: null } },
      }),
    );

    expect(html).toContain("Bazar");
    expect(html).toContain("Sin imagen disponible para Mate camionero premium");
    expect(html).toContain("bg-muted");
    expect(html).toContain("Disponible");
    expect(html).toContain("Mate grande de calabaza curada");
    expect(html).toContain("Agregar al carrito");
  });

  it("renders a warm catalog-read error state with recovery and cart context", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailView, { state: { status: "error" } }));

    expect(html).toContain("No pudimos cargar el producto.");
    expect(html).toContain("Probá de nuevo en unos minutos");
    expect(html).toContain("Volver al catálogo");
    expect(html).toContain("Resumen del carrito");
  });

  it("keeps touched product storefront files free of forbidden neutral color families", () => {
    const repoRoot = process.cwd();
    const touchedStorefrontFiles = [
      "src/app/(store)/products/[slug]/page.tsx",
      "src/components/store/product-detail-view.tsx",
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
