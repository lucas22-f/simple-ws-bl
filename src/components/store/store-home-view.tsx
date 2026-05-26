import * as React from "react";
import { ArrowRight, PackageSearch, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavigationLink } from "@/components/ui/navigation-link";
import { CartSummary } from "@/components/cart";
import { formatMoney } from "@/lib/money";
import type { getProductListState } from "@/server/products/queries";

type StoreHomeCatalog = Awaited<ReturnType<typeof getProductListState>>;

type StoreHomeViewProps = {
  catalog: StoreHomeCatalog;
};

const storefrontSignals = [
  {
    title: "Curaduría simple",
    description: "Pocos productos, bien elegidos, con precios claros desde el primer vistazo.",
    icon: Sparkles,
  },
  {
    title: "Checkout cuidado",
    description: "El pedido valida precio y stock en servidor antes de avanzar al pago.",
    icon: ShieldCheck,
  },
  {
    title: "Entrega local",
    description: "Pensado para vender en tu zona, sin esconder costos ni pasos del proceso.",
    icon: Truck,
  },
];

export function StoreHomeView({ catalog }: StoreHomeViewProps) {
  const featuredProducts = catalog.products.filter((product) => product.featured).slice(0, 4);
  const productCount = catalog.products.length;

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-8 bg-background px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_336px] lg:px-8">
      <section className="space-y-8 lg:space-y-10">
        <div className="animate-in-up overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-[0_10px_30px_rgb(37_26_18/0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex items-center rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Bazar Online
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Bazar simple, compra clara y objetos con intención.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Una tienda cálida para descubrir productos de casa sin fricción: mirás, elegís, armás el carrito y avanzás con
                reglas claras. Diseño lindo, sí; pero primero una compra entendible.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <NavigationLink
                  className="button-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/catalog"
                  pendingTitle="Cargando catálogo"
                  pendingDescription="Buscamos los productos activos para vos."
                >
                  Ver catálogo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </NavigationLink>
                <a
                  className="button-lift inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="#destacados"
                >
                  Ver destacados
                </a>
                <NavigationLink
                  className="button-lift inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/admin/login"
                  pendingTitle="Cargando inicio de sesión"
                  pendingDescription="Abrimos el acceso seguro al panel."
                >
                  Acceso admin
                </NavigationLink>
              </div>
            </div>

            <div className="border-t border-border/70 bg-muted/80 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="flex h-full flex-col justify-between gap-8 rounded-2xl border border-border/70 bg-background p-5 shadow-[0_2px_8px_rgb(37_26_18/0.08)]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_20px_rgb(164_81_36/0.22)]">
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Compra sin vueltas</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {productCount > 0 ? `${productCount} productos activos` : "Catálogo en preparación"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/80 bg-card p-3">
                    <dt className="text-muted-foreground">Pago</dt>
                    <dd className="mt-1 font-semibold">Mercado Pago</dd>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-card p-3">
                    <dt className="text-muted-foreground">Stock</dt>
                    <dd className="mt-1 font-semibold">Validado</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Beneficios de compra">
          {storefrontSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <article key={signal.title} className="animate-in-up rounded-xl border border-border/80 bg-card p-5 shadow-[0_2px_8px_rgb(37_26_18/0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold">{signal.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.description}</p>
              </article>
            );
          })}
        </section>

        <section id="destacados" className="space-y-5" aria-labelledby="featured-products-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selección del día</p>
              <h2 id="featured-products-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Productos destacados
              </h2>
            </div>
            <NavigationLink
              className="rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/catalog"
              pendingTitle="Cargando catálogo"
              pendingDescription="Buscamos los productos activos para vos."
            >
              Ver todo el catálogo
            </NavigationLink>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="animate-in-up overflow-hidden rounded-2xl border-border/80 shadow-[0_2px_8px_rgb(37_26_18/0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]">
                  <CardHeader className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{product.category?.name ?? "Bazar"}</p>
                        <CardTitle className="mt-2 text-2xl leading-tight">{product.name}</CardTitle>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Destacado</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5 pt-0">
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{product.description}</p>
                    <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
                      <strong className="text-lg">
                        {formatMoney({ amountCents: product.priceCents, currency: product.currency })}
                      </strong>
                      <NavigationLink
                        className="inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`/products/${product.slug}`}
                        pendingTitle="Cargando detalle"
                        pendingDescription="Preparamos la ficha completa del producto."
                      >
                        Ver detalle
                      </NavigationLink>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card p-6 text-muted-foreground shadow-[0_2px_8px_rgb(37_26_18/0.08)]">
              <PackageSearch className="h-6 w-6 text-primary" aria-hidden="true" />
              <p className="mt-4 font-semibold text-foreground">Todavía no hay destacados publicados</p>
              <p className="mt-2 text-sm leading-6">
                Cuando marques productos como destacados desde el admin, van a aparecer acá con prioridad.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/80 bg-muted/90 p-6 shadow-[0_2px_8px_rgb(37_26_18/0.08)] sm:p-8" aria-labelledby="buying-flow-title">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cómo funciona</p>
            <h2 id="buying-flow-title" className="mt-2 text-3xl font-semibold tracking-tight">
              Una experiencia corta, sin esconder decisiones.
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["Elegí productos activos", "Revisá el carrito", "Confirmá tus datos"].map((step, index) => (
              <div key={step} className="rounded-xl border border-border/70 bg-background p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="mt-4 font-semibold">{step}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {index === 0
                    ? "El catálogo muestra solo lo publicado y disponible para clientes."
                    : index === 1
                      ? "El carrito queda a mano para no perder contexto mientras navegás."
                      : "Antes del pago, el servidor vuelve a validar disponibilidad y precio."}
                </p>
              </div>
            ))}
          </div>
        </section>

        {catalog.status === "error" ? (
          <div className="rounded-2xl border border-border/80 bg-card p-6 text-muted-foreground shadow-[0_2px_8px_rgb(37_26_18/0.08)]" role="status">
            {catalog.message}
          </div>
        ) : null}
      </section>

      <div className="lg:sticky lg:top-8 lg:h-fit">
        <CartSummary />
      </div>
    </main>
  );
}
