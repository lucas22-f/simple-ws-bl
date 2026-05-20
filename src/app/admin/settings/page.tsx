import { updateSettingsAction } from "@/server/admin/actions/settings";

async function saveSettings(formData: FormData) {
  "use server";
  await updateSettingsAction(formData);
}

export default function AdminSettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <form action={saveSettings} className="mt-6 grid gap-3 rounded-2xl border p-5 sm:grid-cols-2">
        <input className="rounded-xl border px-3 py-2" name="shippingZones.0.city" placeholder="Ciudad" />
        <input className="rounded-xl border px-3 py-2" name="shippingZones.0.costCents" placeholder="Costo envío" type="number" min="0" />
        <select className="rounded-xl border px-3 py-2" name="commission.type" defaultValue="percentage"><option value="percentage">Porcentaje</option><option value="fixed">Fija</option></select>
        <input className="rounded-xl border px-3 py-2" name="commission.value" placeholder="Comisión" type="number" min="0" />
        <input className="rounded-xl border px-3 py-2" name="analytics.metaPixelId" placeholder="Meta Pixel ID" />
        <input className="rounded-xl border px-3 py-2" name="analytics.gtmId" placeholder="GTM-XXXX" />
        <button className="rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">Guardar configuración</button>
      </form>
    </main>
  );
}

