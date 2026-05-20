export const DEFAULT_ADMIN_LOGIN_REDIRECT = "/admin";

export function resolveAdminLoginNextPath(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_ADMIN_LOGIN_REDIRECT;
  }

  if (value.startsWith(DEFAULT_ADMIN_LOGIN_REDIRECT) && !value.startsWith("//")) {
    return value;
  }

  return DEFAULT_ADMIN_LOGIN_REDIRECT;
}
