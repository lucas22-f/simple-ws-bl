"use client";

import * as React from "react";
import { useActionState } from "react";
import { Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FormToast } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import type { PendingAdmin } from "@/server/admin/actions/approvals";

type ApprovalsListProps = {
  pendingAdmins: PendingAdmin[];
  approveAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  rejectAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
};

function ApproveForm({ adminId, action }: { adminId: string; action: ApprovalsListProps["approveAction"] }) {
  const [state, formAction] = useActionState(action, initialFormActionState);

  return (
    <form action={formAction} className="relative">
      <FormToast state={state} successTitle="Administrador aprobado" />
      <input name="adminId" type="hidden" value={adminId} />
      <SubmitButton className="button-lift min-h-10 rounded-full border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Aprobar
      </SubmitButton>
    </form>
  );
}

function RejectForm({ adminId, action }: { adminId: string; action: ApprovalsListProps["rejectAction"] }) {
  const [state, formAction] = useActionState(action, initialFormActionState);

  return (
    <form action={formAction} className="relative">
      <FormToast state={state} errorTitle="Administrador rechazado" />
      <input name="adminId" type="hidden" value={adminId} />
      <SubmitButton className="button-lift min-h-10 rounded-full border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Rechazar
      </SubmitButton>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ApprovalsList({ pendingAdmins, approveAction, rejectAction }: ApprovalsListProps) {
  return (
    <AdminShell title="Aprobaciones" description="Gestion de nuevos administradores.">
      {pendingAdmins.length === 0 ? (
        <section className="animate-in-up rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
          <p className="mt-3 font-semibold text-foreground">No hay administradores pendientes.</p>
          <p>Cuando alguien solicite acceso de administrador, va a aparecer acá automáticamente.</p>
        </section>
      ) : (
        <section className="grid gap-4" aria-label="Lista de administradores pendientes">
          {pendingAdmins.map((admin) => (
            <article
              key={admin.id}
              className="animate-in-up rounded-xl border border-border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ID</p>
                  <p className="mt-1 truncate font-mono text-sm text-foreground">{admin.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Solicitado el {formatDate(admin.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ApproveForm adminId={admin.id} action={approveAction} />
                  <RejectForm adminId={admin.id} action={rejectAction} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </AdminShell>
  );
}
