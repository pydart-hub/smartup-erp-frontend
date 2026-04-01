// ── Batch Configuration ──
export const MAX_BATCH_CAPACITY = 60;

// ── Student Statuses ──
export const STUDENT_STATUSES = ["Active", "Completed", "Drop-out", "Discontinued"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

// ── Discontinuation Reasons ──
export const DISCONTINUATION_REASONS = [
  "Fee Default",
  "Relocation",
  "Personal Reasons",
  "Health Issues",
  "Transfer to Other School",
  "Other",
] as const;
export type DiscontinuationReason = (typeof DISCONTINUATION_REASONS)[number];

// ── Class Levels ──
export const CLASS_LEVELS = ["8", "9", "10", "11", "12"] as const;

// ── Batch Names ──
export const BATCH_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

// ── Attendance Statuses ──
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late"] as const;

// ── Fee Payment Modes ──
export const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Razorpay"] as const;

// ── Instalment Due Date Schedule ──
// Month (0-indexed) and day for each instalment option.
// Academic year starts April, ends March.
export const INSTALMENT_DUE_DATES = {
  // OTP: due on enrollment date (handled dynamically)
  quarterly: [
    { month: 3, day: 15 },   // Q1: April 15
    { month: 6, day: 15 },   // Q2: July 15
    { month: 9, day: 15 },   // Q3: October 15
    { month: 0, day: 15 },   // Q4: January 15 (next calendar year)
  ],
  inst6: [
    { month: 3, day: 15 },   // April 15
    { month: 5, day: 15 },   // June 15
    { month: 7, day: 15 },   // August 15
    { month: 9, day: 15 },   // October 15
    { month: 11, day: 15 },  // December 15
    { month: 1, day: 15 },   // February 15 (next calendar year)
  ],
  inst8: [
    { month: 3, day: 15 },   // April 15
    { month: 4, day: 15 },   // May 15
    { month: 5, day: 15 },   // June 15
    { month: 6, day: 15 },   // July 15
    { month: 7, day: 15 },   // August 15
    { month: 8, day: 15 },   // September 15
    { month: 9, day: 15 },   // October 15
    { month: 10, day: 15 },  // November 15
  ],
} as const;

// ── Payment Option Labels ──
export const PAYMENT_OPTION_LABELS: Record<string, string> = {
  "1": "One-Time Payment",
  "4": "Quarterly",
  "6": "Bi-Monthly (6 Instalments)",
  "8": "Monthly (8 Instalments)",
};

// ── Roles ──
export const ROLES = {
  BRANCH_MANAGER: "Branch Manager",
  BATCH_COORDINATOR: "Batch Coordinator",
  TEACHER: "Teacher",
  ADMIN: "Administrator",
  HR_MANAGER: "HR Manager",
  SALES_USER: "Sales User",
} as const;

// ── Role to Dashboard Route Mapping ──
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  "Director": "/dashboard/director",
  "Management": "/dashboard/director",
  "Branch Manager": "/dashboard/branch-manager",
  "Batch Coordinator": "/dashboard/batch-coordinator",
  "Teacher": "/dashboard/teacher",
  "Administrator": "/dashboard/admin",
  "HR Manager": "/dashboard/hr-manager",
  "Instructor": "/dashboard/instructor",
  "Sales User": "/dashboard/sales-user",
  "Parent": "/dashboard/parent",
};

// ── Sidebar Navigation per Role ──
export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: string;
  children?: NavItem[];
}

