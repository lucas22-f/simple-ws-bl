"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Input } from "@/components/ui/input";
import { type FormActionState } from "@/lib/form-state";
import { useCartStore } from "@/stores/cart-store";

type CheckoutState = "idle" | "submitting" | "error";

export function getCheckoutEmailMessage(email: string) {
  if (!email) return { text: "Usamos este email para identificar el pedido en el checkout.", tone: "neutral" as const };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { text: "Ese email todavía no tiene formato válido.", tone: "error" as const };
  return { text: "Email con formato válido.", tone: "success" as const };
}

type CheckoutFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: React.ReactNode;
};

function CheckoutField({ label, helper, className, ...props }: CheckoutFieldProps) {
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input className={className} {...props} />
      {helper}
    </label>
  );
}

type CheckoutSectionProps = {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function CheckoutSection({ step, title, description, children }: CheckoutSectionProps) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm animate-in-up sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <div>
          <h2 className="font-heading text-lg text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const [state, setState] = useState<CheckoutState>("idle");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FormActionState>({ status: "idle" });
  const emailMessage = useMemo(() => getCheckoutEmailMessage(email), [email]);
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
    <form action={submitCheckout} className="relative space-y-4 overflow-hidden" aria-label="Datos para finalizar la compra">
      <FormToast state={feedback} errorTitle="Checkout detenido" />
      <LoadingOverlay
        show={state === "submitting"}
        title="Preparando tu pago"
        description="Validamos el carrito en servidor y te llevamos a Mercado Pago."
      />

      <CheckoutSection step="1" title="Datos de contacto" description="Usamos estos datos para identificar el pedido antes de pagar.">
        <CheckoutField label="Nombre" name="name" required />
        <CheckoutField
          label="Email"
          aria-describedby="checkout-email-help"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          helper={<FieldMessage id="checkout-email-help" message={emailMessage.text} tone={emailMessage.tone} />}
        />
        <CheckoutField label="Teléfono" name="phone" required />
      </CheckoutSection>

      <CheckoutSection step="2" title="Datos de entrega" description="La disponibilidad y costos se recalculan antes de crear la orden.">
        <CheckoutField label="Dirección" name="address" required />
        <CheckoutField label="Ciudad" name="city" required />
        <CheckoutField label="Código postal" name="postalCode" required />
      </CheckoutSection>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm animate-in-up sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-foreground">Pago con Mercado Pago</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Primero validamos tu carrito en servidor; después abrimos Mercado Pago para el cobro seguro.
            </p>
          </div>
          <Button type="submit" disabled={cartIsEmpty || state === "submitting"} className="button-lift min-h-12 px-6">
            {state === "submitting" ? "Preparando pago..." : "Pagar con Mercado Pago"}
          </Button>
        </div>

        {cartIsEmpty ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
            Agregá productos al carrito antes de pagar.
          </p>
        ) : null}
        {errorMessage ? <p role="alert" className="mt-4 text-sm text-red-700 animate-in-fade">{errorMessage}</p> : null}
      </section>
    </form>
  );
}
