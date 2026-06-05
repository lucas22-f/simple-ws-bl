import { expect, test } from "@playwright/test";

const seededProductName = /Mate cer.mico artesanal/i;
const seededProductSlug = "mate-ceramico-artesanal";

test.describe("storefront checkout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("e2e-cart-cleared") !== "1") {
        localStorage.removeItem("bazar-online-cart");
        sessionStorage.setItem("e2e-cart-cleared", "1");
      }
    });
  });

  test("browses seeded products, adds one to cart, and redirects to mocked Mercado Pago checkout", async ({ page }) => {
    await page.route("**/api/checkout/preferences", async (route) => {
      const payload = route.request().postDataJSON() as {
        items?: Array<{ productId?: string; quantity?: number }>;
      };

      expect(payload.items).toEqual([
        expect.objectContaining({
          productId: "550e8400-e29b-41d4-a716-446655440001",
          quantity: 1,
        }),
      ]);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orderId: "e2e-order",
          preferenceId: "e2e-preference",
          checkoutUrl: new URL(
            "/__e2e__/mercado-pago/checkout?preference_id=e2e-preference",
            route.request().url(),
          ).toString(),
        }),
      });
    });

    await page.goto("/catalog");

    await expect(page.getByRole("heading", { name: /Cat.logo/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: seededProductName })).toBeVisible();
    await page.locator(`a[href="/products/${seededProductSlug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/products/${seededProductSlug}$`));
    await expect(page.getByRole("heading", { name: seededProductName })).toBeVisible();

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByLabel("Resumen del carrito")).toContainText("1 producto");
    await page.waitForFunction(() => localStorage.getItem("bazar-online-cart")?.includes("550e8400-e29b-41d4-a716-446655440001"));

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /Prepar. tu pedido con confianza/ })).toBeVisible();

    await page.getByLabel("Nombre").fill("Ana Gomez");
    await page.getByLabel("Email").fill("ana@example.com");
    await page.getByLabel(/Tel.fono/).fill("+5491112345678");
    await page.getByLabel(/Direcci.n/).fill("Av. Siempre Viva 742");
    await page.getByLabel("Ciudad").fill("CABA");
    await page.getByLabel(/C.digo postal/).fill("1405");

    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
    await expect(page).toHaveURL(/\/__e2e__\/mercado-pago\/checkout\?preference_id=e2e-preference$/);
  });

  test("keeps keyboard focus inside the cart dialog and restores it to the opener", async ({ page }) => {
    await page.goto("/catalog");

    await page.locator(`a[href="/products/${seededProductSlug}"]`).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.waitForFunction(() => localStorage.getItem("bazar-online-cart")?.includes("550e8400-e29b-41d4-a716-446655440001"));

    const cartOpener = page.getByRole("button", { name: /Abrir carrito, 1 productos/ });
    await cartOpener.focus();
    await expect(cartOpener).toBeFocused();

    await cartOpener.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Resumen del carrito" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.body.children)
            .filter((element) => !element.hasAttribute("data-cart-portal-root") && element.tagName !== "SCRIPT")
            .every((element) => element.hasAttribute("inert") && element.getAttribute("aria-hidden") === "true"),
        ),
      )
      .toBe(true);

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("link", { name: "Finalizar compra" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Cerrar carrito" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(cartOpener).toBeFocused();

    await cartOpener.press("Enter");
    await expect(dialog).toBeFocused();
    await page.getByRole("button", { name: "Cerrar carrito" }).click();
    await expect(dialog).toBeHidden();
    await expect(cartOpener).toBeFocused();
  });
});
