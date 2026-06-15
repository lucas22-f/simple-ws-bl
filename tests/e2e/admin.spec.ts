import { expect, test } from "@playwright/test";

const adminEmail = process.env.ADMIN_E2E_EMAIL;
const adminPassword = process.env.ADMIN_E2E_PASSWORD;

test.describe("admin", () => {
  test("redirects protected admin pages to the login screen", async ({ page }) => {
    await page.goto("/admin/products");

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("keeps login available without bypassing the admin middleware", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("keeps registration public while product management stays protected", async ({ page }) => {
    await page.goto("/admin/register?next=%2Fadmin%2Fproducts");

    await expect(page).toHaveURL(/\/admin\/register\?next=%2Fadmin%2Fproducts$/);
    await expect(page.getByRole("heading", { name: "Crear cuenta de administrador" })).toBeVisible();
    await expect(page.getByLabel("Secreto de registro")).toBeVisible();

    await page.goto("/admin/products");

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts$/);
  });

  test("logs out authenticated admins and requires re-authentication for protected pages", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD for authenticated admin logout.");

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Contraseña").fill(adminPassword!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts$/);
  });

  test("admin product CRUD and order fulfillment smoke", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD for authenticated admin CRUD/order smoke.");

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Contraseña").fill(adminPassword!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Agregar producto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar producto" })).toHaveCount(0);

    await page.goto("/admin/products/new");
    await expect(page.getByRole("heading", { name: "Crear producto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar producto" })).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /rdenes/ })).toBeVisible();
    const orderCards = page.locator('article[aria-label^="Orden "]');
    expect(await orderCards.count()).toBeLessThanOrEqual(4);
    const firstOrder = orderCards.first();
    if (await firstOrder.count()) {
      await expect(firstOrder.getByRole("button", { name: "Actualizar" })).toBeVisible();
      await expect(firstOrder.getByRole("button", { name: "Archivar orden" })).toBeVisible();
      await expect(firstOrder.getByRole("checkbox", { name: /Conservar historial/ })).toBeVisible();
    }
  });
});
