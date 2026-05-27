export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_REGISTER_PATH = "/admin/register";

export type ProfileRole = "admin" | "customer";

export type AuthProfile = {
  id: string;
  role: ProfileRole;
} | null;

export type AdminAccessDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string; reason: "unauthenticated" | "forbidden" };

export function canAccessAdmin(profile: AuthProfile): profile is NonNullable<AuthProfile> & { role: "admin" } {
  return profile?.role === "admin";
}

export function createAdminRedirectUrl(currentUrl: string, nextPath: string) {
  const redirectUrl = new URL(ADMIN_LOGIN_PATH, currentUrl);
  redirectUrl.searchParams.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
  return redirectUrl;
}

export function isPublicAdminAuthRoute(pathname: string) {
  return pathname === ADMIN_LOGIN_PATH || pathname === ADMIN_REGISTER_PATH;
}

export function resolveAdminAccess(profile: AuthProfile, currentUrl: string): AdminAccessDecision {
  const url = new URL(currentUrl);

  if (isPublicAdminAuthRoute(url.pathname)) {
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
