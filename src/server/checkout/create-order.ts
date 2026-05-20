import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { calculateCheckout, type CheckoutRepository, type CheckoutSettings, type PendingOrderInput } from "@/server/checkout/calculate";
import { checkoutInputSchema, type CheckoutInput } from "@/server/checkout/schema";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  stock_quantity: number | null;
};

type SettingRow = {
  key: string;
  value: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeSettings(rows: SettingRow[] | null): CheckoutSettings {
  const map = new Map((rows ?? []).map((row) => [row.key, row.value]));
  const shippingValue = map.get("shipping_zones");
  const commissionValue = asRecord(map.get("commission"));

  return {
    shippingZones: Array.isArray(shippingValue)
      ? shippingValue.map((zone) => {
          const record = asRecord(zone);
          return {
            city: typeof record.name === "string" ? record.name : typeof record.city === "string" ? record.city : undefined,
            postalCodePrefix: typeof record.postalCodePrefix === "string" ? record.postalCodePrefix : undefined,
            costCents: asNumber(record.costCents),
            priceCents: asNumber(record.priceCents),
          };
        })
      : [],
    commission: {
      enabled: commissionValue.enabled === true,
      type: commissionValue.type === "fixed" ? "fixed" : commissionValue.type === "percentage" ? "percentage" : undefined,
      value: asNumber(commissionValue.value),
      percent: asNumber(commissionValue.percent),
      fixedCents: asNumber(commissionValue.fixedCents),
    },
  };
}

export function createSupabaseCheckoutRepository(): CheckoutRepository {
  const supabase = createSupabaseAdminClient();

  return {
    async getActiveProductsByIds(productIds) {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price_cents,currency,stock_quantity")
        .in("id", productIds)
        .eq("active", true);

      if (error) {
        throw new Error("No pudimos validar los productos del carrito");
      }

      return ((data ?? []) as ProductRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        priceCents: row.price_cents,
        currency: row.currency,
        stockQuantity: row.stock_quantity,
      }));
    },
    async getCheckoutSettings() {
      const { data, error } = await supabase.from("settings").select("key,value").in("key", ["shipping_zones", "commission"]);

      if (error) {
        throw new Error("No pudimos cargar la configuración de checkout");
      }

      return normalizeSettings((data ?? []) as SettingRow[]);
    },
    async createPendingOrder(order) {
      const { data: orderRow, error } = await supabase.rpc("create_pending_order", {
        p_order: {
          buyer_name: order.buyer.name,
          buyer_email: order.buyer.email,
          buyer_phone: order.buyer.phone,
          shipping_address: order.shippingAddress,
          subtotal_cents: order.totals.subtotalCents,
          shipping_cents: order.totals.shippingCents,
          commission_cents: order.totals.commissionCents,
          total_cents: order.totals.totalCents,
          currency: order.totals.currency,
          external_reference: order.externalReference,
        },
        p_items: order.items.map((item) => ({
          product_id: item.productId,
          product_name: item.productName,
          product_slug: item.productSlug,
          unit_price_cents: item.unitPriceCents,
          quantity: item.quantity,
          line_total_cents: item.lineTotalCents,
        })),
      });

      if (error || !orderRow) {
        throw new Error("No pudimos crear la orden");
      }

      const row = Array.isArray(orderRow) ? orderRow[0] : orderRow;
      if (!row) {
        throw new Error("No pudimos crear la orden");
      }

      return { id: row.id as string, externalReference: row.external_reference as string };
    },
    async setOrderPreference(input) {
      const { error } = await supabase
        .from("orders")
        .update({ mercado_pago_preference_id: input.preferenceId })
        .eq("id", input.orderId);

      if (error) {
        throw new Error("No pudimos guardar la preferencia de pago");
      }
    },
  };
}

export async function createCheckoutOrder(
  rawInput: unknown,
  options: { repository?: CheckoutRepository; externalReferenceFactory?: () => string } = {},
) {
  const input = checkoutInputSchema.parse(rawInput) as CheckoutInput;
  const repository = options.repository ?? createSupabaseCheckoutRepository();
  const calculated = await calculateCheckout(input, repository);
  const externalReference = options.externalReferenceFactory?.() ?? randomUUID();
  const orderInput: PendingOrderInput = {
    buyer: input.buyer,
    shippingAddress: {
      address: input.buyer.address,
      city: input.buyer.city,
      postalCode: input.buyer.postalCode,
    },
    items: calculated.items,
    totals: calculated.totals,
    externalReference,
  };
  const order = await repository.createPendingOrder(orderInput);

  return {
    orderId: order.id,
    externalReference: order.externalReference,
    ...calculated,
  };
}


