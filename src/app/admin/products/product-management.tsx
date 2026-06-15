"use client";

import * as React from "react";
import { useActionState } from "react";
import { Archive, Boxes, CircleDollarSign, Eye, ImageOff, ImagePlus, PackageCheck, PackagePlus, PencilLine, Sparkles, Trash2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { NavigationLink } from "@/components/ui/navigation-link";
import { PaginationControls } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import { PRODUCT_IMAGE_ACCEPT_ATTRIBUTE, compressProductImage, formatFileSize, getProductImageCompressionErrorMessage } from "@/lib/image-compression";
import { calculatePublishedPriceCents, formatCentsAsCurrency, MERCADO_PAGO_SURCHARGE_PERCENT, parseCurrencyAmountToCents } from "@/lib/money";
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
    delete: ProductFormAction;
  };
};

const fieldClassName = "min-h-11 rounded-xl border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

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

function getFormDataFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function ProductImageField({ status, tone }: { status?: string; tone?: "neutral" | "error" | "success" }) {
  const [selectedFileName, setSelectedFileName] = React.useState("Sin archivo seleccionado");

  return (
    <label className="grid gap-2 rounded-2xl border border-dashed bg-muted/35 p-4 text-sm font-medium sm:col-span-2">
      <span className="inline-flex items-center gap-2">
        <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        Imagen del producto
      </span>
      <span className="relative grid min-h-11 gap-2 rounded-xl border bg-card p-2 transition focus-within:ring-2 focus-within:ring-ring sm:flex sm:items-center">
        <span className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">
          Seleccionar archivo
        </span>
        <span className="min-w-0 truncate px-1 text-sm font-normal text-muted-foreground">{selectedFileName}</span>
        <input
          className="absolute inset-0 cursor-pointer opacity-0"
          name="productImage"
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT_ATTRIBUTE}
          onChange={(event) => setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "Sin archivo seleccionado")}
        />
      </span>
      <input name="productImageAlt" type="hidden" value="" />
      <FieldMessage
        id="product-image-help"
        message={status ?? "La imagen se optimiza automáticamente a WebP, máximo 1200px, antes de subirla al bucket."}
        tone={tone}
      />
    </label>
  );
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

function getPriceInputValue(product?: AdminProduct) {
  if (!product) {
    return "";
  }

  return (product.basePriceCents / 100).toFixed(2);
}

function ProductPricePreview({ basePriceAmount, applySurcharge, currency }: { basePriceAmount: string; applySurcharge: boolean; currency: string }) {
  let basePriceCents = 0;
  let priceIsValid = true;

  try {
    basePriceCents = basePriceAmount.trim() ? parseCurrencyAmountToCents(basePriceAmount) : 0;
  } catch {
    priceIsValid = false;
  }

  const publishedPriceCents = priceIsValid ? calculatePublishedPriceCents(basePriceCents, applySurcharge) : 0;
  const surchargeCents = Math.max(0, publishedPriceCents - basePriceCents);

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm sm:col-span-2" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Vista previa del precio publicado</p>
          <p className="mt-1 text-muted-foreground">El precio base se guarda en centavos internamente; el catálogo y Mercado Pago usan el precio publicado.</p>
        </div>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary">
          Recargo {MERCADO_PAGO_SURCHARGE_PERCENT}%
        </span>
      </div>
      {priceIsValid ? (
        <dl className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-card p-3">
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Base</dt>
            <dd className="mt-1 font-semibold">{formatCentsAsCurrency(basePriceCents, currency)}</dd>
          </div>
          <div className="rounded-xl bg-card p-3">
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recargo</dt>
            <dd className="mt-1 font-semibold">{formatCentsAsCurrency(surchargeCents, currency)}</dd>
          </div>
          <div className="rounded-xl bg-primary p-3 text-primary-foreground">
            <dt className="text-xs uppercase tracking-[0.14em] opacity-80">Publicado</dt>
            <dd className="mt-1 font-semibold">{formatCentsAsCurrency(publishedPriceCents, currency)}</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-xl bg-card p-3 font-medium text-primary">Ingresá un precio válido para calcular la vista previa.</p>
      )}
    </div>
  );
}

function ProductFields({ product }: { product?: AdminProduct }) {
  const [basePriceAmount, setBasePriceAmount] = React.useState(getPriceInputValue(product));
  const [applySurcharge, setApplySurcharge] = React.useState(product?.applyMercadoPagoSurcharge ?? false);
  const currency = product?.currency ?? "ARS";

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
        Precio base
        <input
          className={fieldClassName}
          name="basePriceAmount"
          placeholder="12500,00"
          inputMode="decimal"
          value={basePriceAmount}
          onChange={(event) => setBasePriceAmount(event.currentTarget.value)}
          required
        />
        <FieldMessage id="product-price-help" message="Ingresá el importe normal, sin convertirlo a centavos." />
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
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:col-span-2">
        <input
          className="mt-1 h-4 w-4 accent-primary"
          name="applyMercadoPagoSurcharge"
          type="checkbox"
          value="true"
          checked={applySurcharge}
          onChange={(event) => setApplySurcharge(event.currentTarget.checked)}
        />
        <span>
          <span className="block font-semibold">Aplicar recargo de Mercado Pago</span>
          <span className="mt-1 block text-muted-foreground">Suma automáticamente el {MERCADO_PAGO_SURCHARGE_PERCENT}% al precio publicado.</span>
        </span>
      </label>
      <ProductPricePreview basePriceAmount={basePriceAmount} applySurcharge={applySurcharge} currency={currency} />
    </>
  );
}

