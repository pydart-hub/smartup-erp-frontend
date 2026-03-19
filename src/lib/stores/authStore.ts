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
  "HR Manager",
  "Administrator",
  "Instructor",
  "Batch Coordinator",
  "Teacher",
  "Sales User",
  "Accounts User",
  "Parent",
];

/** Roles the user can actively switch between in the UI. */
const SWITCHABLE_ROLES = ["Branch Manager", "Instructor"] as const;

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

/** Return roles the user may switch between, or empty if only one. */
function determineSwitchableRoles(roles: string[], isInstructor: boolean): string[] {
  const available: string[] = [];
  for (const r of SWITCHABLE_ROLES) {
    if (r === "Instructor" && isInstructor) available.push(r);
    else if (roles.includes(r)) available.push(r);
  }
  return available.length > 1 ? available : [];
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The highest-priority role from the user's Frappe roles */
  role: string | null;
  /** The role the user is actively viewing (can be switched) */
  activeRole: string | null;
  /** Roles this user can switch between (empty = no switcher) */
  switchableRoles: string[];
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
  setActiveRole: (role: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  activeRole: null,
  switchableRoles: [],
  allowedCompanies: [],
  defaultCompany: "",
  isInstructor: false,
  instructorName: "",
  instructorDisplayName: "",
  allowedBatches: [],
  defaultBatch: "",

  setUser: (user) => {
    const role = determinePrimaryRole(user.roles ?? [], user.role_profile_name ?? undefined);
    const isInstructor = !!user.instructor_name;
    const switchableRoles = determineSwitchableRoles(user.roles ?? [], isInstructor);
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      role,
      activeRole: role,
      switchableRoles,
      allowedCompanies: user.allowed_companies ?? [],
      defaultCompany: user.default_company ?? "",
      isInstructor,
      instructorName: user.instructor_name ?? "",
      instructorDisplayName: user.instructor_display_name ?? "",
      allowedBatches: user.allowed_batches ?? [],
      defaultBatch: user.default_batch ?? "",
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setActiveRole: (activeRole) => set({ activeRole }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      role: null,
      activeRole: null,
      switchableRoles: [],
      allowedCompanies: [],
      defaultCompany: "",
      isInstructor: false,
      instructorName: "",
      instructorDisplayName: "",
      allowedBatches: [],
      defaultBatch: "",
    }),
}));
