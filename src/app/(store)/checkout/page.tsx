import Link from "next/link";
import { CartSummary, CheckoutForm } from "@/components/cart";
import { Card } from "@/components/ui/card";

export default function CheckoutPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        <Link href="/catalog" className="text-sm font-medium text-amber-700 hover:text-amber-900">
          ← Volver al catálogo
        </Link>
        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-700">Checkout seguro</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Datos para preparar tu pedido</h1>
          <p className="text-stone-700">
            El carrito se valida en el servidor antes de crear la orden. Los precios visibles son referencia: el total final se
            recalcula con productos activos, stock y configuración vigente.
          </p>
        </section>
        <CheckoutForm />
        <Card className="space-y-4 p-6">
          <h2 className="text-xl font-semibold text-stone-950">Qué pasa al pagar</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
            <li>Validamos comprador, cantidades y productos activos.</li>
            <li>Recalculamos subtotal, envío, comisión y total en servidor.</li>
            <li>Creamos una orden pendiente y recién ahí generamos la preferencia de Mercado Pago.</li>
            <li>La vuelta de Mercado Pago es solo informativa: el webhook firmado confirma el pago.</li>
          </ol>
        </Card>
      </section>
      <CartSummary />
    </main>
  );
}