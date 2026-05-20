import { updateOrderFulfillmentStatusAction } from "@/server/admin/actions/orders";

async function updateOrder(formData: FormData) {
  "use server";
  await updateOrderFulfillmentStatusAction(formData);
}

export default function AdminOrdersPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Órdenes</h1>
      <form action={updateOrder} className="mt-6 grid gap-3 rounded-2xl border p-5 sm:grid-cols-3">
        <input className="rounded-xl border px-3 py-2" name="orderId" placeholder="ID de orden" required />
        <select className="rounded-xl border px-3 py-2" name="status" defaultValue="processing">
          <option value="processing">En preparación</option>
          <option value="shipped">Enviada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <button className="rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white" type="submit">Actualizar</button>
      </form>
    </main>
  );
}

