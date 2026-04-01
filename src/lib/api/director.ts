/**
 * director.ts
 * API functions for the Director/Management dashboard.
 * Provides cross-branch aggregate queries.
 */

import apiClient from "./client";

// ── Types ──

export interface BranchSummary {
  name: string;
  company_name: string;
  abbr: string;
  studentCount: number;
  batchCount: number;
  instructorCount: number;
}

export interface BranchDetail {
  name: string;
  company_name: string;
  abbr: string;
}

// ── Branch list ──

/** Get all companies (branches) */
export async function getAllBranches(): Promise<BranchDetail[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "company_name", "abbr"]),
    limit_page_length: "100",
    order_by: "name asc",
  });
  const { data } = await apiClient.get(`/resource/Company?${params}`);
  return data.data ?? [];
}

// ── Count helpers ──

async function getCount(
  doctype: string,
  filters?: Record<string, string>
): Promise<number> {
  const params = new URLSearchParams({ doctype });
  if (filters) params.set("filters", JSON.stringify(filters));
  const { data } = await apiClient.get(
    `/method/frappe.client.get_count?${params}`
  );
  return data.message ?? 0;
}

export async function getStudentCountForBranch(
  branch: string
): Promise<number> {
  return getCount("Student", { custom_branch: branch });
}

export async function getActiveStudentCountForBranch(
  branch: string
): Promise<number> {
  return getCount("Student", { custom_branch: branch, enabled: "1" });
}

export async function getDiscontinuedStudentCountForBranch(
  branch: string
): Promise<number> {
  return getCount("Student", { custom_branch: branch, enabled: "0" });
}

export async function getBatchCountForBranch(
  branch: string
): Promise<number> {
  return getCount("Student Group", { custom_branch: branch });
}

export async function getInstructorCountForBranch(
  branch: string
): Promise<number> {
  // Instructors don't have custom_branch; linked via Employee → company
  // Use Employee count with company filter as proxy
  return getCount("Employee", { company: branch, status: "Active" });
}

export async function getScheduleCountForBranch(
  branch: string
): Promise<number> {
  return getCount("Course Schedule", { custom_branch: branch });
}

export async function getAttendanceCountForBranch(
  branch: string,
  date: string
): Promise<number> {
  const params = new URLSearchParams({ doctype: "Student Attendance" });
  params.set(
    "filters",
    JSON.stringify({ custom_branch: branch, date })
  );
  const { data } = await apiClient.get(
    `/method/frappe.client.get_count?${params}`
  );
  return data.message ?? 0;
}

// ── Global count helpers (no branch filter) ──

export async function getTotalStudentCount(): Promise<number> {
  return getCount("Student");
}

export async function getActiveStudentCount(): Promise<number> {
  return getCount("Student", { enabled: "1" });
}

export async function getDiscontinuedStudentCount(): Promise<number> {
  return getCount("Student", { enabled: "0" });
}

export async function getTotalStaffCount(): Promise<number> {
  return getCount("Employee", { status: "Active" });
}

/** Get student count grouped by plan (Advanced / Intermediate / Basic) from Sales Orders */
export async function getStudentCountByPlan(): Promise<{
  advanced: number;
  intermediate: number;
  basic: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["custom_plan as plan", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    group_by: "custom_plan",
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${params}`);
  const rows = data?.data ?? [];
  const result = { advanced: 0, intermediate: 0, basic: 0 };
  for (const row of rows) {
    const plan = (row.plan || "").toLowerCase();
    if (plan === "advanced") result.advanced = row.count ?? 0;
    else if (plan === "intermediate") result.intermediate = row.count ?? 0;
    else if (plan === "basic") result.basic = row.count ?? 0;
  }
  return result;
}

/** Get student count grouped by plan for a specific branch */
export async function getStudentCountByPlanForBranch(branch: string): Promise<{
  advanced: number;
  intermediate: number;
  basic: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["custom_plan as plan", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1], ["company", "=", branch]]),
    group_by: "custom_plan",
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${params}`);
  const rows = data?.data ?? [];
  const result = { advanced: 0, intermediate: 0, basic: 0 };
  for (const row of rows) {
    const plan = (row.plan || "").toLowerCase();
    if (plan === "advanced") result.advanced = row.count ?? 0;
    else if (plan === "intermediate") result.intermediate = row.count ?? 0;
    else if (plan === "basic") result.basic = row.count ?? 0;
  }
  return result;
}

