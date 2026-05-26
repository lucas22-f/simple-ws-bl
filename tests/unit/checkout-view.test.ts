import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const cartMock = vi.hoisted(() => ({
  items: [] as Array<{
    productId: string;
    slug: string;
    name: string;
    unitPriceCents: number;
    currency: string;
    quantity: number;
    imageUrl?: string;
  }>,
}));

vi.mock("@/stores/cart-store", () => ({
  useCartStore: <T,>(selector: (state: { items: typeof cartMock.items; getSubtotalCents: () => number }) => T) =>
    selector({
      items: cartMock.items,
      getSubtotalCents: () => cartMock.items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0),
    }),
}));

import CheckoutPage from "@/app/(store)/checkout/page";
import { CheckoutForm, getCheckoutEmailMessage } from "@/components/cart/checkout-form";

describe("Checkout visual slice", () => {
  it("renders a single warm checkout page with sectioned form, trust copy and sticky order summary", () => {
    cartMock.items = [
      {
        productId: "prod-mate",
        slug: "mate-camionero",
        name: "Mate camionero",
        unitPriceCents: 12500,
        currency: "ARS",
        quantity: 2,
        imageUrl: "https://cdn.example.com/mate.jpg",
      },
    ];

    const html = renderToStaticMarkup(createElement(CheckoutPage));

    expect(html).toContain("Checkout seguro");
    expect(html).toContain("Prepará tu pedido con confianza");
    expect(html).toContain("Datos de contacto");
    expect(html).toContain("Datos de entrega");
    expect(html).toContain("1");
    expect(html).toContain("2");
    expect(html).toContain("Tu pedido");
    expect(html).toContain("Mate camionero");
    expect(html).toContain("x2");
    expect(html).toMatch(/\$\s*250/);
    expect(html).toContain("sticky");
    expect(html).toContain("Pago seguro con Mercado Pago");
  });

  it("keeps the order summary sticky only on desktop layouts", () => {
    const source = readFileSync(path.join(process.cwd(), "src/components/cart/checkout-order-summary.tsx"), "utf8");

    expect(source).toContain("lg:sticky");
    expect(source).toContain("lg:top-8");
    expect(source).not.toContain('className="sticky top-8');
  });

  it("keeps empty-cart payment disabled while preserving clear guidance", () => {
    cartMock.items = [];

    const html = renderToStaticMarkup(createElement(CheckoutForm));

    expect(html).toContain("Agregá productos al carrito antes de pagar.");
    expect(html).toContain("disabled");
    expect(html).toContain("Pagar con Mercado Pago");
  });

  it("keeps email validation accessible and checkout process copy truthful", () => {
    cartMock.items = [];

    const html = renderToStaticMarkup(createElement(CheckoutPage));
    const invalidEmail = getCheckoutEmailMessage("sin-arroba");

    expect(invalidEmail).toEqual({ text: "Ese email todavía no tiene formato válido.", tone: "error" });
    expect(getCheckoutEmailMessage("")).toEqual({
      text: "Usamos este email para identificar el pedido en el checkout.",
      tone: "neutral",
    });
    expect(html).toContain('aria-describedby="checkout-email-help"');
    expect(html).toContain("Usamos estos datos para identificar el pedido antes de pagar.");
    expect(html).toContain("La vuelta de Mercado Pago es solo informativa");
    expect(html).toContain("webhook firmado confirma el pago");
    expect(html).not.toContain("Te mandamos la confirmación");
    expect(html).not.toContain("enviarte novedades");
    const source = readFileSync(path.join(process.cwd(), "src/components/cart/checkout-form.tsx"), "utf8");
    expect(source).toContain("Preparando tu pago");
    expect(source).toContain("Preparando pago...");
  });

  it("keeps touched checkout storefront files free of forbidden neutral color families", () => {
    const repoRoot = process.cwd();
    const touchedStorefrontFiles = [
      "src/app/(store)/checkout/page.tsx",
      "src/components/cart/checkout-form.tsx",
      "src/components/cart/checkout-order-summary.tsx",
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







