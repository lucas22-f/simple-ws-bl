import * as React from "react";
import { PaymentReturnCartSync } from "@/components/store/payment-return-cart-sync";
import { PaymentStateView } from "@/components/store/payment-state-view";

export default function PaymentSuccessPage() {
  return (
    <>
      <PaymentReturnCartSync />
      <PaymentStateView
        tone="success"
        kicker="Volviste desde Mercado Pago"
        title="Estamos verificando tu pago"
        description="Tu regreso al sitio no confirma el estado final de la orden. El estado final se actualiza cuando el servidor recibe la confirmación definitiva."
        panelTitle="Confirmación segura"
        panelCopy="El webhook firmado de Mercado Pago es la fuente de verdad para marcar una orden como pagada. Esta pantalla solo confirma que el flujo de pago volvió a la tienda."
        primaryCta={{ href: "/catalog", label: "Seguir comprando" }}
      />
    </>
  );
}
