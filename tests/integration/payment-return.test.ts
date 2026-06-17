import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const supabaseAdmin = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => supabaseAdmin);
vi.mock("@/server/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/security/rate-limit")>();
  return {
    ...actual,
    createDefaultRateLimiter: vi.fn(() => limiter),
  };
});

import { GET } from "@/app/api/orders/payment-return/route";
import { getPaymentReturnOrder } from "@/server/orders/payment-return";

const paidOrderId = "11111111-1111-4111-8111-111111111111";
const pendingOrderId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  limiter.consume.mockReset();
  limiter.consume.mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 0,
    remaining: 19,
    resetAt: new Date("2026-06-05T12:01:00.000Z"),
  });
});

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
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "orders:payment-return:ip",
      identity: "unknown",
      limit: 20,
      windowSeconds: 60,
    }));
  });

  it("returns 429 before querying orders when payment-return polling is rate limited", async () => {
    const supabase = createOrderQuery({
      id: paidOrderId,
      payment_status: "paid",
      order_items: [{ product_id: "prod-mate", quantity: 2 }],
    });
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);
    limiter.consume.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 30,
      remaining: 0,
      resetAt: new Date("2026-06-05T12:01:30.000Z"),
    });

    const response = await GET(new Request(`https://bazar.test/api/orders/payment-return?order_id=${paidOrderId}`, {
      headers: { "x-forwarded-for": "198.51.100.50, 10.0.0.1" },
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    await expect(response.json()).resolves.toEqual({ error: "Demasiados intentos. Probá de nuevo en unos minutos." });
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "orders:payment-return:ip",
      identity: "198.51.100.50",
    }));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not leak invalid order identifier details through the API route", async () => {
    const supabase = createOrderQuery(null);
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);

    const response = await GET(new Request("https://bazar.test/api/orders/payment-return?order_id=not-a-uuid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No pudimos verificar el estado de la orden" });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
