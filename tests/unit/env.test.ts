import { describe, expect, it } from "vitest";
import { createPublicEnv, createServerEnv } from "@/server/env";

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
