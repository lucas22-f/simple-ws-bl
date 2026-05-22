"use client";

import { useActionState, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";

type AdminSettingsFormProps = {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
};

function getGtmMessage(value: string) {
  if (!value) return { text: "Opcional. Formato esperado: GTM-XXXXXX.", tone: "neutral" as const };
  if (!/^GTM-[A-Z0-9]{4,}$/.test(value)) return { text: "El GTM debe empezar con GTM- y usar mayúsculas/números.", tone: "error" as const };
  return { text: "GTM con formato válido.", tone: "success" as const };
}

function getPixelMessage(value: string) {
  if (!value) return { text: "Opcional. Usá solo números si activás Meta Pixel.", tone: "neutral" as const };
  if (!/^\d{6,}$/.test(value)) return { text: "Meta Pixel debe ser numérico y tener al menos 6 dígitos.", tone: "error" as const };
  return { text: "Meta Pixel con formato válido.", tone: "success" as const };
}

export function AdminSettingsForm({ action }: AdminSettingsFormProps) {
  const [state, formAction] = useActionState(action, initialFormActionState);
  const [gtmId, setGtmId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const gtmMessage = useMemo(() => getGtmMessage(gtmId), [gtmId]);
  const pixelMessage = useMemo(() => getPixelMessage(metaPixelId), [metaPixelId]);

  return (
    <AdminShell title="Configuración" description="Configurá envíos, comisión y medición sin tocar variables o tablas a mano.">
      <form action={formAction} className="relative mt-6 grid gap-3 overflow-hidden rounded-2xl border p-5 sm:grid-cols-2 animate-in-up">
        <FormToast state={state} successTitle="Configuración guardada" />
        <FormLoadingOverlay title="Guardando configuración" description="Actualizamos reglas de envío, comisión y medición." />
        <label className="grid gap-1 text-sm font-medium">
          Ciudad
          <input className="rounded-xl border px-3 py-2" name="shippingZones.0.city" placeholder="Ciudad" />
          <FieldMessage id="shipping-city-help" message="Usala para reglas simples de envío por ciudad." />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Prefijo postal
          <input className="rounded-xl border px-3 py-2" name="shippingZones.0.postalCodePrefix" placeholder="14" />
          <FieldMessage id="shipping-postal-help" message="Opcional. Ayuda a calcular envío por código postal." />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Costo envío
          <input className="rounded-xl border px-3 py-2" name="shippingZones.0.costCents" placeholder="Costo envío" type="number" min="0" />
          <FieldMessage id="shipping-cost-help" message="Guardamos centavos para evitar errores de redondeo." />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Comisión
          <select className="rounded-xl border px-3 py-2" name="commission.type" defaultValue="percentage">
            <option value="percentage">Porcentaje</option>
            <option value="fixed">Fija</option>
          </select>
          <FieldMessage id="commission-type-help" message="La regla se valida en servidor antes de guardar." />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Valor comisión
          <input className="rounded-xl border px-3 py-2" name="commission.value" placeholder="Comisión" type="number" min="0" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Meta Pixel ID
          <input className="rounded-xl border px-3 py-2" name="analytics.metaPixelId" placeholder="1234567890" value={metaPixelId} onChange={(event) => setMetaPixelId(event.target.value)} />
          <FieldMessage id="meta-pixel-help" message={pixelMessage.text} tone={pixelMessage.tone} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          GTM ID
          <input className="rounded-xl border px-3 py-2" name="analytics.gtmId" placeholder="GTM-XXXX" value={gtmId} onChange={(event) => setGtmId(event.target.value.toUpperCase())} />
          <FieldMessage id="gtm-help" message={gtmMessage.text} tone={gtmMessage.tone} />
        </label>
        <SubmitButton className="button-lift sm:col-span-2" pendingLabel="Guardando configuración...">Guardar configuración</SubmitButton>
      </form>
    </AdminShell>
  );
}