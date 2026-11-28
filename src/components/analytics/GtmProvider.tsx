"use client";

import React, { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  GTM_ID,
  isGtmExcludedRoute,
  trackGtmPageView,
} from "@/lib/analytics/gtm";

interface GtmProviderProps {
  gtmId?: string;
}

export default function GtmProvider({ gtmId = GTM_ID }: GtmProviderProps) {
  const pathname = usePathname();
  const validId = /^GTM-[A-Z0-9]+$/i.test(gtmId) ? gtmId : "";
  const skipTracking = !validId || isGtmExcludedRoute(pathname);

  useEffect(() => {
    if (skipTracking) return;
    trackGtmPageView(pathname);
  }, [pathname, skipTracking]);

  if (skipTracking) {
    return null;
  }

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${validId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(validId)}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
