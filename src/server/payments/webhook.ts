import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createMercadoPagoPaymentGateway, type MercadoPagoPaymentGateway } from "@/server/payments/mercado-pago";

export type PaymentStatus = "pending" | "paid" | "rejected" | "cancelled" | "refunded";

export type WebhookRequest = {
  body: unknown;
  query?: Record<string, string | string[] | null | undefined>;
  headers: Record<string, string | null | undefined>;
};

export type PaymentGateway = MercadoPagoPaymentGateway;

export type PaymentReconciliationInput = {
  providerEventId: string;
  eventType: string;
  payload: unknown;
  externalReference: string;
  mercadoPagoPaymentId: string;
  preferenceId: string;
  metadataOrderId: string;
  amountCents: number;
  currency: string;
  paymentStatus: PaymentStatus;
};

export type PaymentReconciliationResult = {
  processed: boolean;
  duplicate: boolean;
  rejected: boolean;
  reason: string | null;
  paymentStatus?: PaymentStatus | null;
};

export type PaymentReconciliationStore = {
  reconcileMercadoPagoPayment: (input: PaymentReconciliationInput) => Promise<PaymentReconciliationResult>;
};

type MercadoPagoWebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function readHeader(headers: WebhookRequest["headers"], name: string) {
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return found?.[1] ?? undefined;
}

function readQueryParam(query: WebhookRequest["query"], name: string) {
  const value = query?.[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

function parseSignature(signatureHeader: string | undefined) {
  const parts = new Map((signatureHeader ?? "").split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key?.trim(), value?.trim()];
  }));

  return { timestamp: parts.get("ts"), signature: parts.get("v1") };
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function signatureManifest(input: { paymentId?: string; requestId?: string; timestamp?: string }) {
  return [
    input.paymentId ? `id:${input.paymentId};` : "",
    input.requestId ? `request-id:${input.requestId};` : "",
    input.timestamp ? `ts:${input.timestamp};` : "",
  ].join("");
}

export function verifyMercadoPagoSignature(input: { paymentId?: string; requestId?: string; signatureHeader?: string; secret: string }) {
  const parsed = parseSignature(input.signatureHeader);
  if (!parsed.timestamp || !parsed.signature) {
    return false;
  }

  const expected = createHmac("sha256", input.secret).update(signatureManifest({
    paymentId: input.paymentId,
    requestId: input.requestId,
    timestamp: parsed.timestamp,
  })).digest("hex");

  try {
    return safeEqualHex(expected, parsed.signature);
  } catch {
    return false;
  }
}

function getPaymentIdFromBody(body: unknown) {
  const record = typeof body === "object" && body !== null ? body as MercadoPagoWebhookBody : {};
  const id = record.data?.id;
  return id === undefined ? undefined : String(id);
}

function getPaymentId(request: WebhookRequest) {
  return readQueryParam(request.query, "data.id") ?? getPaymentIdFromBody(request.body);
}

function eventType(request: WebhookRequest) {
  const queryType = readQueryParam(request.query, "type");
  if (queryType) {
    return queryType;
  }

  const record = typeof request.body === "object" && request.body !== null ? request.body as MercadoPagoWebhookBody : {};
  return record.type ?? record.action ?? "payment";
}

export function mapMercadoPagoStatus(status: string): PaymentStatus {
  if (status === "approved") {
    return "paid";
  }
  if (["rejected", "cancelled", "refunded"].includes(status)) {
    return status as PaymentStatus;
  }
  return "pending";
}

export function mercadoPagoAmountToCents(amount: number | string) {
  const parsed = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(parsed)) {
    throw new Error("Mercado Pago no devolvió un monto verificable");
  }

  return Math.round(parsed * 100);
}

export function createSupabasePaymentReconciliationStore(): PaymentReconciliationStore {
  const supabase = createSupabaseAdminClient();

  return {
    async reconcileMercadoPagoPayment(input) {
      const { data, error } = await supabase.rpc("reconcile_mercado_pago_payment", {
        p_payment: {
          id: input.mercadoPagoPaymentId,
          status: input.paymentStatus,
          external_reference: input.externalReference,
          preference_id: input.preferenceId,
          metadata_order_id: input.metadataOrderId,
          amount_cents: input.amountCents,
          currency: input.currency,
        },
        p_event: {
          provider_event_id: input.providerEventId,
          event_type: input.eventType,
          payload: input.payload,
        },
      });

      if (error) {
        throw new Error("No pudimos reconciliar el pago");
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        throw new Error("Mercado Pago no devolvió una reconciliación verificable");
      }

      const result = row as {
        processed: boolean;
        duplicate: boolean;
        rejected: boolean;
        reason: string | null;
        payment_status?: PaymentStatus | null;
      };

      return {
        processed: result.processed,
        duplicate: result.duplicate,
        rejected: result.rejected,
        reason: result.reason,
        paymentStatus: result.payment_status,
      };
    },
  };
}

export async function handleMercadoPagoWebhook(
  request: WebhookRequest,
  options: { secret: string; gateway?: PaymentGateway; store?: PaymentReconciliationStore },
) {
  const paymentId = getPaymentId(request);
  const requestId = readHeader(request.headers, "x-request-id");

  if (!paymentId || !requestId) {
    return { status: 400, body: { error: "invalid_payload" } };
  }

  const signatureIsValid = verifyMercadoPagoSignature({
    paymentId,
    requestId,
    signatureHeader: readHeader(request.headers, "x-signature"),
    secret: options.secret,
  });

  if (!signatureIsValid) {
    return { status: 401, body: { error: "invalid_signature" } };
  }

  const gateway = options.gateway ?? createMercadoPagoPaymentGateway();
  const store = options.store ?? createSupabasePaymentReconciliationStore();
  const payment = await gateway.getPayment(paymentId);
  const providerEventId = `${requestId}:${payment.id}:${payment.status}`;
  const paymentStatus = mapMercadoPagoStatus(payment.status);
  const reconciliation = await store.reconcileMercadoPagoPayment({
    providerEventId,
    eventType: eventType(request),
    payload: { webhook: request.body, query: request.query, payment },
    externalReference: payment.externalReference,
    mercadoPagoPaymentId: payment.id,
    preferenceId: payment.preferenceId,
    metadataOrderId: payment.metadataOrderId,
    amountCents: mercadoPagoAmountToCents(payment.transactionAmount),
    currency: payment.currency,
    paymentStatus,
  });

  if (reconciliation.duplicate) {
    return { status: 200, body: { processed: false, duplicate: true } };
  }

  if (reconciliation.rejected) {
    return { status: 200, body: { processed: false, rejected: true, reason: reconciliation.reason } };
  }

  if (reconciliation.paymentStatus && reconciliation.paymentStatus !== paymentStatus) {
    return { status: 200, body: { processed: true, paymentStatus: reconciliation.paymentStatus } };
  }

  return { status: 200, body: { processed: true } };
}
