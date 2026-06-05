import "server-only";
import { Payment, Preference, MerchantOrder, MercadoPagoConfig } from "mercadopago";
import { getServerEnv } from "@/server/env";
import type { OrderLineItem } from "@/server/checkout/calculate";

export type PreferenceRequest = {
  orderId: string;
  externalReference: string;
  buyer: { name: string; email: string; phone: string };
  items: OrderLineItem[];
  totalCents: number;
  currency: string;
  returnUrls: { success: string; failure: string; pending: string };
  notificationUrl?: string;
};

export type PreferenceResult = {
  preferenceId: string;
  checkoutUrl: string;
};

export type PreferenceGateway = {
  createPreference: (request: PreferenceRequest) => Promise<PreferenceResult>;
};

export type MercadoPagoPayment = {
  id: string;
  status: string;
  externalReference: string;
  preferenceId: string;
  metadataOrderId: string;
  transactionAmount: number | string;
  currency: string;
};

export type MercadoPagoPaymentGateway = {
  getPayment: (paymentId: string) => Promise<MercadoPagoPayment>;
};

export function createMercadoPagoPreferenceGateway(accessToken = getServerEnv().MP_ACCESS_TOKEN): PreferenceGateway {
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  return {
    async createPreference(request) {
      const response = await preference.create({
        body: {
          external_reference: request.externalReference,
          metadata: { order_id: request.orderId },
          payer: {
            name: request.buyer.name,
            email: request.buyer.email,
            phone: { number: request.buyer.phone },
          },
          items: request.items.map((item) => ({
            id: item.productId,
            title: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPriceCents / 100,
            currency_id: request.currency,
          })),
          back_urls: request.returnUrls,
          auto_return: "approved",
          notification_url: request.notificationUrl,
        },
      });

      const checkoutUrl = response.init_point ?? response.sandbox_init_point;
      if (!response.id || !checkoutUrl) {
        throw new Error("Mercado Pago no devolvió una preferencia válida");
      }

      return { preferenceId: response.id, checkoutUrl };
    },
  };
}

export function createMercadoPagoPaymentGateway(accessToken = getServerEnv().MP_ACCESS_TOKEN): MercadoPagoPaymentGateway {
  const client = new MercadoPagoConfig({ accessToken });
  const payment = new Payment(client);
  const merchantOrder = new MerchantOrder(client);

  return {
    async getPayment(paymentId) {
      const response = await payment.get({ id: paymentId });
      const merchantOrderResponse = response.order?.id
        ? await merchantOrder.get({ merchantOrderId: response.order.id })
        : undefined;
      const metadata = typeof response.metadata === "object" && response.metadata !== null
        ? response.metadata as Record<string, unknown>
        : {};

      if (
        !response.id
        || !response.status
        || !response.external_reference
        || !merchantOrderResponse?.preference_id
        || typeof metadata.order_id !== "string"
        || response.transaction_amount === undefined
        || !response.currency_id
      ) {
        throw new Error("Mercado Pago no devolvió un pago verificable");
      }

      return {
        id: String(response.id),
        status: response.status,
        externalReference: response.external_reference,
        preferenceId: merchantOrderResponse.preference_id,
        metadataOrderId: metadata.order_id,
        transactionAmount: response.transaction_amount,
        currency: response.currency_id,
      };
    },
  };
}