export async function getTotalBatchCount(): Promise<number> {
  return getCount("Student Group");
}

export async function getTotalFeeScheduleCount(): Promise<number> {
  return getCount("Fee Schedule");
}

export async function getTotalSalesOrderCount(): Promise<number> {
  return getCount("Sales Order");
}

/** Get total revenue (grand_total) and paid across all Sales Orders */
export async function getTotalSalesStats(): Promise<{
  totalRevenue: number;
  totalPaid: number;
  count: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as total_revenue", "sum(advance_paid) as total_paid", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${params}`);
  const row = data?.data?.[0];
  return {
    totalRevenue: row?.total_revenue ?? 0,
    totalPaid: row?.total_paid ?? 0,
    count: row?.count ?? 0,
  };
}

/** Get total fee schedule amounts (uses total_amount since grand_total is 0 in Frappe) */
export async function getTotalFeeStats(): Promise<{
  totalAmount: number;
  count: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(total_amount) as total_amount", "count(name) as count"]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Fee Schedule?${params}`);
  const row = data?.data?.[0];
  return {
    totalAmount: row?.total_amount ?? 0,
    count: row?.count ?? 0,
  };
}

/** Get sales summary for a specific branch */
export async function getBranchSalesSummary(
  branch: string
): Promise<{
  totalRevenue: number;
  totalPaid: number;
  count: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as total_revenue", "sum(advance_paid) as total_paid", "count(name) as count"]),
    filters: JSON.stringify([["company", "=", branch], ["docstatus", "=", 1]]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${params}`);
  const row = data?.data?.[0];
  return {
    totalRevenue: row?.total_revenue ?? 0,
    totalPaid: row?.total_paid ?? 0,
    count: row?.count ?? 0,
  };
}

// ── Invoice (Collection) Stats ──

/** Get total invoiced, outstanding, and collected amounts across all branches */
export async function getTotalInvoiceStats(): Promise<{
  totalInvoiced: number;
  totalOutstanding: number;
  totalCollected: number;
  count: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as total_invoiced", "sum(outstanding_amount) as total_outstanding", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1]]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${params}`);
  const row = data?.data?.[0];
  const invoiced = row?.total_invoiced ?? 0;
  const outstanding = row?.total_outstanding ?? 0;
  return {
    totalInvoiced: invoiced,
    totalOutstanding: outstanding,
    totalCollected: invoiced - outstanding,
    count: row?.count ?? 0,
  };
}

/**
 * Break down total collected amount into Razorpay (online) vs Offline.
 * Razorpay payments have reference_no starting with "pay_" or mode_of_payment = "Razorpay".
 */
export async function getCollectedByMode(): Promise<{
  razorpay: number;
  offline: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["mode_of_payment", "reference_no", "paid_amount"]),
    filters: JSON.stringify([["docstatus", "=", "1"], ["payment_type", "=", "Receive"]]),
    limit_page_length: "1000",
  });
  const { data } = await apiClient.get(`/resource/Payment Entry?${params}`);
  const entries: { mode_of_payment: string | null; reference_no: string | null; paid_amount: number }[] =
    data?.data ?? [];
  let razorpay = 0;
  let offline = 0;
  for (const pe of entries) {
    const isOnline = pe.reference_no?.startsWith("pay_") || pe.mode_of_payment === "Razorpay";
    if (isOnline) {
      razorpay += pe.paid_amount ?? 0;
    } else {
      offline += pe.paid_amount ?? 0;
    }
  }
  return { razorpay, offline };
}

export interface CollectedByMode {
  razorpay: number;
  cash: number;
  upi: number;
  bank_transfer: number;
  cheque: number;
  other: number;
  total: number;
}

export async function getBranchCollectedByMode(branch: string): Promise<CollectedByMode> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["mode_of_payment", "reference_no", "paid_amount"]),
    filters: JSON.stringify([["docstatus", "=", "1"], ["payment_type", "=", "Receive"], ["company", "=", branch]]),
    limit_page_length: "1000",
  });
  const { data } = await apiClient.get(`/resource/Payment Entry?${params}`);
  const entries: { mode_of_payment: string | null; reference_no: string | null; paid_amount: number }[] =
    data?.data ?? [];
  const result: CollectedByMode = { razorpay: 0, cash: 0, upi: 0, bank_transfer: 0, cheque: 0, other: 0, total: 0 };
  for (const pe of entries) {
    const amt = pe.paid_amount ?? 0;
    result.total += amt;
    const isOnline = pe.reference_no?.startsWith("pay_") || pe.mode_of_payment === "Razorpay";
    if (isOnline) {
      result.razorpay += amt;
    } else {
      const mode = (pe.mode_of_payment ?? "").toLowerCase().trim();
      if (mode === "cash") result.cash += amt;
      else if (mode === "upi") result.upi += amt;
      else if (mode === "bank transfer") result.bank_transfer += amt;
      else if (mode === "cheque") result.cheque += amt;
      else result.other += amt;
    }
  }
  return result;
}

