const DEFAULT_GTM_ID = "GTM-PPCRHD8L";
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/i;

function resolveValidGtmId(rawId?: string | null): string | null {
  const candidate = (rawId ?? "").trim();
  if (!candidate || !GTM_ID_PATTERN.test(candidate)) {
    return null;
  }
  return candidate;
}

export const GTM_ID =
  resolveValidGtmId(process.env.NEXT_PUBLIC_GTM_ID) || DEFAULT_GTM_ID;

export interface GtmEnquiryLeadPayload {
  referenceCode: string;
  classLevel: string;
  preferredPlan: string;
  updated?: boolean;
  country?: string;
  city?: string;
  stream?: string;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function isGtmExcludedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.includes("/admin");
}

export function ensureDataLayer(): Array<Record<string, unknown>> | null {
  if (typeof window === "undefined") return null;
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  return window.dataLayer;
}

export function pushGtmEvent(
  event: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || !GTM_ID) return;
  if (isGtmExcludedRoute(window.location.pathname)) return;

  const dataLayer = ensureDataLayer();
  if (!dataLayer) return;

  dataLayer.push({
    event,
    ...params,
  });
}

export function trackGtmPageView(pathname?: string | null): void {
  if (typeof window === "undefined") return;
  const currentPath = pathname ?? window.location.pathname;
  if (isGtmExcludedRoute(currentPath)) return;

  pushGtmEvent("enquiry_page_view", {
    page_path: currentPath,
    page_location: window.location.href,
    page_title: typeof document !== "undefined" ? document.title : "",
  });
}

/**
 * Pushes a deduplicated `enquiry_lead_submitted` dataLayer event once per
 * `referenceCode` (`su_gtm_lead_<referenceCode>` in localStorage) with strictly
 * non-PII fields so GA4, Google Ads, and Meta Pixel tags inside GTM can fire safely.
 */
export function trackGtmEnquiryLead(payload: GtmEnquiryLeadPayload): void {
  if (typeof window === "undefined") return;
  const id = payload.referenceCode?.trim();
  if (!id || isGtmExcludedRoute(window.location.pathname)) return;

  const dedupeKey = `su_gtm_lead_${id}`;
  try {
    if (window.localStorage.getItem(dedupeKey)) {
      return;
    }
  } catch {
    // Continue if localStorage is blocked
  }

  pushGtmEvent("enquiry_lead_submitted", {
    event_id: id,
    content_name: "enquiry_lead",
    reference_code: id,
    class_level: payload.classLevel,
    preferred_plan: payload.preferredPlan,
    is_updated_lead: Boolean(payload.updated),
    ...(payload.country ? { country: payload.country } : {}),
    ...(payload.city ? { city: payload.city } : {}),
    ...(payload.stream ? { stream: payload.stream } : {}),
  });

  try {
    window.localStorage.setItem(dedupeKey, "1");
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}
