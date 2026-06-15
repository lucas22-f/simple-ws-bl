import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AdminOrdersForm } from "@/app/admin/orders/admin-orders-form";
import { listAdminOrders, mapAdminOrderRow } from "@/server/orders/queries";

const action = async () => ({ status: "idle" as const, message: "" });
const archiveAction = async () => ({ status: "idle" as const, message: "" });

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
    archivedAt: null,
    items: [{ productName: "Mate camionero", quantity: 2 }],
  },
];

describe("AdminOrdersForm", () => {
  it("renders real orders with buyer, items, payment state and server-backed update form", () => {
    const html = renderToStaticMarkup(createElement(AdminOrdersForm, { orders, action, archiveAction }));

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
    const html = renderToStaticMarkup(createElement(AdminOrdersForm, { orders: [], action, archiveAction }));

    expect(html).toContain("Todavía no hay órdenes para gestionar");
    expect(html).toContain("va a aparecer acá automáticamente");
  });



  it("renders compact order cards with confirmed archive controls", () => {
    const html = renderToStaticMarkup(createElement(AdminOrdersForm, { orders, action, archiveAction }));

    expect(html).toContain('aria-label="Orden Ada Lovelace"');
    expect(html).toContain('Archivar orden');
    expect(html).toContain('name="confirmArchive"');
    expect(html).toContain('Conservar historial');
  });

  it("requests four visible orders per admin page", async () => {
    vi.resetModules();
    const listAdminOrdersPageMock = vi.fn(async () => ({
      orders: [],
      pagination: { page: 2, pageSize: 4, totalItems: 9, totalPages: 3 },
    }));
    vi.doMock("@/server/orders/queries", () => ({ listAdminOrdersPage: listAdminOrdersPageMock }));
    vi.doMock("@/server/admin/actions/orders", () => ({
      updateOrderFulfillmentStatusAction: vi.fn(),
      archiveOrderAction: vi.fn(),
    }));
    const { default: AdminOrdersPage } = await import("@/app/admin/orders/page");

    await AdminOrdersPage({ searchParams: Promise.resolve({ page: "2" }) });

    expect(listAdminOrdersPageMock).toHaveBeenCalledWith({ page: 2, pageSize: 4 });
  });

  it("renders pagination controls for long order lists", () => {
    const html = renderToStaticMarkup(
      createElement(AdminOrdersForm, {
        orders,
        action,
        archiveAction,
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
      archived_at: "2026-06-14T12:00:00.000Z",
      order_items: [{ product_name: "Mate camionero", quantity: 2 }],
    };
    const client = { listAdminOrders: vi.fn(async () => ({ data: [row], error: null })) };

    await expect(listAdminOrders({ client })).resolves.toEqual([expect.objectContaining({ ...mapAdminOrderRow(row), archivedAt: "2026-06-14T12:00:00.000Z" })]);
    expect(client.listAdminOrders).toHaveBeenCalledWith(expect.objectContaining({ includeArchived: false }));
  });

  it("allows explicit archived order queries for audit views", async () => {
    const client = { listAdminOrders: vi.fn(async () => ({ data: [], error: null, count: 0 })) };

    await expect(listAdminOrders({ client, includeArchived: true })).resolves.toEqual([]);

    expect(client.listAdminOrders).toHaveBeenCalledWith(expect.objectContaining({ includeArchived: true }));
  });

  it("fails explicitly when Supabase cannot load orders", async () => {
    const client = { listAdminOrders: vi.fn(async () => ({ data: null, error: new Error("db down") })) };

    await expect(listAdminOrders({ client })).rejects.toThrow("No pudimos cargar las órdenes");
  });
});
