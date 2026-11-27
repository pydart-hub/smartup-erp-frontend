"use client";

import { useEffect } from "react";
import {
  trackMetaLead,
  type MetaLeadContentName,
} from "@/lib/analytics/meta-pixel";

interface MetaLeadEventProps {
  contentName: MetaLeadContentName;
  eventId?: string | null;
}

/**
 * Fires a deduplicated Meta `Lead` conversion event once per `eventId`
 * (`su_lead_<eventId>` in localStorage) on Thank You page mount.
 */
export default function MetaLeadEvent({
  contentName,
  eventId,
}: MetaLeadEventProps) {
  useEffect(() => {
    if (!eventId) return;
    trackMetaLead(contentName, eventId);
  }, [contentName, eventId]);

  return null;
}
