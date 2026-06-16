import { expect, test } from "@playwright/test";

test.describe("Contacto page", () => {
  test("page loads with correct heading", async ({ page }) => {
    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { level: 1, name: /canales de contacto/i }),
    ).toBeVisible();
  });

  test("all contact cards are visible", async ({ page }) => {
    await page.goto("/contacto");
    // The contact page has 4 link-based contact cards (WhatsApp, Email, Instagram, Ubicación)
    // plus the brand logo link to home
    const contactLinks = page.getByRole("link").filter({
      hasText: /whatsapp|email|instagram|ubicación/i,
    });
    await expect(contactLinks).toHaveCount(4);
  });

  test("business hours section is visible", async ({ page }) => {
    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { name: /horarios/i }),
    ).toBeVisible();
  });

  test("map iframe shows Ezeiza location", async ({ page }) => {
    await page.goto("/contacto");
    const map = page.locator("iframe[title*='Mapa']");
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute("src", /ezeiza/i);
  });

  test("navigation link to home works", async ({ page }) => {
    await page.goto("/contacto");
    await page.getByRole("link", { name: /ir al inicio/i }).first().click();
    await expect(page).toHaveURL("/");
  });
});