/**
 * Total outstanding fees for all discontinued students.
 * Step 1: fetch discontinued student IDs, Step 2: sum their invoice outstanding amounts.
 */
export async function getDiscontinuedStudentForfeitedFees(): Promise<number> {
  // Step 1 – get all discontinued student names
  const studentParams = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify({ enabled: "0" }),
    limit_page_length: "500",
  });
  const { data: studentData } = await apiClient.get(`/resource/Student?${studentParams}`);
  const students: { name: string }[] = studentData?.data ?? [];
  if (!students.length) return 0;

  const studentNames = students.map((s) => s.name);

  // Step 2 – sum outstanding_amount for submitted invoices linked to those students
  const invoiceParams = new URLSearchParams({
    fields: JSON.stringify(["sum(outstanding_amount) as total_outstanding"]),
    filters: JSON.stringify([
      ["docstatus", "=", "1"],
      ["outstanding_amount", ">", "0"],
      ["student", "in", studentNames],
    ]),
    limit_page_length: "1",
  });
  const { data: invoiceData } = await apiClient.get(`/resource/Sales Invoice?${invoiceParams}`);
  return invoiceData?.data?.[0]?.total_outstanding ?? 0;
}

/** Outstanding invoices from discontinued students in a specific branch. */
export async function getBranchForfeitedFees(branch: string): Promise<number> {
  const studentParams = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify([["custom_branch", "=", branch], ["enabled", "=", "0"]]),
    limit_page_length: "500",
  });
  const { data: studentData } = await apiClient.get(`/resource/Student?${studentParams}`);
  const students: { name: string }[] = studentData?.data ?? [];
  if (!students.length) return 0;

  const studentNames = students.map((s) => s.name);
  const invoiceParams = new URLSearchParams({
    fields: JSON.stringify(["sum(outstanding_amount) as total_outstanding"]),
    filters: JSON.stringify([
      ["docstatus", "=", "1"],
      ["outstanding_amount", ">", "0"],
      ["student", "in", studentNames],
      ["company", "=", branch],
    ]),
    limit_page_length: "1",
  });
  const { data: invoiceData } = await apiClient.get(`/resource/Sales Invoice?${invoiceParams}`);
  return invoiceData?.data?.[0]?.total_outstanding ?? 0;
}

export interface ProgramFeeStats {
  program: string;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  forfeitedFees: number;
  count: number;
}

/**
 * Program-wise invoice stats for a branch.
 * Approach: Branch students → latest Program Enrollment per student → aggregate invoices per program.
 */
