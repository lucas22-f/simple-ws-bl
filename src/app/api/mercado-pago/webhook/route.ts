import { NextResponse } from "next/server";
import { getServerEnv } from "@/server/env";
import { handleMercadoPagoWebhook } from "@/server/payments/webhook";

function readMercadoPagoQueryParams(url: string) {
  const searchParams = new URL(url).searchParams;
  return {
    "data.id": searchParams.get("data.id"),
    type: searchParams.get("type"),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await handleMercadoPagoWebhook(
    {
      body,
      query: readMercadoPagoQueryParams(request.url),
      headers: {
        "x-request-id": request.headers.get("x-request-id"),
        "x-signature": request.headers.get("x-signature"),
      },
    },
    { secret: getServerEnv().MP_WEBHOOK_SECRET },
  );

  return NextResponse.json(result.body, { status: result.status });
}
