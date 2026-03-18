/**
 * Report definitions for the Director export system.
 * Each report is config-driven: columns, Frappe doctype, fields, and filter builders.
 * Adding a new report = adding one entry to REPORT_DEFINITIONS.
 */

// ── Column definition ──
export interface ReportColumn {
  key: string;
  header: string;
  width: number; // Excel column width
  transform?: (value: unknown) => string | number;
}

// ── Filter definition ──
export interface ReportFilterDef {
  key: string;
  label: string;
  type: "branch" | "status" | "date-range";
}

// ── Report definition ──
export interface ReportDefinition {
  key: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  filters: ReportFilterDef[];
  columns: ReportColumn[];
  /**
   * Build the Frappe API fetch config from user-selected filters.
   * Returns an array of fetch steps — most reports need just one,
   * but complex reports (fee collection) may need multiple.
   */
  buildFetch: (filters: ReportFilters) => FrappeFetchStep[];
  /**
   * Optional post-processing to merge/aggregate results from multiple fetch steps.
   * Receives array of arrays (one per fetch step) and returns final flat rows.
   */
  postProcess?: (results: Record<string, unknown>[][]) => Record<string, unknown>[];
}

// ── User-selected filter values ──
export interface ReportFilters {
  branch?: string;     // "" = all
  status?: string;     // "all" | "active" | "discontinued" | "Present" | "Absent"
  fromDate?: string;   // ISO date
  toDate?: string;     // ISO date
}

// ── Single Frappe API fetch step ──
export interface FrappeFetchStep {
  doctype: string;
  fields: string[];
  filters: (string | number)[][];
  orderBy?: string;
  limit?: number;      // 0 = all
}

// ── Helpers ──
function enabledTransform(v: unknown): string {
  return v === 1 || v === "1" ? "Active" : "Discontinued";
}

function attendanceStatusIcon(v: unknown): string {
  if (v === "Present") return "Present";
  if (v === "Absent") return "Absent";
  if (v === "Half Day") return "Half Day";
  if (v === "On Leave") return "On Leave";
  return String(v ?? "—");
}

// ── Report definitions ──

const studentRoster: ReportDefinition = {
  key: "students",
  label: "Student Roster",
  description: "All students with contact info, branch, and status",
  icon: "GraduationCap",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
    { key: "status", label: "Status", type: "status" },
  ],
  columns: [
    { key: "name", header: "Student ID", width: 22 },
    { key: "student_name", header: "Student Name", width: 28 },
    { key: "custom_branch", header: "Branch", width: 22 },
    { key: "custom_srr_id", header: "SRR ID", width: 14 },
    { key: "student_email_id", header: "Email", width: 30 },
    { key: "student_mobile_number", header: "Mobile", width: 16 },
    { key: "custom_aadhaar", header: "Aadhaar", width: 16 },
    { key: "custom_parent_name", header: "Parent Name", width: 24 },
    { key: "gender", header: "Gender", width: 10 },
    { key: "date_of_birth", header: "Date of Birth", width: 14 },
    { key: "joining_date", header: "Joining Date", width: 14 },
    { key: "enabled", header: "Status", width: 14, transform: enabledTransform },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [];
    if (f.branch) filters.push(["custom_branch", "=", f.branch]);
    if (f.status === "active") filters.push(["enabled", "=", 1]);
    else if (f.status === "discontinued") filters.push(["enabled", "=", 0]);
    return [{
      doctype: "Student",
      fields: [
        "name", "student_name", "custom_branch", "custom_srr_id",
        "student_email_id", "student_mobile_number", "custom_aadhaar",
        "custom_parent_name", "gender", "date_of_birth", "joining_date", "enabled",
      ],
      filters,
      orderBy: "student_name asc",
      limit: 0,
    }];
  },
};

const staffDirectory: ReportDefinition = {
  key: "staff",
  label: "Staff Directory",
  description: "All employees with designation, branch, and contact info",
  icon: "UserCheck",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
  ],
  columns: [
    { key: "name", header: "Employee ID", width: 18 },
    { key: "employee_name", header: "Name", width: 28 },
    { key: "company", header: "Branch", width: 22 },
    { key: "designation", header: "Designation", width: 20 },
    { key: "department", header: "Department", width: 18 },
    { key: "cell_number", header: "Mobile", width: 16 },
    { key: "personal_email", header: "Email", width: 30 },
    { key: "gender", header: "Gender", width: 10 },
    { key: "date_of_joining", header: "Joining Date", width: 14 },
    { key: "status", header: "Status", width: 12 },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [["status", "=", "Active"]];
    if (f.branch) filters.push(["company", "=", f.branch]);
    return [{
      doctype: "Employee",
      fields: [
        "name", "employee_name", "company", "designation", "department",
        "cell_number", "personal_email", "gender", "date_of_joining", "status",
      ],
      filters,
      orderBy: "employee_name asc",
      limit: 0,
    }];
  },
};