export async function getBranchProgramFeeStats(branch: string): Promise<ProgramFeeStats[]> {
  // Step 1: Get all students (active + discontinued) for this branch
  const studentParams = new URLSearchParams({
    fields: JSON.stringify(["name", "enabled"]),
    filters: JSON.stringify([["custom_branch", "=", branch]]),
    limit_page_length: "500",
  });
  const { data: studentData } = await apiClient.get(`/resource/Student?${studentParams}`);
  const students: { name: string; enabled: number }[] = studentData?.data ?? [];
  if (!students.length) return [];

  const allStudentNames = students.map((s) => s.name);

  // Step 2: Get latest Program Enrollment per student (sorted desc by date, first wins)
  // Include draft (0) and submitted (1) enrollments; exclude only cancelled (2)
  const enrollParams = new URLSearchParams({
    fields: JSON.stringify(["student", "program", "enrollment_date"]),
    filters: JSON.stringify([["student", "in", allStudentNames], ["docstatus", "!=", "2"]]),
    limit_page_length: "1000",
    order_by: "enrollment_date desc",
  });
  const { data: enrollData } = await apiClient.get(`/resource/Program Enrollment?${enrollParams}`);
  const enrollments: { student: string; program: string }[] = enrollData?.data ?? [];

  // Latest program per student
  const studentProgram = new Map<string, string>();
  for (const e of enrollments) {
    if (!studentProgram.has(e.student)) studentProgram.set(e.student, e.program);
  }

  // Build program → { all[], discontinued[] }
  const programStudents = new Map<string, { all: string[]; discontinued: string[] }>();
  for (const s of students) {
    const program = studentProgram.get(s.name) ?? "Uncategorized";
    if (!programStudents.has(program)) programStudents.set(program, { all: [], discontinued: [] });
    const grp = programStudents.get(program)!;
    grp.all.push(s.name);
    if (!s.enabled) grp.discontinued.push(s.name);
  }

  // Step 3: Aggregate invoice stats per program in parallel
  const results = await Promise.all(
    Array.from(programStudents.entries()).map(async ([program, { all, discontinued }]) => {
      const allInvParams = new URLSearchParams({
        fields: JSON.stringify(["sum(grand_total) as total_invoiced", "sum(outstanding_amount) as total_outstanding", "count(name) as count"]),
        filters: JSON.stringify([["docstatus", "=", "1"], ["student", "in", all], ["company", "=", branch]]),
        limit_page_length: "1",
      });
      const { data: allData } = await apiClient.get(`/resource/Sales Invoice?${allInvParams}`);
      const row = allData?.data?.[0];
      const totalInvoiced = row?.total_invoiced ?? 0;
      const totalOutstanding = row?.total_outstanding ?? 0;

      let forfeitedFees = 0;
      if (discontinued.length) {
        const forfParams = new URLSearchParams({
          fields: JSON.stringify(["sum(outstanding_amount) as total_outstanding"]),
          filters: JSON.stringify([
            ["docstatus", "=", "1"],
            ["outstanding_amount", ">", "0"],
            ["student", "in", discontinued],
            ["company", "=", branch],
          ]),
          limit_page_length: "1",
        });
        const { data: forfData } = await apiClient.get(`/resource/Sales Invoice?${forfParams}`);
        forfeitedFees = forfData?.data?.[0]?.total_outstanding ?? 0;
      }

      return {
        program,
        totalInvoiced,
        totalCollected: totalInvoiced - totalOutstanding,
        totalOutstanding,
        forfeitedFees,
        count: row?.count ?? 0,
      };
    })
  );

  return results
    .filter((r) => r.count > 0)
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced);
}

export interface InstalmentDetail {
  name: string;
  grand_total: number;
  outstanding_amount: number;
  due_date: string;
  paid: number;
}

export interface StudentFeeRow {
  studentName: string;
  studentId: string;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
  enabled: number; // 1 = active, 0 = discontinued
  feePlan?: string; // "Basic" | "Intermediate" | "Advanced" from Sales Order
  paymentMode?: string; // "Cash" | "Online" derived from Payment Entries
  noOfInstalments?: string; // "1" | "4" | "6" | "8" from Sales Order
  duesTillToday: number; // overdue amount (due_date <= today)
  instalments: InstalmentDetail[]; // individual invoice breakdown sorted by due_date
  disabilities?: string;
}

/**
 * Get student-level fee details for a specific branch + program.
 * Calls the server-side /api/director/program-students route which uses
 * admin credentials, bypassing any Frappe role-permission gaps for the
 * Director user token.
 */
export async function getBranchProgramStudentFees(
  branch: string,
  program: string
): Promise<StudentFeeRow[]> {
  const params = new URLSearchParams({ branch, program });
  const { data } = await apiClient.get(
    `/director/program-students?${params}`,
    { baseURL: "/api" }
  );
  return (data?.data ?? []) as StudentFeeRow[];
}

// ── Batch student fees ──

export interface BatchStudentFeeRow {
  studentId: string;
  studentName: string;
  active: number;
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  invoiceCount: number;
  plan: string | null; // "Basic" | "Intermediate" | "Advanced"
  duesTillToday: number; // overdue amount (due_date <= today)
}

/**
 * Get per-student fee summary + plan label for a specific batch.
 * Calls /api/director/batch-students-fees with admin credentials.
 */
export async function getBatchStudentFees(
  batch: string,
  branch: string
): Promise<BatchStudentFeeRow[]> {
  const params = new URLSearchParams({ batch, branch });
  const { data } = await apiClient.get(
    `/director/batch-students-fees?${params}`,
    { baseURL: "/api" }
  );
  return (data?.data ?? []) as BatchStudentFeeRow[];
}

