import { createProductAction } from "@/server/admin/actions/products";

async function saveProduct(formData: FormData) {
  "use server";
  await createProductAction(formData);
}

export default function AdminProductsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Productos</h1>
      <form action={saveProduct} className="mt-6 grid gap-3 rounded-2xl border p-5 sm:grid-cols-2">
        <input className="rounded-xl border px-3 py-2" name="name" placeholder="Nombre" required />
        <input className="rounded-xl border px-3 py-2" name="slug" placeholder="slug-del-producto" required />
        <input className="rounded-xl border px-3 py-2" name="priceCents" placeholder="Precio en centavos" type="number" min="0" required />
        <input className="rounded-xl border px-3 py-2" name="stockQuantity" placeholder="Stock" type="number" min="0" />
        <textarea className="rounded-xl border px-3 py-2 sm:col-span-2" name="description" placeholder="Descripción" />
        <label className="flex gap-2"><input name="active" type="checkbox" value="true" /> Publicado</label>
        <label className="flex gap-2"><input name="featured" type="checkbox" value="true" /> Destacado</label>
        <button className="rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">Guardar producto</button>
      </form>
    </main>
  );
}

