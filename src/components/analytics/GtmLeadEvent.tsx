"use client";

import { useEffect } from "react";
import {
  trackGtmEnquiryLead,
  type GtmEnquiryLeadPayload,
} from "@/lib/analytics/gtm";

interface GtmLeadEventProps {
  receipt: GtmEnquiryLeadPayload | null;
}

/**
 * Fires a deduplicated GTM `enquiry_lead_submitted` dataLayer event once per
 * `receipt.referenceCode` on the Thank You page.
 */
export default function GtmLeadEvent({ receipt }: GtmLeadEventProps) {
  useEffect(() => {
    if (!receipt?.referenceCode) return;
    trackGtmEnquiryLead(receipt);
  }, [receipt]);

  return null;
}
