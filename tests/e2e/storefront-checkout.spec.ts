import { expect, test } from "@playwright/test";

const seededProductName = /Mate cer.mico artesanal/i;
const seededProductSlug = "mate-ceramico-artesanal";

test.describe("storefront checkout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("bazar-online-cart"));
  });

  test("browses seeded products, adds one to cart, and redirects to mocked Mercado Pago checkout", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page.getByRole("heading", { name: /Cat.logo/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: seededProductName })).toBeVisible();
    await page.locator(`a[href="/products/${seededProductSlug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/products/${seededProductSlug}$`));
    await expect(page.getByRole("heading", { name: seededProductName })).toBeVisible();

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByLabel("Resumen del carrito")).toContainText("1 productos");

    await page.getByRole("link", { name: "Finalizar compra" }).click();
    await expect(page.getByRole("heading", { name: "Datos para preparar tu pedido" })).toBeVisible();

    await page.getByLabel("Nombre").fill("Ana Gomez");
    await page.getByLabel("Email").fill("ana@example.com");
    await page.getByLabel(/Tel.fono/).fill("+5491112345678");
    await page.getByLabel(/Direcci.n/).fill("Av. Siempre Viva 742");
    await page.getByLabel("Ciudad").fill("CABA");
    await page.getByLabel(/C.digo postal/).fill("1405");

    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:3100\/__e2e__\/mercado-pago\/checkout\?preference_id=e2e-preference/);
  });
});