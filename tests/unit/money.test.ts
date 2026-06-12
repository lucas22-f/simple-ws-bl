import { describe, expect, it } from "vitest";
import {
  calculatePublishedPriceCents,
  formatCentsAsCurrency,
  MERCADO_PAGO_SURCHARGE_PERCENT,
  parseCurrencyAmountToCents,
} from "@/lib/money";

describe("money helpers", () => {
  it("parses normal currency amounts to cents", () => {
    expect(parseCurrencyAmountToCents("200.00")).toBe(20000);
    expect(parseCurrencyAmountToCents("1,234.56")).toBe(123456);
    expect(parseCurrencyAmountToCents("1.234,56")).toBe(123456);
    expect(parseCurrencyAmountToCents("1.234")).toBe(123400);
    expect(parseCurrencyAmountToCents("1,234")).toBe(123400);
    expect(parseCurrencyAmountToCents("1.234.567")).toBe(123456700);
    expect(parseCurrencyAmountToCents(200)).toBe(20000);
  });

  it("rejects negative money amounts", () => {
    expect(() => parseCurrencyAmountToCents("-1")).toThrow("cannot be negative");
    expect(() => parseCurrencyAmountToCents(-1)).toThrow("cannot be negative");
    expect(() => calculatePublishedPriceCents(-100, true)).toThrow("cannot be negative");
  });

  it("formats cents as normal currency amounts", () => {
    expect(formatCentsAsCurrency(20000, "ARS", "es-AR")).toContain("200,00");
  });

  it("calculates the published price with the fixed Mercado Pago surcharge", () => {
    expect(MERCADO_PAGO_SURCHARGE_PERCENT).toBe(10);
    expect(calculatePublishedPriceCents(10000, true)).toBe(11000);
    expect(calculatePublishedPriceCents(10000, false)).toBe(10000);
    expect(calculatePublishedPriceCents(999, true)).toBe(1099);
  });
});
