import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { executeAdminRegistration, registerAdminAction } from "@/server/admin/actions/register";
import type { RateLimiter } from "@/server/security/rate-limit";

function buildRegistrationForm(input: { email?: string; password?: string; secret?: string }) {
  const formData = new FormData();
  if (input.email !== undefined) formData.set("email", input.email);
  if (input.password !== undefined) formData.set("password", input.password);
  if (input.secret !== undefined) formData.set("secret", input.secret);
  return formData;
}

function createRegistrationClients(options: { createUserError?: Error | null } = {}) {
  const createUser = vi.fn(async () => ({
    data: options.createUserError ? { user: null } : { user: { id: "user-123", email: "owner@example.com" } },
    error: options.createUserError ?? null,
  }));
  const upsert = vi.fn(async () => ({ error: null }));

  return {
    adminClient: {
      auth: { admin: { createUser } },
      from: vi.fn(() => ({ upsert })),
    },
    createUser,
    upsert,
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
  it("creates a confirmed auth user, promotes its profile to admin (pending), and returns success", async () => {
    const clients = createRegistrationClients();

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: " owner@example.com ",
      password: "secure-password",
      secret: "owner-secret",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
    })).resolves.toBeUndefined();

    expect(clients.createUser).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secure-password",
      email_confirm: true,
    });
    expect(clients.adminClient.from).toHaveBeenCalledWith("profiles");
    expect(clients.upsert).toHaveBeenCalledWith(
      { id: "user-123", role: "admin", admin_status: "pending" },
      { onConflict: "id" },
    );
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
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
    })).rejects.toThrow("No pudimos crear la cuenta de administrador");

    expect(clients.createUser).not.toHaveBeenCalled();
    expect(clients.upsert).not.toHaveBeenCalled();
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

  it("does not promote when Supabase rejects a duplicate email", async () => {
    const clients = createRegistrationClients({ createUserError: new Error("User already registered") });

    await expect(executeAdminRegistration(buildRegistrationForm({
      email: "owner@example.com",
      password: "secure-password",
      secret: "owner-secret",
    }), {
      getSecret: () => "owner-secret",
      adminClient: clients.adminClient,
      rateLimiter: createAllowingRateLimiter(),
      clientIp: "203.0.113.10",
    })).rejects.toThrow("No pudimos crear la cuenta de administrador");

    expect(clients.createUser).toHaveBeenCalledOnce();
    expect(clients.upsert).not.toHaveBeenCalled();
  });

  it("returns success state instead of redirecting", async () => {
    const clients = createRegistrationClients();

    const result = await registerAdminAction(
      { status: "idle" },
      buildRegistrationForm({
        email: "owner@example.com",
        password: "secure-password",
        secret: "owner-secret",
      }),
      {
        getSecret: () => "owner-secret",
        adminClient: clients.adminClient,
        rateLimiter: createAllowingRateLimiter(),
        clientIp: "203.0.113.10",
      },
    );

    expect(result).toEqual({
      status: "success",
      message: "Tu cuenta fue creada. Esperá la aprobación de un administrador.",
    });
  });
});
