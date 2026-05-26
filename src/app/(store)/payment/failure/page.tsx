import * as React from "react";
import { PaymentStateView } from "@/components/store/payment-state-view";

export default function PaymentFailurePage() {
  return (
    <PaymentStateView
      tone="failure"
      kicker="Pago no completado"
      title="No pudimos procesar tu pago"
      description="Revisá los datos de tu tarjeta e intentá nuevamente. Si Mercado Pago confirma algo después, la orden se actualizará por webhook."
      panelTitle="Podés intentarlo otra vez"
      panelCopy="No se marcó la orden como pagada desde esta pantalla. Reintentá el pago cuando estés listo o volvé al catálogo para seguir mirando."
      primaryCta={{ href: "/checkout", label: "Reintentar pago" }}
      secondaryCta={{ href: "/catalog", label: "Volver al catálogo" }}
    />
  );
}

