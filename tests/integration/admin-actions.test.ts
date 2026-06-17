import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const supabaseAdmin = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => supabaseAdmin);

const mockGetVariosCategoryId = vi.hoisted(() => vi.fn().mockResolvedValue("varios-cat-id-0000"));

vi.mock("@/server/categories/queries", () => ({
  getVariosCategoryId: mockGetVariosCategoryId,
}));

import { archiveProductAction, createProductAction, createSupabaseProductsRepository, deleteProductAction, updateProductAction } from "@/server/admin/actions/products";
import { archiveOrderAction, updateOrderFulfillmentStatusAction, type OrdersRepository } from "@/server/admin/actions/orders";
import { updateSettingsAction } from "@/server/admin/actions/settings";
import { buildProductImagePath } from "@/server/admin/storage";

const allowAdmin = vi.fn(async () => undefined);

describe("admin product actions", () => {
  it("validates and normalizes product data before creating a product", async () => {
    const repository = { createProduct: vi.fn(async (product) => ({ id: "prod-1", ...product })) };

    await expect(createProductAction({
      name: " Mate Camionero ",
      slug: "mate-camionero",
      description: "Clásico",
      basePriceAmount: "125.00",
      active: "true",
      featured: false,
      stockQuantity: "8",
    }, { repository, assertAdmin: allowAdmin })).resolves.toMatchObject({ id: "prod-1", name: "Mate Camionero", basePriceAmount: "125.00", active: true, stockQuantity: 8 });

    expect(repository.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: "Mate Camionero", slug: "mate-camionero" }));
  });

  it("rejects unsafe product payloads instead of trusting admin form data", async () => {
    const repository = { createProduct: vi.fn() };

    await expect(createProductAction({ name: "x", slug: "../bad", basePriceAmount: "-1" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Producto inválido");
    expect(repository.createProduct).not.toHaveBeenCalled();
  });

  it("rejects invalid product money input before repository mutation", async () => {
    const repository = { createProduct: vi.fn() };

    await expect(createProductAction({
      name: "Mate",
      slug: "mate",
      basePriceAmount: "abc",
    }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Producto inválido");
    await expect(createProductAction({
      name: "Mate",
      slug: "mate",
      basePriceAmount: "-1",
    }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Producto inválido");

    expect(repository.createProduct).not.toHaveBeenCalled();
  });
  it("rejects non-admin product creates before repository mutation", async () => {
    const repository = { createProduct: vi.fn() };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(createProductAction({
      name: "Mate",
      slug: "mate",
      description: "",
      basePriceAmount: "10.00",
    }, { repository, assertAdmin })).rejects.toThrow("No autorizado");

    expect(assertAdmin).toHaveBeenCalledOnce();
    expect(repository.createProduct).not.toHaveBeenCalled();
  });

  it("uploads an optimized product image after creating the product", async () => {
    const repository = {
      createProduct: vi.fn(async (product) => ({ id: "550e8400-e29b-41d4-a716-446655440020", ...product })),
      uploadProductImage: vi.fn(async () => ({ id: "image-1" })),
    };
    const formData = new FormData();
    const image = new File(["webp"], "mate.webp", { type: "image/webp" });

    formData.set("name", "Mate");
    formData.set("slug", "mate");
    formData.set("description", "");
    formData.set("basePriceAmount", "10.00");
    formData.set("productImage", image);
    formData.set("productImageAlt", "Mate listo para cebar");

    await expect(createProductAction(formData, { repository, assertAdmin: allowAdmin })).resolves.toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440020",
    });

    expect(repository.uploadProductImage).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440020",
      expect.objectContaining({ file: image, altText: "Mate listo para cebar" }),
    );
  });

  it("converts normal currency product prices to persisted cents and published surcharge price", async () => {
    const single = vi.fn(async () => ({ data: { id: "prod-1" }, error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue({ from });
    const repository = createSupabaseProductsRepository();

    await expect(repository.createProduct({
      name: "Mate premium",
      slug: "mate-premium",
      description: "",
      basePriceAmount: "200.00",
      applyMercadoPagoSurcharge: true,
      currency: "ARS",
      active: true,
      featured: false,
      stockQuantity: null,
      categoryId: null,
    })).resolves.toEqual({ id: "prod-1" });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      base_price_cents: 20000,
      apply_mercado_pago_surcharge: true,
      price_cents: 22000,
    }));
  });

  it("builds product image paths with deterministic safe segments only", () => {
    expect(buildProductImagePath("550e8400-e29b-41d4-a716-446655440000", { uuidFactory: () => "11111111-1111-4111-8111-111111111111" }))
      .toBe("products/550e8400-e29b-41d4-a716-446655440000/11111111-1111-4111-8111-111111111111");
    expect(() => buildProductImagePath("../escape", { uuidFactory: () => "11111111-1111-4111-8111-111111111111" })).toThrow("ID de producto inválido");
  });

  it("validates product updates server-side", async () => {
    const repository = { updateProduct: vi.fn(async (id, product) => ({ id, ...product })) };

    await expect(updateProductAction("550e8400-e29b-41d4-a716-446655440000", { name: "Yerbera", slug: "yerbera", description: "", basePriceAmount: "50.00" }, { repository, assertAdmin: allowAdmin }))
      .resolves.toMatchObject({ id: "550e8400-e29b-41d4-a716-446655440000", name: "Yerbera" });
    await expect(updateProductAction("bad/id", { name: "Yerbera", slug: "yerbera", basePriceAmount: "50.00" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("ID de producto inválido");
  });

  it("archives products by validated id", async () => {
    const repository = { archiveProduct: vi.fn(async (id) => ({ id, active: false })) };

    await expect(archiveProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin: allowAdmin }))
      .resolves.toEqual({ id: "550e8400-e29b-41d4-a716-446655440000", active: false });
    await expect(archiveProductAction("bad/id", { repository, assertAdmin: allowAdmin })).rejects.toThrow("ID de producto inválido");

    expect(repository.archiveProduct).toHaveBeenCalledOnce();
  });

  it("deletes products only after admin validation and unsafe reference check", async () => {
    const repository = {
      hasUnsafeDeleteReferences: vi.fn(async () => false),
      deleteProduct: vi.fn(async (id) => ({ id })),
    };

    await expect(deleteProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin: allowAdmin, confirmedDelete: true }))
      .resolves.toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });

    expect(repository.hasUnsafeDeleteReferences).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
    expect(repository.deleteProduct).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
  });

  it("checks only unarchived orders when validating unsafe product deletion references", async () => {
    const limit = vi.fn(async () => ({ data: [], error: null }));
    const or = vi.fn(() => ({ limit }));
    const is = vi.fn(() => ({ or }));
    const eq = vi.fn(() => ({ is }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue({ from });

    const repository = createSupabaseProductsRepository();

    await expect(repository.hasUnsafeDeleteReferences("550e8400-e29b-41d4-a716-446655440000")).resolves.toBe(false);

    expect(from).toHaveBeenCalledWith("order_items");
    expect(eq).toHaveBeenCalledWith("product_id", "550e8400-e29b-41d4-a716-446655440000");
    expect(is).toHaveBeenCalledWith("orders.archived_at", null);
    expect(or).toHaveBeenCalledWith("payment_status.eq.pending,inventory_status.in.(reserved,conflict)", { foreignTable: "orders" });
  });

  it("blocks product deletion for pending, reserved, or conflict references", async () => {
    const repository = {
      hasUnsafeDeleteReferences: vi.fn(async () => true),
      deleteProduct: vi.fn(),
    };

    await expect(deleteProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin: allowAdmin, confirmedDelete: true }))
      .rejects.toThrow("No podés eliminar este producto porque tiene órdenes pendientes o reservas activas.");

    expect(repository.deleteProduct).not.toHaveBeenCalled();
  });

  it("rejects invalid or non-admin product deletion before repository mutation", async () => {
    const repository = {
      hasUnsafeDeleteReferences: vi.fn(),
      deleteProduct: vi.fn(),
    };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(deleteProductAction("bad/id", { repository, assertAdmin: allowAdmin, confirmedDelete: true })).rejects.toThrow("ID de producto inválido");
    await expect(deleteProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin, confirmedDelete: true })).rejects.toThrow("No autorizado");

    expect(repository.hasUnsafeDeleteReferences).not.toHaveBeenCalled();
    expect(repository.deleteProduct).not.toHaveBeenCalled();
  });

  it("requires explicit delete confirmation before product repository mutation", async () => {
    const repository = {
      hasUnsafeDeleteReferences: vi.fn(),
      deleteProduct: vi.fn(),
    };

    await expect(deleteProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin: allowAdmin }))
      .rejects.toThrow("Debes confirmar la eliminación del producto.");

    expect(repository.hasUnsafeDeleteReferences).not.toHaveBeenCalled();
    expect(repository.deleteProduct).not.toHaveBeenCalled();
  });

  it("auto-assigns Varios category when no categoryId is provided on create", async () => {
    const repository = { createProduct: vi.fn(async (product) => ({ id: "prod-1", ...product })) };

    await createProductAction({
      name: "Mate",
      slug: "mate",
      description: "",
      basePriceAmount: "10.00",
      active: "true",
    }, { repository, assertAdmin: allowAdmin });

    expect(repository.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: "varios-cat-id-0000",
    }));
  });

  it("preserves explicit categoryId on create", async () => {
    const repository = { createProduct: vi.fn(async (product) => ({ id: "prod-1", ...product })) };

    await createProductAction({
      name: "Mate premium",
      slug: "mate-premium",
      description: "",
      basePriceAmount: "15.00",
      categoryId: "550e8400-e29b-41d4-a716-446655440099",
      active: "true",
    }, { repository, assertAdmin: allowAdmin });

    expect(repository.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: "550e8400-e29b-41d4-a716-446655440099",
    }));
  });
});

