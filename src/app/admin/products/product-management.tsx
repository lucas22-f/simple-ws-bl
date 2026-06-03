"use client";

import * as React from "react";
import { useActionState } from "react";
import { Archive, Boxes, CircleDollarSign, Eye, ImageOff, PackageCheck, PackagePlus, PencilLine, Sparkles, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { PaginationControls } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import type { PaginationState } from "@/lib/pagination";
import type { AdminProduct } from "@/server/products/queries";

export type ProductFormAction = string | ((state: FormActionState, formData: FormData) => Promise<FormActionState>);

type AdminProductsViewProps = {
  products: AdminProduct[];
  pagination?: PaginationState;
  actions: {
    create: ProductFormAction;
    update: ProductFormAction;
    archive: ProductFormAction;
  };
};

const fieldClassName = "min-h-11 rounded-xl border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(priceCents / 100);
}

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
      <span className={active ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-800" : "rounded-full bg-muted px-2 py-1 text-muted-foreground"}>
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
        <input className={fieldClassName} name="name" placeholder="Mate cerámico" defaultValue={product?.name} required minLength={2} />
        <FieldMessage id="product-name-help" message="Mínimo 2 caracteres." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Slug
        <input className={fieldClassName} name="slug" placeholder="mate-ceramico" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product?.slug} required />
        <FieldMessage id="product-slug-help" message="Solo minúsculas, números y guiones. Sin espacios." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Precio en centavos
        <input className={fieldClassName} name="priceCents" placeholder="1250000" type="number" min="0" defaultValue={product?.priceCents} required />
        <FieldMessage id="product-price-help" message="Guardamos centavos para evitar errores con decimales." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Stock
        <input className={fieldClassName} name="stockQuantity" placeholder="Stock" type="number" min="0" defaultValue={product?.stockQuantity ?? ""} />
        <FieldMessage id="product-stock-help" message="Dejalo vacío si todavía no querés controlar stock." />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Descripción
        <textarea className={`${fieldClassName} min-h-24 resize-y`} name="description" placeholder="Descripción" defaultValue={product?.description} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="active" type="checkbox" value="true" defaultChecked={product?.active ?? false} /> Publicado
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="featured" type="checkbox" value="true" defaultChecked={product?.featured ?? false} /> Destacado
      </label>
    </>
  );
}

function ProductCreateForm({ action }: { action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-5 grid gap-4 overflow-hidden sm:grid-cols-2">
      <FormToast state={state} successTitle="Producto guardado" />
      <FormLoadingOverlay title="Guardando producto" description="Creamos el producto y actualizamos el catálogo." />
      <ProductFields />
      <SubmitButton className="button-lift min-h-11 sm:col-span-2" pendingLabel="Guardando producto...">
        <PackagePlus className="h-4 w-4" aria-hidden="true" />
        Guardar producto
      </SubmitButton>
    </form>
  );
}

function ProductUpdateForm({ product, action }: { product: AdminProduct; action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-5 grid gap-4 overflow-hidden sm:grid-cols-2">
      <FormToast state={state} successTitle="Producto actualizado" />
      <FormLoadingOverlay title="Actualizando producto" description="Guardamos los cambios de este producto." />
      <input name="productId" type="hidden" value={product.id} />
      <ProductFields product={product} />
      <SubmitButton className="button-lift min-h-11 sm:col-span-2" pendingLabel="Actualizando producto...">
        <PencilLine className="h-4 w-4" aria-hidden="true" />
        Actualizar producto
      </SubmitButton>
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
      <SubmitButton variant="outline" className="button-lift" pendingLabel="Archivando producto...">
        <Archive className="h-4 w-4" aria-hidden="true" />
        Archivar producto
      </SubmitButton>
    </form>
  );
}

function ProductEditDialog({ product, actions }: { product: AdminProduct; actions: AdminProductsViewProps["actions"] }) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button className="w-full" type="button" variant="outline" onClick={() => dialogRef.current?.showModal()}>
        <PencilLine className="h-4 w-4" aria-hidden="true" />
        Editar producto
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`edit-product-${product.id}`}
        className="m-auto max-h-[calc(100vh-2rem)] w-[min(46rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-0 text-foreground shadow-[0_18px_48px_rgb(37_26_18/0.24)] backdrop:bg-foreground/45"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Edición de catálogo</p>
            <h2 id={`edit-product-${product.id}`} className="mt-1 text-xl font-semibold">{product.name}</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label={`Cerrar edición de ${product.name}`} onClick={() => dialogRef.current?.close()}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <ProductUpdateForm product={product} action={actions.update} />
          <ProductArchiveForm productId={product.id} action={actions.archive} />
        </div>
      </dialog>
    </>
  );
}

export function AdminProductsView({ products, pagination, actions }: AdminProductsViewProps) {
  const publishedProducts = products.filter((product) => product.active).length;
  const featuredProducts = products.filter((product) => product.featured).length;
  const trackedStock = products.reduce((total, product) => total + (product.stockQuantity ?? 0), 0);

  return (
    <AdminShell title="Productos" description="Administrá el catálogo, el inventario y la visibilidad de cada artículo desde un solo lugar.">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen del catálogo">
        {[
          { label: "Productos", value: products.length, icon: Boxes },
          { label: "Publicados", value: publishedProducts, icon: PackageCheck },
          { label: "Destacados", value: featuredProducts, icon: Sparkles },
          { label: "Stock registrado", value: trackedStock, icon: CircleDollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="animate-in-up rounded-xl border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-primary">
            <PackagePlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Crear producto</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Cargá la información esencial. Después podés editarla desde el listado.</p>
          </div>
        </div>
        <ProductCreateForm action={actions.create} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Inventario actual</h2>
          <p className="text-sm text-muted-foreground">Revisá el catálogo de un vistazo y desplegá la edición solamente cuando la necesites.</p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Todavía no hay productos cargados.</p>
            <p>Creá el primero con el formulario de arriba.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const productImage = product.images[0];

                return (
                <article key={product.id} className="group animate-in-up overflow-hidden rounded-xl border bg-card shadow-[0_2px_8px_rgb(37_26_18/0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={productImage.storagePath} alt={productImage.altText || product.name} />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-sm font-medium text-muted-foreground">
                        <div>
                          <ImageOff className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
                          <p className="mt-3">Sin imagen disponible</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <ProductStatus active={product.active} featured={product.featured} />
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">/{product.slug}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:text-right">
                      <span className="text-muted-foreground">Precio</span>
                      <strong>{formatPrice(product.priceCents, product.currency)}</strong>
                      <span className="text-muted-foreground">Stock</span>
                      <strong>{product.stockQuantity ?? "Sin control"}</strong>
                    </div>
                    {productImage ? (
                      <a className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={productImage.storagePath} target="_blank" rel="noreferrer">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Ver imagen
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <ProductEditDialog product={product} actions={actions} />
                  </div>
                  </div>
                </article>
                );
              })}
            </div>
            {pagination ? <PaginationControls pagination={pagination} basePath="/admin/products" itemLabel="productos" /> : null}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
