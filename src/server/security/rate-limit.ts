import "server-only";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type RateLimitPolicy = {
  bucket: string;
  identity: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  resetAt: Date;
};

export type RateLimiter = {
  consume(policy: RateLimitPolicy): Promise<RateLimitResult>;
};

type RateLimitRpcRow = {
  allowed: boolean;
  retry_after_seconds: number;
  remaining: number;
  reset_at: string;
};

type RateLimitSupabaseClient = {
  rpc(
    functionName: "consume_rate_limit",
    args: {
      p_bucket: string;
      p_identity: string;
      p_limit: number;
      p_window_seconds: number;
    },
  ): PromiseLike<{ data: RateLimitRpcRow | RateLimitRpcRow[] | null; error: { message?: string } | null }>;
};

export const CHECKOUT_RATE_LIMIT = {
  bucket: "checkout:create-preference:ip",
  limit: 5,
  windowSeconds: 60,
} as const;

export const CHECKOUT_EMAIL_RATE_LIMIT = {
  bucket: "checkout:create-preference:email",
  limit: 3,
  windowSeconds: 60 * 10,
} as const;

export const PAYMENT_RETURN_RATE_LIMIT = {
  bucket: "orders:payment-return:ip",
  limit: 20,
  windowSeconds: 60,
} as const;

export const ADMIN_REGISTRATION_IP_RATE_LIMIT = {
  bucket: "admin-registration:ip",
  limit: 5,
  windowSeconds: 60 * 60,
} as const;

export const ADMIN_REGISTRATION_EMAIL_RATE_LIMIT = {
  bucket: "admin-registration:email",
  limit: 3,
  windowSeconds: 60 * 60,
} as const;

export const ADMIN_LOGIN_IP_RATE_LIMIT = {
  bucket: "admin-login:ip",
  limit: 10,
  windowSeconds: 60 * 15,
} as const;

export const ADMIN_LOGIN_EMAIL_RATE_LIMIT = {
  bucket: "admin-login:email",
  limit: 5,
  windowSeconds: 60 * 15,
} as const;

export function normalizeRateLimitIdentity(value: string) {
  return value.trim().toLowerCase();
}

export function getClientIpFromHeaders(headers: Pick<Headers, "get">) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0];
  const realIp = headers.get("x-real-ip");
  const candidate = forwardedFor ?? realIp ?? "unknown";
  return normalizeRateLimitIdentity(candidate) || "unknown";
}

function mapRateLimitRow(row: RateLimitRpcRow): RateLimitResult {
  return {
    allowed: row.allowed,
    retryAfterSeconds: row.retry_after_seconds,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}

export function createSupabaseRateLimiter(
  createClient: () => RateLimitSupabaseClient = createSupabaseAdminClient,
): RateLimiter {
  return {
    async consume(policy) {
      const { data, error } = await createClient().rpc("consume_rate_limit", {
        p_bucket: policy.bucket,
        p_identity: normalizeRateLimitIdentity(policy.identity) || "unknown",
        p_limit: policy.limit,
        p_window_seconds: policy.windowSeconds,
      });

      if (error) {
        throw new Error("No pudimos validar el límite de intentos");
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        throw new Error("No pudimos validar el límite de intentos");
      }

      return mapRateLimitRow(row);
    },
  };
}

export function createDefaultRateLimiter() {
  return createSupabaseRateLimiter();
}
