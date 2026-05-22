"use client";

import * as React from "react";
import { useActionState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import type { AdminProduct } from "@/server/products/queries";

export type ProductFormAction = string | ((state: FormActionState, formData: FormData) => Promise<FormActionState>);

type AdminProductsViewProps = {
  products: AdminProduct[];
  actions: {
    create: ProductFormAction;
    update: ProductFormAction;
    archive: ProductFormAction;
  };
};

function useProductFormAction(action: ProductFormAction) {
  const isEnhancedAction = typeof action === "function";
  const [state, enhancedFormAction] = useActionState(
    isEnhancedAction ? action : async () => initialFormActionState,
    initialFormActionState,
  );

  return {
    formAction: isEnhancedAction ? enhancedFormAction : action,
    state: isEnhancedAction ? state : initialFormActionState,
  };
}

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
      <label className="grid gap-1 text-sm font-medium">
        Nombre
        <input className="rounded-xl border px-3 py-2" name="name" placeholder="Mate cerámico" defaultValue={product?.name} required minLength={2} />
        <FieldMessage id="product-name-help" message="Mínimo 2 caracteres." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Slug
        <input className="rounded-xl border px-3 py-2" name="slug" placeholder="mate-ceramico" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product?.slug} required />
        <FieldMessage id="product-slug-help" message="Solo minúsculas, números y guiones. Sin espacios." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Precio en centavos
        <input className="rounded-xl border px-3 py-2" name="priceCents" placeholder="1250000" type="number" min="0" defaultValue={product?.priceCents} required />
        <FieldMessage id="product-price-help" message="Guardamos centavos para evitar errores con decimales." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Stock
        <input className="rounded-xl border px-3 py-2" name="stockQuantity" placeholder="Stock" type="number" min="0" defaultValue={product?.stockQuantity ?? ""} />
        <FieldMessage id="product-stock-help" message="Dejalo vacío si todavía no querés controlar stock." />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Descripción
        <textarea className="rounded-xl border px-3 py-2" name="description" placeholder="Descripción" defaultValue={product?.description} />
      </label>
      <label className="flex gap-2 text-sm">
        <input name="active" type="checkbox" value="true" defaultChecked={product?.active ?? false} /> Publicado
      </label>
      <label className="flex gap-2 text-sm">
        <input name="featured" type="checkbox" value="true" defaultChecked={product?.featured ?? false} /> Destacado
      </label>
    </>
  );
}

function ProductCreateForm({ action }: { action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-4 grid gap-3 overflow-hidden rounded-2xl sm:grid-cols-2">
      <FormToast state={state} successTitle="Producto guardado" />
      <FormLoadingOverlay title="Guardando producto" description="Creamos el producto y actualizamos el catálogo." />
      <ProductFields />
      <SubmitButton className="button-lift sm:col-span-2" pendingLabel="Guardando producto...">Guardar producto</SubmitButton>
    </form>
  );
}

function ProductUpdateForm({ product, action }: { product: AdminProduct; action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-4 grid gap-3 overflow-hidden rounded-2xl sm:grid-cols-2">
      <FormToast state={state} successTitle="Producto actualizado" />
      <FormLoadingOverlay title="Actualizando producto" description="Guardamos los cambios de este producto." />
      <input name="productId" type="hidden" value={product.id} />
      <ProductFields product={product} />
      <SubmitButton className="button-lift sm:col-span-2" pendingLabel="Actualizando producto...">Actualizar producto</SubmitButton>
    </form>
  );
}

function ProductArchiveForm({ productId, action }: { productId: string; action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-3 overflow-hidden rounded-xl">
      <FormToast state={state} successTitle="Producto archivado" />
      <FormLoadingOverlay title="Archivando producto" description="Lo quitamos del catálogo público." />
      <input name="productId" type="hidden" value={productId} />
      <SubmitButton variant="outline" className="button-lift" pendingLabel="Archivando producto...">Archivar producto</SubmitButton>
    </form>
  );
}

export function AdminProductsView({ products, actions }: AdminProductsViewProps) {
  return (
    <AdminShell title="Productos" description="Creá, editá y pausá productos sin tocar la base a mano.">
      <section className="rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">Crear producto</h2>
        <ProductCreateForm action={actions.create} />
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
              <article key={product.id} className="rounded-2xl border p-5 animate-in-up">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-sm text-stone-500">{product.slug}</p>
                  </div>
                  <ProductStatus active={product.active} featured={product.featured} />
                </div>
                <ProductUpdateForm product={product} action={actions.update} />
                <ProductArchiveForm productId={product.id} action={actions.archive} />
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
