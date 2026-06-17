import { NextResponse } from "next/server";
import { createCheckoutPreference } from "@/server/checkout/create-preference";
import {
  CHECKOUT_EMAIL_RATE_LIMIT,
  CHECKOUT_RATE_LIMIT,
  createDefaultRateLimiter,
  getClientIpFromHeaders,
  normalizeRateLimitIdentity,
} from "@/server/security/rate-limit";

const checkoutRateLimiter = createDefaultRateLimiter();

function readCheckoutBuyerEmail(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const buyer = (body as { buyer?: unknown }).buyer;
  if (typeof buyer !== "object" || buyer === null) {
    return undefined;
  }

  const email = (buyer as { email?: unknown }).email;
  return typeof email === "string" ? normalizeRateLimitIdentity(email) : undefined;
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
    const buyerEmail = readCheckoutBuyerEmail(body);

    if (buyerEmail) {
      const emailRateLimit = await checkoutRateLimiter.consume({
        ...CHECKOUT_EMAIL_RATE_LIMIT,
        identity: buyerEmail,
      });

      if (!emailRateLimit.allowed) {
        return NextResponse.json(
          { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.max(1, emailRateLimit.retryAfterSeconds)) },
          },
        );
      }
    }

    const preference = await createCheckoutPreference(body, {});

    return NextResponse.json(preference);
  } catch {
    return NextResponse.json({ error: "No pudimos iniciar el pago" }, { status: 400 });
  }
}
