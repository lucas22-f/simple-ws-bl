"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Input } from "@/components/ui/input";
import { type FormActionState } from "@/lib/form-state";
import { useCartStore } from "@/stores/cart-store";

type CheckoutState = "idle" | "submitting" | "error";

function getEmailMessage(email: string) {
  if (!email) return { text: "Te mandamos la confirmación a este email.", tone: "neutral" as const };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { text: "Ese email todavía no tiene formato válido.", tone: "error" as const };
  return { text: "Email con formato válido.", tone: "success" as const };
}

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const [state, setState] = useState<CheckoutState>("idle");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FormActionState>({ status: "idle" });
  const emailMessage = useMemo(() => getEmailMessage(email), [email]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkoutItems = useMemo(
    () => items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
    [items],
  );

  async function submitCheckout(formData: FormData) {
    setState("submitting");
    setErrorMessage(null);
    setFeedback({ status: "idle" });

    const buyerEmail = String(formData.get("email") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(buyerEmail)) {
      const message = "Ingresá un email válido antes de pagar.";
      setState("error");
      setErrorMessage(message);
      setFeedback({ status: "error", message });
      return;
    }

    try {
      const response = await fetch("/api/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer: {
            name: String(formData.get("name") ?? ""),
            email: buyerEmail,
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
        const message = payload.error ?? "No pudimos iniciar el pago";
        setState("error");
        setErrorMessage(message);
        setFeedback({ status: "error", message });
        return;
      }

      window.location.assign(payload.checkoutUrl);
    } catch {
      const message = "No pudimos conectar con el checkout. Probá de nuevo.";
      setState("error");
      setErrorMessage(message);
      setFeedback({ status: "error", message });
    }
  }

  const cartIsEmpty = checkoutItems.length === 0;

  return (
    <form action={submitCheckout} className="relative grid gap-4 overflow-hidden rounded-3xl border bg-white p-6 shadow-sm animate-in-up">
      <FormToast state={feedback} errorTitle="Checkout detenido" />
      <LoadingOverlay show={state === "submitting"} title="Preparando tu pago" description="Validamos el carrito y te llevamos a Mercado Pago." />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nombre<Input className="mt-1" name="name" required /></label>
        <label className="block text-sm font-medium">
          Email
          <Input aria-describedby="checkout-email-help" className="mt-1" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <FieldMessage id="checkout-email-help" message={emailMessage.text} tone={emailMessage.tone} />
        </label>
        <label className="block text-sm font-medium">Teléfono<Input className="mt-1" name="phone" required /></label>
        <label className="block text-sm font-medium">Dirección<Input className="mt-1" name="address" required /></label>
        <label className="block text-sm font-medium">Ciudad<Input className="mt-1" name="city" required /></label>
        <label className="block text-sm font-medium">Código postal<Input className="mt-1" name="postalCode" required /></label>
      </div>
      {cartIsEmpty ? <p className="text-sm text-stone-600">Agregá productos al carrito antes de pagar.</p> : null}
      {errorMessage ? <p role="alert" className="text-sm text-red-700 animate-in-fade">{errorMessage}</p> : null}
      <Button type="submit" disabled={cartIsEmpty || state === "submitting"} className="button-lift">
        {state === "submitting" ? "Preparando pago..." : "Pagar con Mercado Pago"}
      </Button>
    </form>
  );
}