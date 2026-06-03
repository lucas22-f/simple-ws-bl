import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { archiveProductAction, createProductAction, updateProductAction } from "@/server/admin/actions/products";
import { updateOrderFulfillmentStatusAction, type OrdersRepository } from "@/server/admin/actions/orders";
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
      priceCents: "12500",
      active: "true",
      featured: false,
      stockQuantity: "8",
    }, { repository, assertAdmin: allowAdmin })).resolves.toMatchObject({ id: "prod-1", name: "Mate Camionero", priceCents: 12500, active: true, stockQuantity: 8 });

    expect(repository.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: "Mate Camionero", slug: "mate-camionero" }));
  });

  it("rejects unsafe product payloads instead of trusting admin form data", async () => {
    const repository = { createProduct: vi.fn() };

    await expect(createProductAction({ name: "x", slug: "../bad", priceCents: -1 }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Producto inválido");
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
      priceCents: 1000,
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
    formData.set("priceCents", "1000");
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

  it("builds product image paths with deterministic safe segments only", () => {
    expect(buildProductImagePath("550e8400-e29b-41d4-a716-446655440000", { uuidFactory: () => "11111111-1111-4111-8111-111111111111" }))
      .toBe("products/550e8400-e29b-41d4-a716-446655440000/11111111-1111-4111-8111-111111111111");
    expect(() => buildProductImagePath("../escape", { uuidFactory: () => "11111111-1111-4111-8111-111111111111" })).toThrow("ID de producto inválido");
  });

  it("validates product updates server-side", async () => {
    const repository = { updateProduct: vi.fn(async (id, product) => ({ id, ...product })) };

    await expect(updateProductAction("550e8400-e29b-41d4-a716-446655440000", { name: "Yerbera", slug: "yerbera", description: "", priceCents: 5000 }, { repository, assertAdmin: allowAdmin }))
      .resolves.toMatchObject({ id: "550e8400-e29b-41d4-a716-446655440000", name: "Yerbera" });
    await expect(updateProductAction("bad/id", { name: "Yerbera", slug: "yerbera", priceCents: 5000 }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("ID de producto inválido");
  });

  it("archives products by validated id", async () => {
    const repository = { archiveProduct: vi.fn(async (id) => ({ id, active: false })) };

    await expect(archiveProductAction("550e8400-e29b-41d4-a716-446655440000", { repository, assertAdmin: allowAdmin }))
      .resolves.toEqual({ id: "550e8400-e29b-41d4-a716-446655440000", active: false });
    await expect(archiveProductAction("bad/id", { repository, assertAdmin: allowAdmin })).rejects.toThrow("ID de producto inválido");

    expect(repository.archiveProduct).toHaveBeenCalledOnce();
  });
});

describe("admin order actions", () => {
  it("allows explicit fulfillment transitions and persists valid changes", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(async () => ({ paymentStatus: "paid" as const, fulfillmentStatus: "processing" as const })),
      updateFulfillmentStatus: vi.fn(async (orderId, status) => ({ orderId, fulfillmentStatus: status })),
    };

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin: allowAdmin }))
      .resolves.toEqual({ orderId: "order-1", fulfillmentStatus: "shipped" });
    expect(repository.updateFulfillmentStatus).toHaveBeenCalledWith("order-1", "shipped");
  });

  it("rejects arbitrary or invalid fulfillment transitions", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(async () => ({ paymentStatus: "pending" as const, fulfillmentStatus: "pending" as const })),
      updateFulfillmentStatus: vi.fn(),
    };

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "delivered" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Estado de orden inválido");
    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin: allowAdmin })).rejects.toThrow("Transición de estado inválida");
    expect(repository.updateFulfillmentStatus).not.toHaveBeenCalled();
  });

  it("rejects non-admin order status changes before reading or mutating orders", async () => {
    const repository: OrdersRepository = {
      getOrderStatus: vi.fn(),
      updateFulfillmentStatus: vi.fn(),
    };
    const assertAdmin = vi.fn(async () => {
      throw new Error("No autorizado");
    });

    await expect(updateOrderFulfillmentStatusAction({ orderId: "order-1", status: "shipped" }, { repository, assertAdmin })).rejects.toThrow("No autorizado");

    expect(assertAdmin).toHaveBeenCalledOnce();
    expect(repository.getOrderStatus).not.toHaveBeenCalled();
    expect(repository.updateFulfillmentStatus).not.toHaveBeenCalled();
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
