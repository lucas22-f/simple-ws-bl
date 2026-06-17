import { describe, expect, it } from "vitest";
import {
  ADMIN_LOGIN_PATH,
  ADMIN_REGISTER_PATH,
  canAccessAdmin,
  createAdminDashboardUrl,
  createAdminRedirectUrl,
  resolveAdminAccess,
  type AuthProfile,
} from "@/server/auth/guards";
import { requirePublicSupabaseEnv } from "@/middleware";

const adminProfile: AuthProfile = { id: "admin-id", role: "admin" };
const customerProfile: AuthProfile = { id: "user-id", role: "customer" };

describe("admin route guards", () => {
  it("grants admin access only to authenticated admin profiles", () => {
    expect(canAccessAdmin(adminProfile)).toBe(true);
    expect(canAccessAdmin(customerProfile)).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });

  it("blocks pending admin on protected routes with reason 'pending'", () => {
    const pendingAdmin: AuthProfile = { id: "pending-id", role: "admin", admin_status: "pending" };

    expect(resolveAdminAccess(pendingAdmin, "https://bazar.test/admin/products")).toEqual({
      allowed: false,
      redirectTo: "https://bazar.test/admin/login?next=%2Fadmin%2Fproducts",
      reason: "pending",
    });
  });

  it("allows pending admin on public auth routes", () => {
    const pendingAdmin: AuthProfile = { id: "pending-id", role: "admin", admin_status: "pending" };

    expect(resolveAdminAccess(pendingAdmin, "https://bazar.test/admin/login")).toEqual({
      allowed: true,
    });

    expect(resolveAdminAccess(pendingAdmin, "https://bazar.test/admin/register")).toEqual({
      allowed: true,
    });
  });

  it("allows approved admin on protected routes", () => {
    const approvedAdmin: AuthProfile = { id: "approved-id", role: "admin", admin_status: "approved" };

    expect(resolveAdminAccess(approvedAdmin, "https://bazar.test/admin/settings")).toEqual({
      allowed: true,
    });
  });

  it("redirects anonymous and non-admin profiles to login with a safe next path", () => {
    expect(resolveAdminAccess(null, "https://bazar.test/admin/products")).toEqual({
      allowed: false,
      redirectTo: "https://bazar.test/admin/login?next=%2Fadmin%2Fproducts",
      reason: "unauthenticated",
    });

    expect(resolveAdminAccess(customerProfile, "https://bazar.test/admin/orders?id=1")).toEqual({
      allowed: false,
      redirectTo: "https://bazar.test/admin/login?next=%2Fadmin%2Forders%3Fid%3D1",
      reason: "forbidden",
    });
  });

  it("does not redirect admin users or public admin auth pages", () => {
    expect(resolveAdminAccess(adminProfile, "https://bazar.test/admin/settings")).toEqual({
      allowed: true,
    });

    expect(resolveAdminAccess(null, "https://bazar.test/admin/login")).toEqual({
      allowed: true,
    });

    expect(resolveAdminAccess(null, "https://bazar.test/admin/register")).toEqual({
      allowed: true,
    });

    expect(resolveAdminAccess(adminProfile, "https://bazar.test/admin/login")).toEqual({
      allowed: false,
      redirectTo: "https://bazar.test/admin",
      reason: "authenticated",
    });

    expect(createAdminDashboardUrl("https://bazar.test/admin/login").pathname).toBe("/admin");
    expect(createAdminRedirectUrl("https://bazar.test/admin", "/admin/products").pathname).toBe(
      ADMIN_LOGIN_PATH,
    );
    expect(ADMIN_REGISTER_PATH).toBe("/admin/register");
  });
});

describe("middleware Supabase public env", () => {
  it("uses the current publishable key instead of the legacy anon key", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    };

    expect(requirePublicSupabaseEnv(env)).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "publishable-key",
    });
  });
});
