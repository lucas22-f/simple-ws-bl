import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartSummary } from "@/components/cart";
import { NavigationLink } from "@/components/ui/navigation-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatMoney } from "@/lib/money";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams?: Promise<{ q?: string; category?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const catalog = await getProductListState({ search: params?.q, category: params?.category });
  const products = catalog.products;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        <div>
          <NavigationLink className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/" pendingTitle="Cargando inicio" pendingDescription="Volvemos a la tienda principal.">
            Inicio
          </NavigationLink>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Catálogo</h1>
          <p className="mt-2 text-muted-foreground">Solo productos activos publicados para clientes.</p>
        </div>

        <form className="flex gap-3 animate-in-up" action="/catalog">
          <Input name="q" placeholder="Buscar por nombre o descripción" defaultValue={params?.q ?? ""} />
          <SubmitButton className="button-lift rounded-md px-4" pendingLabel="Buscando...">
            Buscar
          </SubmitButton>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="animate-in-up transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{product.category?.name ?? "Bazar"}</p>
                <p className="line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
                <div className="flex items-center justify-between">
                  <strong>{formatMoney({ amountCents: product.priceCents, currency: product.currency })}</strong>
                  <NavigationLink className="text-sm font-medium underline-offset-4 hover:underline" href={`/products/${product.slug}`} pendingTitle="Cargando detalle" pendingDescription="Preparamos la ficha completa del producto.">
                    Ver producto
                  </NavigationLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {catalog.status === "error" ? (
          <p className="rounded-xl border p-6 text-muted-foreground">{catalog.message}</p>
        ) : products.length === 0 ? (
          <p className="rounded-xl border p-6 text-muted-foreground">No encontramos productos activos.</p>
        ) : null}
      </section>
      <CartSummary />
    </main>
  );
}

