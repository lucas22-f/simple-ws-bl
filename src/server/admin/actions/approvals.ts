import { assertCurrentUserIsAdmin } from "@/server/admin/actions/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PendingAdmin = {
  id: string;
  created_at: string;
};

export type ApprovalsAdminClient = {
  auth: {
    admin: {
      deleteUser(userId: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        eq(column2: string, value2: unknown): Promise<{ data: PendingAdmin[] | null; error: unknown }>;
      };
    };
    update(value: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column2: string, value2: unknown): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export type ApprovalsDependencies = {
  adminClient?: ApprovalsAdminClient;
};

export async function listPendingAdminsAction(
  deps: ApprovalsDependencies = {},
): Promise<PendingAdmin[]> {
  await assertCurrentUserIsAdmin();

  const adminClient = deps.adminClient ?? createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, created_at")
    .eq("role", "admin")
    .eq("admin_status", "pending");

  if (error) throw new Error("No pudimos obtener la lista de pendientes.");
  return data ?? [];
}

export async function approveAdminAction(
  adminId: string,
  deps: ApprovalsDependencies = {},
): Promise<{ success: true }> {
  await assertCurrentUserIsAdmin();

  const adminClient = deps.adminClient ?? createSupabaseAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ admin_status: "approved" })
    .eq("id", adminId)
    .eq("admin_status", "pending");

  if (error) throw new Error("No pudimos aprobar al administrador.");
  return { success: true };
}

export async function rejectAdminAction(
  adminId: string,
  deps: ApprovalsDependencies = {},
): Promise<{ success: true }> {
  await assertCurrentUserIsAdmin();

  const adminClient = deps.adminClient ?? createSupabaseAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(adminId);

  if (error) throw new Error("No pudimos rechazar al administrador.");
  return { success: true };
}
