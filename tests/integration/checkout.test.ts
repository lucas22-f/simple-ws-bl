import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const supabaseAdmin = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => supabaseAdmin);

import { createCheckoutOrder, createSupabaseCheckoutRepository } from "@/server/checkout/create-order";
import { createCheckoutPreference } from "@/server/checkout/create-preference";
import type { CheckoutRepository } from "@/server/checkout/calculate";
import type { PreferenceGateway } from "@/server/payments/mercado-pago";

const validBuyer = {
  name: "Ana Gomez",
  email: "ana@example.com",
  phone: "+5491112345678",
  address: "Av. Siempre Viva 742",
  city: "CABA",
  postalCode: "1405",
};

function createRepository(): CheckoutRepository {
  return {
    async getActiveProductsByIds(productIds) {
      return [
        {
          id: productIds[0],
          name: "Mate camionero",
          slug: "mate-camionero",
          priceCents: 12500,
          currency: "ARS",
          stockQuantity: 10,
        },
      ];
    },
    async getCheckoutSettings() {
      return {
        shippingZones: [{ city: "CABA", postalCodePrefix: "14", costCents: 1800 }],
        commission: { enabled: true, percent: 10, fixedCents: 250 },
      };
    },
    async createPendingOrder(order) {
      return { id: "order-1", externalReference: order.externalReference };
    },
  };
}

function createSupabaseMock() {
  const productsQuery = {
    select: vi.fn(() => productsQuery),
    in: vi.fn(() => productsQuery),
    eq: vi.fn(async () => ({
      data: [{ id: "prod-1", name: "Mate camionero", slug: "mate-camionero", price_cents: 12500, currency: "ARS", stock_quantity: 10 }],
      error: null,
    })),
  };
  const settingsQuery = {
    select: vi.fn(() => settingsQuery),
    in: vi.fn(async () => ({
      data: [
        { key: "shipping_zones", value: [{ city: "CABA", postalCodePrefix: "14", costCents: 1800 }] },
        { key: "commission", value: { enabled: true, percent: 10, fixedCents: 250 } },
      ],
      error: null,
    })),
  };
  const updatePreferenceQuery = {
    update: vi.fn(() => updatePreferenceQuery),
    eq: vi.fn(async () => ({ error: null })),
  };
  const ordersInsert = vi.fn();
  const orderItemsInsert = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "products") return productsQuery;
    if (table === "settings") return settingsQuery;
    if (table === "orders") return { insert: ordersInsert, update: updatePreferenceQuery.update };
    if (table === "order_items") return { insert: orderItemsInsert };
    throw new Error(`Unexpected table ${table}`);
  });
  const rpc = vi.fn(async () => ({ data: { id: "order-1", external_reference: "order-ext-default" }, error: null }));
  return { from, rpc, ordersInsert, orderItemsInsert, updatePreferenceQuery };
}

