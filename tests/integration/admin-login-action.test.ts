import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { executeAdminLogin } from "@/server/admin/actions/login";
import { resolveAdminLoginNextPath } from "@/server/admin/actions/login-path";

function buildLoginForm(input: { email?: string; password?: string; next?: string }) {
  const formData = new FormData();
  if (input.email !== undefined) formData.set("email", input.email);
  if (input.password !== undefined) formData.set("password", input.password);
  if (input.next !== undefined) formData.set("next", input.next);
  return formData;
}

describe("admin login next path resolution", () => {
  it("keeps same-site admin destinations", () => {
    expect(resolveAdminLoginNextPath("/admin/products?tab=active")).toBe("/admin/products?tab=active");
    expect(resolveAdminLoginNextPath("/admin")).toBe("/admin");
  });

  it("falls back to /admin for missing, non-string, or external destinations", () => {
    expect(resolveAdminLoginNextPath(undefined)).toBe("/admin");
    expect(resolveAdminLoginNextPath(["/admin/orders"])).toBe("/admin");
    expect(resolveAdminLoginNextPath("https://evil.test/admin")).toBe("/admin");
    expect(resolveAdminLoginNextPath("//evil.test/admin")).toBe("/admin");
  });
});

describe("admin login action", () => {
  it("signs in with Supabase credentials and redirects to the safe next path", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: null }));
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "/admin/orders",
    }), {
      redirect: redirectTo,
      supabase: { auth: { signInWithPassword } },
    })).rejects.toThrow("redirect:/admin/orders");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
    expect(redirectTo).toHaveBeenCalledWith("/admin/orders");
  });

  it("does not redirect to external next destinations after successful sign in", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: null }));
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "https://evil.test/admin",
    }), {
      redirect: redirectTo,
      supabase: { auth: { signInWithPassword } },
    })).rejects.toThrow("redirect:/admin");

    expect(redirectTo).toHaveBeenCalledWith("/admin");
  });

  it("surfaces a clean auth failure and does not redirect when Supabase rejects credentials", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: new Error("Invalid login credentials") }));
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "wrong",
      next: "/admin",
    }), {
      redirect: redirectTo,
      supabase: { auth: { signInWithPassword } },
    })).rejects.toThrow("Credenciales inválidas");

    expect(redirectTo).not.toHaveBeenCalled();
  });
});