describe("admin order actions", () => {
  it("allows explicit fulfillment transitions and persists valid changes", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(async () => ({ paymentStatus: "paid" as const, fulfillmentStatus: "processing" as const })),
      updateFulfillmentStatus: vi.fn(async (orderId, status) => ({ orderId, fulfillmentStatus: status })),
      archiveOrder: vi.fn(),
    };

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin: allowAdmin }))
      .resolves.toEqual({ orderId: "order-1", fulfillmentStatus: "shipped" });
    expect(repository.updateFulfillmentStatus).toHaveBeenCalledWith("order-1", "shipped");
  });

  it("rejects arbitrary or invalid fulfillment transitions", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(async () => ({ paymentStatus: "pending" as const, fulfillmentStatus: "pending" as const })),
      updateFulfillmentStatus: vi.fn(),
      archiveOrder: vi.fn(),
    };

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "delivered" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Estado de orden inválido");
    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Transición de estado inválida");
    expect(repository.updateFulfillmentStatus).not.toHaveBeenCalled();
  });

  it("rejects non-admin order status changes before reading or mutating orders", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(),
      updateFulfillmentStatus: vi.fn(),
      archiveOrder: vi.fn(),
    };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin })).rejects.toThrow("No autorizado");

    expect(assertAdmin).toHaveBeenCalledOnce();
    expect(repository.getOrderStatus).not.toHaveBeenCalled();
    expect(repository.updateFulfillmentStatus).not.toHaveBeenCalled();
  });


  it("archives orders by setting archived_at instead of deleting order history", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(),
      updateFulfillmentStatus: vi.fn(),
      archiveOrder: vi.fn(async (orderId) => ({ id: orderId, archived_at: "2026-06-14T12:00:00.000Z" })),
    };

    await expect(archiveOrderAction("550e8400-e29b-41d4-a716-446655440030", { repository, assertAdmin: allowAdmin }))
      .resolves.toEqual({ id: "550e8400-e29b-41d4-a716-446655440030", archived_at: "2026-06-14T12:00:00.000Z" });

    expect(repository.archiveOrder).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440030");
  });

  it("rejects invalid or non-admin order archives before repository mutation", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(),
      updateFulfillmentStatus: vi.fn(),
      archiveOrder: vi.fn(),
    };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(archiveOrderAction("bad/id", { repository, assertAdmin: allowAdmin })).rejects.toThrow("ID de orden inválido");
    await expect(archiveOrderAction("550e8400-e29b-41d4-a716-446655440030", { repository, assertAdmin })).rejects.toThrow("No autorizado");

    expect(repository.archiveOrder).not.toHaveBeenCalled();
  });
});

