import { NextResponse } from "next/server";
import { createCheckoutPreference } from "@/server/checkout/create-preference";
import { CHECKOUT_RATE_LIMIT, createDefaultRateLimiter, getClientIpFromHeaders } from "@/server/security/rate-limit";
import type { CheckoutRepository } from "@/server/checkout/calculate";
import type { PreferenceGateway } from "@/server/payments/mercado-pago";

const checkoutRateLimiter = createDefaultRateLimiter();

function createE2ePreferenceGateway(checkoutUrl: string): PreferenceGateway {
  return {
    async createPreference() {
      return { preferenceId: "e2e-preference", checkoutUrl };
    },
  };
}

function createE2eCheckoutRepository(): CheckoutRepository {
  return {
    async getActiveProductsByIds() {
      return [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "Mate cerámico artesanal",
          slug: "mate-ceramico-artesanal",
          priceCents: 12500,
          currency: "ARS",
          stockQuantity: 10,
        },
      ];
    },
    async getCheckoutSettings() {
      return { shippingZones: [{ city: "CABA", postalCodePrefix: "14", costCents: 1800 }], commission: { enabled: false } };
    },
    async createPendingOrder(order) {
      return { id: "e2e-order", externalReference: order.externalReference };
    },
    async setOrderPreference() {
      return undefined;
    },
  };
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkoutRateLimiter.consume({
      ...CHECKOUT_RATE_LIMIT,
      identity: getClientIpFromHeaders(request.headers),
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, rateLimit.retryAfterSeconds)) },
        },
      );
    }

    const body = await request.json();
    const e2eCheckoutUrl = process.env.E2E_MERCADO_PAGO_CHECKOUT_URL;
    const preference = await createCheckoutPreference(body, e2eCheckoutUrl ? {
      gateway: createE2ePreferenceGateway(e2eCheckoutUrl),
      repository: createE2eCheckoutRepository(),
    } : {});

    return NextResponse.json(preference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos iniciar el pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
