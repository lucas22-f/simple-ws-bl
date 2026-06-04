import * as React from "react";
import { ArrowRight, PackageSearch, Search, ShoppingBag } from "lucide-react";
import { CartSummary } from "@/components/cart";
import { formatMoney } from "@/lib/money";
import type { getProductListState } from "@/server/products/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NavigationLink } from "@/components/ui/navigation-link";
import { PaginationControls } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";

type CatalogState = Awaited<ReturnType<typeof getProductListState>>;

type CatalogViewProps = {
  catalog: CatalogState;
  searchQuery?: string;
  categorySlug?: string;
};

export function CatalogView({ catalog, searchQuery = "", categorySlug }: CatalogViewProps) {
  const products = catalog.products;
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 font-body sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_336px] lg:px-8">
      <section className="space-y-8 lg:space-y-10" aria-labelledby="catalog-title">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm animate-in-up">
          <div className="bg-muted px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <NavigationLink
              className="inline-flex text-sm font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/"
              pendingTitle="Cargando inicio"
              pendingDescription="Volvemos a la tienda principal."
            >
              Inicio
            </NavigationLink>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Tienda curada</p>
            <h1 id="catalog-title" className="mt-3 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Catálogo artesanal
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Una selección cálida de objetos simples para elegir sin ruido, con precios claros y el carrito siempre a mano.
            </p>
          </div>

          <form className="grid gap-3 border-t border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6" action="/catalog">
            <label className="sr-only" htmlFor="catalog-search">
              Buscar productos
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="catalog-search"
                name="q"
                placeholder="Buscar productos por nombre o descripción"
                defaultValue={searchQuery}
                className="min-h-12 pl-11"
              />
            </div>
            <SubmitButton className="button-lift min-h-12 rounded-xl px-6" pendingLabel="Buscando...">
              Buscar productos
            </SubmitButton>
          </form>
        </div>

        {catalog.status === "error" ? (
          <CatalogStateCard
            title="No pudimos cargar el catálogo."
            description="Probá de nuevo en unos minutos."
            actionLabel="Volver al inicio"
            href="/"
          />
        ) : products.length === 0 ? (
          <CatalogStateCard
            title={hasSearch ? "No encontramos productos para tu búsqueda" : "Todavía no hay productos activos"}
            description={
              hasSearch
                ? "Probá con otra palabra o volvé al catálogo completo para seguir explorando."
                : "Cuando publiques productos activos desde el admin, van a aparecer en esta grilla."
            }
            actionLabel="Ver todo el catálogo"
            href="/catalog"
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-5 xl:grid-cols-3" aria-label="Productos del catálogo">
              {products.map((product) => {
                const productImage = product.images[0];

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden rounded-xl border-border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)] sm:rounded-3xl animate-in-up"
                  >
                    <article>
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        {productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={productImage.storagePath}
                            alt={productImage.altText || product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm font-medium text-muted-foreground transition duration-500 group-hover:scale-105">
                            <div>
                              <ShoppingBag className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                              <p className="mt-3">Imagen de {product.name}</p>
                            </div>
                          </div>
                        )}
                        <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] truncate rounded-full bg-card px-2 py-1 text-[0.625rem] font-semibold text-muted-foreground shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
                          {product.category?.name ?? "Bazar"}
                        </span>
                      </div>

                      <CardHeader className="space-y-2 p-3 sm:space-y-3 sm:p-5">
                        <CardTitle className="line-clamp-2 font-heading text-base leading-tight text-foreground sm:text-xl">{product.name}</CardTitle>
                        <p className="hidden line-clamp-2 text-sm leading-6 text-muted-foreground sm:block">{product.description}</p>
                      </CardHeader>

                      <CardContent className="space-y-3 p-3 pt-0 sm:space-y-5 sm:p-5 sm:pt-0">
                        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3 sm:gap-4 sm:pt-4">
                          <strong className="font-heading text-base text-primary sm:text-xl">
                            {formatMoney({ amountCents: product.priceCents, currency: product.currency })}
                          </strong>
                        </div>
                        <NavigationLink
                          className="button-lift inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
                          href={`/products/${product.slug}`}
                          pendingTitle="Cargando detalle"
                          pendingDescription="Preparamos la ficha completa del producto."
                        >
                          Ver producto
                          <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                        </NavigationLink>
                      </CardContent>
                    </article>
                  </Card>
                );
              })}
            </div>
            {catalog.pagination ? (
              <PaginationControls
                pagination={catalog.pagination}
                basePath="/catalog"
                searchParams={{ q: searchQuery || undefined, category: categorySlug }}
                itemLabel="productos"
              />
            ) : null}
          </div>
        )}
      </section>

      <div className="lg:sticky lg:top-8 lg:h-fit">
        <CartSummary />
      </div>
    </main>
  );
}

type CatalogStateCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

function CatalogStateCard({ title, description, actionLabel, href }: CatalogStateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-border bg-card px-6 py-16 text-center shadow-sm animate-in-up" role="status">
      <div className="mb-5 rounded-full bg-muted p-5">
        <PackageSearch className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <NavigationLink
        className="button-lift mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={href}
        pendingTitle="Cargando catálogo"
        pendingDescription="Preparamos la vista para seguir comprando."
      >
        {actionLabel}
      </NavigationLink>
    </div>
  );
}
