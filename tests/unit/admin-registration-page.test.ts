import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AdminLoginForm } from "@/app/admin/login/admin-login-form";
import { AdminRegisterForm } from "@/app/admin/register/admin-register-form";
import { actionError } from "@/lib/form-state";

describe("AdminRegisterForm", () => {
  it("renders accessible field feedback for registration errors", () => {
    const html = renderToStaticMarkup(
      createElement(AdminRegisterForm, {
        nextPath: "/admin/products",
        initialState: actionError("Review the form details.", {
          email: "Use a valid email, for example admin@store.com.",
          password: "Enter your password.",
          secret: "Enter the registration secret.",
        }),
      }),
    );

    expect(html).toContain('name="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="admin-register-email-help"');
    expect(html).toContain('id="admin-register-email-help"');
    expect(html).toContain("Use a valid email, for example admin@store.com.");
    expect(html).toContain('aria-describedby="admin-register-password-help"');
    expect(html).toContain('id="admin-register-password-help"');
    expect(html).toContain("Enter your password.");
    expect(html).toContain('aria-describedby="admin-register-secret-help"');
    expect(html).toContain('id="admin-register-secret-help"');
    expect(html).toContain("Enter the registration secret.");
  });

  it("links back to admin login with the current safe next path", () => {
    const html = renderToStaticMarkup(createElement(AdminRegisterForm, { nextPath: "/admin/products" }));

    expect(html).toContain('href="/admin/login?next=%2Fadmin%2Fproducts"');
    expect(html).toContain("I already have an admin account");
  });
});

describe("AdminLoginForm", () => {
  it("links owners to registration with the current safe next path", () => {
    const html = renderToStaticMarkup(createElement(AdminLoginForm, { nextPath: "/admin/products" }));

    expect(html).toContain('href="/admin/register?next=%2Fadmin%2Fproducts"');
    expect(html).toContain("Create admin account");
  });
});
