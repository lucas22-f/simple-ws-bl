export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_REGISTER_PATH = "/admin/register";

export type ProfileRole = "admin" | "customer";

export type AuthProfile = {
  id: string;
  role: ProfileRole;
  admin_status?: "pending" | "approved" | null;
} | null;

export type AdminAccessDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string; reason: "unauthenticated" | "forbidden" | "authenticated" | "pending" };

export function canAccessAdmin(profile: AuthProfile): profile is NonNullable<AuthProfile> & { role: "admin" } {
  return profile?.role === "admin";
}

export function createAdminRedirectUrl(currentUrl: string, nextPath: string) {
  const redirectUrl = new URL(ADMIN_LOGIN_PATH, currentUrl);
  redirectUrl.searchParams.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
  return redirectUrl;
}

export function createAdminDashboardUrl(currentUrl: string) {
  return new URL("/admin", currentUrl);
}

export function isPublicAdminAuthRoute(pathname: string) {
  return pathname === ADMIN_LOGIN_PATH || pathname === ADMIN_REGISTER_PATH;
}

export function resolveAdminAccess(profile: AuthProfile, currentUrl: string): AdminAccessDecision {
  const url = new URL(currentUrl);

  // Pending admin on protected routes → block
  if (!isPublicAdminAuthRoute(url.pathname)) {
    if (profile && profile.role === "admin" && profile.admin_status === "pending") {
      return {
        allowed: false,
        redirectTo: createAdminRedirectUrl(currentUrl, `${url.pathname}${url.search}`).toString(),
        reason: "pending",
      };
    }
  }

  if (isPublicAdminAuthRoute(url.pathname)) {
    // Approved admin on auth route → redirect to dashboard
    if (canAccessAdmin(profile) && profile?.admin_status !== "pending") {
      return {
        allowed: false,
        redirectTo: createAdminDashboardUrl(currentUrl).toString(),
        reason: "authenticated",
      };
    }

    return { allowed: true };
  }

  if (canAccessAdmin(profile)) {
    return { allowed: true };
  }

  const reason = profile ? "forbidden" : "unauthenticated";
  return {
    allowed: false,
    redirectTo: createAdminRedirectUrl(currentUrl, `${url.pathname}${url.search}`).toString(),
    reason,
  };
}
