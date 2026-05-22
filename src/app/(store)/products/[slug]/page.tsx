import { notFound } from "next/navigation";
import { AddToCartButton, CartSummary } from "@/components/cart";
import { NavigationLink } from "@/components/ui/navigation-link";
import { formatMoney } from "@/lib/money";
import { getActiveProductBySlug, isProductCatalogReadError } from "@/server/products/queries";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch((error: unknown) => {
    if (!isProductCatalogReadError(error)) {
      throw error;
    }

    return "catalog-error" as const;
  });

  if (product === "catalog-error") {
    return (
      <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <NavigationLink className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/catalog" pendingTitle="Cargando catálogo" pendingDescription="Volvemos a la lista de productos.">
            Volver al catálogo
          </NavigationLink>
          <div className="rounded-xl border p-6 text-muted-foreground">
            No pudimos cargar el producto. Probá de nuevo en unos minutos.
          </div>
        </section>
        <CartSummary />
      </main>
    );
  }

  if (!product) {
    notFound();
  }

  const primaryImage = product.images[0];

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
      <section className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border bg-muted">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="aspect-square w-full object-cover" src={primaryImage.storagePath} alt={primaryImage.altText} />
          ) : (
            <div className="flex aspect-square items-center justify-center text-muted-foreground">Sin imagen</div>
          )}
        </div>

        <div className="space-y-6">
          <NavigationLink className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/catalog" pendingTitle="Cargando catálogo" pendingDescription="Volvemos a la lista de productos.">
            Volver al catálogo
          </NavigationLink>
          <div>
            <p className="text-sm text-muted-foreground">{product.category?.name ?? "Bazar"}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-4 text-2xl font-semibold">
              {formatMoney({ amountCents: product.priceCents, currency: product.currency })}
            </p>
          </div>
          <p className="text-muted-foreground">{product.description}</p>
          <p className="text-sm text-muted-foreground">
            {product.stockQuantity === null ? "Disponible" : `${product.stockQuantity} unidades disponibles`}
          </p>
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
      </section>
      <CartSummary />
    </main>
  );
}
