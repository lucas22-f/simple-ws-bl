import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { executeAdminRegistration } from "@/server/admin/actions/register";

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
    })).rejects.toThrow("No pudimos crear la cuenta administradora");

    expect(clients.createUser).not.toHaveBeenCalled();
    expect(clients.upsert).not.toHaveBeenCalled();
    expect(clients.signInWithPassword).not.toHaveBeenCalled();
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
    })).rejects.toThrow("No pudimos crear la cuenta administradora");

    expect(clients.createUser).toHaveBeenCalledOnce();
    expect(clients.upsert).not.toHaveBeenCalled();
    expect(clients.signInWithPassword).not.toHaveBeenCalled();
  });
});
