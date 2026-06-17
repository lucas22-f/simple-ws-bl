import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const checkout = vi.hoisted(() => ({
  createCheckoutPreference: vi.fn(),
}));

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
}));

vi.mock("@/server/checkout/create-preference", () => checkout);
vi.mock("@/server/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/security/rate-limit")>();
  return {
    ...actual,
    createDefaultRateLimiter: vi.fn(() => limiter),
  };
});

describe("checkout preference route rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    checkout.createCheckoutPreference.mockReset();
    limiter.consume.mockReset();
    limiter.consume.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 4,
      resetAt: new Date("2026-06-05T12:01:00.000Z"),
    });
    delete process.env.E2E_MERCADO_PAGO_CHECKOUT_URL;
  });

  it("returns 429 and Retry-After before creating an order or payment preference when the caller is limited", async () => {
    limiter.consume.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 45,
      remaining: 0,
      resetAt: new Date("2026-06-05T12:00:45.000Z"),
    });
    const { POST } = await import("@/app/api/checkout/preferences/route");

    const response = await POST(new Request("https://bazar.test/api/checkout/preferences", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.20, 10.0.0.2" },
      body: JSON.stringify({ shouldNotMatter: true }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    await expect(response.json()).resolves.toEqual({ error: "Demasiados intentos. Probá de nuevo en unos minutos." });
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "checkout:create-preference:ip",
      identity: "198.51.100.20",
    }));
    expect(checkout.createCheckoutPreference).not.toHaveBeenCalled();
  });

  it("creates the checkout preference when the distributed limit allows the request", async () => {
    checkout.createCheckoutPreference.mockResolvedValueOnce({
      orderId: "order-1",
      checkoutUrl: "https://mp.test/checkout",
      preferenceId: "pref-1",
    });
    const { POST } = await import("@/app/api/checkout/preferences/route");

    const response = await POST(new Request("https://bazar.test/api/checkout/preferences", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.21" },
      body: JSON.stringify({ buyer: { email: "ana@example.com" }, items: [] }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Retry-After")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      orderId: "order-1",
      checkoutUrl: "https://mp.test/checkout",
      preferenceId: "pref-1",
    });
    expect(checkout.createCheckoutPreference).toHaveBeenCalledOnce();
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "checkout:create-preference:ip",
      identity: "198.51.100.21",
    }));
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "checkout:create-preference:email",
      identity: "ana@example.com",
    }));
  });

  it("returns 429 before creating a checkout preference when the buyer email is limited", async () => {
    limiter.consume
      .mockResolvedValueOnce({
        allowed: true,
        retryAfterSeconds: 0,
        remaining: 4,
        resetAt: new Date("2026-06-05T12:01:00.000Z"),
      })
      .mockResolvedValueOnce({
        allowed: false,
        retryAfterSeconds: 90,
        remaining: 0,
        resetAt: new Date("2026-06-05T12:02:30.000Z"),
      });
    const { POST } = await import("@/app/api/checkout/preferences/route");

    const response = await POST(new Request("https://bazar.test/api/checkout/preferences", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.23" },
      body: JSON.stringify({ buyer: { email: " Ana@Example.COM " }, items: [] }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    await expect(response.json()).resolves.toEqual({ error: "Demasiados intentos. Probá de nuevo en unos minutos." });
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "checkout:create-preference:ip",
      identity: "198.51.100.23",
    }));
    expect(limiter.consume).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "checkout:create-preference:email",
      identity: "ana@example.com",
    }));
    expect(checkout.createCheckoutPreference).not.toHaveBeenCalled();
  });

  it("does not bypass production checkout persistence when an E2E checkout URL env var is present", async () => {
    process.env.E2E_MERCADO_PAGO_CHECKOUT_URL = "https://e2e.test/checkout";
    checkout.createCheckoutPreference.mockResolvedValueOnce({
      orderId: "order-1",
      checkoutUrl: "https://mp.test/checkout",
      preferenceId: "pref-1",
    });
    const { POST } = await import("@/app/api/checkout/preferences/route");

    const response = await POST(new Request("https://bazar.test/api/checkout/preferences", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.22" },
      body: JSON.stringify({ buyer: { email: "ana@example.com" }, items: [] }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      orderId: "order-1",
      checkoutUrl: "https://mp.test/checkout",
      preferenceId: "pref-1",
    });
    expect(checkout.createCheckoutPreference).toHaveBeenCalledWith(
      { buyer: { email: "ana@example.com" }, items: [] },
      {},
    );
  });

  it("does not leak internal checkout errors to public API clients", async () => {
    checkout.createCheckoutPreference.mockRejectedValueOnce(new Error("database stack detail: orders.total_cents"));
    const { POST } = await import("@/app/api/checkout/preferences/route");

    const response = await POST(new Request("https://bazar.test/api/checkout/preferences", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.24" },
      body: JSON.stringify({ buyer: { email: "ana@example.com" }, items: [] }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No pudimos iniciar el pago" });
  });
});
