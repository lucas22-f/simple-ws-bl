import type { OrderFulfillmentStatus, OrderPaymentStatus } from "@/lib/status";

export type AdminOrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_cents: number;
  currency: string;
  payment_status: OrderPaymentStatus;
  fulfillment_status: OrderFulfillmentStatus;
  created_at: string;
  order_items: { product_name: string; quantity: number }[] | null;
};

export type AdminOrder = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  totalCents: number;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

export type AdminOrderQueryClient = {
  listAdminOrders: () => Promise<{ data: AdminOrderRow[] | null; error: unknown }>;
};

export function mapAdminOrderRow(row: AdminOrderRow): AdminOrder {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    totalCents: row.total_cents,
    currency: row.currency,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
    })),
  };
}

export function createSupabaseAdminOrderQueryClient(): AdminOrderQueryClient {
  return {
    async listAdminOrders() {
      const { createSupabaseAdminClient } = await import("@/server/supabase/admin");
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, total_cents, currency, payment_status, fulfillment_status, created_at, order_items(product_name, quantity)")
        .order("created_at", { ascending: false })
        .limit(50);

      return { data: (data ?? null) as AdminOrderRow[] | null, error };
    },
  };
}

export async function listAdminOrders(options: { client?: AdminOrderQueryClient } = {}) {
  const client = options.client ?? createSupabaseAdminOrderQueryClient();
  const { data, error } = await client.listAdminOrders();

  if (error) {
    throw new Error("No pudimos cargar las órdenes.");
  }

  return (data ?? []).map(mapAdminOrderRow);
}
