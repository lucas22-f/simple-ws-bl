import "server-only";
import { canAccessAdmin, type AuthProfile } from "@/server/auth/guards";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type AdminAssertion = () => Promise<void>;

export type AdminActionAuthOptions = {
  assertAdmin?: AdminAssertion;
};

type AdminAuthClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function readCurrentProfile(supabase: AdminAuthClient): Promise<AuthProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  return data as AuthProfile;
}

export async function assertCurrentUserIsAdmin(supabase?: AdminAuthClient) {
  const authClient = supabase ?? await createSupabaseServerClient();
  const profile = await readCurrentProfile(authClient);

  if (!canAccessAdmin(profile)) {
    throw new Error("No autorizado");
  }
}

export async function assertAdminActionAccess(options: AdminActionAuthOptions = {}) {
  const assertAdmin = options.assertAdmin ?? assertCurrentUserIsAdmin;
  await assertAdmin();
}
