import Image from "next/image";
import * as React from "react";
import { ArrowDown, ArrowRight, PackageSearch, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { CartSummary } from "@/components/cart";
import { NavigationLink } from "@/components/ui/navigation-link";
import { formatMoney } from "@/lib/money";
import type { getProductListState } from "@/server/products/queries";

type StoreHomeCatalog = Awaited<ReturnType<typeof getProductListState>>;

type StoreHomeViewProps = {
  catalog: StoreHomeCatalog;
};

const storefrontSignals = [
  {
    title: "Curaduría con intención",
    description: "Objetos simples que suman calidez y carácter a los espacios de todos los días.",
    icon: Sparkles,
  },
  {
    title: "Compra segura",
    description: "Precio y disponibilidad se validan antes de avanzar al pago.",
    icon: ShieldCheck,
  },
  {
    title: "Entrega local",
    description: "Un proceso claro, cercano y sin pasos escondidos.",
    icon: Truck,
  },
];

const editorialStories = [
  {
    title: "Rituales de cocina",
    description: "Madera, cerámica y textiles que hacen más amable cada pausa.",
    image: "/editorial/rituales-cocina.png",
  },
  {
    title: "Rincones con calma",
    description: "Pocas piezas, materiales honestos y espacio para respirar.",
    image: "/editorial/rincones-con-calma.png",
  },
  {
    title: "El momento del mate",
    description: "Objetos cotidianos elegidos para acompañar encuentros simples.",
    image: "/editorial/momento-mate.png",
  },
];

export function StoreHomeView({ catalog }: StoreHomeViewProps) {
  const featuredProducts = catalog.products.filter((product) => product.featured).slice(0, 6);
  const showcaseProducts = featuredProducts.length > 0 ? featuredProducts : catalog.products.slice(0, 6);

  return (
    <main className="bg-background font-body text-foreground">
      <section
        className="relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden border-b border-border/80"
        aria-labelledby="home-hero-title"
      >
        <Image
          src="/brand/bazar-bl-home-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[64%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_250_243/0.99)_0%,rgb(255_250_243/0.94)_62%,rgb(255_250_243/0.48)_100%)] sm:bg-[linear-gradient(90deg,rgb(255_250_243/0.98)_0%,rgb(255_250_243/0.94)_36%,rgb(255_250_243/0.3)_67%,rgb(255_250_243/0.04)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(0deg,rgb(37_26_18/0.18),transparent)]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="animate-in-up max-w-2xl">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur-sm sm:text-xs sm:tracking-[0.24em]">
              Bazar BL · Objetos para tu hogar
            </p>
            <h1 id="home-hero-title" className="mt-5 font-heading text-[2.75rem] font-semibold leading-[0.98] tracking-tight sm:text-6xl sm:leading-none lg:text-7xl">
              Pequeños detalles.
              <span className="block text-primary">Espacios con alma.</span>
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground sm:max-w-xl sm:text-lg">
              Una selección cálida de objetos cotidianos para construir una casa que se sienta realmente tuya.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <NavigationLink
                className="button-lift inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="/catalog"
                pendingTitle="Cargando catálogo"
                pendingDescription="Buscamos los productos activos para vos."
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </NavigationLink>
              <a
                className="button-lift inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-background/75 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="#catalogo"
              >
                Ver selección
              </a>
            </div>
          </div>

          <a
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-10 sm:text-xs sm:tracking-[0.2em] sm:text-background sm:hover:text-primary-foreground"
            href="#catalogo"
          >
            Descubrí la colección
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="border-b border-border/70 bg-muted/45" aria-label="Beneficios de compra">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {storefrontSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <article key={signal.title} className="flex gap-4 border-b border-border/70 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-semibold">{signal.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{signal.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="catalogo" className="scroll-mt-24 py-16 sm:py-20 lg:py-24" aria-labelledby="home-catalog-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Colección destacada</p>
              <h2 id="home-catalog-title" className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                Elegidos para transformar lo cotidiano.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Texturas honestas, formas simples y objetos que encuentran su lugar sin pedir permiso.
              </p>
            </div>
            <NavigationLink
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg text-sm font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/catalog"
              pendingTitle="Cargando catálogo"
              pendingDescription="Buscamos los productos activos para vos."
            >
              Ver todo el catálogo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </NavigationLink>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_336px]">
            <div>
              {showcaseProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 xl:grid-cols-3" aria-label="Productos destacados">
                  {showcaseProducts.map((product) => {
                    const productImage = product.images[0];

                    return (
                      <article
                        key={product.id}
                        className="group animate-in-up overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_8px_rgb(37_26_18/0.08)] transition-shadow hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]"
                      >
                        <NavigationLink
                          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          href={`/products/${product.slug}`}
                          pendingTitle="Cargando detalle"
                          pendingDescription="Preparamos la ficha completa del producto."
                        >
                          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                            {productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={productImage.storagePath}
                                alt={productImage.altText || product.name}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center p-6 text-center text-sm font-medium text-muted-foreground">
                                Imagen de {product.name}
                              </div>
                            )}
                            <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-background/90 px-2 py-1 text-[0.625rem] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
                              {product.category?.name ?? "Bazar"}
                            </span>
                          </div>
                          <div className="p-3 sm:p-4">
                            <h3 className="font-heading text-base font-semibold leading-tight transition-colors group-hover:text-primary sm:text-xl">
                              {product.name}
                            </h3>
                            <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-muted-foreground sm:block">{product.description}</p>
                            <p className="mt-2 font-heading text-base font-semibold text-primary sm:mt-3 sm:text-xl">
                              {formatMoney({ amountCents: product.priceCents, currency: product.currency })}
                            </p>
                          </div>
                        </NavigationLink>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-[0_2px_8px_rgb(37_26_18/0.08)]">
                  <PackageSearch className="h-7 w-7 text-primary" aria-hidden="true" />
                  <p className="mt-4 font-heading text-xl font-semibold text-foreground">La colección está en preparación</p>
                  <p className="mt-2 text-sm leading-6">Cuando publiques productos activos desde el admin, van a aparecer acá.</p>
                </div>
              )}

              {catalog.status === "error" ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground" role="status">
                  {catalog.message}
                </div>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-28 lg:h-fit" aria-label="Resumen del carrito">
              <CartSummary />
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-border/70 bg-foreground py-16 text-background sm:py-20" aria-labelledby="editorial-stories-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-background/60">Bazar BL</p>
          <h2 id="editorial-stories-title" className="mt-4 max-w-3xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Ideas para habitar con intención.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-background/70">
            Deslizá para descubrir escenas simples y encontrar inspiración para tus propios espacios.
          </p>

          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {editorialStories.map((story) => (
              <article
                key={story.title}
                className="group relative min-w-[82%] snap-center overflow-hidden rounded-xl border border-background/15 bg-background/5 sm:min-w-[48%] lg:min-w-0"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={story.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(37_26_18/0.92),rgb(37_26_18/0.04)_70%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-heading text-2xl font-semibold">{story.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-background/70">{story.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
