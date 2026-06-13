import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const supabaseAdmin = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => supabaseAdmin);

import { GET } from "@/app/api/orders/payment-return/route";
import { getPaymentReturnOrder } from "@/server/orders/payment-return";

const paidOrderId = "11111111-1111-4111-8111-111111111111";
const pendingOrderId = "22222222-2222-4222-8222-222222222222";

function createOrderQuery(row: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table !== "orders") {
      throw new Error(`Unexpected table ${table}`);
    }
    return query;
  });

  return { from, query };
}

describe("payment return lookup", () => {
  it("returns paid status with minimal purchased item quantities for a valid order", async () => {
    const supabase = createOrderQuery({
      id: paidOrderId,
      payment_status: "paid",
      order_items: [
        { product_id: "prod-mate", quantity: 2 },
        { product_id: "prod-bombilla", quantity: 1 },
      ],
    });
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);

    await expect(getPaymentReturnOrder(paidOrderId)).resolves.toEqual({
      paymentStatus: "paid",
      items: [
        { productId: "prod-mate", quantity: 2 },
        { productId: "prod-bombilla", quantity: 1 },
      ],
    });
    expect(supabase.query.select).toHaveBeenCalledWith("id, payment_status, order_items(product_id, quantity)");
    expect(supabase.query.eq).toHaveBeenCalledWith("id", paidOrderId);
  });

  it("preserves the cart by omitting items when the valid order is not paid", async () => {
    const supabase = createOrderQuery({
      id: pendingOrderId,
      payment_status: "pending",
      order_items: [{ product_id: "prod-mate", quantity: 2 }],
    });
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);

    await expect(getPaymentReturnOrder(pendingOrderId)).resolves.toEqual({
      paymentStatus: "pending",
      items: [],
    });
  });

  it("rejects invalid order identifiers before querying the database", async () => {
    const supabase = createOrderQuery(null);
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);

    await expect(getPaymentReturnOrder("not-a-uuid")).rejects.toThrow("Identificador de orden inválido");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("exposes only status and items from the API route", async () => {
    const supabase = createOrderQuery({
      id: paidOrderId,
      payment_status: "paid",
      order_items: [{ product_id: "prod-mate", quantity: 2 }],
    });
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);

    const response = await GET(new Request(`https://bazar.test/api/orders/payment-return?order_id=${paidOrderId}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      paymentStatus: "paid",
      items: [{ productId: "prod-mate", quantity: 2 }],
    });
  });
});
