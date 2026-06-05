"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/server";

type LogoutResult = {
  error: unknown;
};

type LogoutSupabaseClient = {
  auth: {
    signOut(): Promise<LogoutResult>;
  };
};

type AdminLogoutDependencies = {
  createClient?: () => Promise<LogoutSupabaseClient>;
  redirect?: (path: string) => never;
  supabase?: LogoutSupabaseClient;
};

export async function executeAdminLogout(dependencies: AdminLogoutDependencies = {}) {
  const supabase = dependencies.supabase ?? await (dependencies.createClient ?? createSupabaseServerClient)();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("No pudimos cerrar la sesión");
  }

  const redirectUser = dependencies.redirect ?? redirect;
  redirectUser("/admin/login");
}

export async function logoutAction() {
  await executeAdminLogout();
}
