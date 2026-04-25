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
  GENERAL_MANAGER: "General Manager",
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
  "General Manager": "/dashboard/general-manager",
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
  icon: string;    // Lucide icon name (inactive state)
  emoji: string;   // Colored emoji (active state)
  badge?: string;
  children?: NavItem[];
}

export const BRANCH_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/branch-manager", icon: "LayoutDashboard", emoji: "📊" },
  { label: "New Admission", href: "/dashboard/branch-manager/new-admission", icon: "UserPlus", emoji: "🎓" },
  {
    label: "Students", href: "/dashboard/branch-manager/students", icon: "GraduationCap", emoji: "👨‍🎓",
    children: [
      { label: "Classes", href: "/dashboard/branch-manager/classes", icon: "School", emoji: "🏫" },
      { label: "Batches", href: "/dashboard/branch-manager/batches", icon: "Users", emoji: "👥" },
    ],
  },
  { label: "Attendance", href: "/dashboard/branch-manager/attendance", icon: "ClipboardCheck", emoji: "✅",
    children: [
      { label: "Students", href: "/dashboard/branch-manager/attendance/students", icon: "GraduationCap", emoji: "👨‍🎓" },
      { label: "Staff", href: "/dashboard/branch-manager/attendance/staff", icon: "Briefcase", emoji: "💼" },
    ],
  },
  { label: "Course Schedule", href: "/dashboard/branch-manager/course-schedule", icon: "CalendarDays", emoji: "📅" },
  { label: "Teachers", href: "/dashboard/branch-manager/teachers", icon: "UserCheck", emoji: "👨‍🏫" },
  { label: "Fees", href: "/dashboard/branch-manager/fees", icon: "IndianRupee", emoji: "💰" },
  { label: "Exams", href: "/dashboard/branch-manager/exams", icon: "ClipboardList", emoji: "📝" },
  { label: "Academics", href: "/dashboard/branch-manager/academics", icon: "BarChart3", emoji: "📈",
    children: [
      { label: "Attendance Report", href: "/dashboard/branch-manager/attendance/report", icon: "ClipboardCheck", emoji: "✅" },
      { label: "Exam Analytics", href: "/dashboard/branch-manager/exams/analytics", icon: "Trophy", emoji: "🏆" },
      { label: "Student Performance", href: "/dashboard/branch-manager/student-performance", icon: "TrendingUp", emoji: "📊" },
    ],
  },
  { label: "Topic Coverage", href: "/dashboard/branch-manager/topic-coverage", icon: "BookOpen", emoji: "📖" },
  { label: "Complaints", href: "/dashboard/branch-manager/complaints", icon: "MessageSquareWarning", emoji: "⚠️" },
  { label: "Transfers", href: "/dashboard/branch-manager/transfers", icon: "ArrowRightLeft", emoji: "🔄" },
];

export const DIRECTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/director", icon: "LayoutDashboard", emoji: "📊" },
  {
    label: "Students", href: "/dashboard/director/students", icon: "GraduationCap", emoji: "👨‍🎓",
    children: [
      { label: "Batches", href: "/dashboard/director/batches", icon: "Users", emoji: "👥" },
    ],
  },
  { label: "Teachers", href: "/dashboard/director/teachers", icon: "UserCheck", emoji: "👨‍🏫" },
  { label: "Attendance", href: "/dashboard/director/attendance", icon: "ClipboardCheck", emoji: "✅",
    children: [
      { label: "Students", href: "/dashboard/director/attendance/students", icon: "GraduationCap", emoji: "👨‍🎓" },
      { label: "Staff", href: "/dashboard/director/attendance/staff", icon: "Briefcase", emoji: "💼" },
    ],
  },
  { label: "Course Schedule", href: "/dashboard/director/course-schedule", icon: "CalendarDays", emoji: "📅" },
  { label: "Fees", href: "/dashboard/director/fees", icon: "IndianRupee", emoji: "💰" },
  { label: "Accounts", href: "/dashboard/director/accounts", icon: "Coins", emoji: "🪙",
    children: [
      { label: "Collection", href: "/dashboard/director/accounts/collection", icon: "Landmark", emoji: "🏦" },
      { label: "Expense", href: "/dashboard/director/accounts/expense", icon: "Receipt", emoji: "🧾" },
    ],
  },
  { label: "Exams", href: "/dashboard/director/exams", icon: "ClipboardList", emoji: "📝" },
  { label: "Academics", href: "/dashboard/director/academics", icon: "BarChart3", emoji: "📈",
    children: [
      { label: "Overview", href: "/dashboard/director/academics/overview", icon: "BarChart3", emoji: "📈" },
      { label: "Attendance", href: "/dashboard/director/academics/attendance", icon: "ClipboardCheck", emoji: "✅" },
      { label: "Exams", href: "/dashboard/director/academics/exams", icon: "ClipboardList", emoji: "📝" },
      { label: "Course Schedule", href: "/dashboard/director/academics/course-schedule", icon: "CalendarDays", emoji: "📅" },
      { label: "Instructors", href: "/dashboard/director/academics/instructors", icon: "UserCheck", emoji: "👨‍🏫" },
      { label: "Topic Coverage", href: "/dashboard/director/academics/topic-coverage", icon: "BookOpen", emoji: "📖" },
    ],
  },
  { label: "Leaderboard", href: "/dashboard/director/leaderboard", icon: "Trophy", emoji: "🏆" },
  { label: "Reports", href: "/dashboard/director/reports", icon: "FileBarChart", emoji: "📈" },
  { label: "Complaints", href: "/dashboard/director/complaints", icon: "MessageSquareWarning", emoji: "⚠️" },
  { label: "Transfers", href: "/dashboard/branch-manager/transfers", icon: "ArrowRightLeft", emoji: "🔄" },
];

