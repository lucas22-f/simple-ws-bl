"use client";
import * as React from "react";

import { NavigationLink } from "@/components/ui/navigation-link";
import { ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";

export function CartSummary() {
  const items = useCartStore((state) => state.items);
  const subtotalCents = useCartStore((state) => state.getSubtotalCents());
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const currency = items[0]?.currency ?? "ARS";

  return (
    <aside className="rounded-3xl border border-border bg-card p-5 text-sm shadow-sm animate-in-up" aria-label="Resumen del carrito">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-muted text-primary">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            </span>
            Carrito
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Tu compra queda a mano mientras explorás.</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{itemCount} productos</span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-muted-foreground">Subtotal</span>
        <strong className="font-heading text-lg text-foreground">{formatMoney({ amountCents: subtotalCents, currency })}</strong>
      </div>
      <p className="mt-3 rounded-2xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
        El checkout revalidará precio y disponibilidad en servidor.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <NavigationLink
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/catalog"
          pendingTitle="Cargando catálogo"
          pendingDescription="Buscamos los productos activos para vos."
        >
          Seguir comprando
        </NavigationLink>
        {itemCount > 0 ? (
          <NavigationLink
            className="button-lift inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/checkout"
            pendingTitle="Cargando checkout"
            pendingDescription="Preparamos el resumen para finalizar la compra."
          >
            Finalizar compra
          </NavigationLink>
        ) : null}
      </div>
    </aside>
  );
}
