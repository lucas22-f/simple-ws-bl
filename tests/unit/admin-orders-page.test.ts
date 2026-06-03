import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AdminOrdersForm } from "@/app/admin/orders/admin-orders-form";
import { listAdminOrders, mapAdminOrderRow } from "@/server/orders/queries";

const action = async () => ({ status: "idle" as const, message: "" });

const orders = [
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    buyerName: "Ada Lovelace",
    buyerEmail: "ada@example.com",
    buyerPhone: "1144445555",
    totalCents: 12500,
    currency: "ARS",
    paymentStatus: "paid" as const,
    fulfillmentStatus: "processing" as const,
    createdAt: "2026-06-01T10:30:00.000Z",
    items: [{ productName: "Mate camionero", quantity: 2 }],
  },
];

describe("AdminOrdersForm", () => {
  it("renders real orders with buyer, items, payment state and server-backed update form", () => {
    const html = renderToStaticMarkup(createElement(AdminOrdersForm, { orders, action }));

    expect(html).toContain("Pedidos recientes");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("2 × Mate camionero");
    expect(html).toContain("Pagada");
    expect(html).toContain("En preparación");
    expect(html).toContain("Enviada");
    expect(html).toContain('name="orderId"');
  });

  it("renders an empty operational state when there are no orders", () => {
    const html = renderToStaticMarkup(createElement(AdminOrdersForm, { orders: [], action }));

    expect(html).toContain("Todavía no hay órdenes para gestionar");
    expect(html).toContain("va a aparecer acá automáticamente");
  });

  it("renders pagination controls for long order lists", () => {
    const html = renderToStaticMarkup(
      createElement(AdminOrdersForm, {
        orders,
        action,
        pagination: { page: 1, pageSize: 1, totalItems: 11, totalPages: 11 },
      }),
    );

    expect(html).toContain("Paginación de");
    expect(html).toContain("1-1");
    expect(html).toContain("11");
    expect(html).toContain("/admin/orders?page=2");
  });
});

describe("admin order queries", () => {
  it("maps database rows and returns newest order data from the query client", async () => {
    const row = {
      id: "order-1",
      buyer_name: "Ada Lovelace",
      buyer_email: "ada@example.com",
      buyer_phone: null,
      total_cents: 12500,
      currency: "ARS",
      payment_status: "paid" as const,
      fulfillment_status: "processing" as const,
      created_at: "2026-06-01T10:30:00.000Z",
      order_items: [{ product_name: "Mate camionero", quantity: 2 }],
    };
    const client = { listAdminOrders: vi.fn(async () => ({ data: [row], error: null })) };

    await expect(listAdminOrders({ client })).resolves.toEqual([mapAdminOrderRow(row)]);
  });

  it("fails explicitly when Supabase cannot load orders", async () => {
    const client = { listAdminOrders: vi.fn(async () => ({ data: null, error: new Error("db down") })) };

    await expect(listAdminOrders({ client })).rejects.toThrow("No pudimos cargar las órdenes");
  });
});
