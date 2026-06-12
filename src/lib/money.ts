export type MoneyInput = {
  amountCents: number;
  currency?: string;
  locale?: string;
};

export const MERCADO_PAGO_SURCHARGE_PERCENT = 10;

function normalizeCents(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Money amount must be finite.");
  }

  if (value < 0) {
    throw new Error("Money amount cannot be negative.");
  }

  return Math.round(value);
}

function normalizeCurrencyString(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue.includes("-")) {
    throw new Error("Money amount cannot be negative.");
  }

  const compactValue = trimmedValue.replace(/[^\d,.-]/g, "");

  if (!compactValue || compactValue === "-" || compactValue === "," || compactValue === ".") {
    throw new Error("Money amount is required.");
  }

  const lastComma = compactValue.lastIndexOf(",");
  const lastDot = compactValue.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : lastDot > -1 ? "." : "";
  const separators = compactValue.match(/[,.]/g) ?? [];

  if (!decimalSeparator) {
    return compactValue.replace(/[,.]/g, "");
  }

  if (
    separators.length === 1
    && compactValue.slice(compactValue.lastIndexOf(decimalSeparator) + 1).length === 3
  ) {
    return compactValue.replace(/[,.]/g, "");
  }

  if (
    separators.length > 1
    && separators.every((separator) => separator === decimalSeparator)
    && compactValue.split(decimalSeparator).slice(1).every((group) => group.length === 3)
  ) {
    return compactValue.replace(/[,.]/g, "");
  }

  const decimalIndex = compactValue.lastIndexOf(decimalSeparator);
  const integerPart = compactValue.slice(0, decimalIndex).replace(/[,.]/g, "");
  const decimalPart = compactValue.slice(decimalIndex + 1).replace(/[,.]/g, "");

  return `${integerPart || "0"}.${decimalPart}`;
}

export function formatMoney({ amountCents, currency = "ARS", locale = "es-AR" }: MoneyInput) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function parseCurrencyAmountToCents(value: string | number) {
  if (typeof value === "number") {
    return normalizeCents(value * 100);
  }

  const numericValue = Number(normalizeCurrencyString(value));

  if (!Number.isFinite(numericValue)) {
    throw new Error("Money amount must be a valid number.");
  }

  return normalizeCents(numericValue * 100);
}

export function formatCentsAsCurrency(amountCents: number, currency = "ARS", locale = "es-AR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizeCents(amountCents) / 100);
}

export function calculatePublishedPriceCents(basePriceCents: number, applyMercadoPagoSurcharge: boolean) {
  const normalizedBasePriceCents = normalizeCents(basePriceCents);

  if (!applyMercadoPagoSurcharge) {
    return normalizedBasePriceCents;
  }

  return Math.round(normalizedBasePriceCents * (1 + MERCADO_PAGO_SURCHARGE_PERCENT / 100));
}

export function calculateSubtotalCents(items: { quantity: number; unitPriceCents: number }[]) {
  return items.reduce((subtotal, item) => {
    const quantity = Number.isFinite(item.quantity) ? Math.max(0, Math.trunc(item.quantity)) : 0;
    const unitPriceCents = Number.isFinite(item.unitPriceCents) ? Math.max(0, Math.trunc(item.unitPriceCents)) : 0;

    return subtotal + quantity * unitPriceCents;
  }, 0);
}
