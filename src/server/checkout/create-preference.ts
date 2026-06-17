import "server-only";
import { getPublicEnv } from "@/server/env";
import { createCheckoutOrder, createSupabaseCheckoutRepository } from "@/server/checkout/create-order";
import type { CheckoutRepository } from "@/server/checkout/calculate";
import { createMercadoPagoPreferenceGateway, type PreferenceGateway } from "@/server/payments/mercado-pago";

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/$/, "");
}

export async function createCheckoutPreference(
  rawInput: unknown,
  options: {
    repository?: CheckoutRepository;
    gateway?: PreferenceGateway;
    siteUrl?: string;
    externalReferenceFactory?: () => string;
  } = {},
) {
  const repository = options.repository ?? createSupabaseCheckoutRepository();
  const order = await createCheckoutOrder(rawInput, {
    repository,
    externalReferenceFactory: options.externalReferenceFactory,
  });
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? getPublicEnv().NEXT_PUBLIC_SITE_URL);
  const notificationUrl = `${siteUrl}/api/mercado-pago/webhook`;
  const gateway = options.gateway ?? createMercadoPagoPreferenceGateway();
  const preference = await gateway.createPreference({
    orderId: order.orderId,
    externalReference: order.externalReference,
    buyer: order.items.length ? (rawInput as { buyer: { name: string; email: string; phone: string } }).buyer : { name: "", email: "", phone: "" },
    items: order.items,
    totalCents: order.totals.totalCents,
    currency: order.totals.currency,
    returnUrls: {
      success: `${siteUrl}/payment/success?order_id=${order.orderId}`,
      failure: `${siteUrl}/payment/failure?order_id=${order.orderId}`,
      pending: `${siteUrl}/payment/pending?order_id=${order.orderId}`,
    },
    notificationUrl,
  });

  await repository.setOrderPreference?.({ orderId: order.orderId, preferenceId: preference.preferenceId });

  return {
    orderId: order.orderId,
    checkoutUrl: preference.checkoutUrl,
    preferenceId: preference.preferenceId,
  };
}


