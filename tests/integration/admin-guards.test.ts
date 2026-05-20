import { describe, expect, it } from "vitest";
import {
  ADMIN_LOGIN_PATH,
  canAccessAdmin,
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

  it("does not redirect admin users or the admin login page itself", () => {
    expect(resolveAdminAccess(adminProfile, "https://bazar.test/admin/settings")).toEqual({
      allowed: true,
    });

    expect(resolveAdminAccess(null, "https://bazar.test/admin/login")).toEqual({
      allowed: true,
    });

    expect(createAdminRedirectUrl("https://bazar.test/admin", "/admin/products").pathname).toBe(
      ADMIN_LOGIN_PATH,
    );
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
