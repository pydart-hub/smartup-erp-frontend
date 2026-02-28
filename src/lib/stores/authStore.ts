import { create } from "zustand";
import type { User } from "@/lib/types/user";

/**
 * Ordered list of application roles recognised by the frontend.
 * The first match wins, so higher-priority roles come first.
 * Generic Frappe roles (All, Desk User, Employee, Guest …) are
 * intentionally excluded so they never become the "primary" role.
 */
const APP_ROLE_PRIORITY = [
  "Director",
  "Management",
  "Branch Manager",
  "Administrator",
  "Instructor",
  "Batch Coordinator",
  "Teacher",
  "Accountant",
  "Parent",
];

/** Pick the best application role from the user's full role list. */
function determinePrimaryRole(
  roles: string[],
  roleProfileName?: string,
): string | null {
  for (const r of APP_ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  // Fall back to role_profile_name, then first role, then null
  return roleProfileName || roles[0] || null;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;
  /** Companies (branches) this user can access */
  allowedCompanies: string[];
  /** Default / primary company for this user */
  defaultCompany: string;
  /** Whether the user is an instructor */
  isInstructor: boolean;
  /** Instructor doc name */
  instructorName: string;
  /** Instructor display name */
  instructorDisplayName: string;
  /** Student Batch Names (e.g. "FKO-25") the instructor can access */
  allowedBatches: string[];
  /** Default batch for the instructor */
  defaultBatch: string;

  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  allowedCompanies: [],
  defaultCompany: "",
  isInstructor: false,
  instructorName: "",
  instructorDisplayName: "",
  allowedBatches: [],
  defaultBatch: "",

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      role: determinePrimaryRole(user.roles ?? [], user.role_profile_name ?? undefined),
      allowedCompanies: user.allowed_companies ?? [],
      defaultCompany: user.default_company ?? "",
      isInstructor: !!user.instructor_name,
      instructorName: user.instructor_name ?? "",
      instructorDisplayName: user.instructor_display_name ?? "",
      allowedBatches: user.allowed_batches ?? [],
      defaultBatch: user.default_batch ?? "",
    }),

  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      role: null,
      allowedCompanies: [],
      defaultCompany: "",
      isInstructor: false,
      instructorName: "",
      instructorDisplayName: "",
      allowedBatches: [],
      defaultBatch: "",
    }),
}));
