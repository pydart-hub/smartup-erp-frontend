import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const AI_AGENT_SECRET_KEY = process.env.AI_AGENT_SECRET_KEY || "smartup-ai-agent-key-2026";

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

function verifyAccess(request: NextRequest): { authorized: boolean; identity: string } {
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
  limitPageLength = 200
): Promise<Record<string, unknown>[]> {
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
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, identity } = verifyAccess(request);
    if (!authorized) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Provide valid Authorization Bearer token, x-ai-agent-key header, or log in with Director privileges.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "all";
    const branch = searchParams.get("branch");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const now = new Date();
    const responsePayload: Record<string, unknown> = {
      meta: {
        system_name: "SmartUp ERP",
        timestamp: now.toISOString(),
        queried_by: identity,
        scope: { section, branch: branch || "All Branches", limit },
      },
    };

    // 1. FEES
    if (section === "all" || section === "fees" || section === "summary") {
      const invFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
      if (branch) invFilters.push(["company", "=", branch]);

      const peFilters: (string | number | string[])[][] = [
        ["docstatus", "=", 1],
        ["payment_type", "=", "Receive"],
      ];
      if (branch) peFilters.push(["company", "=", branch]);

      const [invoices, payments, feeStructures] = await Promise.all([
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
          branch ? [["custom_branch", "=", branch]] : [],
          "creation desc",
          30
        ),
      ]);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
      const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0);
      const totalCollected = payments.reduce((sum, pe) => sum + Number(pe.paid_amount || 0), 0);

      const todayStr = now.toISOString().slice(0, 10);
      const overdueList = invoices
        .filter((inv) => Number(inv.outstanding_amount || 0) > 0 && String(inv.due_date) < todayStr)
        .slice(0, 20);

      responsePayload.fees = {
        summary: {
          total_billed_in_sample: Math.round(totalInvoiced),
          total_collected_in_sample: Math.round(totalCollected),
          total_outstanding_in_sample: Math.round(totalOutstanding),
          overdue_invoices_count: overdueList.length,
        },
        overdue_invoices_sample: overdueList,
        recent_payments_sample: payments.slice(0, 15),
        fee_structures_count: feeStructures.length,
      };
    }

    // 2. ACADEMICS
    if (section === "all" || section === "academics" || section === "summary") {
      const studentFilters: (string | number | string[])[][] = [["enabled", "=", 1]];
      if (branch) studentFilters.push(["custom_branch", "=", branch]);

      const batchFilters: (string | number | string[])[][] = [["disabled", "=", 0]];
      if (branch) batchFilters.push(["custom_branch", "=", branch]);

      const [students, batches, programs] = await Promise.all([
        frappeGet(
          "Student",
          ["name", "first_name", "last_name", "student_name", "custom_branch", "student_email_id", "custom_program_enrolled"],
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

      responsePayload.academics = {
        summary: {
          active_students_in_sample: students.length,
          active_batches_count: batches.length,
          programs_count: programs.length,
        },
        active_batches: batches.slice(0, 25),
        recent_enrolled_students: students.slice(0, 20),
      };
    }

    // 3. ATTENDANCE
    if (section === "all" || section === "attendance" || section === "summary") {
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
          branch ? [["company", "=", branch]] : [],
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
    if (section === "all" || section === "issues" || section === "summary") {
      const complaintFilters: (string | number | string[])[][] = [];
      if (branch) complaintFilters.push(["branch", "=", branch]);

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

      responsePayload.system_issues = {
        summary: {
          open_complaints_count: openComplaints.length,
          urgent_complaints_count: highPriority.length,
          total_complaints_recorded: complaints.length,
        },
        urgent_open_complaints: highPriority,
        recent_open_complaints: openComplaints.slice(0, 15),
      };
    }

    return NextResponse.json({ success: true, data: responsePayload });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
