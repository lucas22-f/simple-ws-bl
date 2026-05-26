import * as React from "react";
import { PaymentStateView } from "@/components/store/payment-state-view";

export default function PaymentPendingPage() {
  return (
    <PaymentStateView
      tone="pending"
      kicker="Pago pendiente"
      title="Tu pago está siendo procesado"
      description="Guardá esta pantalla como referencia. Mientras tanto, no hace falta volver a pagar."
      panelTitle="Qué pasa ahora"
      panelCopy="Mercado Pago todavía está procesando el resultado y nos avisará el estado final mediante el webhook firmado."
      primaryCta={{ href: "/catalog", label: "Volver al catálogo" }}
      secondaryCta={{ href: "/checkout", label: "Revisar checkout" }}
    />
  );
}

