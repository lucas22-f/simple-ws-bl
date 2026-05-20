"use server";

import { redirect } from "next/navigation";
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

export async function executeAdminLogin(
  formData: FormData,
  dependencies: AdminLoginDependencies = {},
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = dependencies.supabase ?? await (dependencies.createClient ?? createSupabaseServerClient)();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Credenciales inválidas");
  }

  const redirectTo = resolveAdminLoginNextPath(formData.get("next"));
  const redirectUser = dependencies.redirect ?? redirect;
  redirectUser(redirectTo);
}

export async function loginAction(formData: FormData) {
  await executeAdminLogin(formData);
}
