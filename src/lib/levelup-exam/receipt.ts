export interface LevelUpSubmissionReceipt {
  registrationId: string;
  studentName: string;
  classLevel: string;
  curriculum: string;
  country: string;
  emirateCity: string;
  schoolName?: string;
  hasActiveExam?: boolean;
  examTitle?: string | null;
  durationMinutes?: number;
}

const RECEIPT_STORAGE_PREFIX = "smartup_levelup_receipt_";
const LAST_RECEIPT_STORAGE_KEY = "smartup_levelup_last_receipt";

/**
 * Returns the route prefix depending on whether the user is on the
 * dedicated `levelup.*` subdomain (rewritten by proxy.ts) or main domain.
 */
export function getLevelUpBasePath(hostname?: string): string {
  const host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return host.toLowerCase().startsWith("levelup.") ? "" : "/levelup";
}

export function getLevelUpHomePath(hostname?: string): string {
  return getLevelUpBasePath(hostname) || "/";
}

export function getLevelUpThankYouPath(
  registrationId?: string,
  hostname?: string
): string {
  const base = getLevelUpBasePath(hostname);
  const path = `${base}/thank-you`;
  return registrationId
    ? `${path}?id=${encodeURIComponent(registrationId)}`
    : path;
}

export function saveLevelUpReceipt(receipt: LevelUpSubmissionReceipt): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(receipt);
    window.sessionStorage.setItem(
      `${RECEIPT_STORAGE_PREFIX}${receipt.registrationId}`,
      serialized
    );
    window.sessionStorage.setItem(LAST_RECEIPT_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}

export function loadLevelUpReceipt(
  registrationId?: string | null
): LevelUpSubmissionReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = registrationId
      ? window.sessionStorage.getItem(
          `${RECEIPT_STORAGE_PREFIX}${registrationId}`
        )
      : window.sessionStorage.getItem(LAST_RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LevelUpSubmissionReceipt>;
    if (
      typeof parsed.registrationId === "string" &&
      typeof parsed.studentName === "string" &&
      typeof parsed.classLevel === "string"
    ) {
      return {
        registrationId: parsed.registrationId,
        studentName: parsed.studentName,
        classLevel: parsed.classLevel,
        curriculum: parsed.curriculum || "CBSE",
        country: parsed.country || "UAE",
        emirateCity: parsed.emirateCity || "",
        schoolName: parsed.schoolName || "",
        hasActiveExam: Boolean(parsed.hasActiveExam),
        examTitle: parsed.examTitle || null,
        durationMinutes: parsed.durationMinutes,
      };
    }
    return null;
  } catch {
    return null;
  }
}
