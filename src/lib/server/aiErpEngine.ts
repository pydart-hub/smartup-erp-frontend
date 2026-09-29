import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const AI_AGENT_SECRET_KEY = process.env.AI_AGENT_SECRET_KEY || "smartup-ai-agent-key-2026";

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ai-agent-key",
};

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function verifyAiAccess(request: NextRequest): { authorized: boolean; identity: string } {
  // 1. Check Query parameter (?key= or ?api_key=)
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("api_key") || searchParams.get("key");
  if (queryKey && queryKey === AI_AGENT_SECRET_KEY) {
    return { authorized: true, identity: "ai_agent_query_param" };
  }

  // 2. Check Authorization Header / Custom Header
  const authHeader = request.headers.get("authorization");
  const agentKey = request.headers.get("x-ai-agent-key");

  if (agentKey && agentKey === AI_AGENT_SECRET_KEY) {
    return { authorized: true, identity: "ai_agent_header" };
  }

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === AI_AGENT_SECRET_KEY) {
      return { authorized: true, identity: "ai_agent_bearer" };
    }
  }

  // 3. Check Director Session Cookie
  const sessionCookie = request.cookies.get("smartup_session");
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      ) as { email?: string; roles?: string[] };
      const roles = sessionData.roles || [];
      const isDirector =
        roles.includes("Administrator") ||
        roles.includes("Director") ||
        roles.includes("Management") ||
        roles.includes("General Manager");

      if (isDirector) {
        return { authorized: true, identity: `user:${sessionData.email || "director"}` };
      }
    } catch {
      // ignore parse error
    }
  }

  return { authorized: false, identity: "unauthorized" };
}

export async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][] = [],
  orderBy?: string,
  limitPageLength = 200,
  groupBy?: string,
  retries = 2
): Promise<Record<string, unknown>[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify(fields),
        filters: JSON.stringify(filters),
        limit_page_length: String(limitPageLength),
        ...(orderBy ? { order_by: orderBy } : {}),
        ...(groupBy ? { group_by: groupBy } : {}),
      });

      const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`, {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.data || []) as Record<string, unknown>[];
    } catch {
      if (attempt === retries) return [];
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return [];
}

export async function getCount(
  doctype: string,
  filters?: (string | number | string[])[][]
): Promise<number> {
  try {
    const params = new URLSearchParams({ doctype });
    if (filters && filters.length > 0) {
      params.set("filters", JSON.stringify(filters));
    }
    const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_count?${params}`, {
      headers: { Authorization: adminAuth, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json.message || 0);
  } catch {
    return 0;
  }
}

export interface LiveBranchStat {
  branch: string;
  short_name: string;
  total_students: number;
  active_students: number;
  discontinued_students: number;
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: string;
  invoice_count: number;
}

