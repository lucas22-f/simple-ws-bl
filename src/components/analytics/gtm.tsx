import React from "react";
import { isValidGtmId } from "@/server/settings/queries";

export function Gtm({ gtmId }: { gtmId: string | null | undefined }) {
  if (!isValidGtmId(gtmId)) {
    return null;
  }

  const encodedId = encodeURIComponent(gtmId);
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${encodedId}`} data-provider="gtm" />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodedId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}


