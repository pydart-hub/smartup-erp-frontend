import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flag Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureFlags {
  /** Auth gate: if false, skip login and go straight to dashboard */
  auth: boolean;
  /** Sidebar: if false, hide the entire sidebar */
  sidebar: boolean;
  /** Dashboard overview page visible in sidebar */
  overview: boolean;
  /** Students module (nav item + list page) */
  students: boolean;
  /** New student admission button on list page */
  students_create: boolean;
  /** Eye / view student button */
  students_view: boolean;
  /** Pencil / edit student button */
  students_edit: boolean;
  /** Batches nav item */
  batches: boolean;
  /** Classes nav item */
  classes: boolean;
  /** Attendance nav item */
  attendance: boolean;
  /** Fees nav item */
  fees: boolean;
  /** Global search bar in the header/topbar */
  topbar_search: boolean;
  /** Notification bell icon in the header */
  topbar_notifications: boolean;
  /** User profile button + dropdown in the header */
  topbar_profile: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  auth: true,
  sidebar: true,
  overview: true,
  students: true,
  students_create: true,
  students_view: true,
  students_edit: true,
  batches: true,
  classes: true,
  attendance: true,
  fees: true,
  topbar_search: true,
  topbar_notifications: true,
  topbar_profile: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureFlagsStore {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  resetFlags: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>()(
  persist(
    (set) => ({
      flags: DEFAULT_FLAGS,

      setFlag: (key, value) => {
        // Sync the auth flag to a middleware-readable cookie
        if (key === "auth") {
          if (!value) {
            document.cookie = "dev_auth_bypass=1; path=/; SameSite=Lax";
          } else {
            document.cookie =
              "dev_auth_bypass=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
          }
        }
        set((state) => ({ flags: { ...state.flags, [key]: value } }));
      },

      resetFlags: () => {
        // Clear the bypass cookie on reset
        document.cookie =
          "dev_auth_bypass=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        set({ flags: DEFAULT_FLAGS });
      },
    }),
    {
      name: "smartup-dev-flags",
    }
  )
);
