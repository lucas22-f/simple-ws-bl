import { NextResponse } from "next/server";
import { getPaymentReturnOrder } from "@/server/orders/payment-return";
import { createDefaultRateLimiter, getClientIpFromHeaders, PAYMENT_RETURN_RATE_LIMIT } from "@/server/security/rate-limit";

const paymentReturnRateLimiter = createDefaultRateLimiter();

export async function GET(request: Request) {
  try {
    const rateLimit = await paymentReturnRateLimiter.consume({
      ...PAYMENT_RETURN_RATE_LIMIT,
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

    const orderId = new URL(request.url).searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "Falta el identificador de la orden" }, { status: 400 });
    }

    const order = await getPaymentReturnOrder(orderId);

    if (!order) {
      return NextResponse.json({ error: "No encontramos la orden" }, { status: 404 });
    }

    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No pudimos verificar el estado de la orden" }, { status: 400 });
  }
}
