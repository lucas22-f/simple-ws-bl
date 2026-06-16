import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => navigationMocks.searchParams,
}));

import { AdminSearchInput } from "@/components/admin/admin-search-input";

describe("AdminSearchInput", () => {
  it("renders the search icon, placeholder, label and initial value", () => {
    navigationMocks.searchParams = new URLSearchParams();
    const html = renderToStaticMarkup(
      createElement(AdminSearchInput, {
        basePath: "/admin/products",
        initialQuery: "mate",
        id: "admin-product-search",
        label: "Search products",
        placeholder: "Search products by name",
      }),
    );

    expect(html).toContain("Search products");
    expect(html).toContain('placeholder="Search products by name"');
    expect(html).toContain('value="mate"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("uses the current q search parameter when no initial query is provided", () => {
    navigationMocks.searchParams = new URLSearchParams("q=orders");

    const html = renderToStaticMarkup(
      createElement(AdminSearchInput, {
        basePath: "/admin/orders",
        id: "admin-order-search",
        label: "Search orders",
        placeholder: "Search by order or buyer",
      }),
    );

    expect(html).toContain('placeholder="Search by order or buyer"');
    expect(html).toContain('value="orders"');
  });
});