export const BRANCH_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/branch-manager", icon: "LayoutDashboard" },
  { label: "New Admission", href: "/dashboard/branch-manager/new-admission", icon: "UserPlus" },
  {
    label: "Students", href: "/dashboard/branch-manager/students", icon: "GraduationCap",
    children: [
      { label: "Classes", href: "/dashboard/branch-manager/classes", icon: "School" },
      { label: "Batches", href: "/dashboard/branch-manager/batches", icon: "Users" },
    ],
  },
  { label: "Attendance", href: "/dashboard/branch-manager/attendance", icon: "ClipboardCheck",
    children: [
      { label: "Students", href: "/dashboard/branch-manager/attendance/students", icon: "GraduationCap" },
      { label: "Staff", href: "/dashboard/branch-manager/attendance/staff", icon: "Briefcase" },
    ],
  },
  { label: "Course Schedule", href: "/dashboard/branch-manager/course-schedule", icon: "CalendarDays" },
  { label: "Teachers", href: "/dashboard/branch-manager/teachers", icon: "UserCheck" },
  { label: "Fees", href: "/dashboard/branch-manager/fees", icon: "IndianRupee" },
  { label: "Sales Orders", href: "/dashboard/branch-manager/sales-orders", icon: "ShoppingCart" },
  { label: "Transfers", href: "/dashboard/branch-manager/transfers", icon: "ArrowRightLeft" },
];

export const DIRECTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/director", icon: "LayoutDashboard" },
  {
    label: "Students", href: "/dashboard/director/students", icon: "GraduationCap",
    children: [
      { label: "Batches", href: "/dashboard/director/batches", icon: "Users" },
    ],
  },
  { label: "Teachers", href: "/dashboard/director/teachers", icon: "UserCheck" },
  { label: "Attendance", href: "/dashboard/director/attendance", icon: "ClipboardCheck",
    children: [
      { label: "Students", href: "/dashboard/director/attendance/students", icon: "GraduationCap" },
      { label: "Staff", href: "/dashboard/director/attendance/staff", icon: "Briefcase" },
    ],
  },
  { label: "Course Schedule", href: "/dashboard/director/course-schedule", icon: "CalendarDays" },
  { label: "Fees", href: "/dashboard/director/fees", icon: "IndianRupee" },
  { label: "Bank", href: "/dashboard/director/bank", icon: "Landmark" },
  { label: "Reports", href: "/dashboard/director/reports", icon: "FileBarChart" },
  { label: "Complaints", href: "/dashboard/director/complaints", icon: "MessageSquareWarning" },
  { label: "Transfers", href: "/dashboard/branch-manager/transfers", icon: "ArrowRightLeft" },
];

export const INSTRUCTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/instructor", icon: "LayoutDashboard" },
  { label: "My Batches", href: "/dashboard/instructor/batches", icon: "Users" },
  { label: "Students", href: "/dashboard/instructor/students", icon: "GraduationCap" },
  { label: "Attendance", href: "/dashboard/instructor/attendance", icon: "ClipboardCheck" },
  { label: "Course Schedule", href: "/dashboard/instructor/course-schedule", icon: "CalendarDays" },
];

export const PARENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/parent", icon: "LayoutDashboard" },
  { label: "Children", href: "/dashboard/parent/children", icon: "Users" },
  { label: "Attendance", href: "/dashboard/parent/attendance", icon: "ClipboardCheck" },
  { label: "Fees", href: "/dashboard/parent/fees", icon: "IndianRupee" },
  { label: "Complaints", href: "/dashboard/parent/complaints", icon: "MessageSquareWarning" },
];

export const HR_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/hr-manager", icon: "LayoutDashboard" },
  { label: "Employees", href: "/dashboard/hr-manager/employees", icon: "Users" },
  { label: "Attendance", href: "/dashboard/hr-manager/attendance", icon: "ClipboardCheck" },
  { label: "Leaves", href: "/dashboard/hr-manager/leaves", icon: "CalendarDays" },
  { label: "Payroll", href: "/dashboard/hr-manager/payroll", icon: "IndianRupee" },
  { label: "Expense Claims", href: "/dashboard/hr-manager/expense-claims", icon: "FileText" },
];

export const SALES_USER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/sales-user", icon: "LayoutDashboard" },
  { label: "New Admission", href: "/dashboard/sales-user/new-admission", icon: "UserPlus" },
  { label: "Students", href: "/dashboard/sales-user/students", icon: "GraduationCap" },
];


