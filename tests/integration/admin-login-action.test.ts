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

function createLoginClients(options: {
  signInError?: Error | null;
  adminStatus?: "pending" | "approved" | null;
} = {}) {
  const { signInError = null, adminStatus = null } = options;

  const signInWithPassword = vi.fn(async () => ({
    data: signInError ? undefined : { user: { id: "user-123" } },
    error: signInError ?? null,
  }));

  const maybeSingle = vi.fn(async () => ({
    data: { admin_status: adminStatus },
    error: null,
  }));

  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    supabase: { auth: { signInWithPassword }, from },
    signInWithPassword,
    from,
    select,
    eq,
    maybeSingle,
  };
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
    const clients = createLoginClients({ adminStatus: null });
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "/admin/orders",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
    })).rejects.toThrow("redirect:/admin/orders");

    expect(clients.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
    expect(clients.from).toHaveBeenCalledWith("profiles");
    expect(clients.maybeSingle).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalledWith("/admin/orders");
  });

  it("does not redirect to external next destinations after successful sign in", async () => {
    const clients = createLoginClients({ adminStatus: null });
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "https://evil.test/admin",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
    })).rejects.toThrow("redirect:/admin");

    expect(redirectTo).toHaveBeenCalledWith("/admin");
  });

  it("surfaces a clean auth failure and does not redirect when Supabase rejects credentials", async () => {
    const clients = createLoginClients({ signInError: new Error("Invalid login credentials") });
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "wrong",
      next: "/admin",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
    })).rejects.toThrow("Credenciales inválidas");

    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("denies login for pending admin and shows pending approval error", async () => {
    const clients = createLoginClients({ adminStatus: "pending" });
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "/admin",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
    })).rejects.toThrow("Tu cuenta está pendiente de aprobación. Contactá al administrador que te dio las credenciales.");

    expect(clients.signInWithPassword).toHaveBeenCalled();
    expect(clients.from).toHaveBeenCalledWith("profiles");
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("allows approved admin login and redirects normally", async () => {
    const clients = createLoginClients({ adminStatus: "approved" });
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: "admin@example.com",
      password: "secret",
      next: "/admin/products",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
    })).rejects.toThrow("redirect:/admin/products");

    expect(clients.signInWithPassword).toHaveBeenCalled();
    expect(clients.from).toHaveBeenCalledWith("profiles");
    expect(clients.maybeSingle).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalledWith("/admin/products");
  });
});
