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
        initialState: actionError("Revisá los datos del formulario.", {
          email: "Usá un email válido, por ejemplo admin@tienda.com.",
          password: "Ingresá tu contraseña.",
          secret: "Ingresá el secreto de registro.",
        }),
      }),
    );

    expect(html).toContain('name="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="admin-register-email-help"');
    expect(html).toContain('id="admin-register-email-help"');
    expect(html).toContain("Usá un email válido, por ejemplo admin@tienda.com.");
    expect(html).toContain('aria-describedby="admin-register-password-help"');
    expect(html).toContain('id="admin-register-password-help"');
    expect(html).toContain("Ingresá tu contraseña.");
    expect(html).toContain('aria-describedby="admin-register-secret-help"');
    expect(html).toContain('id="admin-register-secret-help"');
    expect(html).toContain("Ingresá el secreto de registro.");
  });

  it("links back to admin login with the current safe next path", () => {
    const html = renderToStaticMarkup(createElement(AdminRegisterForm, { nextPath: "/admin/products" }));

    expect(html).toContain('href="/admin/login?next=%2Fadmin%2Fproducts"');
    expect(html).toContain("Ya tengo una cuenta de administrador");
  });
});

describe("AdminLoginForm", () => {
  it("links owners to registration with the current safe next path", () => {
    const html = renderToStaticMarkup(createElement(AdminLoginForm, { nextPath: "/admin/products" }));

    expect(html).toContain('href="/admin/register?next=%2Fadmin%2Fproducts"');
    expect(html).toContain("Crear cuenta de administrador");
  });
});
