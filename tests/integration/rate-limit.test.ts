import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const supabaseAdmin = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/server/supabase/admin", () => supabaseAdmin);

import {
  CHECKOUT_RATE_LIMIT,
  createSupabaseRateLimiter,
  getClientIpFromHeaders,
  normalizeRateLimitIdentity,
} from "@/server/security/rate-limit";

describe("distributed rate limiter", () => {
  it("normalizes IP and email identities before they become database keys", () => {
    expect(getClientIpFromHeaders(new Headers({ "x-forwarded-for": " 198.51.100.50, 10.0.0.1 " }))).toBe("198.51.100.50");
    expect(getClientIpFromHeaders(new Headers({ "x-real-ip": " 203.0.113.8 " }))).toBe("203.0.113.8");
    expect(normalizeRateLimitIdentity(" Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("uses the service-role RPC and maps database retry-after metadata", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        allowed: false,
        retry_after_seconds: 30,
        remaining: 0,
        reset_at: "2026-06-05T12:00:30.000Z",
      },
      error: null,
    }));
    supabaseAdmin.createSupabaseAdminClient.mockReturnValue({ rpc });

    const result = await createSupabaseRateLimiter().consume({
      ...CHECKOUT_RATE_LIMIT,
      identity: "198.51.100.50",
    });

    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_bucket: "checkout:create-preference:ip",
      p_identity: "198.51.100.50",
      p_limit: CHECKOUT_RATE_LIMIT.limit,
      p_window_seconds: CHECKOUT_RATE_LIMIT.windowSeconds,
    });
    expect(result).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
      remaining: 0,
      resetAt: new Date("2026-06-05T12:00:30.000Z"),
    });
  });
});
