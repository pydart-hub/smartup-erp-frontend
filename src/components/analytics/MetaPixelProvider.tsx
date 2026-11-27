"use client";

import React, { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  META_PIXEL_ID,
  isAdminRoute,
  trackMetaPageView,
} from "@/lib/analytics/meta-pixel";

export default function MetaPixelProvider() {
  const pathname = usePathname();
  const skipTracking = isAdminRoute(pathname);

  useEffect(() => {
    if (skipTracking) return;
    trackMetaPageView(pathname);
  }, [pathname, skipTracking]);

  if (skipTracking) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel-fbevents"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
