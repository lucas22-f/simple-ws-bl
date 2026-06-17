import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { ApprovalsList } from "@/app/admin/approvals/approvals-list";
import { approveAdminAction, rejectAdminAction, listPendingAdminsAction } from "@/server/admin/actions/approvals";
import type { PendingAdmin } from "@/server/admin/actions/approvals";

async function approveAdmin(prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const adminId = formData.get("adminId");
    if (typeof adminId !== "string") throw new Error("ID de administrador invalido");
    await approveAdminAction(adminId);
    return actionSuccess("Administrador aprobado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos aprobar al administrador."));
  }
}

async function rejectAdmin(prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const adminId = formData.get("adminId");
    if (typeof adminId !== "string") throw new Error("ID de administrador invalido");
    await rejectAdminAction(adminId);
    return actionSuccess("Administrador rechazado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos rechazar al administrador."));
  }
}

export default async function AdminApprovalsPage() {
  let pendingAdmins: PendingAdmin[] = [];
  try {
    pendingAdmins = await listPendingAdminsAction();
  } catch {
    // not admin or error
  }
  return <ApprovalsList pendingAdmins={pendingAdmins} approveAction={approveAdmin} rejectAction={rejectAdmin} />;
}