export async function fetchLiveBranchData(): Promise<{
  liveBranchList: LiveBranchStat[];
  admissionTypes: Record<string, number>;
  totalBatches: number;
  totalPrograms: number;
}> {
  const [
    branchStudentRows,
    branchInvoiceRows,
    studentTypeRows,
    totalBatchesCount,
    totalProgramsCount,
  ] = await Promise.all([
    frappeGet(
      "Student",
      ["custom_branch", "enabled", "count(name) as student_count"],
      [],
      undefined,
      100,
      "custom_branch,enabled"
    ),
    frappeGet(
      "Sales Invoice",
      [
        "company",
        "sum(grand_total) as total_invoiced",
        "sum(outstanding_amount) as total_outstanding",
        "count(name) as invoice_count",
      ],
      [["docstatus", "=", 1]],
      undefined,
      100,
      "company"
    ),
    frappeGet(
      "Student",
      ["custom_student_type", "count(name) as type_count"],
      [],
      undefined,
      50,
      "custom_student_type"
    ),
    getCount("Student Group", [["disabled", "=", 0]]),
    getCount("Program", []),
  ]);

  const branchMap = new Map<string, LiveBranchStat>();

  for (const row of branchStudentRows) {
    const branchName = String(row.custom_branch || "").trim();
    if (!branchName) continue;
    if (!branchMap.has(branchName)) {
      const shortName = branchName.replace(/^Smart\s*Up\s*/i, "").trim() || branchName;
      branchMap.set(branchName, {
        branch: branchName,
        short_name: shortName,
        total_students: 0,
        active_students: 0,
        discontinued_students: 0,
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_rate: "0.0%",
        invoice_count: 0,
      });
    }
    const stat = branchMap.get(branchName)!;
    const count = Number(row.student_count || 0);
    if (Number(row.enabled) === 1) {
      stat.active_students += count;
    } else {
      stat.discontinued_students += count;
    }
    stat.total_students = stat.active_students + stat.discontinued_students;
  }

  for (const row of branchInvoiceRows) {
    const companyName = String(row.company || "").trim();
    if (!companyName) continue;
    if (!branchMap.has(companyName)) {
      const shortName = companyName.replace(/^Smart\s*Up\s*/i, "").trim() || companyName;
      branchMap.set(companyName, {
        branch: companyName,
        short_name: shortName,
        total_students: 0,
        active_students: 0,
        discontinued_students: 0,
        total_invoiced: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_rate: "0.0%",
        invoice_count: 0,
      });
    }
    const stat = branchMap.get(companyName)!;
    stat.total_invoiced = Math.round(Number(row.total_invoiced || 0));
    stat.total_outstanding = Math.round(Number(row.total_outstanding || 0));
    stat.total_collected = Math.max(0, stat.total_invoiced - stat.total_outstanding);
    stat.collection_rate =
      stat.total_invoiced > 0
        ? `${((stat.total_collected / stat.total_invoiced) * 100).toFixed(1)}%`
        : "0.0%";
    stat.invoice_count = Number(row.invoice_count || 0);
  }

  const liveBranchList = Array.from(branchMap.values()).sort((a, b) =>
    a.branch.localeCompare(b.branch)
  );

  const admissionTypes: Record<string, number> = {};
  for (const row of studentTypeRows) {
    const typeKey = String(row.custom_student_type || "unspecified").toLowerCase();
    admissionTypes[typeKey] = Number(row.type_count || 0);
  }

  return {
    liveBranchList,
    admissionTypes,
    totalBatches: totalBatchesCount,
    totalPrograms: totalProgramsCount,
  };
}

export function matchBranchInList(
  input: string | null | undefined,
  list: LiveBranchStat[]
): LiveBranchStat | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase().replace(/[-_]/g, " ");
  return list.find((b) => {
    const bName = b.branch.toLowerCase();
    const sName = b.short_name.toLowerCase();
    return bName === clean || sName === clean || clean.includes(sName) || bName.includes(clean);
  });
}

// ── LIVE FEES ──
export async function getLiveFeesData(branchName?: string, limit = 50) {
  const invFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  if (branchName) invFilters.push(["company", "=", branchName]);

  const peFilters: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["payment_type", "=", "Receive"],
  ];
  if (branchName) peFilters.push(["company", "=", branchName]);

  const [recentInvoices, recentPayments, feeStructures, branchMeta] = await Promise.all([
    frappeGet(
      "Sales Invoice",
      [
        "name",
        "customer",
        "customer_name",
        "company",
        "grand_total",
        "outstanding_amount",
        "status",
        "posting_date",
        "due_date",
      ],
      invFilters,
      "posting_date desc",
      limit
    ),
    frappeGet(
      "Payment Entry",
      ["name", "party", "party_name", "company", "paid_amount", "received_amount", "posting_date", "mode_of_payment"],
      peFilters,
      "posting_date desc",
      limit
    ),
    frappeGet(
      "Fee Structure",
      ["name", "academic_year", "company", "total_amount", "program"],
      branchName ? [["company", "=", branchName]] : [],
      "creation desc",
      30
    ),
    fetchLiveBranchData(),
  ]);

  const matched = matchBranchInList(branchName, branchMeta.liveBranchList);

  const systemTotalInvoiced = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_invoiced, 0);
  const systemTotalOutstanding = branchMeta.liveBranchList.reduce(
    (sum, b) => sum + b.total_outstanding,
    0
  );
  const systemTotalCollected = Math.max(0, systemTotalInvoiced - systemTotalOutstanding);
  const systemCollectionRate =
    systemTotalInvoiced > 0
      ? `${((systemTotalCollected / systemTotalInvoiced) * 100).toFixed(1)}%`
      : "0.0%";

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueList = recentInvoices
    .filter((inv) => Number(inv.outstanding_amount || 0) > 0 && String(inv.due_date) < todayStr)
    .slice(0, 25);

  const totalOverdueAmount = overdueList.reduce(
    (sum, inv) => sum + Number(inv.outstanding_amount || 0),
    0
  );

  return {
    summary: {
      scope: matched ? matched.branch : "All Branches (Consolidated)",
      total_invoiced: matched ? matched.total_invoiced : systemTotalInvoiced,
      total_collected: matched ? matched.total_collected : systemTotalCollected,
      total_outstanding: matched ? matched.total_outstanding : systemTotalOutstanding,
      collection_rate: matched ? matched.collection_rate : systemCollectionRate,
      overdue_sample_amount: Math.round(totalOverdueAmount),
      overdue_invoices_count: overdueList.length,
    },
    branch_breakdown: matched ? [matched] : branchMeta.liveBranchList,
    overdue_invoices: overdueList,
    recent_invoices_sample: recentInvoices.slice(0, 20),
    recent_payments_sample: recentPayments.slice(0, 15),
    fee_structures_count: feeStructures.length,
  };
}

