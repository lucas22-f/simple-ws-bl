export type MoneyInput = {
  amountCents: number;
  currency?: string;
  locale?: string;
};

export function formatMoney({ amountCents, currency = "ARS", locale = "es-AR" }: MoneyInput) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function calculateSubtotalCents(items: { quantity: number; unitPriceCents: number }[]) {
  return items.reduce((subtotal, item) => {
    const quantity = Number.isFinite(item.quantity) ? Math.max(0, Math.trunc(item.quantity)) : 0;
    const unitPriceCents = Number.isFinite(item.unitPriceCents) ? Math.max(0, Math.trunc(item.unitPriceCents)) : 0;

    return subtotal + quantity * unitPriceCents;
  }, 0);
}

