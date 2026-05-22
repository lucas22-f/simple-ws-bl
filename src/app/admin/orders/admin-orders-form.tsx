"use client";

import { useActionState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";

type AdminOrdersFormProps = {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
};

export function AdminOrdersForm({ action }: AdminOrdersFormProps) {
  const [state, formAction] = useActionState(action, initialFormActionState);

  return (
    <AdminShell title="Órdenes" description="Actualizá el estado operativo de cada pedido sin salir del panel.">
      <form action={formAction} className="relative mt-6 grid gap-3 overflow-hidden rounded-2xl border p-5 sm:grid-cols-3 animate-in-up">
        <FormToast state={state} successTitle="Orden actualizada" />
        <FormLoadingOverlay title="Actualizando orden" description="Guardamos el nuevo estado operativo de la orden." />
        <label className="grid gap-1 text-sm font-medium">
          ID de orden
          <input className="rounded-xl border px-3 py-2" name="orderId" placeholder="ID de orden" required />
          <FieldMessage id="order-id-help" message="Pegá el ID interno de la orden. No uses datos del cliente como identificador." />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Estado
          <select className="rounded-xl border px-3 py-2" name="status" defaultValue="processing">
            <option value="processing">En preparación</option>
            <option value="shipped">Enviada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <FieldMessage id="order-status-help" message="Solo permitimos transiciones operativas válidas." />
        </label>
        <SubmitButton className="button-lift self-end" pendingLabel="Actualizando orden...">Actualizar</SubmitButton>
      </form>
    </AdminShell>
  );
}