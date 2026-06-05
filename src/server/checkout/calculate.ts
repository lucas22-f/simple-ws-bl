import { calculateSubtotalCents } from "@/lib/money";
import type { CheckoutBuyer, CheckoutInput } from "@/server/checkout/schema";

export type CheckoutProduct = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  stockQuantity: number | null;
};

export type ShippingZone = {
  city?: string;
  postalCodePrefix?: string;
  costCents?: number;
  priceCents?: number;
};

export type CommissionSettings = {
  enabled: boolean;
  percent?: number;
  fixedCents?: number;
  type?: "percentage" | "fixed";
  value?: number;
};

export type CheckoutSettings = {
  shippingZones: ShippingZone[];
  commission: CommissionSettings;
};

export type OrderLineItem = {
  productId: string;
  productName: string;
  productSlug: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type CheckoutTotals = {
  subtotalCents: number;
  shippingCents: number;
  commissionCents: number;
  totalCents: number;
  currency: string;
};

export type PendingOrderInput = {
  buyer: CheckoutBuyer;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
  };
  items: OrderLineItem[];
  totals: CheckoutTotals;
  externalReference: string;
};

export type PendingOrderResult = {
  id: string;
  externalReference: string;
};

export type CheckoutRepository = {
  getActiveProductsByIds: (productIds: string[]) => Promise<CheckoutProduct[]>;
  getCheckoutSettings: () => Promise<CheckoutSettings>;
  createPendingOrder: (order: PendingOrderInput) => Promise<PendingOrderResult>;
  setOrderPreference?: (input: { orderId: string; preferenceId: string }) => Promise<void>;
};

const DEFAULT_SETTINGS: CheckoutSettings = {
  shippingZones: [],
  commission: { enabled: false },
};

function cents(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}

function matchesZone(zone: ShippingZone, buyer: CheckoutBuyer) {
  const cityMatches = zone.city ? zone.city.trim().toLowerCase() === buyer.city.trim().toLowerCase() : true;
  const postalMatches = zone.postalCodePrefix ? buyer.postalCode.trim().startsWith(zone.postalCodePrefix) : true;
  return cityMatches && postalMatches;
}

export function calculateShippingCents(buyer: CheckoutBuyer, zones: ShippingZone[]) {
  const zone = zones.find((candidate) => matchesZone(candidate, buyer));
  return cents(zone?.costCents ?? zone?.priceCents);
}

export function calculateCommissionCents(subtotalCents: number, shippingCents: number, settings: CommissionSettings) {
  if (!settings.enabled) {
    return 0;
  }

  if (settings.type === "fixed") {
    return cents(settings.value ?? settings.fixedCents);
  }

  const percent = settings.percent ?? (settings.type === "percentage" ? settings.value : 0) ?? 0;
  return Math.round(subtotalCents * Math.max(0, percent) / 100) + cents(settings.fixedCents);
}

export async function calculateCheckout(input: CheckoutInput, repository: Pick<CheckoutRepository, "getActiveProductsByIds" | "getCheckoutSettings">) {
  const quantitiesByProductId = new Map<string, number>();
  for (const item of input.items) {
    quantitiesByProductId.set(item.productId, (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = [...quantitiesByProductId.keys()];
  const [products, settings = DEFAULT_SETTINGS] = await Promise.all([
    repository.getActiveProductsByIds(productIds),
    repository.getCheckoutSettings(),
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const items = productIds.map((productId) => {
    const product = productsById.get(productId);
    const quantity = quantitiesByProductId.get(productId) ?? 0;
    if (!product) {
      throw new Error("Hay productos del carrito que ya no están disponibles");
    }
    if (product.stockQuantity !== null && quantity > product.stockQuantity) {
      throw new Error(`Stock insuficiente para ${product.name}`);
    }

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    };
  });

  const subtotalCents = calculateSubtotalCents(items.map((item) => ({ quantity: item.quantity, unitPriceCents: item.unitPriceCents })));
  const shippingCents = calculateShippingCents(input.buyer, settings.shippingZones);
  const commissionCents = calculateCommissionCents(subtotalCents, shippingCents, settings.commission);
  const currency = products[0]?.currency ?? "ARS";

  return {
    items,
    totals: {
      subtotalCents,
      shippingCents,
      commissionCents,
      totalCents: subtotalCents + shippingCents + commissionCents,
      currency,
    },
  };
}


