import type { OrderFulfillmentStatus, OrderPaymentStatus } from "@/lib/status";
import { createPaginationState, getPaginationRange, type PaginationInput } from "@/lib/pagination";

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
  listAdminOrders: (pagination?: PaginationInput) => Promise<{ data: AdminOrderRow[] | null; error: unknown; count?: number | null }>;
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
    async listAdminOrders(pagination = {}) {
      const { createSupabaseAdminClient } = await import("@/server/supabase/admin");
      const supabase = createSupabaseAdminClient();
      let query = supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, total_cents, currency, payment_status, fulfillment_status, created_at, order_items(product_name, quantity)", {
          count: pagination.pageSize ? "exact" : undefined,
        })
        .order("created_at", { ascending: false });

      if (pagination.pageSize) {
        const { from, to } = getPaginationRange({ page: pagination.page ?? 1, pageSize: pagination.pageSize });
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      return { data: (data ?? null) as AdminOrderRow[] | null, error, count };
    },
  };
}

export async function listAdminOrders(options: { client?: AdminOrderQueryClient } = {}) {
  const { orders } = await listAdminOrdersPage(options);
  return orders;
}

export async function listAdminOrdersPage(options: { client?: AdminOrderQueryClient } & PaginationInput = {}) {
  const client = options.client ?? createSupabaseAdminOrderQueryClient();
  const { data, error, count } = await client.listAdminOrders({ page: options.page, pageSize: options.pageSize });

  if (error) {
    throw new Error("No pudimos cargar las órdenes.");
  }

  const orders = (data ?? []).map(mapAdminOrderRow);
  return {
    orders,
    pagination: createPaginationState({
      page: options.page ?? 1,
      pageSize: options.pageSize ?? Math.max(1, orders.length),
      totalItems: count ?? orders.length,
    }),
  };
}