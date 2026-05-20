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

export type PaymentEventStore = {
  insertPaymentEvent: (event: {
    providerEventId: string;
    eventType: string;
    payload: unknown;
    externalReference: string;
  }) => Promise<{ inserted: boolean }>;
  updateOrderPaymentStatus: (input: {
    externalReference: string;
    mercadoPagoPaymentId: string;
    paymentStatus: PaymentStatus;
  }) => Promise<void>;
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

export function createSupabasePaymentEventStore(): PaymentEventStore {
  const supabase = createSupabaseAdminClient();

  return {
    async insertPaymentEvent(event) {
      const { error } = await supabase.from("payment_events").insert({
        provider: "mercado_pago",
        provider_event_id: event.providerEventId,
        event_type: event.eventType,
        payload: event.payload,
      });

      if (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
        if (code === "23505") {
          return { inserted: false };
        }
        throw new Error("No pudimos registrar el evento de pago");
      }

      return { inserted: true };
    },
    async updateOrderPaymentStatus(input) {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: input.paymentStatus,
          mercado_pago_payment_id: input.mercadoPagoPaymentId,
        })
        .eq("external_reference", input.externalReference);

      if (error) {
        throw new Error("No pudimos actualizar el estado de pago");
      }
    },
  };
}

export async function handleMercadoPagoWebhook(
  request: WebhookRequest,
  options: { secret: string; gateway?: PaymentGateway; store?: PaymentEventStore },
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
  const store = options.store ?? createSupabasePaymentEventStore();
  const payment = await gateway.getPayment(paymentId);
  const providerEventId = `${requestId}:${payment.id}:${payment.status}`;
  const inserted = await store.insertPaymentEvent({
    providerEventId,
    eventType: eventType(request),
    payload: { webhook: request.body, query: request.query, payment },
    externalReference: payment.externalReference,
  });

  if (!inserted.inserted) {
    return { status: 200, body: { processed: false, duplicate: true } };
  }

  await store.updateOrderPaymentStatus({
    externalReference: payment.externalReference,
    mercadoPagoPaymentId: payment.id,
    paymentStatus: mapMercadoPagoStatus(payment.status),
  });

  return { status: 200, body: { processed: true } };
}
