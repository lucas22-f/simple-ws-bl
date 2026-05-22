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
    <aside className="rounded-xl border bg-card p-4 text-sm shadow-sm animate-in-up" aria-label="Resumen del carrito">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Carrito
        </div>
        <span>{itemCount} productos</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground">Subtotal</span>
        <strong>{formatMoney({ amountCents: subtotalCents, currency })}</strong>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        El checkout revalidará precio y disponibilidad en servidor.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <NavigationLink className="text-sm font-medium underline-offset-4 hover:underline" href="/catalog" pendingTitle="Cargando catálogo" pendingDescription="Buscamos los productos activos para vos.">
          Seguir comprando
        </NavigationLink>
        {itemCount > 0 ? (
          <NavigationLink className="button-lift inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" href="/checkout" pendingTitle="Cargando checkout" pendingDescription="Preparamos el resumen para finalizar la compra.">
            Finalizar compra
          </NavigationLink>
        ) : null}
      </div>
    </aside>
  );
}


