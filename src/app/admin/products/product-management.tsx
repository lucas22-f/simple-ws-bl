import * as React from "react";
import type { AdminProduct } from "@/server/products/queries";

export type ProductFormAction = string | ((formData: FormData) => void | Promise<void>);

type AdminProductsViewProps = {
  products: AdminProduct[];
  actions: {
    create: ProductFormAction;
    update: ProductFormAction;
    archive: ProductFormAction;
  };
};

function ProductStatus({ active, featured }: { active: boolean; featured: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
      <span className={active ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-800" : "rounded-full bg-stone-200 px-2 py-1 text-stone-700"}>
        {active ? "Publicado" : "Pausado"}
      </span>
      {featured ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Destacado</span> : null}
    </div>
  );
}

function ProductFields({ product }: { product?: AdminProduct }) {
  return (
    <>
      <input className="rounded-xl border px-3 py-2" name="name" placeholder="Nombre" defaultValue={product?.name} required />
      <input className="rounded-xl border px-3 py-2" name="slug" placeholder="slug-del-producto" defaultValue={product?.slug} required />
      <input
        className="rounded-xl border px-3 py-2"
        name="priceCents"
        placeholder="Precio en centavos"
        type="number"
        min="0"
        defaultValue={product?.priceCents}
        required
      />
      <input
        className="rounded-xl border px-3 py-2"
        name="stockQuantity"
        placeholder="Stock"
        type="number"
        min="0"
        defaultValue={product?.stockQuantity ?? ""}
      />
      <textarea className="rounded-xl border px-3 py-2 sm:col-span-2" name="description" placeholder="Descripción" defaultValue={product?.description} />
      <label className="flex gap-2">
        <input name="active" type="checkbox" value="true" defaultChecked={product?.active ?? false} /> Publicado
      </label>
      <label className="flex gap-2">
        <input name="featured" type="checkbox" value="true" defaultChecked={product?.featured ?? false} /> Destacado
      </label>
    </>
  );
}

export function AdminProductsView({ products, actions }: AdminProductsViewProps) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</p>
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="text-stone-600">Creá, editá y pausá productos sin tocar la base a mano.</p>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">Crear producto</h2>
        <form action={actions.create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <ProductFields />
          <button className="rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">
            Guardar producto
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Productos actuales</h2>
          <p className="text-sm text-stone-600">Incluye publicados y pausados para que puedas administrarlos desde un solo lugar.</p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-stone-600">
            <p className="font-semibold text-stone-900">Todavía no hay productos cargados.</p>
            <p>Creá el primero con el formulario de arriba.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-sm text-stone-500">{product.slug}</p>
                  </div>
                  <ProductStatus active={product.active} featured={product.featured} />
                </div>

                <form action={actions.update} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input name="productId" type="hidden" value={product.id} />
                  <ProductFields product={product} />
                  <button className="rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">
                    Actualizar producto
                  </button>
                </form>

                <form action={actions.archive} className="mt-3">
                  <input name="productId" type="hidden" value={product.id} />
                  <button className="rounded-xl border px-4 py-2 font-semibold text-stone-800" type="submit">
                    Archivar producto
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
