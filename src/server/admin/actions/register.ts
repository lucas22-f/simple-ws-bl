"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { actionError, actionSuccess, type FormActionState } from "@/lib/form-state";
import { getAdminRegistrationEnv } from "@/server/env";
import {
  ADMIN_REGISTRATION_EMAIL_RATE_LIMIT,
  ADMIN_REGISTRATION_IP_RATE_LIMIT,
  createDefaultRateLimiter,
  getClientIpFromHeaders,
  normalizeRateLimitIdentity,
  type RateLimiter,
} from "@/server/security/rate-limit";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const ADMIN_REGISTRATION_FAILURE = "No pudimos crear la cuenta de administrador";

type RegistrationCredentials = {
  email: string;
  password: string;
};

type AuthUser = {
  id: string;
  email?: string;
};

type RegistrationResult<TData> = {
  data?: TData;
  error: unknown;
};

export type AdminRegistrationAdminClient = {
  auth: {
    admin: {
      createUser(input: RegistrationCredentials & { email_confirm: true }): Promise<
        RegistrationResult<{ user: AuthUser | null }>
      >;
    };
  };
  from(table: "profiles"): {
    upsert(
      value: { id: string; role: "admin"; admin_status: "pending" },
      options: { onConflict: "id" },
    ): Promise<RegistrationResult<unknown>>;
  };
};

export type AdminRegistrationDependencies = {
  adminClient?: AdminRegistrationAdminClient;
  getSecret?: () => string;
  rateLimiter?: RateLimiter;
  clientIp?: string;
};

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest();
}

function ownerSecretsMatch(submittedSecret: string, expectedSecret: string) {
  return timingSafeEqual(hashSecret(submittedSecret), hashSecret(expectedSecret));
}

function validateRegistrationForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = "Ingresá tu email.";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "Usá un email válido, por ejemplo admin@tienda.com.";
  }

  if (!password) {
    fieldErrors.password = "Ingresá tu contraseña.";
  }

  if (!secret) {
    fieldErrors.secret = "Ingresá el secreto de registro.";
  }

  return { email, password, secret, fieldErrors };
}

function readAdminRegistrationSecret(dependencies: AdminRegistrationDependencies) {
  const getSecret = dependencies.getSecret ?? (() => getAdminRegistrationEnv().ADMIN_REGISTRATION_SECRET);
  return getSecret().trim();
}

async function resolveAdminRegistrationClientIp(dependencies: AdminRegistrationDependencies) {
  if (dependencies.clientIp) {
    return normalizeRateLimitIdentity(dependencies.clientIp) || "unknown";
  }

  return getClientIpFromHeaders(await headers());
}

async function enforceAdminRegistrationRateLimit(email: string, dependencies: AdminRegistrationDependencies) {
  const rateLimiter = dependencies.rateLimiter ?? createDefaultRateLimiter();
  const clientIp = await resolveAdminRegistrationClientIp(dependencies);
  const emailIdentity = normalizeRateLimitIdentity(email);
  const results = await Promise.all([
    rateLimiter.consume({ ...ADMIN_REGISTRATION_IP_RATE_LIMIT, identity: clientIp }),
    rateLimiter.consume({ ...ADMIN_REGISTRATION_EMAIL_RATE_LIMIT, identity: emailIdentity }),
  ]).catch(() => {
    throw new Error(ADMIN_REGISTRATION_FAILURE);
  });

  if (results.some((result) => !result.allowed)) {
    throw new Error(ADMIN_REGISTRATION_FAILURE);
  }
}

export async function executeAdminRegistration(
  formData: FormData,
  dependencies: AdminRegistrationDependencies = {},
) {
  const { email, password, secret, fieldErrors } = validateRegistrationForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    throw new Error("Revisá los datos del formulario");
  }

  await enforceAdminRegistrationRateLimit(email, dependencies);

  const expectedSecret = readAdminRegistrationSecret(dependencies);
  if (!ownerSecretsMatch(secret, expectedSecret)) {
    throw new Error(ADMIN_REGISTRATION_FAILURE);
  }

  const adminClient = dependencies.adminClient ?? createSupabaseAdminClient();
  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const createdUser = createdUserData?.user;

  if (createUserError || !createdUser) {
    throw new Error(ADMIN_REGISTRATION_FAILURE);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({ id: createdUser.id, role: "admin", admin_status: "pending" }, { onConflict: "id" });

  if (profileError) {
    throw new Error(ADMIN_REGISTRATION_FAILURE);
  }
}

export async function registerAdminAction(
  _previousState: FormActionState,
  formData: FormData,
  dependencies: AdminRegistrationDependencies = {},
): Promise<FormActionState> {
  const { fieldErrors } = validateRegistrationForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return actionError("Revisá los datos del formulario.", fieldErrors);
  }

  try {
    await executeAdminRegistration(formData, dependencies);
    return actionSuccess("Tu cuenta fue creada. Esperá la aprobación de un administrador.");
  } catch (error) {
    if (error instanceof Error && error.message === ADMIN_REGISTRATION_FAILURE) {
      return actionError("No pudimos crear la cuenta de administrador. Revisá los datos e intentá nuevamente.", {
        email: " ",
        password: " ",
        secret: " ",
      });
    }

    throw error;
  }
}
