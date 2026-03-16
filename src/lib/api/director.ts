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
  const enrollParams = new URLSearchParams({
    fields: JSON.stringify(["student", "program", "enrollment_date"]),
    filters: JSON.stringify([["student", "in", allStudentNames], ["docstatus", "=", "1"]]),
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

export interface BranchInstructor {
  name: string;
  instructor_name: string;
  employee: string;
  department: string;
}

export async function getBranchInstructors(
  branch: string
): Promise<BranchInstructor[]> {
  // First get employees for this branch
  const empParams = new URLSearchParams({
    fields: JSON.stringify(["name", "employee_name"]),
    filters: JSON.stringify([
      ["company", "=", branch],
      ["status", "=", "Active"],
    ]),
    limit_page_length: "500",
  });
  const { data: empData } = await apiClient.get(
    `/resource/Employee?${empParams}`
  );
  const employees: { name: string; employee_name: string }[] =
    empData.data ?? [];
  if (!employees.length) return [];

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
  return instrData.data ?? [];
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
