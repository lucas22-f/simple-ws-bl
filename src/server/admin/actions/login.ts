"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionError, initialFormActionState, type FormActionState } from "@/lib/form-state";
import { resolveAdminLoginNextPath } from "@/server/admin/actions/login-path";
import {
  ADMIN_LOGIN_EMAIL_RATE_LIMIT,
  ADMIN_LOGIN_IP_RATE_LIMIT,
  createDefaultRateLimiter,
  getClientIpFromHeaders,
  normalizeRateLimitIdentity,
  type RateLimiter,
} from "@/server/security/rate-limit";
import { createSupabaseServerClient } from "@/server/supabase/server";

const ADMIN_LOGIN_RATE_LIMIT_FAILURE = "Demasiados intentos. Probá de nuevo en unos minutos.";

type LoginCredentials = {
  email: string;
  password: string;
};

type LoginResult = {
  data?: { user?: { id: string } | null };
  error: unknown;
};

type LoginSupabaseClient = {
  auth: {
    signInWithPassword(credentials: LoginCredentials): Promise<LoginResult>;
  };
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { admin_status: string | null } | null; error: unknown }>;
      };
    };
  };
};

type AdminLoginDependencies = {
  createClient?: () => Promise<LoginSupabaseClient>;
  clientIp?: string;
  rateLimiter?: RateLimiter;
  redirect?: (path: string) => never;
  supabase?: LoginSupabaseClient;
};

function validateLoginForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = "Ingresá tu email.";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "Usá un email válido, por ejemplo admin@tienda.com.";
  }

  if (!password) {
    fieldErrors.password = "Ingresá tu contraseña.";
  }

  return { email, password, fieldErrors };
}

async function resolveAdminLoginClientIp(dependencies: AdminLoginDependencies) {
  if (dependencies.clientIp) {
    return normalizeRateLimitIdentity(dependencies.clientIp) || "unknown";
  }

  return getClientIpFromHeaders(await headers());
}

async function enforceAdminLoginRateLimit(email: string, dependencies: AdminLoginDependencies) {
  const rateLimiter = dependencies.rateLimiter ?? createDefaultRateLimiter();
  const clientIp = await resolveAdminLoginClientIp(dependencies);
  const emailIdentity = normalizeRateLimitIdentity(email);
  const results = await Promise.all([
    rateLimiter.consume({ ...ADMIN_LOGIN_IP_RATE_LIMIT, identity: clientIp }),
    rateLimiter.consume({ ...ADMIN_LOGIN_EMAIL_RATE_LIMIT, identity: emailIdentity }),
  ]).catch(() => {
    throw new Error(ADMIN_LOGIN_RATE_LIMIT_FAILURE);
  });

  if (results.some((result) => !result.allowed)) {
    throw new Error(ADMIN_LOGIN_RATE_LIMIT_FAILURE);
  }
}

export async function executeAdminLogin(
  formData: FormData,
  dependencies: AdminLoginDependencies = {},
) {
  const { email, password, fieldErrors } = validateLoginForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    throw new Error("Revisá email y contraseña");
  }

  await enforceAdminLoginRateLimit(email, dependencies);

  const supabase = dependencies.supabase ?? await (dependencies.createClient ?? createSupabaseServerClient)();

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Credenciales inválidas");
  }

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error("No pudimos verificar tu usuario");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("admin_status")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.admin_status === "pending") {
    throw new Error("Tu cuenta está pendiente de aprobación. Contactá al administrador que te dio las credenciales.");
  }

  const redirectTo = resolveAdminLoginNextPath(formData.get("next"));
  const redirectUser = dependencies.redirect ?? redirect;
  redirectUser(redirectTo);
}

export async function loginAction(
  _previousState: FormActionState,
  formData: FormData,
  dependencies: AdminLoginDependencies = {},
): Promise<FormActionState> {
  const { fieldErrors } = validateLoginForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return actionError("Revisá los datos del formulario.", fieldErrors);
  }

  try {
    await executeAdminLogin(formData, dependencies);
    return initialFormActionState;
  } catch (error) {
    if (error instanceof Error && error.message === ADMIN_LOGIN_RATE_LIMIT_FAILURE) {
      return actionError(ADMIN_LOGIN_RATE_LIMIT_FAILURE, {
        email: " ",
        password: " ",
      });
    }

    if (error instanceof Error && error.message === "Credenciales inválidas") {
      return actionError("Credenciales inválidas. Revisá el email y la contraseña.", {
        email: " ",
        password: " ",
      });
    }

    if (
      error instanceof Error &&
      error.message === "Tu cuenta está pendiente de aprobación. Contactá al administrador que te dio las credenciales."
    ) {
      return actionError(error.message, {
        email: " ",
        password: " ",
      });
    }

    throw error;
  }
}
