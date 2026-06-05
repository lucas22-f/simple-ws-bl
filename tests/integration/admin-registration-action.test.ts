import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { executeAdminRegistration, registerAdminAction } from "@/server/admin/actions/register";
import type { RateLimiter } from "@/server/security/rate-limit";

function buildRegistrationForm(input: { email?: string; password?: string; secret?: string; next?: string }) {
  const formData = new FormData();
  if (input.email !== undefined) formData.set("email", input.email);
  if (input.password !== undefined) formData.set("password", input.password);
  if (input.secret !== undefined) formData.set("secret", input.secret);
  if (input.next !== undefined) formData.set("next", input.next);
  return formData;
}

function createRegistrationClients(options: { createUserError?: Error | null } = {}) {
  const createUser = vi.fn(async () => ({
    data: options.createUserError ? { user: null } : { user: { id: "user-123", email: "owner@example.com" } },
    error: options.createUserError ?? null,
  }));
  const upsert = vi.fn(async () => ({ error: null }));
  const signInWithPassword = vi.fn(async () => ({ error: null }));

  return {
    adminClient: {
      auth: { admin: { createUser } },
      from: vi.fn(() => ({ upsert })),
    },
    authClient: { auth: { signInWithPassword } },
    createUser,
    upsert,
    signInWithPassword,
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

describe("admin registration action", () => {
  it("creates a confirmed auth user, promotes its profile to admin, signs in, and redirects safely", async () => {
    const clients = createRegistrationClients();
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: " owner@example.com ",
      password: "secure-password",
      secret: "owner-secret",
      next: "/admin/products",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      authClient: clients.authClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
      redirect: redirectTo,
    })).rejects.toThrow("redirect:/admin/products");

    expect(clients.createUser).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secure-password",
      email_confirm: true,
    });
    expect(clients.adminClient.from).toHaveBeenCalledWith("profiles");
    expect(clients.upsert).toHaveBeenCalledWith({ id: "user-123", role: "admin" }, { onConflict: "id" });
    expect(clients.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secure-password",
    });
    expect(redirectTo).toHaveBeenCalledWith("/admin/products");
  });

  it("falls back to /admin instead of redirecting to external next destinations", async () => {
    const clients = createRegistrationClients();
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: "owner@example.com",
      password: "secure-password",
      secret: "owner-secret",
      next: "https://evil.test/admin",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      authClient: clients.authClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
      redirect: redirectTo,
    })).rejects.toThrow("redirect:/admin");

    expect(redirectTo).toHaveBeenCalledWith("/admin");
  });

  it("rejects an invalid owner secret before creating or promoting any user", async () => {
    const clients = createRegistrationClients();

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: "owner@example.com",
      password: "secure-password",
      secret: "wrong-secret",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      authClient: clients.authClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
    })).rejects.toThrow("No pudimos crear la cuenta de administrador");

    expect(clients.createUser).not.toHaveBeenCalled();
    expect(clients.upsert).not.toHaveBeenCalled();
    expect(clients.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns the generic failure before secret validation or user creation when the registration limit is exceeded", async () => {
    const clients = createRegistrationClients();
    const getSecret = vi.fn(() => "owner-secret");
    const rateLimiter: RateLimiter = {
      consume: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 120,
        remaining: 0,
        resetAt: new Date("2026-06-05T12:02:00.000Z"),
      })),
    };

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: " Owner@Example.COM ",
      password: "secure-password",
      secret: "owner-secret",
    }), {
      getSecret,
      adminClient: clients.adminClient,
      authClient: clients.authClient,
      rateLimiter,
      clientIp: "203.0.113.10",
    })).rejects.toThrow("No pudimos crear la cuenta de administrador");

    expect(rateLimiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "admin-registration:ip",
      identity: "203.0.113.10",
    }));
    expect(rateLimiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "admin-registration:email",
      identity: "owner@example.com",
    }));
    expect(getSecret).not.toHaveBeenCalled();
    expect(clients.createUser).not.toHaveBeenCalled();
    expect(clients.upsert).not.toHaveBeenCalled();
    expect(clients.signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps a rate-limited registration action to the generic form error", async () => {
    const clients = createRegistrationClients();
    const getSecret = vi.fn(() => "owner-secret");
    const rateLimiter: RateLimiter = {
      consume: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 120,
        remaining: 0,
        resetAt: new Date("2026-06-05T12:02:00.000Z"),
      })),
    };

    await expect(registerAdminAction(
      { status: "idle" },
      buildRegistrationForm({
        email: "owner@example.com",
        password: "secure-password",
        secret: "owner-secret",
      }),
      {
        getSecret,
        adminClient: clients.adminClient,
        authClient: clients.authClient,
        rateLimiter,
        clientIp: "203.0.113.10",
      },
    )).resolves.toEqual({
      status: "error",
      message: "No pudimos crear la cuenta de administrador. Revisá los datos e intentá nuevamente.",
      fieldErrors: {
        email: " ",
        password: " ",
        secret: " ",
      },
    });

    expect(getSecret).not.toHaveBeenCalled();
    expect(clients.createUser).not.toHaveBeenCalled();
  });

  it("does not promote or sign in when Supabase rejects a duplicate email", async () => {
    const clients = createRegistrationClients({ createUserError: new Error("User already registered") });

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: "owner@example.com",
      password: "secure-password",
      secret: "owner-secret",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      authClient: clients.authClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
    })).rejects.toThrow("No pudimos crear la cuenta de administrador");

    expect(clients.createUser).toHaveBeenCalledOnce();
    expect(clients.upsert).not.toHaveBeenCalled();
    expect(clients.signInWithPassword).not.toHaveBeenCalled();
  });
});
