import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartDrawer } from "@/components/cart/cart-drawer";

describe("CartDrawer", () => {
  it("renders a persistent navbar trigger before the client-side drawer portal mounts", () => {
    const html = renderToStaticMarkup(createElement(CartDrawer));

    expect(html).toContain("Abrir carrito, 0 productos");
    expect(html).not.toContain('aria-label="Resumen del carrito"');
  });
});
