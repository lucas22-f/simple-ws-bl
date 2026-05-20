import { describe, expect, it } from "vitest";

import { assertFulfillmentTransition, isFulfillmentStatus, ORDER_FULFILLMENT_STATUSES } from "@/lib/status";

describe("order fulfillment status transitions", () => {
  it("accepts only known fulfillment statuses", () => {
    expect(ORDER_FULFILLMENT_STATUSES).toEqual(["pending", "processing", "shipped", "cancelled"]);
    expect(isFulfillmentStatus("processing")).toBe(true);
    expect(isFulfillmentStatus("delivered")).toBe(false);
  });

  it("allows explicit forward/cancel transitions", () => {
    expect(assertFulfillmentTransition("pending", "processing")).toBe("processing");
    expect(assertFulfillmentTransition("processing", "shipped")).toBe("shipped");
    expect(assertFulfillmentTransition("pending", "cancelled")).toBe("cancelled");
  });

  it("rejects skipped, terminal, and arbitrary transitions", () => {
    expect(() => assertFulfillmentTransition("pending", "shipped")).toThrow("Transición de estado inválida");
    expect(() => assertFulfillmentTransition("shipped", "cancelled")).toThrow("Transición de estado inválida");
    expect(() => assertFulfillmentTransition("pending", "delivered")).toThrow("Estado de orden inválido");
  });
});

