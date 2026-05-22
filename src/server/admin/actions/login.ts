"use server";

import { redirect } from "next/navigation";
import { actionError, initialFormActionState, type FormActionState } from "@/lib/form-state";
import { resolveAdminLoginNextPath } from "@/server/admin/actions/login-path";
import { createSupabaseServerClient } from "@/server/supabase/server";

type LoginCredentials = {
  email: string;
  password: string;
};

type LoginResult = {
  error: unknown;
};

type LoginSupabaseClient = {
  auth: {
    signInWithPassword(credentials: LoginCredentials): Promise<LoginResult>;
  };
};

type AdminLoginDependencies = {
  createClient?: () => Promise<LoginSupabaseClient>;
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

export async function executeAdminLogin(
  formData: FormData,
  dependencies: AdminLoginDependencies = {},
) {
  const { email, password, fieldErrors } = validateLoginForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    throw new Error("Revisá email y contraseña");
  }

  const supabase = dependencies.supabase ?? await (dependencies.createClient ?? createSupabaseServerClient)();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Credenciales inválidas");
  }

  const redirectTo = resolveAdminLoginNextPath(formData.get("next"));
  const redirectUser = dependencies.redirect ?? redirect;
  redirectUser(redirectTo);
}

export async function loginAction(_previousState: FormActionState, formData: FormData): Promise<FormActionState> {
  const { fieldErrors } = validateLoginForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return actionError("Revisá los datos del formulario.", fieldErrors);
  }

  try {
    await executeAdminLogin(formData);
    return initialFormActionState;
  } catch (error) {
    if (error instanceof Error && error.message === "Credenciales inválidas") {
      return actionError("Credenciales inválidas. Revisá el email y la contraseña.", {
        email: " ",
        password: " ",
      });
    }

    throw error;
  }
}
