import type { SubmissionReceipt } from "@/components/enquiry/types";

const RECEIPT_STORAGE_PREFIX = "smartup_enquiry_receipt_";
const LAST_RECEIPT_STORAGE_KEY = "smartup_enquiry_last_receipt";

/**
 * Returns the route prefix depending on whether the user is on the
 * dedicated `enquiry.*` subdomain (rewritten by proxy.ts) or main domain.
 */
export function getEnquiryBasePath(hostname?: string): string {
  const host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return host.toLowerCase().startsWith("enquiry.") ? "" : "/enquiry";
}

export function getEnquiryHomePath(hostname?: string): string {
  return getEnquiryBasePath(hostname) || "/";
}

export function getEnquiryThankYouPath(
  referenceCode?: string,
  hostname?: string
): string {
  const base = getEnquiryBasePath(hostname);
  const path = `${base}/thank-you`;
  return referenceCode
    ? `${path}?ref=${encodeURIComponent(referenceCode)}`
    : path;
}

export function saveEnquiryReceipt(receipt: SubmissionReceipt): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(receipt);
    window.sessionStorage.setItem(
      `${RECEIPT_STORAGE_PREFIX}${receipt.referenceCode}`,
      serialized
    );
    window.sessionStorage.setItem(LAST_RECEIPT_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}

export function loadEnquiryReceipt(
  referenceCode?: string | null
): SubmissionReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = referenceCode
      ? window.sessionStorage.getItem(`${RECEIPT_STORAGE_PREFIX}${referenceCode}`)
      : window.sessionStorage.getItem(LAST_RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SubmissionReceipt>;
    if (
      typeof parsed.referenceCode === "string" &&
      typeof parsed.studentName === "string" &&
      typeof parsed.classLevel === "string" &&
      typeof parsed.preferredPlan === "string"
    ) {
      return {
        referenceCode: parsed.referenceCode,
        studentName: parsed.studentName,
        classLevel: parsed.classLevel,
        preferredPlan: parsed.preferredPlan,
        updated: Boolean(parsed.updated),
      };
    }
    return null;
  } catch {
    return null;
  }
}
