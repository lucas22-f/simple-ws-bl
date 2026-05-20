"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";

type CheckoutState = "idle" | "submitting" | "error";

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const [state, setState] = useState<CheckoutState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkoutItems = useMemo(
    () => items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
    [items],
  );

  async function submitCheckout(formData: FormData) {
    setState("submitting");
    setErrorMessage(null);

    const response = await fetch("/api/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer: {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          address: String(formData.get("address") ?? ""),
          city: String(formData.get("city") ?? ""),
          postalCode: String(formData.get("postalCode") ?? ""),
        },
        items: checkoutItems,
      }),
    });
    const payload = await response.json() as { checkoutUrl?: string; error?: string };

    if (!response.ok || !payload.checkoutUrl) {
      setState("error");
      setErrorMessage(payload.error ?? "No pudimos iniciar el pago");
      return;
    }

    window.location.assign(payload.checkoutUrl);
  }

  const cartIsEmpty = checkoutItems.length === 0;

  return (
    <form action={submitCheckout} className="grid gap-4 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nombre<Input className="mt-1" name="name" required /></label>
        <label className="block text-sm font-medium">Email<Input className="mt-1" name="email" type="email" required /></label>
        <label className="block text-sm font-medium">Teléfono<Input className="mt-1" name="phone" required /></label>
        <label className="block text-sm font-medium">Dirección<Input className="mt-1" name="address" required /></label>
        <label className="block text-sm font-medium">Ciudad<Input className="mt-1" name="city" required /></label>
        <label className="block text-sm font-medium">Código postal<Input className="mt-1" name="postalCode" required /></label>
      </div>
      {cartIsEmpty ? <p className="text-sm text-stone-600">Agregá productos al carrito antes de pagar.</p> : null}
      {errorMessage ? <p role="alert" className="text-sm text-red-700">{errorMessage}</p> : null}
      <Button type="submit" disabled={cartIsEmpty || state === "submitting"}>
        {state === "submitting" ? "Preparando pago..." : "Pagar con Mercado Pago"}
      </Button>
    </form>
  );
}