describe("checkout order creation", () => {
  it("ignores tampered client prices and creates immutable server-side snapshots", async () => {
    const repository = createRepository();
    const createPendingOrder = vi.spyOn(repository, "createPendingOrder");

    const result = await createCheckoutOrder(
      {
        buyer: validBuyer,
        items: [{ productId: "prod-1", quantity: 2, unitPriceCents: 1_00 }],
      },
      { repository, externalReferenceFactory: () => "order-ext-1" },
    );

    expect(result.totals).toEqual({ subtotalCents: 25000, shippingCents: 1800, commissionCents: 2750, totalCents: 29550, currency: "ARS" });
    expect(createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyer: validBuyer,
        externalReference: "order-ext-1",
        items: [
          {
            productId: "prod-1",
            productName: "Mate camionero",
            productSlug: "mate-camionero",
            unitPriceCents: 12500,
            quantity: 2,
            lineTotalCents: 25000,
          },
        ],
      }),
    );
  });

  it("rejects empty carts and quantities beyond available stock", async () => {
    const repository = createRepository();

    await expect(createCheckoutOrder({ buyer: validBuyer, items: [] }, { repository })).rejects.toThrow("El carrito está vacío");
    await expect(
      createCheckoutOrder({ buyer: validBuyer, items: [{ productId: "prod-1", quantity: 99 }] }, { repository }),
    ).rejects.toThrow("Stock insuficiente para Mate camionero");
  });

  it("creates orders and items through the atomic database RPC instead of split inserts", async () => {
    const supabase = createSupabaseMock();
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);
    const repository = createSupabaseCheckoutRepository();

    await expect(repository.createPendingOrder({
      buyer: validBuyer,
      shippingAddress: { address: validBuyer.address, city: validBuyer.city, postalCode: validBuyer.postalCode },
      items: [{ productId: "prod-1", productName: "Mate camionero", productSlug: "mate-camionero", unitPriceCents: 12500, quantity: 1, lineTotalCents: 12500 }],
      totals: { subtotalCents: 12500, shippingCents: 1800, commissionCents: 1500, totalCents: 15800, currency: "ARS" },
      externalReference: "order-ext-default",
    })).resolves.toEqual({ id: "order-1", externalReference: "order-ext-default" });

    expect(supabase.rpc).toHaveBeenCalledWith("create_pending_order", expect.objectContaining({
      p_order: expect.objectContaining({ external_reference: "order-ext-default" }),
      p_items: [expect.objectContaining({ product_id: "prod-1", quantity: 1 })],
    }));
    expect(supabase.ordersInsert).not.toHaveBeenCalled();
    expect(supabase.orderItemsInsert).not.toHaveBeenCalled();
  });

  it("does not leave a split pending order path when atomic item creation fails", async () => {
    const supabase = createSupabaseMock();
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "item insert failed" } } as never);
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);
    const repository = createSupabaseCheckoutRepository();

    await expect(repository.createPendingOrder({
      buyer: validBuyer,
      shippingAddress: { address: validBuyer.address, city: validBuyer.city, postalCode: validBuyer.postalCode },
      items: [{ productId: "prod-1", productName: "Mate camionero", productSlug: "mate-camionero", unitPriceCents: 12500, quantity: 1, lineTotalCents: 12500 }],
      totals: { subtotalCents: 12500, shippingCents: 1800, commissionCents: 1500, totalCents: 15800, currency: "ARS" },
      externalReference: "order-ext-default",
    })).rejects.toThrow("No pudimos crear la orden");

    expect(supabase.ordersInsert).not.toHaveBeenCalled();
    expect(supabase.orderItemsInsert).not.toHaveBeenCalled();
  });
});

describe("Mercado Pago preference creation", () => {
  it("creates a pending order before requesting a Mercado Pago preference", async () => {
    const repository = createRepository();
    const gateway: PreferenceGateway = {
      createPreference: vi.fn(async () => ({ preferenceId: "pref-1", checkoutUrl: "https://mp.test/checkout" })),
    };

    const result = await createCheckoutPreference(
      { buyer: validBuyer, items: [{ productId: "prod-1", quantity: 1, unitPriceCents: 1 }] },
      { repository, gateway, siteUrl: "https://bazar.test", externalReferenceFactory: () => "order-ext-2" },
    );

    expect(result).toEqual({ orderId: "order-1", checkoutUrl: "https://mp.test/checkout", preferenceId: "pref-1" });
    expect(gateway.createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        externalReference: "order-ext-2",
        totalCents: 15800,
        returnUrls: {
          success: "https://bazar.test/payment/success?order_id=order-1",
          failure: "https://bazar.test/payment/failure?order_id=order-1",
          pending: "https://bazar.test/payment/pending?order_id=order-1",
        },
      }),
    );
    expect(gateway.createPreference).not.toHaveBeenCalledWith(
      expect.objectContaining({ notificationUrl: expect.anything() }),
    );
  });

  it("persists the Mercado Pago preference ID when using the default production repository", async () => {
    const supabase = createSupabaseMock();
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue(supabase);
    const gateway: PreferenceGateway = {
      createPreference: vi.fn(async () => ({ preferenceId: "pref-default", checkoutUrl: "https://mp.test/default" })),
    };

    await expect(createCheckoutPreference(
      { buyer: validBuyer, items: [{ productId: "prod-1", quantity: 1, unitPriceCents: 1 }] },
      { gateway, siteUrl: "https://bazar.test", externalReferenceFactory: () => "order-ext-default" },
    )).resolves.toEqual({ orderId: "order-1", checkoutUrl: "https://mp.test/default", preferenceId: "pref-default" });

    expect(supabase.updatePreferenceQuery.update).toHaveBeenCalledWith({ mercado_pago_preference_id: "pref-default" });
    expect(supabase.updatePreferenceQuery.eq).toHaveBeenCalledWith("id", "order-1");
  });
});

