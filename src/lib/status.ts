export const ORDER_FULFILLMENT_STATUSES = ["pending", "processing", "shipped", "cancelled"] as const;
export const ORDER_PAYMENT_STATUSES = ["pending", "paid", "rejected", "cancelled", "refunded"] as const;

export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_STATUSES)[number];
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

const fulfillmentTransitions: Record<OrderFulfillmentStatus, readonly OrderFulfillmentStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export function isFulfillmentStatus(value: unknown): value is OrderFulfillmentStatus {
  return typeof value === "string" && ORDER_FULFILLMENT_STATUSES.includes(value as OrderFulfillmentStatus);
}

export function isPaymentStatus(value: unknown): value is OrderPaymentStatus {
  return typeof value === "string" && ORDER_PAYMENT_STATUSES.includes(value as OrderPaymentStatus);
}

export function assertFulfillmentTransition(current: OrderFulfillmentStatus, next: unknown): OrderFulfillmentStatus {
  if (!isFulfillmentStatus(next)) {
    throw new Error("Estado de orden inválido");
  }

  if (!fulfillmentTransitions[current].includes(next)) {
    throw new Error("Transición de estado inválida");
  }

  return next;
}

