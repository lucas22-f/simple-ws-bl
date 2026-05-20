import React from "react";
import { isValidMetaPixelId } from "@/server/settings/queries";

export function MetaPixel({ pixelId }: { pixelId: string | null | undefined }) {
  if (!isValidMetaPixelId(pixelId)) {
    return null;
  }

  const src = `https://connect.facebook.net/en_US/fbevents.js?id=${encodeURIComponent(pixelId)}`;
  const imageSrc = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;

  return (
    <>
      <script async src={src} data-provider="meta-pixel" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} src={imageSrc} alt="" />
      </noscript>
    </>
  );
}


