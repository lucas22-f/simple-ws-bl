import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { CheckoutForm, CheckoutOrderSummary } from "@/components/cart";
import { Card } from "@/components/ui/card";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al catálogo
          </Link>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm animate-in-up">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">Checkout seguro</p>
            <h1 className="mt-3 font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
              Prepará tu pedido con confianza
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Completá tus datos y validamos el carrito en servidor antes de crear la orden. Nada se confirma hasta que
              Mercado Pago avisa el resultado por webhook firmado.
            </p>
          </section>

          <CheckoutForm />

          <Card className="space-y-5 p-6 animate-in-up">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-heading text-xl text-foreground">Qué pasa al pagar</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Mercado Pago procesa el cobro, pero la orden se actualiza con confirmación del servidor.
                </p>
              </div>
            </div>
            <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-3"><span className="font-heading text-primary">1.</span>Validamos comprador, cantidades y productos activos.</li>
              <li className="flex gap-3"><span className="font-heading text-primary">2.</span>Recalculamos subtotal, envío, comisión y total en servidor.</li>
              <li className="flex gap-3"><span className="font-heading text-primary">3.</span>Creamos una orden pendiente y recién ahí generamos la preferencia de Mercado Pago.</li>
              <li className="flex gap-3"><span className="font-heading text-primary">4.</span>La vuelta de Mercado Pago es solo informativa: el webhook firmado confirma el pago.</li>
            </ol>
            <p className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Tus datos viajan al checkout seguro cuando el servidor aprueba el pedido.
            </p>
          </Card>
        </section>

        <CheckoutOrderSummary />
      </div>
    </main>
  );
}
