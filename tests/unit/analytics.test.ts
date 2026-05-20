import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { Gtm } from "@/components/analytics/gtm";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { getAnalyticsSettings, isValidGtmId, isValidMetaPixelId } from "@/server/settings/queries";

describe("analytics ID gates", () => {
  it("accepts only valid Meta Pixel and GTM IDs", () => {
    expect(isValidMetaPixelId("1234567890123")).toBe(true);
    expect(isValidMetaPixelId("123abc")).toBe(false);
    expect(isValidGtmId("GTM-ABCD12")).toBe(true);
    expect(isValidGtmId("G-ABC")).toBe(false);
  });

  it("renders nothing for missing or malformed IDs", () => {
    expect(renderToStaticMarkup(React.createElement(MetaPixel, { pixelId: "" }))).toBe("");
    expect(renderToStaticMarkup(React.createElement(MetaPixel, { pixelId: "123<script>alert(1)</script>" }))).toBe("");
    expect(renderToStaticMarkup(React.createElement(Gtm, { gtmId: "bad" }))).toBe("");
  });

  it("renders provider scripts with validated IDs and no arbitrary script content", () => {
    const meta = renderToStaticMarkup(React.createElement(MetaPixel, { pixelId: "1234567890" }));
    const gtm = renderToStaticMarkup(React.createElement(Gtm, { gtmId: "GTM-ABCD12" }));

    expect(meta).toContain("connect.facebook.net/en_US/fbevents.js?id=1234567890");
    expect(meta).not.toContain("alert(");
    expect(gtm).toContain("googletagmanager.com/gtm.js?id=GTM-ABCD12");
    expect(gtm).not.toContain("<script>GTM-ABCD12</script>");
  });

  it("loads analytics settings only when public setting values contain valid IDs", async () => {
    const repository = {
      getPublicSettings: vi.fn(async () => [
        { key: "analytics", value: { metaPixelId: "1234567890", gtmId: "bad" } },
        { key: "private", value: { metaPixelId: "9999999999", gtmId: "GTM-PRIVATE" } },
      ]),
    };

    await expect(getAnalyticsSettings(repository)).resolves.toEqual({ metaPixelId: "1234567890", gtmId: null });
  });
});

