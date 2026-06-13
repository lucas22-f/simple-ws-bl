import { NextResponse } from "next/server";
import { getPaymentReturnOrder } from "@/server/orders/payment-return";

export async function GET(request: Request) {
  try {
    const orderId = new URL(request.url).searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "Falta el identificador de la orden" }, { status: 400 });
    }

    const order = await getPaymentReturnOrder(orderId);

    if (!order) {
      return NextResponse.json({ error: "No encontramos la orden" }, { status: 404 });
    }

    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos verificar el estado de la orden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
