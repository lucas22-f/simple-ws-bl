import "server-only";
import { z } from "zod";
import { assertFulfillmentTransition, type OrderFulfillmentStatus, type OrderPaymentStatus } from "@/lib/status";
import { assertAdminActionAccess, type AdminActionAuthOptions } from "@/server/admin/actions/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.string().min(1),
});

export type OrderStatusSnapshot = {
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
};

export type OrdersRepository = {
  getOrderStatus(orderId: string): Promise<OrderStatusSnapshot>;
  updateFulfillmentStatus(orderId: string, status: OrderFulfillmentStatus): Promise<unknown>;
};

type OrderActionOptions = AdminActionAuthOptions & {
  repository?: OrdersRepository;
};

export function createSupabaseOrdersRepository(): OrdersRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async getOrderStatus(orderId) {
      const { data, error } = await supabase.from("orders").select("payment_status,fulfillment_status").eq("id", orderId).single();
      if (error || !data) throw new Error("No pudimos cargar la orden");
      return { paymentStatus: data.payment_status, fulfillmentStatus: data.fulfillment_status } as OrderStatusSnapshot;
    },
    async updateFulfillmentStatus(orderId, status) {
      const { data, error } = await supabase.from("orders").update({ fulfillment_status: status }).eq("id", orderId).select("*").single();
      if (error) throw new Error("No pudimos actualizar la orden");
      return data;
    },
  };
}

function normalizeRawOrderInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    return { orderId: rawInput.get("orderId"), status: rawInput.get("status") };
  }
  return rawInput;
}

export async function updateOrderFulfillmentStatusAction(rawInput: unknown, options: OrderActionOptions = {}) {
  await assertAdminActionAccess(options);
  const parsed = updateOrderStatusSchema.safeParse(normalizeRawOrderInput(rawInput));
  if (!parsed.success) throw new Error("Estado de orden inválido");
  const repository = options.repository ?? createSupabaseOrdersRepository();
  const current = await repository.getOrderStatus(parsed.data.orderId);
  const next = assertFulfillmentTransition(current.fulfillmentStatus, parsed.data.status);
  return repository.updateFulfillmentStatus(parsed.data.orderId, next);
}
