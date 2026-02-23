// ── Batch Configuration ──
export const MAX_BATCH_CAPACITY = 60;

// ── Student Statuses ──
export const STUDENT_STATUSES = ["Active", "Completed", "Drop-out"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

// ── Class Levels ──
export const CLASS_LEVELS = ["8", "9", "10", "11", "12"] as const;

// ── Batch Names ──
export const BATCH_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

// ── Attendance Statuses ──
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late"] as const;

// ── Fee Payment Modes ──
export const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card"] as const;

// ── Roles ──
export const ROLES = {
  BRANCH_MANAGER: "Branch Manager",
  BATCH_COORDINATOR: "Batch Coordinator",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  ADMIN: "Administrator",
} as const;

// ── Role to Dashboard Route Mapping ──
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  "Branch Manager": "/dashboard/branch-manager",
  "Batch Coordinator": "/dashboard/batch-coordinator",
  "Teacher": "/dashboard/teacher",
  "Accountant": "/dashboard/accountant",
  "Administrator": "/dashboard/admin",
};

// ── Sidebar Navigation per Role ──
export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: string;
}

export const BRANCH_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/branch-manager", icon: "LayoutDashboard" },
  { label: "Students", href: "/dashboard/branch-manager/students", icon: "GraduationCap" },
  { label: "Classes", href: "/dashboard/branch-manager/classes", icon: "School" },
  { label: "Batches", href: "/dashboard/branch-manager/batches", icon: "Users" },
  { label: "Attendance", href: "/dashboard/branch-manager/attendance", icon: "ClipboardCheck" },
  { label: "Fees", href: "/dashboard/branch-manager/fees", icon: "IndianRupee" },
];