export const INSTRUCTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/instructor", icon: "LayoutDashboard", emoji: "📊" },
  { label: "My Batches", href: "/dashboard/instructor/batches", icon: "Users", emoji: "👥" },
  { label: "Students", href: "/dashboard/instructor/students", icon: "GraduationCap", emoji: "👨‍🎓" },
  { label: "Attendance", href: "/dashboard/instructor/attendance", icon: "ClipboardCheck", emoji: "✅" },
  { label: "Exams", href: "/dashboard/instructor/exams", icon: "ClipboardList", emoji: "📝" },
  { label: "Topic Coverage", href: "/dashboard/instructor/topic-coverage", icon: "BookOpen", emoji: "📖" },
  { label: "My Performance", href: "/dashboard/instructor/my-performance", icon: "TrendingUp", emoji: "📈" },
  { label: "Course Schedule", href: "/dashboard/instructor/course-schedule", icon: "CalendarDays", emoji: "📅" },
];

export const PARENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/parent", icon: "LayoutDashboard", emoji: "📊" },
  { label: "Children", href: "/dashboard/parent/children", icon: "Baby", emoji: "👶" },
  { label: "Attendance", href: "/dashboard/parent/attendance", icon: "ClipboardCheck", emoji: "✅" },
  { label: "Performance", href: "/dashboard/parent/performance", icon: "Trophy", emoji: "🏆" },
  { label: "Video Classes", href: "/dashboard/parent/video-classes", icon: "Video", emoji: "🎬" },
  { label: "Fees", href: "/dashboard/parent/fees", icon: "IndianRupee", emoji: "💰" },
  { label: "Complaints", href: "/dashboard/parent/complaints", icon: "MessageSquareWarning", emoji: "⚠️" },
];

export const HR_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/hr-manager", icon: "LayoutDashboard", emoji: "📊" },
  { label: "Staff", href: "/dashboard/hr-manager/salary/staff", icon: "Users", emoji: "👥" },
  { label: "Salary", href: "/dashboard/hr-manager/salary", icon: "Coins", emoji: "💰" },
  { label: "Payroll", href: "/dashboard/hr-manager/payroll", icon: "IndianRupee", emoji: "💵" },
];

export const SALES_USER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/sales-user", icon: "LayoutDashboard", emoji: "📊" },
  { label: "New Admission", href: "/dashboard/sales-user/new-admission", icon: "UserPlus", emoji: "🎓" },
  { label: "Students", href: "/dashboard/sales-user/students", icon: "GraduationCap", emoji: "👨‍🎓" },
];

export const GENERAL_MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/general-manager", icon: "LayoutDashboard", emoji: "📊" },
  { label: "Academics", href: "/dashboard/general-manager/academics", icon: "BarChart3", emoji: "📈" },
  { label: "Attendance", href: "/dashboard/general-manager/attendance", icon: "ClipboardCheck", emoji: "✅" },
  { label: "Exams", href: "/dashboard/general-manager/exams", icon: "ClipboardList", emoji: "📝" },
  { label: "Course Schedule", href: "/dashboard/general-manager/course-schedule", icon: "CalendarDays", emoji: "📅" },
  { label: "Instructors", href: "/dashboard/general-manager/instructors", icon: "UserCheck", emoji: "👨‍🏫" },
  { label: "Topic Coverage", href: "/dashboard/general-manager/topic-coverage", icon: "BookOpen", emoji: "📖" },
];


