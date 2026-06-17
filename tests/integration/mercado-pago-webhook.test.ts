import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { handleMercadoPagoWebhook } from "@/server/payments/webhook";
import type { PaymentGateway, PaymentReconciliationStore } from "@/server/payments/webhook";

const webhookSecret = "webhook-secret";

function signatureFor({ requestId, paymentId }: { requestId: string; paymentId: string }) {
  const manifest = `id:${paymentId};request-id:${requestId};ts:1700000000;`;
  const signature = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  return `ts=1700000000,v1=${signature}`;
}

function createPayment(overrides: Partial<Awaited<ReturnType<PaymentGateway["getPayment"]>>> = {}) {
  return {
    id: "pay-1",
    status: "approved",
    externalReference: "order-ext-1",
    preferenceId: "pref-1",
    metadataOrderId: "order-1",
    transactionAmount: 123.45,
    currency: "ARS",
    ...overrides,
  };
}

function createStore(): PaymentReconciliationStore {
  const eventIds = new Set<string>();
  return {
    reconcileMercadoPagoPayment: vi.fn(async (event) => {
      if (eventIds.has(event.providerEventId)) {
        return { processed: false, duplicate: true, rejected: false, reason: "duplicate_event" };
      }
      eventIds.add(event.providerEventId);
      return { processed: true, duplicate: false, rejected: false, reason: null };
    }),
  };
}

describe("Mercado Pago webhook", () => {
  it("rejects invalid signatures before fetching or mutating payment state", async () => {
    const store = createStore();
    const gateway: PaymentGateway = { getPayment: vi.fn() };

    const result = await handleMercadoPagoWebhook(
      {
        body: {
          type: "payment",
          data: { id: "pay-1" },
          payer: { email: "buyer@example.com", phone: "11111111" },
          metadata: { address: "Av. Siempre Viva 742" },
        },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-1", "x-signature": "ts=1700000000,v1=bad" },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 401, body: { error: "invalid_signature" } });
    expect(gateway.getPayment).not.toHaveBeenCalled();
    expect(store.reconcileMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it("uses the Mercado Pago URL data.id query param for signature verification and payment lookup", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => createPayment({
        id: "pay-url",
        externalReference: "order-ext-url",
        metadataOrderId: "order-url",
      })),
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
    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledWith(expect.objectContaining({
      externalReference: "order-ext-url",
      mercadoPagoPaymentId: "pay-url",
      paymentStatus: "paid",
      metadataOrderId: "order-url",
    }));
  });

  it("uses verified Mercado Pago data as source of truth and treats return pages as UX only", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => createPayment()),
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
    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledWith({
      providerEventId: "req-1:pay-1:approved",
      eventType: "payment",
      payload: {
        webhook: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        payment: createPayment(),
      },
      externalReference: "order-ext-1",
      mercadoPagoPaymentId: "pay-1",
      preferenceId: "pref-1",
      metadataOrderId: "order-1",
      amountCents: 12345,
      currency: "ARS",
      paymentStatus: "paid",
    });
    const persistedEvent = vi.mocked(store.reconcileMercadoPagoPayment).mock.calls[0][0];
    expect(JSON.stringify(persistedEvent.payload)).not.toContain("buyer@example.com");
    expect(JSON.stringify(persistedEvent.payload)).not.toContain("Av. Siempre Viva");
  });

  it("handles duplicate webhook events idempotently without duplicate reconciliation", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => createPayment({
        id: "pay-dup",
        status: "rejected",
        externalReference: "order-ext-dup",
        metadataOrderId: "order-dup",
      })),
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

    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledTimes(2);
    expect(store.reconcileMercadoPagoPayment).toHaveBeenLastCalledWith(expect.objectContaining({
      externalReference: "order-ext-dup",
      mercadoPagoPaymentId: "pay-dup",
      paymentStatus: "rejected",
      metadataOrderId: "order-dup",
    }));
  });

  it("uses Mercado Pago sandbox money units as major units and sends integer cents to reconciliation", async () => {
    const store = createStore();
    const gateway: PaymentGateway = {
      getPayment: vi.fn(async () => createPayment({ transactionAmount: "1000.5" })),
    };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-money", "x-signature": signatureFor({ requestId: "req-money", paymentId: "pay-1" }) },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 200, body: { processed: true } });
    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountCents: 100050,
      currency: "ARS",
      preferenceId: "pref-1",
      metadataOrderId: "order-1",
    }));
  });

  it("surfaces validated reconciliation mismatches without treating the provider event as processed", async () => {
    const store: PaymentReconciliationStore = {
      reconcileMercadoPagoPayment: vi.fn(async () => ({
        processed: false,
        duplicate: false,
        rejected: true,
        reason: "amount_mismatch",
      })),
    };
    const gateway: PaymentGateway = { getPayment: vi.fn(async () => createPayment({ transactionAmount: 999 })) };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-mismatch", "x-signature": signatureFor({ requestId: "req-mismatch", paymentId: "pay-1" }) },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 200, body: { processed: false, rejected: true, reason: "amount_mismatch" } });
    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 99900 }));
  });

  it("keeps paid orders monotonic when reconciliation receives an out-of-order pending event", async () => {
    const store: PaymentReconciliationStore = {
      reconcileMercadoPagoPayment: vi.fn(async () => ({
        processed: true,
        duplicate: false,
        rejected: false,
        reason: null,
        paymentStatus: "paid" as const,
      })),
    };
    const gateway: PaymentGateway = { getPayment: vi.fn(async () => createPayment({ status: "pending" })) };

    const result = await handleMercadoPagoWebhook(
      {
        body: { type: "payment", data: { id: "pay-1" } },
        query: { "data.id": "pay-1", type: "payment" },
        headers: { "x-request-id": "req-pending", "x-signature": signatureFor({ requestId: "req-pending", paymentId: "pay-1" }) },
      },
      { secret: webhookSecret, gateway, store },
    );

    expect(result).toEqual({ status: 200, body: { processed: true, paymentStatus: "paid" } });
    expect(store.reconcileMercadoPagoPayment).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "pending" }));
  });
});