export function ProductCreateForm({ action }: { action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  const [imageStatus, setImageStatus] = React.useState<{ message: string; tone?: "neutral" | "error" | "success" }>();
  const createAction = typeof formAction === "function"
    ? async (formData: FormData) => {
        const image = getFormDataFile(formData, "productImage");

        if (image) {
          setImageStatus({ message: `Optimizando ${formatFileSize(image.size)} antes de subir...` });

          try {
            const compressedImage = await compressProductImage(image);
            formData.set("productImage", compressedImage);
            setImageStatus({ message: `Lista para subir: ${formatFileSize(compressedImage.size)} en WebP.`, tone: "success" });
          } catch (error) {
            setImageStatus({ message: getProductImageCompressionErrorMessage(error), tone: "error" });
            return;
          }
        }

        formAction(formData);
      }
    : formAction;

  return (
    <form action={createAction} className="relative mt-5 grid gap-4 overflow-hidden sm:grid-cols-2">
      <FormToast state={state} successTitle="Producto guardado" />
      <FormLoadingOverlay title="Guardando producto" description="Optimizamos la imagen, creamos el producto y actualizamos el catálogo." />
      <ProductFields />
      <ProductImageField status={imageStatus?.message} tone={imageStatus?.tone} />
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

function ProductArchiveForm({ product, action }: { product: AdminProduct; action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-3 overflow-hidden rounded-xl">
      <FormToast state={state} successTitle="Producto archivado" />
      <FormLoadingOverlay title="Archivando producto" description="Lo quitamos del catálogo público." />
      <input name="productId" type="hidden" value={product.id} />
      <SubmitButton variant="outline" className="button-lift" pendingLabel="Archivando producto..." aria-label={`Archivar ${product.name}`}>
        <Archive className="h-4 w-4" aria-hidden="true" />
        Archivar producto
      </SubmitButton>
    </form>
  );
}

function ProductDeleteForm({ product, action }: { product: AdminProduct; action: ProductFormAction }) {
  const { state, formAction } = useProductFormAction(action);
  return (
    <form action={formAction} className="relative mt-3 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <FormToast state={state} successTitle="Producto eliminado" />
      <FormLoadingOverlay title="Eliminando producto" description="Validamos que no tenga órdenes pendientes ni reservas activas." />
      <input name="productId" type="hidden" value={product.id} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input className="mt-0.5 h-4 w-4 accent-primary" name="confirmDelete" type="checkbox" value="true" required />
        Confirmo que quiero eliminar “{product.name}”. Se bloqueará automáticamente si tiene órdenes pendientes o reservas activas.
      </label>
      <SubmitButton
        variant="outline"
        aria-label={`Eliminar ${product.name}`}
        className="button-lift mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
        pendingLabel="Eliminando producto..."
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Eliminar producto
      </SubmitButton>
    </form>
  );
}

function ProductEditDialog({ product, actions }: { product: AdminProduct; actions: AdminProductsViewProps["actions"] }) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button className="w-full px-2 text-xs sm:px-4 sm:text-sm" type="button" variant="outline" aria-label={`Editar ${product.name}`} onClick={() => dialogRef.current?.showModal()}>
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
          <ProductArchiveForm product={product} action={actions.archive} />
          <ProductDeleteForm product={product} action={actions.delete} />
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

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Inventario actual</h2>
            <p className="text-sm text-muted-foreground">Revisá el catálogo de un vistazo y desplegá la edición solamente cuando la necesites.</p>
          </div>
          <NavigationLink
            href="/admin/products/new"
            className="button-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            pendingTitle="Cargando creación de producto"
            pendingDescription="Abrimos el formulario dedicado para cargar un nuevo producto."
          >
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            Agregar producto
          </NavigationLink>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Todavía no hay productos cargados.</p>
            <p>Creá el primero desde la ruta dedicada de alta de productos.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {products.map((product) => {
                const productImage = product.images[0];

                return (
                <article key={product.id} aria-label={`Producto ${product.name}`} className="group animate-in-up overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_8px_rgb(37_26_18/0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]">
                  <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[4/3]">
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

                  <div className="p-3 sm:p-5">
                    <div className="grid gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-lg">{product.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">/{product.slug}</p>
                    </div>
                    <div className="grid gap-1 text-xs sm:grid-cols-2 sm:gap-x-6 sm:text-sm md:text-right">
                      <span className="text-muted-foreground">Precio</span>
                      <strong>{formatCentsAsCurrency(product.priceCents, product.currency)}</strong>
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
