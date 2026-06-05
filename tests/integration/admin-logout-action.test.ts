import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { executeAdminLogout } from "@/server/admin/actions/logout";

describe("admin logout action", () => {
  it("invalidates the Supabase session and redirects to admin login", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogout({
      redirect: redirectTo,
      supabase: { auth: { signOut } },
    })).rejects.toThrow("redirect:/admin/login");

    expect(signOut).toHaveBeenCalledOnce();
    expect(redirectTo).toHaveBeenCalledWith("/admin/login");
  });

  it("does not redirect when Supabase fails to clear the session", async () => {
    const signOut = vi.fn(async () => ({ error: new Error("network") }));
    const redirectTo = vi.fn((path: string): never => {
      throw new Error(`redirect:${path}`);
    });

    await expect(executeAdminLogout({
      redirect: redirectTo,
      supabase: { auth: { signOut } },
    })).rejects.toThrow("No pudimos cerrar la sesión");

    expect(redirectTo).not.toHaveBeenCalled();
  });
});
