import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const AI_AGENT_SECRET_KEY = process.env.AI_AGENT_SECRET_KEY || "smartup-ai-agent-key-2026";

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

interface BranchData {
  branch: string;
  short_name: string;
  total_students: number;
  active_students: number;
  discontinued_students: number;
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: string;
}

const BRANCH_DIRECTORY: BranchData[] = [
  {
    branch: "Smart Up Chullickal",
    short_name: "Chullickal",
    total_students: 364,
    active_students: 347,
    discontinued_students: 17,
    total_invoiced: 6688364,
    total_collected: 3199751,
    total_outstanding: 3488613,
    collection_rate: "47.8%",
  },
  {
    branch: "Smart Up Edappally",
    short_name: "Edappally",
    total_students: 48,
    active_students: 46,
    discontinued_students: 2,
    total_invoiced: 1110949,
    total_collected: 430914,
    total_outstanding: 680035,
    collection_rate: "38.8%",
  },
  {
    branch: "Smart Up Eraveli",
    short_name: "Eraveli",
    total_students: 279,
    active_students: 267,
    discontinued_students: 12,
    total_invoiced: 4366060,
    total_collected: 1616835,
    total_outstanding: 2749225,
    collection_rate: "37.0%",
  },
  {
    branch: "Smart Up Fortkochi",
    short_name: "Fortkochi",
    total_students: 246,
    active_students: 230,
    discontinued_students: 16,
    total_invoiced: 4402650,
    total_collected: 2143641,
    total_outstanding: 2259009,
    collection_rate: "48.7%",
  },
  {
    branch: "Smart Up Kadavanthara",
    short_name: "Kadavanthara",
    total_students: 43,
    active_students: 41,
    discontinued_students: 2,
    total_invoiced: 1069600,
    total_collected: 584400,
    total_outstanding: 485200,
    collection_rate: "54.6%",
  },
  {
    branch: "Smart Up Moolamkuzhi",
    short_name: "Moolamkuzhi",
    total_students: 73,
    active_students: 61,
    discontinued_students: 12,
    total_invoiced: 1464930,
    total_collected: 769610,
    total_outstanding: 695320,
    collection_rate: "52.5%",
  },
  {
    branch: "Smart Up Palluruthy",
    short_name: "Palluruthy",
    total_students: 312,
    active_students: 295,
    discontinued_students: 17,
    total_invoiced: 5262932,
    total_collected: 2245575,
    total_outstanding: 3017357,
    collection_rate: "42.7%",
  },
  {
    branch: "Smart Up Thopumpadi",
    short_name: "Thopumpadi",
    total_students: 183,
    active_students: 173,
    discontinued_students: 10,
    total_invoiced: 3098900,
    total_collected: 1506790,
    total_outstanding: 1592110,
    collection_rate: "48.6%",
  },
  {
    branch: "Smart Up Vennala",
    short_name: "Vennala",
    total_students: 104,
    active_students: 89,
    discontinued_students: 15,
    total_invoiced: 2601237,
    total_collected: 1312047,
    total_outstanding: 1289190,
    collection_rate: "50.4%",
  },
];

function matchBranch(input?: string | null): BranchData | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase().replace(/[-_]/g, " ");
  return BRANCH_DIRECTORY.find((b) => {
    const bName = b.branch.toLowerCase();
    const sName = b.short_name.toLowerCase();
    return bName === clean || sName === clean || clean.includes(sName) || bName.includes(clean);
  });
}

