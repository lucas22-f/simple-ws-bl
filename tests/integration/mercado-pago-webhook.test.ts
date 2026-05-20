import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { handleMercadoPagoWebhook } from "@/server/payments/webhook";
import type { PaymentEventStore, PaymentGateway } from "@/server/payments/webhook";

const webhookSecret = "webhook-secret";

function signatureFor({ requestId, paymentId }: { requestId: string; paymentId: string }) {
  const manifest = `id:${paymentId};request-id:${requestId};ts:1700000000;`;
  const signature = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  return `ts=1700000000,v1=${signature}`;
}

function createStore(): PaymentEventStore {
  const eventIds = new Set<string>();
  return {
    async insertPaymentEvent(event) {
      if (eventIds.has(event.providerEventId)) {
        return { inserted: false };
      }
      eventIds.add(event.providerEventId);
      return { inserted: true };
    },
    updateOrderPaymentStatus: vi.fn(async () => undefined),
  };
}

describe("Mercado Pago webhook", () => {
  it("rejects invalid signatures before fetching or mutating payment state", async () => {
    const store = createStore();
    const gateway: PaymentGateway = { getPayment: vi.fn() };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-1", "x-signature": "ts=1700000000,v1=bad" },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 401, body: { error: "invalid_signature" } });
    expect(gateway.getPayment).not.toHaveBeenCalled();
    expect(store.updateOrderPaymentStatus).not.toHaveBeenCalled();
  });

  it("uses the Mercado Pago URL data.id query param for signature verification and payment lookup", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => ({ id: "pay-url", status: "approved", externalReference: "order-ext-url" })),
    };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-body-stale" } },
        query: { "data.id": "pay-url", type: "payment" },
        headers: { "x-request-id": "req-url", "x-signature": signatureFor({ requestId: "req-url", paymentId: "pay-url" }) },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 200, body: { processed: true } });
    expect(gateway.getPayment).toHaveBeenCalledWith("pay-url");
    expect(store.updateOrderPaymentStatus).toHaveBeenCalledWith({
      externalReference: "order-ext-url",
      mercadoPagoPaymentId: "pay-url",
      paymentStatus: "paid",
    });
  });

  it("uses verified Mercado Pago data as source of truth and treats return pages as UX only", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => ({ id: "pay-1", status: "approved", externalReference: "order-ext-1" })),
    };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-1", "x-signature": signatureFor({ requestId: "req-1", paymentId: "pay-1" }) },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 200, body: { processed: true } });
    expect(store.updateOrderPaymentStatus).toHaveBeenCalledWith({
      externalReference: "order-ext-1",
      mercadoPagoPaymentId: "pay-1",
      paymentStatus: "paid",
    });
  });

  it("handles duplicate webhook events idempotently without duplicate order updates", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => ({ id: "pay-dup", status: "rejected", externalReference: "order-ext-dup" })),
    };
    const request = {
      body: { type: "payment", data: { id: "pay-dup" } },
      query: { "data.id": "pay-dup", type: "payment" },
      headers: { "x-request-id": "req-dup", "x-signature": signatureFor({ requestId: "req-dup", paymentId: "pay-dup" }) },
    };

    await expect(handleMercadoPagoWebhook(request, { secret: webhookSecret, gateway, store })).resolves.toEqual({
      status: 200,
      body: { processed: true },
    });
    await expect(handleMercadoPagoWebhook(request, { secret: webhookSecret, gateway, store })).resolves.toEqual({
      status: 200,
      body: { processed: false, duplicate: true },
    });

    expect(store.updateOrderPaymentStatus).toHaveBeenCalledTimes(1);
    expect(store.updateOrderPaymentStatus).toHaveBeenCalledWith({
      externalReference: "order-ext-dup",
      mercadoPagoPaymentId: "pay-dup",
      paymentStatus: "rejected",
    });
  });
});