describe("admin settings actions", () => {
  it("validates settings before persisting shipping, commission, and analytics", async () => {
    const repository = { upsertSettings: vi.fn(async (settings) => settings) };

    await expect(updateSettingsAction({
      shippingZones: [{ city: "CABA", postalCodePrefix: "14", costCents: "1800" }],
      commission: { enabled: true, type: "percentage", value: "10" },
      analytics: { metaPixelId: "1234567890", gtmId: "GTM-ABCD12" },
    }, { repository, assertAdmin: allowAdmin })).resolves.toMatchObject({ analytics: { metaPixelId: "1234567890", gtmId: "GTM-ABCD12" } });

    expect(repository.upsertSettings).toHaveBeenCalledWith(expect.objectContaining({ shippingZones: [expect.objectContaining({ costCents: 1800 })] }));
  });

  it("rejects malformed analytics IDs and negative costs", async () => {
    const repository = { upsertSettings: vi.fn() };

    await expect(updateSettingsAction({
      shippingZones: [{ city: "CABA", costCents: -1 }],
      commission: { enabled: true, type: "fixed", value: 100 },
      analytics: { metaPixelId: "<script>", gtmId: "bad" },
    }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Configuración inválida");
    expect(repository.upsertSettings).not.toHaveBeenCalled();
  });

  it("rejects non-admin settings updates before repository mutation", async () => {
    const repository = { upsertSettings: vi.fn() };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(updateSettingsAction({
      shippingZones: [],
      commission: { enabled: false, type: "fixed", value: 0 },
      analytics: { metaPixelId: "", gtmId: "" },
    }, { repository, assertAdmin })).rejects.toThrow("No autorizado");

    expect(assertAdmin).toHaveBeenCalledOnce();
    expect(repository.upsertSettings).not.toHaveBeenCalled();
  });
});
