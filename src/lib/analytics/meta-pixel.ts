export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1269107675424835";

export type MetaLeadContentName = "enquiry_lead" | "levelup_lead";

type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: FbqFunction;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
    __smartupMetaPixelInitialized?: boolean;
  }
}

/**
 * Ensures the Meta Pixel `window.fbq` queue stub exists and `fbq('init', ...)`
 * has been called once before any `PageView` or `Lead` events are queued.
 */
export function ensureMetaPixelInitialized(): boolean {
  if (typeof window === "undefined") return false;

  if (!window.fbq) {
    const fbqStub: FbqFunction = function (...args: unknown[]) {
      if (fbqStub.callMethod) {
        fbqStub.callMethod(...args);
      } else {
        fbqStub.queue?.push(args);
      }
    };
    fbqStub.push = fbqStub;
    fbqStub.loaded = true;
    fbqStub.version = "2.0";
    fbqStub.queue = [];
    window.fbq = fbqStub;
    if (!window._fbq) {
      window._fbq = fbqStub;
    }
  }

  if (!window.__smartupMetaPixelInitialized) {
    window.fbq("init", META_PIXEL_ID);
    window.__smartupMetaPixelInitialized = true;
  }

  return true;
}

export function isAdminRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.includes("/admin");
}

export function trackMetaPageView(pathname?: string | null): void {
  if (typeof window === "undefined") return;
  const currentPath = pathname ?? window.location.pathname;
  if (isAdminRoute(currentPath)) return;

  if (!ensureMetaPixelInitialized() || !window.fbq) return;
  window.fbq("track", "PageView");
}

export function trackMetaLead(
  contentName: MetaLeadContentName,
  eventId?: string | null
): void {
  if (typeof window === "undefined") return;
  const id = eventId?.trim();
  if (!id || isAdminRoute(window.location.pathname)) return;

  const dedupeKey = `su_lead_${id}`;
  try {
    if (window.localStorage.getItem(dedupeKey)) {
      return;
    }
  } catch {
    // Continue if localStorage is blocked
  }

  if (!ensureMetaPixelInitialized() || !window.fbq) return;

  window.fbq("track", "Lead", { content_name: contentName }, { eventID: id });

  try {
    window.localStorage.setItem(dedupeKey, "1");
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}
