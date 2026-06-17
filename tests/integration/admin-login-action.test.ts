import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { executeAdminLogin, loginAction } from "@/server/admin/actions/login";
import { resolveAdminLoginNextPath } from "@/server/admin/actions/login-path";
import type { RateLimiter } from "@/server/security/rate-limit";

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

function createAllowingRateLimiter(): RateLimiter {
  return {
    consume: vi.fn(async () => ({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      resetAt: new Date("2026-06-05T12:00:00.000Z"),
    })),
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.20",
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.20",
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.20",
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.20",
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.20",
    })).rejects.toThrow("redirect:/admin/products");

    expect(clients.signInWithPassword).toHaveBeenCalled();
    expect(clients.from).toHaveBeenCalledWith("profiles");
    expect(clients.maybeSingle).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalledWith("/admin/products");
  });

  it("checks admin login rate limits by IP and email before authenticating", async () => {
    const clients = createLoginClients({ adminStatus: "approved" });
    const rateLimiter = createAllowingRateLimiter();
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogin(buildLoginForm({
      email: " Admin@Example.COM ",
      password: "secret",
      next: "/admin/products",
    }), {
      redirect: redirectTo,
      supabase: clients.supabase,
      rateLimiter,
      clientIp: "203.0.113.20",
    })).rejects.toThrow("redirect:/admin/products");

    expect(rateLimiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "admin-login:ip",
      identity: "203.0.113.20",
    }));
    expect(rateLimiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "admin-login:email",
      identity: "admin@example.com",
    }));
    expect(clients.signInWithPassword).toHaveBeenCalledWith({
      email: "Admin@Example.COM",
      password: "secret",
    });
  });

  it("stops before Supabase auth when the admin login limit is exceeded", async () => {
    const clients = createLoginClients({ adminStatus: "approved" });
    const rateLimiter: RateLimiter = {
      consume: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 120,
        remaining: 0,
        resetAt: new Date("2026-06-05T12:02:00.000Z"),
      })),
    };
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
      rateLimiter,
      clientIp: "203.0.113.20",
    })).rejects.toThrow("Demasiados intentos. Probá de nuevo en unos minutos.");

    expect(clients.signInWithPassword).not.toHaveBeenCalled();
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("maps a rate-limited admin login action to a form error", async () => {
    const rateLimiter: RateLimiter = {
      consume: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 120,
        remaining: 0,
        resetAt: new Date("2026-06-05T12:02:00.000Z"),
      })),
    };

    await expect(loginAction(
      { status: "idle" },
      buildLoginForm({
        email: "admin@example.com",
        password: "secret",
        next: "/admin/products",
      }),
      {
        rateLimiter,
        clientIp: "203.0.113.20",
      },
    )).resolves.toEqual({
      status: "error",
      message: "Demasiados intentos. Probá de nuevo en unos minutos.",
      fieldErrors: {
        email: " ",
        password: " ",
      },
    });
  });
});
