import { create } from "zustand";
import type { User } from "@/lib/types/user";

/**
 * Ordered list of application roles recognised by the frontend.
 * The first match wins, so higher-priority roles come first.
 * Generic Frappe roles (All, Desk User, Employee, Guest, etc.) are
 * intentionally excluded so they never become the "primary" role.
 */
const APP_ROLE_PRIORITY = [
  "Director",
  "Management",
  "General Manager",
  "Branch Manager",
  "Mentor",
  "HR Manager",
  "Administrator",
  "Class Incharge",
  "Instructor",
  "Batch Coordinator",
  "Teacher",
  "Sales User",
  "Content Admin",
  "Accounts User",
  "Parent",
];

/** Roles the user can actively switch between in the UI. */
const SWITCHABLE_ROLES = [
  "Director",
  "Management",
  "General Manager",
  "Branch Manager",
  "Mentor",
  "HR Manager",
  "Sales User",
  "Class Incharge",
  "Instructor",
  "Content Admin",
  "Parent",
] as const;

function determinePrimaryRole(
  roles: string[],
  roleProfileName?: string,
): string | null {
  for (const r of APP_ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roleProfileName || roles[0] || null;
}

function determineSwitchableRoles(roles: string[]): string[] {
  const available = SWITCHABLE_ROLES.filter((role) => roles.includes(role));
  return available.length > 1 ? [...available] : [];
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;
  activeRole: string | null;
  switchableRoles: string[];
  allowedCompanies: string[];
  defaultCompany: string;
  isInstructor: boolean;
  instructorName: string;
  instructorDisplayName: string;
  allowedBatches: string[];
  defaultBatch: string;
  mentorProfile: string;

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
  mentorProfile: "",

  setUser: (user) => {
    const roles = user.roles ?? [];
    const role = determinePrimaryRole(roles, user.role_profile_name ?? undefined);
    const isInstructor = roles.includes("Instructor");
    const switchableRoles = determineSwitchableRoles(roles);

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
      mentorProfile: user.mentor_profile ?? "",
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
      mentorProfile: "",
    }),
}));