/** Get invoice stats for a specific branch */
export async function getBranchInvoiceStats(
  branch: string
): Promise<{
  totalInvoiced: number;
  totalOutstanding: number;
  totalCollected: number;
  count: number;
}> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as total_invoiced", "sum(outstanding_amount) as total_outstanding", "count(name) as count"]),
    filters: JSON.stringify([["docstatus", "=", 1], ["company", "=", branch]]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${params}`);
  const row = data?.data?.[0];
  const invoiced = row?.total_invoiced ?? 0;
  const outstanding = row?.total_outstanding ?? 0;
  return {
    totalInvoiced: invoiced,
    totalOutstanding: outstanding,
    totalCollected: invoiced - outstanding,
    count: row?.count ?? 0,
  };
}

// ── Aggregate stats for all branches ──

export async function getBranchSummaries(
  branches: BranchDetail[]
): Promise<BranchSummary[]> {
  const summaries = await Promise.all(
    branches.map(async (b) => {
      const [studentCount, batchCount, instructorCount] = await Promise.all([
        getStudentCountForBranch(b.name),
        getBatchCountForBranch(b.name),
        getInstructorCountForBranch(b.name),
      ]);
      return {
        ...b,
        studentCount,
        batchCount,
        instructorCount,
      };
    })
  );
  return summaries;
}

// ── Branch-scoped data fetchers ──

export interface BranchStudent {
  name: string;
  student_name: string;
  student_email_id: string;
  student_mobile_number: string;
  gender: string;
  enabled: number;
  custom_branch: string;
  joining_date: string;
  creation: string;
}

export async function getBranchStudents(
  branch: string,
  params?: {
    search?: string;
    enabled?: 0 | 1;
    limit_start?: number;
    limit_page_length?: number;
    order_by?: string;
  }
): Promise<{ data: BranchStudent[] }> {
  const searchParams = new URLSearchParams();
  searchParams.set(
    "fields",
    JSON.stringify([
      "name",
      "student_name",
      "student_email_id",
      "student_mobile_number",
      "gender",
      "enabled",
      "custom_branch",
      "joining_date",
      "creation",
    ])
  );
  if (params?.limit_start)
    searchParams.set("limit_start", String(params.limit_start));
  searchParams.set(
    "limit_page_length",
    String(params?.limit_page_length ?? 50)
  );
  if (params?.order_by) searchParams.set("order_by", params.order_by);

  const filters: string[][] = [["custom_branch", "=", branch]];
  if (params?.enabled !== undefined)
    filters.push(["enabled", "=", String(params.enabled)]);
  if (params?.search)
    filters.push(["student_name", "like", `%${params.search}%`]);
  searchParams.set("filters", JSON.stringify(filters));

  const { data } = await apiClient.get(
    `/resource/Student?${searchParams}`
  );
  return data;
}

export interface BranchBatch {
  name: string;
  student_group_name: string;
  group_based_on: string;
  batch: string;
  program: string;
  academic_year: string;
  custom_branch: string;
  max_strength: number;
  disabled: number;
}

export async function getBranchBatches(
  branch: string
): Promise<{ data: BranchBatch[] }> {
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "student_group_name",
      "group_based_on",
      "batch",
      "program",
      "academic_year",
      "custom_branch",
      "max_strength",
      "disabled",
    ]),
    filters: JSON.stringify([["custom_branch", "=", branch]]),
    limit_page_length: "500",
    order_by: "name asc",
  });
  const { data } = await apiClient.get(`/resource/Student Group?${params}`);
  return data;
}

export interface BatchStudent {
  student: string;
  student_name: string;
  group_roll_number: number;
  active: number;
}

export async function getBatchStudents(
  batchName: string
): Promise<{ students: BatchStudent[] }> {
  const { data } = await apiClient.get(
    `/resource/Student Group/${encodeURIComponent(batchName)}`
  );
  return { students: data.data?.students ?? [] };
}

/** Aggregate active/inactive student counts for a set of batch names (one API call) */
export async function getProgramBatchesStudentStats(
  batchNames: string[]
): Promise<{ active: number; inactive: number }> {
  if (!batchNames.length) return { active: 0, inactive: 0 };
  const results = await Promise.all(batchNames.map((name) => getBatchStudents(name)));
  let active = 0;
  let inactive = 0;
  for (const res of results) {
    active += res.students.filter((s) => s.active).length;
    inactive += res.students.filter((s) => !s.active).length;
  }
  return { active, inactive };
}

/** Get plan counts (Advanced/Intermediate/Basic) for students in given batches */
export async function getPlanCountsForBatches(
  batchNames: string[],
  branch: string
): Promise<{ advanced: number; intermediate: number; basic: number }> {
  const result = { advanced: 0, intermediate: 0, basic: 0 };
  if (!batchNames.length) return result;
  // 1. Collect all student IDs from the batches
  const batchResults = await Promise.all(batchNames.map((name) => getBatchStudents(name)));
  const studentIds: string[] = [];
  for (const res of batchResults) {
    for (const s of res.students) {
      if (s.student && !studentIds.includes(s.student)) studentIds.push(s.student);
    }
  }
  if (!studentIds.length) return result;
  // 2. Query Sales Orders for these students grouped by plan
  const params = new URLSearchParams({
    fields: JSON.stringify(["custom_plan as plan", "count(name) as count"]),
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["company", "=", branch],
      ["student", "in", studentIds],
    ]),
    group_by: "custom_plan",
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${params}`);
  const rows = data?.data ?? [];
  for (const row of rows) {
    const plan = (row.plan || "").toLowerCase();
    if (plan === "advanced") result.advanced = row.count ?? 0;
    else if (plan === "intermediate") result.intermediate = row.count ?? 0;
    else if (plan === "basic") result.basic = row.count ?? 0;
  }
  return result;
}