// ── LIVE STUDENTS & ACADEMICS ──
export async function getLiveStudentsData(branchName?: string, limit = 50) {
  const studentFilters: (string | number | string[])[][] = [["enabled", "=", 1]];
  if (branchName) studentFilters.push(["custom_branch", "=", branchName]);

  const batchFilters: (string | number | string[])[][] = [["disabled", "=", 0]];
  if (branchName) batchFilters.push(["custom_branch", "=", branchName]);

  const [recentStudents, batches, branchMeta] = await Promise.all([
    frappeGet(
      "Student",
      ["name", "first_name", "last_name", "student_name", "custom_branch", "student_email_id", "joining_date", "enabled", "customer"],
      studentFilters,
      "creation desc",
      limit
    ),
    frappeGet(
      "Student Group",
      ["name", "student_group_name", "program", "custom_branch", "max_strength"],
      batchFilters,
      "creation desc",
      50
    ),
    fetchLiveBranchData(),
  ]);

  const matched = matchBranchInList(branchName, branchMeta.liveBranchList);

  const systemTotalStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_students, 0);
  const systemActiveStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.active_students, 0);
  const systemDiscontinuedStudents = branchMeta.liveBranchList.reduce(
    (sum, b) => sum + b.discontinued_students,
    0
  );

  return {
    summary: {
      scope: matched ? matched.branch : "All Branches (Consolidated)",
      total_students: matched ? matched.total_students : systemTotalStudents,
      active_students: matched ? matched.active_students : systemActiveStudents,
      discontinued_students: matched ? matched.discontinued_students : systemDiscontinuedStudents,
      active_batches_count: branchMeta.totalBatches,
      programs_count: branchMeta.totalPrograms,
    },
    admission_types_live: branchMeta.admissionTypes,
    branch_breakdown: matched ? [matched] : branchMeta.liveBranchList,
    active_batches_sample: batches.slice(0, 25),
    recent_enrolled_students: recentStudents.slice(0, 20),
  };
}

// ── LIVE SALES ORDERS ──
export async function getLiveOrdersData(branchName?: string, limit = 50) {
  const filters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  if (branchName) filters.push(["company", "=", branchName]);

  const [orders, count] = await Promise.all([
    frappeGet(
      "Sales Order",
      ["name", "customer", "customer_name", "company", "grand_total", "status", "transaction_date"],
      filters,
      "transaction_date desc",
      limit
    ),
    getCount("Sales Order", filters),
  ]);

  const totalValue = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);

  return {
    summary: {
      total_orders_count: count,
      recent_sample_total_value: Math.round(totalValue),
    },
    recent_orders: orders,
  };
}

// ── LIVE ATTENDANCE ──
export async function getLiveAttendanceData(branchName?: string, limit = 50) {
  const attFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  const [studentAttendance, staffAttendance] = await Promise.all([
    frappeGet(
      "Student Attendance",
      ["name", "student", "student_name", "date", "status", "student_group"],
      attFilters,
      "date desc",
      limit
    ),
    frappeGet(
      "Attendance",
      ["name", "employee", "employee_name", "attendance_date", "status", "company"],
      branchName ? [["company", "=", branchName]] : [],
      "attendance_date desc",
      30
    ),
  ]);

  const absentCount = studentAttendance.filter((a) => a.status === "Absent").length;
  const presentCount = studentAttendance.filter((a) => a.status === "Present").length;

  return {
    summary: {
      records_evaluated: studentAttendance.length,
      present_count: presentCount,
      absent_count: absentCount,
      sample_absenteeism_rate: studentAttendance.length
        ? `${((absentCount / studentAttendance.length) * 100).toFixed(1)}%`
        : "0%",
    },
    recent_student_absences: studentAttendance.filter((a) => a.status === "Absent").slice(0, 20),
    recent_staff_attendance: staffAttendance.slice(0, 15),
  };
}

