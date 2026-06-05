import { NextResponse } from "next/server";
import { createCheckoutPreference } from "@/server/checkout/create-preference";
import { CHECKOUT_RATE_LIMIT, createDefaultRateLimiter, getClientIpFromHeaders } from "@/server/security/rate-limit";
const checkoutRateLimiter = createDefaultRateLimiter();

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
    const preference = await createCheckoutPreference(body, {});

    return NextResponse.json(preference);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos iniciar el pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