const feeCollection: ReportDefinition = {
  key: "fee_collection",
  label: "Fee Collection Report",
  description: "All invoices with student info, amounts, and payment status",
  icon: "IndianRupee",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
  ],
  columns: [
    { key: "name", header: "Invoice ID", width: 22 },
    { key: "student", header: "Student ID", width: 22 },
    { key: "customer_name", header: "Student Name", width: 28 },
    { key: "company", header: "Branch", width: 22 },
    { key: "posting_date", header: "Invoice Date", width: 14 },
    { key: "grand_total", header: "Total Amount", width: 16 },
    { key: "outstanding_amount", header: "Outstanding", width: 16 },
    {
      key: "_collected", header: "Collected", width: 16,
      transform: (_v, ) => "",  // calculated in postProcess
    },
    {
      key: "_status", header: "Payment Status", width: 16,
      transform: () => "",
    },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [["docstatus", "=", 1]];
    if (f.branch) filters.push(["company", "=", f.branch]);
    return [{
      doctype: "Sales Invoice",
      fields: [
        "name", "student", "customer_name", "company",
        "posting_date", "grand_total", "outstanding_amount",
      ],
      filters,
      orderBy: "posting_date desc",
      limit: 0,
    }];
  },
  postProcess: (results) => {
    const invoices = results[0] ?? [];
    return invoices.map((inv) => {
      const grand = Number(inv.grand_total) || 0;
      const outstanding = Number(inv.outstanding_amount) || 0;
      const collected = grand - outstanding;
      return {
        ...inv,
        _collected: collected,
        _status: outstanding === 0 ? "Paid" : outstanding < grand ? "Partial" : "Unpaid",
      };
    });
  },
};

const paymentSummary: ReportDefinition = {
  key: "payments",
  label: "Payment Summary",
  description: "All payment entries with mode, reference, and amount",
  icon: "Receipt",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
    { key: "fromDate", label: "From Date", type: "date-range" },
    { key: "toDate", label: "To Date", type: "date-range" },
  ],
  columns: [
    { key: "name", header: "Payment ID", width: 22 },
    { key: "party_name", header: "Customer Name", width: 28 },
    { key: "company", header: "Branch", width: 22 },
    { key: "posting_date", header: "Date", width: 14 },
    { key: "paid_amount", header: "Amount", width: 16 },
    { key: "mode_of_payment", header: "Mode", width: 16 },
    { key: "reference_no", header: "Reference", width: 24 },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
    ];
    if (f.branch) filters.push(["company", "=", f.branch]);
    if (f.fromDate) filters.push(["posting_date", ">=", f.fromDate]);
    if (f.toDate) filters.push(["posting_date", "<=", f.toDate]);
    return [{
      doctype: "Payment Entry",
      fields: [
        "name", "party_name", "company", "posting_date",
        "paid_amount", "mode_of_payment", "reference_no",
      ],
      filters,
      orderBy: "posting_date desc",
      limit: 0,
    }];
  },
};

const batchReport: ReportDefinition = {
  key: "batches",
  label: "Batch Report",
  description: "All batches with program, branch, and student count",
  icon: "Users",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
  ],
  columns: [
    { key: "name", header: "Batch ID", width: 22 },
    { key: "student_group_name", header: "Batch Name", width: 28 },
    { key: "custom_branch", header: "Branch", width: 22 },
    { key: "program", header: "Program", width: 18 },
    { key: "academic_year", header: "Academic Year", width: 16 },
    { key: "max_strength", header: "Max Strength", width: 14 },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [];
    if (f.branch) filters.push(["custom_branch", "=", f.branch]);
    return [{
      doctype: "Student Group",
      fields: [
        "name", "student_group_name", "custom_branch", "program",
        "academic_year", "max_strength",
      ],
      filters,
      orderBy: "name asc",
      limit: 0,
    }];
  },
};

const discontinuedStudents: ReportDefinition = {
  key: "discontinued",
  label: "Discontinued Students",
  description: "Students who left with discontinuation details",
  icon: "ClipboardEdit",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
  ],
  columns: [
    { key: "name", header: "Student ID", width: 22 },
    { key: "student_name", header: "Student Name", width: 28 },
    { key: "custom_branch", header: "Branch", width: 22 },
    { key: "custom_parent_name", header: "Parent Name", width: 24 },
    { key: "student_mobile_number", header: "Mobile", width: 16 },
    { key: "custom_discontinuation_date", header: "Discontinuation Date", width: 18 },
    { key: "custom_discontinuation_reason", header: "Reason", width: 22 },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [["enabled", "=", 0]];
    if (f.branch) filters.push(["custom_branch", "=", f.branch]);
    return [{
      doctype: "Student",
      fields: [
        "name", "student_name", "custom_branch", "custom_parent_name",
        "student_mobile_number",
        "custom_discontinuation_date", "custom_discontinuation_reason",
      ],
      filters,
      orderBy: "custom_discontinuation_date desc",
      limit: 0,
    }];
  },
};

const attendanceReport: ReportDefinition = {
  key: "attendance",
  label: "Staff Attendance",
  description: "Employee attendance records by date and branch",
  icon: "ClipboardCheck",
  filters: [
    { key: "branch", label: "Branch", type: "branch" },
    { key: "fromDate", label: "From Date", type: "date-range" },
    { key: "toDate", label: "To Date", type: "date-range" },
  ],
  columns: [
    { key: "employee", header: "Employee ID", width: 18 },
    { key: "employee_name", header: "Name", width: 28 },
    { key: "company", header: "Branch", width: 22 },
    { key: "attendance_date", header: "Date", width: 14 },
    { key: "status", header: "Status", width: 14, transform: attendanceStatusIcon },
    { key: "leave_type", header: "Leave Type", width: 18 },
  ],
  buildFetch: (f) => {
    const filters: (string | number)[][] = [["docstatus", "=", 1]];
    if (f.branch) filters.push(["company", "=", f.branch]);
    if (f.fromDate) filters.push(["attendance_date", ">=", f.fromDate]);
    if (f.toDate) filters.push(["attendance_date", "<=", f.toDate]);
    return [{
      doctype: "Attendance",
      fields: [
        "employee", "employee_name", "company",
        "attendance_date", "status", "leave_type",
      ],
      filters,
      orderBy: "attendance_date desc, employee_name asc",
      limit: 0,
    }];
  },
};

// ── Export all definitions ──
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  studentRoster,
  staffDirectory,
  feeCollection,
  paymentSummary,
  batchReport,
  discontinuedStudents,
  attendanceReport,
];

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.key === key);
}