export interface BranchInstructor {
  name: string;
  instructor_name: string;
  employee: string;
  department: string;
  designation?: string;
  /** Unique courses this instructor teaches at this branch */
  subjects: string[];
}

export async function getBranchInstructors(
  branch: string
): Promise<BranchInstructor[]> {
  // First get employees for this branch
  const empParams = new URLSearchParams({
    fields: JSON.stringify(["name", "employee_name", "designation"]),
    filters: JSON.stringify([
      ["company", "=", branch],
      ["status", "=", "Active"],
    ]),
    limit_page_length: "500",
  });
  const { data: empData } = await apiClient.get(
    `/resource/Employee?${empParams}`
  );
  const employees: { name: string; employee_name: string; designation?: string }[] =
    empData.data ?? [];
  if (!employees.length) return [];

  const empDesignationMap = new Map(
    employees.map((e) => [e.name, e.designation ?? ""])
  );

  // Then get instructors linked to those employees
  const empNames = employees.map((e) => e.name);
  const instrParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "instructor_name",
      "employee",
      "department",
    ]),
    filters: JSON.stringify([["employee", "in", empNames]]),
    limit_page_length: "500",
  });
  const { data: instrData } = await apiClient.get(
    `/resource/Instructor?${instrParams}`
  );
  const instructors: Omit<BranchInstructor, "designation" | "subjects">[] = instrData.data ?? [];
  if (!instructors.length) return [];

  // Fetch each Instructor's full doc in parallel to get instructor_log (subjects)
  const fullDocs = await Promise.all(
    instructors.map((i) =>
      apiClient
        .get(`/resource/Instructor/${encodeURIComponent(i.name)}`)
        .then((r) => r.data?.data)
        .catch(() => null)
    )
  );

  return instructors.map((i, idx) => {
    const doc = fullDocs[idx];
    const log: { course?: string; custom_branch?: string }[] =
      doc?.instructor_log ?? [];
    // Only keep courses assigned to this branch, deduplicated
    const subjects = [
      ...new Set(
        log
          .filter((entry) => entry.custom_branch === branch && entry.course)
          .map((entry) => entry.course as string)
      ),
    ];
    return {
      ...i,
      designation: empDesignationMap.get(i.employee) || "Instructor",
      subjects,
    };
  });
}

export interface BranchSchedule {
  name: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  course: string;
  instructor: string;
  instructor_name: string;
  room: string;
  student_group: string;
  custom_branch: string;
}

export async function getBranchSchedules(
  branch: string,
  dateFrom?: string,
  dateTo?: string
): Promise<BranchSchedule[]> {
  const filters: (string | string[])[] = [
    ["custom_branch", "=", branch],
  ];
  if (dateFrom) filters.push(["schedule_date", ">=", dateFrom]);
  if (dateTo) filters.push(["schedule_date", "<=", dateTo]);

  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "schedule_date",
      "from_time",
      "to_time",
      "course",
      "instructor",
      "instructor_name",
      "room",
      "student_group",
      "custom_branch",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: "500",
    order_by: "schedule_date desc, from_time asc",
  });
  const { data } = await apiClient.get(`/resource/Course Schedule?${params}`);
  return data.data ?? [];
}

