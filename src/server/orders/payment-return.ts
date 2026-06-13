import "server-only";
import { isPaymentStatus, type OrderPaymentStatus } from "@/lib/status";

export type PaymentReturnOrder = {
  paymentStatus: OrderPaymentStatus;
  items: { productId: string; quantity: number }[];
};

type PaymentReturnOrderRow = {
  id: string;
  payment_status: unknown;
  order_items: { product_id: string | null; quantity: number | null }[] | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidOrderId(orderId: string) {
  if (!UUID_PATTERN.test(orderId)) {
    throw new Error("Identificador de orden inválido");
  }
}

function mapPaymentReturnOrder(row: PaymentReturnOrderRow): PaymentReturnOrder {
  if (!isPaymentStatus(row.payment_status)) {
    throw new Error("Estado de pago inválido");
  }

  return {
    paymentStatus: row.payment_status,
    items:
      row.payment_status === "paid"
        ? (row.order_items ?? [])
            .filter((item): item is { product_id: string; quantity: number } => Boolean(item.product_id) && Number.isFinite(item.quantity))
            .map((item) => ({ productId: item.product_id, quantity: Math.max(0, Math.trunc(item.quantity)) }))
            .filter((item) => item.quantity > 0)
        : [],
  };
}

export async function getPaymentReturnOrder(orderId: string): Promise<PaymentReturnOrder | null> {
  assertValidOrderId(orderId);

  const { createSupabaseAdminClient } = await import("@/server/supabase/admin");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, payment_status, order_items(product_id, quantity)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos verificar el estado de la orden");
  }

  return data ? mapPaymentReturnOrder(data as PaymentReturnOrderRow) : null;
}
