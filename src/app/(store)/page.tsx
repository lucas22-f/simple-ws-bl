import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartSummary } from "@/components/cart";
import { formatMoney } from "@/lib/money";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const catalog = await getProductListState();
  const featuredProducts = catalog.products.filter((product) => product.featured).slice(0, 4);

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
      <section className="space-y-8">
        <div className="rounded-3xl bg-muted p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Bazar Online</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
            Cosas lindas para una casa más simple y cálida.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Catálogo activo, carrito local y precios claros. Sin magia: primero bases sólidas, después checkout.
          </p>
          <Link className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground" href="/catalog">
            Ver catálogo
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {featuredProducts.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                <div className="flex items-center justify-between">
                  <strong>{formatMoney({ amountCents: product.priceCents, currency: product.currency })}</strong>
                  <Link className="text-sm font-medium underline-offset-4 hover:underline" href={`/products/${product.slug}`}>
                    Ver detalle
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {catalog.status === "error" ? <p className="rounded-xl border p-6 text-muted-foreground">{catalog.message}</p> : null}
      </section>
      <CartSummary />
    </main>
  );
}