export interface BranchAttendanceRecord {
  name: string;
  student: string;
  student_name: string;
  status: string;
  date: string;
  student_group: string;
  course_schedule: string;
}

export async function getBranchAttendance(
  branch: string,
  date?: string
): Promise<BranchAttendanceRecord[]> {
  const filters: string[][] = [["custom_branch", "=", branch]];
  if (date) filters.push(["date", "=", date]);

  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "student",
      "student_name",
      "status",
      "date",
      "student_group",
      "course_schedule",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: "500",
    order_by: "date desc",
  });
  const { data } = await apiClient.get(
    `/resource/Student Attendance?${params}`
  );
  return data.data ?? [];
}

export interface BranchSalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  advance_paid: number;
  per_billed: number;
  status: string;
  company: string;
}

export async function getBranchSalesOrders(
  branch: string,
  params?: {
    limit_start?: number;
    limit_page_length?: number;
    status?: string;
  }
): Promise<{ data: BranchSalesOrder[] }> {
  const searchParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "customer",
      "customer_name",
      "transaction_date",
      "grand_total",
      "advance_paid",
      "per_billed",
      "status",
      "company",
    ]),
    filters: JSON.stringify([["company", "=", branch]]),
    limit_page_length: String(params?.limit_page_length ?? 50),
    order_by: "transaction_date desc",
  });
  if (params?.limit_start)
    searchParams.set("limit_start", String(params.limit_start));
  if (params?.status) {
    // Re-build filters with status
    searchParams.set(
      "filters",
      JSON.stringify([
        ["company", "=", branch],
        ["status", "=", params.status],
      ])
    );
  }
  const { data } = await apiClient.get(
    `/resource/Sales Order?${searchParams}`
  );
  return data;
}

export interface BranchFeeSchedule {
  name: string;
  fee_structure: string;
  program: string;
  company: string;
  academic_year: string;
  total_amount: number;
  grand_total: number;
  status: string;
}

export async function getBranchFeeSchedules(
  branch: string
): Promise<BranchFeeSchedule[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "fee_structure",
      "program",
      "company",
      "academic_year",
      "total_amount",
      "grand_total",
      "status",
    ]),
    filters: JSON.stringify([["company", "=", branch]]),
    limit_page_length: "100",
    order_by: "name asc",
  });
  const { data } = await apiClient.get(`/resource/Fee Schedule?${params}`);
  return data.data ?? [];
}

// ── Dues Till Today ──

export interface DuesTodayTotal {
  total_dues: number;
  invoice_count: number;
  student_count: number;
}

export interface DuesTodayBranchRow {
  branch: string;
  total_dues: number;
  invoice_count: number;
  student_count: number;
}

export interface DuesTodayClassRow {
  item_code: string;
  total_dues: number;
  invoice_count: number;
  student_count: number;
}

export interface DuesTodayBatchRow {
  batch_id: string;
  batch_name: string;
  total_dues: number;
  student_count: number;
}

export interface DuesTodayStudentRow {
  student_id: string;
  student_name: string;
  total_dues: number;
  plan: string;
  no_of_instalments: string;
  overdue_invoices: { name: string; amount: number; grand_total: number; due_date: string; instalment_label: string }[];
}

