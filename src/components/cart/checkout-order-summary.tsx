"use client";

import * as React from "react";
import { LockKeyhole, ShieldCheck, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";

export function CheckoutOrderSummary() {
  const items = useCartStore((state) => state.items);
  const subtotalCents = useCartStore((state) => state.getSubtotalCents());
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const currency = items[0]?.currency ?? "ARS";

  return (
    <aside className="rounded-3xl border border-border bg-card p-6 text-sm shadow-sm animate-in-up lg:sticky lg:top-8" aria-label="Tu pedido">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Resumen</p>
          <h2 className="mt-2 font-heading text-xl text-foreground">Tu pedido</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-primary">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-4" aria-label="Productos del pedido">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={`Imagen de ${item.name}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sin foto
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium text-foreground">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">x{item.quantity}</p>
              </div>
              <p className="font-heading text-foreground">
                {formatMoney({ amountCents: item.quantity * item.unitPriceCents, currency: item.currency })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
          Agregá productos al carrito antes de pagar.
        </div>
      )}

      <div className="mt-5 space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Productos</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatMoney({ amountCents: subtotalCents, currency })}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 font-heading text-lg text-foreground">
          <span>Total estimado</span>
          <span className="text-primary">{formatMoney({ amountCents: subtotalCents, currency })}</span>
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
        El total final se recalcula en servidor con productos activos, stock y configuración vigente.
      </p>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-background px-3 py-2">
          <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Pago seguro con Mercado Pago
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-background px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Validación en servidor
        </span>
      </div>
    </aside>
  );
}

