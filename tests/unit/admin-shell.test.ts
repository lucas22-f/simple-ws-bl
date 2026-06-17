import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/products",
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminShell } from "@/components/admin/admin-shell";

describe("AdminShell", () => {
  it("exposes admin logout as a panel action", () => {
    const shellProps = {
      title: "Productos",
      description: "Administrá el catálogo.",
      children: createElement("section", null, "Contenido"),
    };

    const html = renderToStaticMarkup(createElement(AdminShell, shellProps));

    expect(html).toContain("Cerrar sesión");
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-label="Cerrar sesión de administración"');
  });

  it("includes navigation link to approvals", () => {
    const shellProps = {
      title: "Aprobaciones",
      description: "Gestion de nuevos administradores.",
      children: createElement("section", null, "Contenido"),
    };

    const html = renderToStaticMarkup(createElement(AdminShell, shellProps));

    expect(html).toContain("Aprobaciones");
    expect(html).toContain('href="/admin/approvals"');
  });
});
