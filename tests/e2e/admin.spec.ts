import { expect, test } from "@playwright/test";

const adminEmail = process.env.ADMIN_E2E_EMAIL;
const adminPassword = process.env.ADMIN_E2E_PASSWORD;

test.describe("admin", () => {
  test("redirects protected admin pages to the login screen", async ({ page }) => {
    await page.goto("/admin/products");

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("keeps login available without bypassing the admin middleware", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("keeps registration public while product management stays protected", async ({ page }) => {
    await page.goto("/admin/register?next=%2Fadmin%2Fproducts");

    await expect(page).toHaveURL(/\/admin\/register\?next=%2Fadmin%2Fproducts$/);
    await expect(page.getByRole("heading", { name: "Create admin account" })).toBeVisible();
    await expect(page.getByLabel("Registration secret")).toBeVisible();

    await page.goto("/admin/products");

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts$/);
  });

  test("admin product CRUD and order fulfillment smoke", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD for authenticated admin CRUD/order smoke.");

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Password").fill(adminPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
    await expect(page.getByPlaceholder("Nombre")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar producto" })).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /rdenes/ })).toBeVisible();
    await expect(page.getByPlaceholder("ID de orden")).toBeVisible();
    await expect(page.getByRole("button", { name: "Actualizar" })).toBeVisible();
  });
});