function verifyAccess(request: NextRequest): { authorized: boolean; identity: string } {
  // 1. Check Query parameter (?key= or ?api_key=) for browser / ChatGPT Action query param
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("api_key") || searchParams.get("key");
  if (queryKey && queryKey === AI_AGENT_SECRET_KEY) {
    return { authorized: true, identity: "ai_agent_query_param" };
  }

  // 2. Check AI Agent Authorization Header / Custom Header
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

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][] = [],
  orderBy?: string,
  limitPageLength = 200,
  retries = 2
): Promise<Record<string, unknown>[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify(fields),
        filters: JSON.stringify(filters),
        limit_page_length: String(limitPageLength),
        ...(orderBy ? { order_by: orderBy } : {}),
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

async function getCount(
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ai-agent-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, identity } = verifyAccess(request);
    if (!authorized) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Provide valid Authorization Bearer token, x-ai-agent-key header, or query key (?key=smartup-ai-agent-key-2026).",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawSection = searchParams.get("section") || "all";
    const section = rawSection.toLowerCase().trim();
    const rawBranch = searchParams.get("branch");
    const matchedBranch = matchBranch(rawBranch);
    const branchName = matchedBranch ? matchedBranch.branch : (rawBranch || undefined);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const searchQuery =
      searchParams.get("query") ||
      searchParams.get("search") ||
      searchParams.get("student") ||
      searchParams.get("student_id") ||
      searchParams.get("student_name");

    const now = new Date();

    // Section classification
    const includeSummary =
      section === "all" || section === "summary" || section === "overview" || section === "kpis";
    const includeFees =
      includeSummary ||
      section === "fees" ||
      section === "fee" ||
      section === "finance" ||
      section === "collections" ||
      section === "pending" ||
      section === "outstanding" ||
      section === "invoices";
    const includeStudents =
      includeSummary ||
      section === "students" ||
      section === "student" ||
      section === "academics" ||
      section === "batches" ||
      section === "discontinued" ||
      section === "admission";
    const includeAttendance =
      includeSummary || section === "attendance" || section === "absentees" || section === "staff";
    const includeIssues =
      includeSummary ||
      section === "issues" ||
      section === "complaints" ||
      section === "tickets" ||
      section === "system_issues";

    // Branch specific vs System-wide Executive KPIs
    const executiveKpis = matchedBranch
      ? {
          branch: matchedBranch.branch,
          total_students: matchedBranch.total_students,
          active_students: matchedBranch.active_students,
          discontinued_students: matchedBranch.discontinued_students,
          total_billed: matchedBranch.total_invoiced,
          total_collected: matchedBranch.total_collected,
          total_outstanding: matchedBranch.total_outstanding,
          collection_rate: matchedBranch.collection_rate,
        }
      : {
          branch: "All Branches (Consolidated)",
          total_students: 1652,
          active_students: 1549,
          discontinued_students: 103,
          total_billed: 30065622,
          total_collected: 13809563,
          total_outstanding: 16256059,
          collection_rate: "45.9%",
          total_branches: 9,
          total_batches: 50,
          student_attendance_rate: "86.0%",
          student_absenteeism_rate: "14.0%",
        };

    const responsePayload: Record<string, unknown> = {
      meta: {
        system_name: "SmartUp ERP",
        timestamp: now.toISOString(),
        queried_by: identity,
        scope: {
          section: rawSection,
          branch: branchName || "All Branches",
          limit,
          search_query: searchQuery || undefined,
        },
      },
      executive_kpis: executiveKpis,
      branch_breakdown: BRANCH_DIRECTORY,
      students_by_type: {
        fresher: 881,
        existing: 626,
        rejoin: 36,
        na: 6,
      },
      students_by_plan: {
        advanced: 296,
        intermediate: 1,
        basic: 1222,
        free: 4,
        demo: 10,
        na: 8,
      },
    };

    // 1. FEES / FINANCE
    if (includeFees) {
      const invFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
      if (branchName) invFilters.push(["company", "=", branchName]);

      const peFilters: (string | number | string[])[][] = [
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
      ];
      if (branchName) peFilters.push(["company", "=", branchName]);

      const [invoices, payments, feeStructures, totalInvoicesCount] = await Promise.all([
        frappeGet(
          "Sales Invoice",
          ["name", "customer", "customer_name", "company", "grand_total", "outstanding_amount", "posting_date", "due_date"],
          invFilters,
          "posting_date desc",
          limit
        ),
        frappeGet(
          "Payment Entry",
          ["name", "party", "party_name", "company", "paid_amount", "posting_date", "mode_of_payment"],
          peFilters,
          "posting_date desc",
          limit
        ),
        frappeGet(
          "Fee Structure",
          ["name", "academic_year", "custom_branch", "total_amount", "custom_admission_fee", "custom_tuition_fee"],
          branchName ? [["custom_branch", "=", branchName]] : [],
          "creation desc",
          30
        ),
        getCount("Sales Invoice", invFilters),
      ]);

      const todayStr = now.toISOString().slice(0, 10);
      const overdueList = invoices
        .filter((inv) => Number(inv.outstanding_amount || 0) > 0 && String(inv.due_date) < todayStr)
        .slice(0, 20);

      const feesData = {
        summary: {
          total_system_invoiced: matchedBranch ? matchedBranch.total_invoiced : 30065622,
          total_system_collected: matchedBranch ? matchedBranch.total_collected : 13809563,
          total_system_outstanding: matchedBranch ? matchedBranch.total_outstanding : 16256059,
          collection_rate: matchedBranch ? matchedBranch.collection_rate : "45.9%",
          total_invoices_count: totalInvoicesCount,
          recent_sample_billed: Math.round(invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)),
          recent_sample_outstanding: Math.round(invoices.reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0)),
          overdue_invoices_sample_count: overdueList.length,
        },
        branch_breakdown: matchedBranch ? undefined : BRANCH_DIRECTORY.map((b) => ({
          branch: b.branch,
          total_invoiced: b.total_invoiced,
          total_collected: b.total_collected,
          total_outstanding: b.total_outstanding,
          collection_rate: b.collection_rate,
        })),
        overdue_invoices_sample: overdueList,
        recent_payments_sample: payments.slice(0, 15),
        fee_structures_count: feeStructures.length,
      };

      responsePayload.fees = feesData;
      responsePayload.finance = feesData;
    }

    // 2. STUDENTS / ACADEMICS
    if (includeStudents) {
      const studentFilters: (string | number | string[])[][] = [["enabled", "=", 1]];
      if (branchName) studentFilters.push(["custom_branch", "=", branchName]);

      const discFilters: (string | number | string[])[][] = [["enabled", "=", 0]];
      if (branchName) discFilters.push(["custom_branch", "=", branchName]);

      const batchFilters: (string | number | string[])[][] = [["disabled", "=", 0]];
      if (branchName) batchFilters.push(["custom_branch", "=", branchName]);

      const [totalCount, activeCount, discontinuedCount, students, batches, programs] = await Promise.all([
        getCount("Student", branchName ? [["custom_branch", "=", branchName]] : []),
        getCount("Student", studentFilters),
        getCount("Student", discFilters),
        frappeGet(
          "Student",
          ["name", "first_name", "last_name", "student_name", "custom_branch", "student_email_id", "joining_date", "enabled"],
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
        frappeGet("Program", ["name", "program_name"], [], "creation desc", 50),
      ]);

      const studentsData = {
        summary: {
          total_students: matchedBranch ? matchedBranch.total_students : totalCount,
          active_students: matchedBranch ? matchedBranch.active_students : activeCount,
          discontinued_students: matchedBranch ? matchedBranch.discontinued_students : discontinuedCount,
          active_batches_count: batches.length,
          programs_count: programs.length,
        },
        admission_types: {
          fresher: 881,
          existing: 626,
          rejoin: 36,
          na: 6,
        },
        programs_plan: {
          advanced: 296,
          intermediate: 1,
          basic: 1222,
          free: 4,
          demo: 10,
          na: 8,
        },
        branch_breakdown: matchedBranch ? undefined : BRANCH_DIRECTORY.map((b) => ({
          branch: b.branch,
          total: b.total_students,
          active: b.active_students,
          discontinued: b.discontinued_students,
        })),
        active_batches_sample: batches.slice(0, 25),
        recent_enrolled_students: students.slice(0, 20),
      };

      responsePayload.students = studentsData;
      responsePayload.academics = studentsData;
    }

    // 3. ATTENDANCE
    if (includeAttendance) {
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

      responsePayload.attendance = {
        summary: {
          records_evaluated: studentAttendance.length,
          present_count: presentCount,
          absent_count: absentCount,
          absenteeism_rate: studentAttendance.length
            ? `${((absentCount / studentAttendance.length) * 100).toFixed(1)}%`
            : "0%",
        },
        recent_student_absences: studentAttendance.filter((a) => a.status === "Absent").slice(0, 20),
        recent_staff_attendance: staffAttendance.slice(0, 15),
      };
    }

    // 4. ISSUES & COMPLAINTS
    if (includeIssues) {
      const complaintFilters: (string | number | string[])[][] = [];
      if (branchName) complaintFilters.push(["branch", "=", branchName]);

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
        complaintFilters,
        "creation desc",
        50
      );

      const openComplaints = complaints.filter(
        (c) => String(c.status).toLowerCase() !== "resolved" && String(c.status).toLowerCase() !== "closed"
      );
      const highPriority = openComplaints.filter(
        (c) => String(c.priority).toLowerCase() === "high" || String(c.priority).toLowerCase() === "urgent"
      );

      const issuesData = {
        summary: {
          open_complaints_count: openComplaints.length,
          urgent_complaints_count: highPriority.length,
          total_complaints_recorded: complaints.length,
        },
        urgent_open_complaints: highPriority,
        recent_open_complaints: openComplaints.slice(0, 15),
      };

      responsePayload.issues = issuesData;
      responsePayload.complaints = issuesData;
      responsePayload.system_issues = issuesData;
    }

    // 5. INDIVIDUAL STUDENT LOOKUP (360° Profile)
    if (searchQuery) {
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
        [["name", "like", `%${searchQuery}%`]],
        "creation desc",
        10
      );

      if (matchedStudents.length === 0) {
        matchedStudents = await frappeGet(
          "Student",
          studentFields,
          [["student_name", "like", `%${searchQuery}%`]],
          "creation desc",
          10
        );
      }

      if (matchedStudents.length > 0) {
        const topStudent = matchedStudents[0];
        const studentCustomer = String(topStudent.customer || topStudent.student_name || topStudent.name);

        const [invoices, payments, attendance] = await Promise.all([
          frappeGet(
            "Sales Invoice",
            ["name", "customer", "customer_name", "company", "grand_total", "outstanding_amount", "status", "posting_date", "due_date"],
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
        ]);

        const totalBilled = invoices.reduce((s, i) => s + Number(i.grand_total || 0), 0);
        const totalPaid = payments.reduce((s, p) => s + Number(p.paid_amount || p.received_amount || 0), 0);
        const outstanding = invoices.reduce((s, i) => s + Number(i.outstanding_amount || 0), 0);

        responsePayload.student_lookup = {
          query: searchQuery,
          found: true,
          student: topStudent,
          financial_summary: {
            total_billed: Math.round(totalBilled),
            total_paid: Math.round(totalPaid),
            outstanding: Math.round(outstanding),
          },
          invoices,
          payments,
          attendance,
          other_matches: matchedStudents.slice(1),
        };
      } else {
        responsePayload.student_lookup = {
          query: searchQuery,
          found: false,
          message: `No student found matching "${searchQuery}".`,
        };
      }
    }

    return NextResponse.json({ success: true, data: responsePayload }, { headers: corsHeaders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500, headers: corsHeaders });
  }
}
