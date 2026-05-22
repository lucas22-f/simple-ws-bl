import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { AdminSettingsForm } from "@/app/admin/settings/admin-settings-form";
import { updateSettingsAction } from "@/server/admin/actions/settings";

async function saveSettings(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    await updateSettingsAction(formData);
    return actionSuccess("Configuración guardada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos guardar la configuración."));
  }
}

export default function AdminSettingsPage() {
  return <AdminSettingsForm action={saveSettings} />;
}