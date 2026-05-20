import { describe, expect, it } from "vitest";
import { createPublicEnv, createServerEnv, createSupabaseAdminEnv, createSupabaseServerClientEnv } from "@/server/env";

const validEnv = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_SECRET_KEY: "secret-key",
  MP_ACCESS_TOKEN: "mp-token",
  MP_WEBHOOK_SECRET: "webhook-secret",
};

describe("createServerEnv", () => {
  it("returns typed env when required values are present", () => {
    expect(createServerEnv(validEnv).MP_ACCESS_TOKEN).toBe("mp-token");
  });

  it("throws a safe error listing invalid keys without leaking values", () => {
    expect(() =>
      createServerEnv({
        ...validEnv,
        MP_ACCESS_TOKEN: "",
      }),
    ).toThrow(/Invalid server configuration: MP_ACCESS_TOKEN/);
  });

  it("still requires Mercado Pago secrets for full server configuration", () => {
    expect(() =>
      createServerEnv({
        ...validEnv,
        MP_ACCESS_TOKEN: undefined,
        MP_WEBHOOK_SECRET: undefined,
      }),
    ).toThrow(/Invalid server configuration: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET/);
  });
});

describe("createPublicEnv", () => {
  it("validates only browser-safe public values", () => {
    expect(
      createPublicEnv({
        NEXT_PUBLIC_SITE_URL: validEnv.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }),
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: validEnv.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_META_PIXEL_ID: undefined,
      NEXT_PUBLIC_GTM_ID: undefined,
    });
  });
});

describe("createSupabaseServerClientEnv", () => {
  it("validates only the public Supabase values needed by the SSR auth client", () => {
    expect(
      createSupabaseServerClientEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: validEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it("throws a narrow Supabase error when a required Supabase value is missing", () => {
    expect(() =>
      createSupabaseServerClientEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      }),
    ).toThrow(/Invalid Supabase server configuration: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe("createSupabaseAdminEnv", () => {
  it("validates only the Supabase URL and service role key needed by admin data access", () => {
    expect(
      createSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SECRET_KEY: validEnv.SUPABASE_SECRET_KEY,
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SECRET_KEY: validEnv.SUPABASE_SECRET_KEY,
    });
  });

  it("does not require Mercado Pago secrets for Supabase admin access", () => {
    expect(() =>
      createSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SECRET_KEY: validEnv.SUPABASE_SECRET_KEY,
      }),
    ).not.toThrow();
  });
});