/** Get total overdue dues across all branches */
export async function getDuesTodayTotal(asOf?: string): Promise<DuesTodayTotal> {
  const params = new URLSearchParams({ level: "total" });
  if (asOf) params.set("as_of", asOf);
  const res = await fetch(`/api/fees/dues-till-today?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`dues-till-today failed: ${res.status}`);
  return res.json();
}

/** Get branch-wise dues breakdown */
export async function getDuesTodayByBranch(asOf?: string): Promise<DuesTodayBranchRow[]> {
  const params = new URLSearchParams({ level: "branch" });
  if (asOf) params.set("as_of", asOf);
  const res = await fetch(`/api/fees/dues-till-today?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`dues-till-today failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/** Get class-wise dues for a specific branch */
export async function getDuesTodayByClass(branch: string, asOf?: string): Promise<DuesTodayClassRow[]> {
  const params = new URLSearchParams({ level: "class", branch });
  if (asOf) params.set("as_of", asOf);
  const res = await fetch(`/api/fees/dues-till-today?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`dues-till-today failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/** Get batch-wise dues for a specific branch + class */
export async function getDuesTodayByBatch(branch: string, itemCode: string, asOf?: string): Promise<DuesTodayBatchRow[]> {
  const params = new URLSearchParams({ level: "batch", branch, item_code: itemCode });
  if (asOf) params.set("as_of", asOf);
  const res = await fetch(`/api/fees/dues-till-today?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`dues-till-today failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/** Get student-wise dues for a specific batch */
export async function getDuesTodayByStudent(branch: string, batch: string, asOf?: string): Promise<DuesTodayStudentRow[]> {
  const params = new URLSearchParams({ level: "student", branch, batch });
  if (asOf) params.set("as_of", asOf);
  const res = await fetch(`/api/fees/dues-till-today?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`dues-till-today failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ── Today's Snapshot ──

/** Count students admitted (created) today */
export async function getTodaysAdmissions(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const params = new URLSearchParams({
    doctype: "Student",
    filters: JSON.stringify([
      ["creation", ">=", `${today} 00:00:00`],
      ["creation", "<=", `${today} 23:59:59`],
    ]),
  });
  const { data } = await apiClient.get(
    `/method/frappe.client.get_count?${params}`
  );
  return data.message ?? 0;
}

/** Total billed (grand_total) from invoices created today */
export async function getTodaysBilled(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as total"]),
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["creation", ">=", `${today} 00:00:00`],
      ["creation", "<=", `${today} 23:59:59`],
    ]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${params}`);
  return data?.data?.[0]?.total ?? 0;
}

/** Total collected (paid_amount) from payment entries created today */
export async function getTodaysCollected(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    fields: JSON.stringify(["sum(paid_amount) as total"]),
    filters: JSON.stringify([
      ["docstatus", "=", 1],
      ["payment_type", "=", "Receive"],
      ["creation", ">=", `${today} 00:00:00`],
      ["creation", "<=", `${today} 23:59:59`],
    ]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Payment Entry?${params}`);
  return data?.data?.[0]?.total ?? 0;
}

// ── Bank / Account Balance ──

export interface AccountBalance {
  account: string;
  account_name: string;
  account_type: string;
  balance: number;
}

export interface BranchBankOverview {
  accounts: AccountBalance[];
}

export interface GLEntryRow {
  name: string;
  posting_date: string;
  account: string;
  debit: number;
  credit: number;
  voucher_type: string;
  voucher_no: string;
  against: string;
  party_type: string | null;
  party: string | null;
}

export interface PaymentEntryRow {
  name: string;
  posting_date: string;
  payment_type: string;
  party: string;
  party_name: string;
  paid_amount: number;
  paid_from: string;
  paid_to: string;
  mode_of_payment: string;
  reference_no: string;
}

export interface JournalEntryRow {
  name: string;
  posting_date: string;
  voucher_type: string;
  title: string;
  total_debit: number;
  total_credit: number;
  user_remark: string | null;
}

/** Get bank/cash account balances for a branch */
export async function getBranchBankOverview(
  branch: string,
): Promise<BranchBankOverview> {
  const params = new URLSearchParams({ branch, mode: "overview" });
  const res = await fetch(`/api/director/bank?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`bank overview failed: ${res.status}`);
  return res.json();
}

/** Get GL entries for bank/cash accounts of a branch */
export async function getBranchGLEntries(
  branch: string,
  opts?: {
    from_date?: string;
    to_date?: string;
    account?: string;
    voucher_type?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ accounts: AccountBalance[]; gl_entries: GLEntryRow[] }> {
  const params = new URLSearchParams({ branch, mode: "gl" });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.account) params.set("account", opts.account);
  if (opts?.voucher_type) params.set("voucher_type", opts.voucher_type);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/director/bank?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`bank gl failed: ${res.status}`);
  return res.json();
}

/** Get payment entries for a branch */
export async function getBranchPaymentEntries(
  branch: string,
  opts?: {
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  },
): Promise<PaymentEntryRow[]> {
  const params = new URLSearchParams({ branch, mode: "payments" });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/director/bank?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`bank payments failed: ${res.status}`);
  const json = await res.json();
  return json.payment_entries ?? [];
}

/** Get journal entries for a branch */
export async function getBranchJournalEntries(
  branch: string,
  opts?: {
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  },
): Promise<JournalEntryRow[]> {
  const params = new URLSearchParams({ branch, mode: "journals" });
  if (opts?.from_date) params.set("from_date", opts.from_date);
  if (opts?.to_date) params.set("to_date", opts.to_date);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/director/bank?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`bank journals failed: ${res.status}`);
  const json = await res.json();
  return json.journal_entries ?? [];
}
