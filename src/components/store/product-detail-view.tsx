import * as React from "react";
import { ArrowLeft, BadgeCheck, PackageCheck, ShieldCheck, ShoppingBag } from "lucide-react";
import { AddToCartButton } from "@/components/cart";
import { formatMoney } from "@/lib/money";
import type { StorefrontProduct } from "@/server/products/queries";
import { NavigationLink } from "@/components/ui/navigation-link";

type ProductDetailState =
  | {
    status: "ready";
    product: StorefrontProduct;
  }
  | {
    status: "error";
  };

type ProductDetailViewProps = {
  state: ProductDetailState;
};

export function ProductDetailView({ state }: ProductDetailViewProps) {
  if (state.status === "error") {
    return <ProductDetailErrorView />;
  }

  const { product } = state;
  const primaryImage = product.images[0];
  const categoryName = product.category?.name ?? "Bazar";
  const stockCopy = getStockCopy(product.stockQuantity);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 font-body sm:px-6 sm:py-10 lg:px-8">
      <section className="space-y-6 lg:space-y-8" aria-labelledby="product-title">
        <ProductBreadcrumb />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
          <div className="space-y-4 animate-in-up" aria-label={`Galería de ${product.name}`}>
            <div className="overflow-hidden rounded-4xl border border-border bg-muted shadow-sm">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="aspect-square h-full w-full object-cover" src={primaryImage.storagePath} alt={primaryImage.altText || product.name} />
              ) : (
                <div
                  className="flex aspect-square items-center justify-center p-8 text-center text-sm font-semibold text-muted-foreground"
                  role="img"
                  aria-label={`Sin imagen disponible para ${product.name}`}
                >
                  <div>
                    <ShoppingBag className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                    <p className="mt-4">Sin imagen disponible para {product.name}</p>
                  </div>
                </div>
              )}
            </div>

            {product.images.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Imágenes del producto">
                {product.images.map((image, index) => (
                  <div
                    key={`${image.storagePath}-${index}`}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-border bg-muted first:border-primary"
                    aria-label={index === 0 ? "Imagen seleccionada" : image.altText || product.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="h-full w-full object-cover" src={image.storagePath} alt="" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-4xl border border-border bg-card p-5 shadow-sm animate-in-up sm:p-6 lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Artesanías / {categoryName}</p>
            <h1 id="product-title" className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              {product.name}
            </h1>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-heading text-3xl font-semibold text-primary">
                {formatMoney({ amountCents: product.priceCents, currency: product.currency })}
              </span>
            </div>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{product.description}</p>

            <div className="mt-6 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                <span>{stockCopy}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">La disponibilidad se revisa de nuevo antes de confirmar el pago.</p>
            </div>

            <div className="mt-6 [&_button]:min-h-12 [&_button]:w-full [&_button]:text-base">
              <AddToCartButton
                item={{
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  unitPriceCents: product.priceCents,
                  currency: product.currency,
                  imageUrl: primaryImage?.storagePath,
                }}
              />
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              <TrustSignal icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />} title="Stock informado" text="Ves la disponibilidad antes de sumar el producto al carrito." />
              <TrustSignal icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} title="Checkout con validación" text="Precio y disponibilidad se revalidan en servidor." />
              <TrustSignal icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />} title="Carrito a mano" text="Podés revisar tu resumen antes de avanzar al pago." />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductDetailErrorView() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 font-body sm:px-6 sm:py-10 lg:px-8">
      <section className="space-y-6" aria-labelledby="product-error-title">
        <ProductBreadcrumb />
        <div className="flex flex-col items-center justify-center rounded-4xl border border-border bg-card px-6 py-16 text-center shadow-sm animate-in-up" role="status">
          <div className="mb-5 rounded-full bg-muted p-5">
            <ShoppingBag className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1 id="product-error-title" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            No pudimos cargar el producto.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Probá de nuevo en unos minutos o volvé al catálogo para seguir explorando.</p>
          <NavigationLink
            className="button-lift mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/catalog"
            pendingTitle="Cargando catálogo"
            pendingDescription="Volvemos a la lista de productos."
          >
            Volver al catálogo
          </NavigationLink>
        </div>
      </section>
    </main>
  );
}

function ProductBreadcrumb() {
  return (
    <NavigationLink
      className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href="/catalog"
      pendingTitle="Cargando catálogo"
      pendingDescription="Volvemos a la lista de productos."
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver al catálogo
    </NavigationLink>
  );
}

function TrustSignal({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-primary">{icon}</span>
      <p className="leading-6">
        <span className="font-semibold text-foreground">{title}.</span> {text}
      </p>
    </div>
  );
}

function getStockCopy(stockQuantity: StorefrontProduct["stockQuantity"]) {
  if (stockQuantity === null) {
    return "Disponible";
  }

  if (stockQuantity === 1) {
    return "1 unidad disponible";
  }

  return `${stockQuantity} unidades disponibles`;
}