// ── LIVE STAFF & INSTRUCTORS ──
export async function getLiveStaffData() {
  const [employeeCount, instructorCount, instructors] = await Promise.all([
    getCount("Employee"),
    getCount("Instructor"),
    frappeGet(
      "Instructor",
      ["name", "instructor_name", "department", "employee"],
      [],
      "creation desc",
      25
    ),
  ]);

  return {
    summary: {
      total_employees: employeeCount,
      total_instructors: instructorCount,
    },
    instructors_sample: instructors,
  };
}

// ── LIVE ISSUES & COMPLAINTS ──
export async function getLiveIssuesData(branchName?: string) {
  const filters: (string | number | string[])[][] = [];
  if (branchName) filters.push(["branch", "=", branchName]);

  const complaints = await frappeGet(
    "SmartUp Complaint",
    [
      "name",
      "subject",
      "category",
      "priority",
      "status",
      "description",
      "student_name",
      "branch",
      "creation",
    ],
    filters,
    "creation desc",
    50
  );

  const openComplaints = complaints.filter(
    (c) => String(c.status).toLowerCase() !== "resolved" && String(c.status).toLowerCase() !== "closed"
  );
  const highPriority = openComplaints.filter(
    (c) => String(c.priority).toLowerCase() === "high" || String(c.priority).toLowerCase() === "urgent"
  );

  return {
    summary: {
      open_complaints_count: openComplaints.length,
      urgent_complaints_count: highPriority.length,
      total_complaints_recorded: complaints.length,
    },
    urgent_open_complaints: highPriority,
    recent_open_complaints: openComplaints.slice(0, 15),
  };
}

// ── 360° STUDENT LOOKUP ──
export async function lookupStudent360(query: string) {
  const studentFields = [
    "name",
    "first_name",
    "last_name",
    "student_name",
    "custom_branch",
    "student_email_id",
    "joining_date",
    "enabled",
    "customer",
    "custom_student_type",
  ];

  let matchedStudents = await frappeGet(
    "Student",
    studentFields,
    [["name", "like", `%${query}%`]],
    "creation desc",
    10
  );

  if (matchedStudents.length === 0) {
    matchedStudents = await frappeGet(
      "Student",
      studentFields,
      [["student_name", "like", `%${query}%`]],
      "creation desc",
      10
    );
  }

  if (matchedStudents.length === 0) {
    return {
      query,
      found: false,
      message: `No student found matching "${query}".`,
    };
  }

  const topStudent = matchedStudents[0];
  const studentCustomer = String(topStudent.customer || topStudent.student_name || topStudent.name);

  const [invoices, payments, attendance, orders, complaints] = await Promise.all([
    frappeGet(
      "Sales Invoice",
      [
        "name",
        "customer",
        "customer_name",
        "company",
        "grand_total",
        "outstanding_amount",
        "status",
        "posting_date",
        "due_date",
      ],
      [["customer", "=", studentCustomer]],
      "posting_date desc",
      20
    ),
    frappeGet(
      "Payment Entry",
      ["name", "party", "party_name", "paid_amount", "received_amount", "posting_date", "mode_of_payment"],
      [["party", "=", studentCustomer]],
      "posting_date desc",
      20
    ),
    frappeGet(
      "Student Attendance",
      ["name", "student", "student_name", "date", "status", "student_group"],
      [["student", "=", String(topStudent.name)]],
      "date desc",
      20
    ),
    frappeGet(
      "Sales Order",
      ["name", "customer", "customer_name", "grand_total", "status", "transaction_date"],
      [["customer", "=", studentCustomer]],
      "transaction_date desc",
      10
    ),
    frappeGet(
      "SmartUp Complaint",
      ["name", "subject", "category", "priority", "status", "description", "creation"],
      [["student_name", "=", studentCustomer]],
      "creation desc",
      10
    ),
  ]);

  const totalBilled = invoices.reduce((s, i) => s + Number(i.grand_total || 0), 0);
  const totalPaid = payments.reduce(
    (s, p) => s + Number(p.paid_amount || p.received_amount || 0),
    0
  );
  const outstanding = invoices.reduce((s, i) => s + Number(i.outstanding_amount || 0), 0);

  return {
    query,
    found: true,
    student: topStudent,
    financial_summary: {
      total_billed: Math.round(totalBilled),
      total_paid: Math.round(totalPaid),
      outstanding: Math.round(outstanding),
    },
    invoices,
    payments,
    sales_orders: orders,
    attendance,
    complaints,
    other_matches: matchedStudents.slice(1),
  };
}
