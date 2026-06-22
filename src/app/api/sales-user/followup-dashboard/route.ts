import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { getSalesUserBranches } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const SALES_USER_ROLES = ["Sales User", "Administrator", "Director", "Management", "General Manager", "System Manager"];
const PROMISED_STATUSES = ["Promised to Pay", "Will Pay This Week"];
const NO_ANSWER_STATUSES = ["Called – No Answer", "Called – Busy"];
const ACTIONABLE_STATUSES = ["Called – No Answer", "Called – Busy", "Promised to Pay", "Will Pay This Week", "Disputed"];

type FollowUpLog = {
  name: string;
  student: string;
  student_name: string;
  branch: string;
  call_date: string;
  called_by: string;
  call_status: string;
  payment_received: number;
  amount_received?: number;
  payment_mode?: string;
  remarks?: string;
  next_followup_date?: string;
  invoice_ref?: string;
};

function hasAllowedRole(roles: string[]): boolean {
  return roles.some((role) => SALES_USER_ROLES.includes(role));
}

function normalizeDateParam(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toLocalDate(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!hasAllowedRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = session.roles || [];
    let allowedCompanies = session.allowed_companies || [];
    let defaultCompany = session.default_company || "";

    if (roles.includes("Sales User") && session.email) {
      const mappedBranches = getSalesUserBranches(session.email);
      if (mappedBranches.length > 0) {
        allowedCompanies = mappedBranches;
        if (!defaultCompany || !mappedBranches.includes(defaultCompany)) {
          defaultCompany = mappedBranches[0];
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const from = normalizeDateParam(searchParams.get("from") || "");
    const to = normalizeDateParam(searchParams.get("to") || "");
    let branch = searchParams.get("branch");

    const filters: any[][] = [
      ["Fee Follow Up", "called_by", "=", session.email],
    ];

    if (roles.includes("Sales User")) {
      if (branch) {
        if (!allowedCompanies.includes(branch)) {
          return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
        }
        filters.push(["Fee Follow Up", "branch", "=", branch]);
      } else {
        if (allowedCompanies.length > 0) {
          filters.push(["Fee Follow Up", "branch", "in", allowedCompanies]);
        }
      }
    } else {
      branch = branch || defaultCompany || "";
      if (branch) {
        filters.push(["Fee Follow Up", "branch", "=", branch]);
      }
    }
    if (from) filters.push(["Fee Follow Up", "call_date", ">=", `${from} 00:00:00`]);
    if (to) filters.push(["Fee Follow Up", "call_date", "<=", `${to} 23:59:59`]);

    const fields = [
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "payment_mode",
      "remarks", "next_followup_date", "invoice_ref",
    ];

    const qs = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: "1000",
      order_by: "call_date desc",
    });

    const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent("Fee Follow Up")}?${qs}`, {
      headers: { Authorization: ADMIN_AUTH, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const logs: FollowUpLog[] = data.data ?? [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    let today_calls = 0;
    let week_calls = 0;
    let answered_count = 0;
    let no_answer_count = 0;
    let promised_count = 0;
    let converted_count = 0;
    let paid_amount = 0;
    let pending_followups = 0;

    const uniqueStudents = new Set<string>();
    const latestByStudent = new Map<string, FollowUpLog>();
    const byBranch = new Map<string, { branch: string; calls: number; converted: number; promised: number; pending: number }>();
    const byStatus = new Map<string, number>();

    for (const log of logs) {
      const logDate = toLocalDate(log.call_date);
      uniqueStudents.add(log.student);
      if (logDate === todayStr) today_calls++;
      if (logDate >= weekStartStr) week_calls++;
      if (!NO_ANSWER_STATUSES.includes(log.call_status)) answered_count++;
      if (NO_ANSWER_STATUSES.includes(log.call_status)) no_answer_count++;
      if (PROMISED_STATUSES.includes(log.call_status)) promised_count++;
      if (
        !(log.payment_received || log.call_status === "Already Paid") &&
        ACTIONABLE_STATUSES.includes(log.call_status) &&
        (!log.next_followup_date || log.next_followup_date <= todayStr)
      ) {
        pending_followups++;
      }
      
      byStatus.set(log.call_status, (byStatus.get(log.call_status) ?? 0) + 1);

      const branchEntry = byBranch.get(log.branch) ?? {
        branch: log.branch,
        calls: 0,
        converted: 0,
        promised: 0,
        pending: 0,
      };
      branchEntry.calls++;
      if (log.payment_received || log.call_status === "Already Paid") branchEntry.converted++;
      if (PROMISED_STATUSES.includes(log.call_status)) branchEntry.promised++;
      if (
        !(log.payment_received || log.call_status === "Already Paid") &&
        ACTIONABLE_STATUSES.includes(log.call_status) &&
        (!log.next_followup_date || log.next_followup_date <= todayStr)
      ) {
        branchEntry.pending++;
      }
      byBranch.set(log.branch, branchEntry);

      if (log.student && !latestByStudent.has(log.student)) {
        latestByStudent.set(log.student, log);
      }
    }

    // ── Converted count + paid amount ──
    // Fetch ALL payment_received=1 logs for this user (no date filter — all-time).
    // This matches the Director's definition: payment_received field = 1 only.
    // We deduplicate per student (one conversion per student, using the EARLIEST paid log
    // so amount_received reflects the first collected payment, not a later re-call).
    {
      const allTimeFilters: any[][] = [
        ["Fee Follow Up", "called_by", "=", session.email],
        ["Fee Follow Up", "payment_received", "=", 1],
      ];
      // Scope to allowed branches (same branch scoping as main query)
      if (roles.includes("Sales User")) {
        if (allowedCompanies.length > 0) {
          allTimeFilters.push(["Fee Follow Up", "branch", "in", allowedCompanies]);
        }
      } else if (branch) {
        allTimeFilters.push(["Fee Follow Up", "branch", "=", branch]);
      }

      try {
        const paidQs = new URLSearchParams({
          fields: JSON.stringify(["student", "amount_received", "call_date"]),
          filters: JSON.stringify(allTimeFilters),
          limit_page_length: "1000",
          order_by: "call_date asc",  // earliest first → first payment per student
        });
        const paidRes = await fetch(
          `${FRAPPE_URL}/api/resource/${encodeURIComponent("Fee Follow Up")}?${paidQs}`,
          { headers: { Authorization: ADMIN_AUTH, Accept: "application/json" }, cache: "no-store" }
        );
        if (paidRes.ok) {
          const paidData = await paidRes.json();
          const paidLogs: { student: string; amount_received?: number }[] = paidData.data ?? [];
          // Deduplicate: first paid log per student (earliest call_date)
          const firstPaidByStudent = new Map<string, number>();
          for (const log of paidLogs) {
            if (log.student && !firstPaidByStudent.has(log.student)) {
              firstPaidByStudent.set(log.student, log.amount_received ?? 0);
            }
          }
          converted_count = firstPaidByStudent.size;
          for (const amt of firstPaidByStudent.values()) {
            paid_amount += amt;
          }
        }
      } catch {
        // Leave converted_count=0, paid_amount=0 on failure
      }
    }


    return NextResponse.json({
      user: {
        email: session.email,
        full_name: session.full_name || session.email.split("@")[0],
        branch: branch || defaultCompany || "",
      },
      summary: {
        today_calls,
        week_calls,
        total_calls: logs.length,
        students_contacted: uniqueStudents.size,
        answered_count,
        no_answer_count,
        promised_count,
        converted_count,
        paid_amount,
        pending_followups,
      },
      by_branch: Array.from(byBranch.values()).sort((a, b) => b.calls - a.calls),
      by_status: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      recent_logs: logs.slice(0, 12),
      latest_by_student: Array.from(latestByStudent.values()).slice(0, 12),
    });
  } catch (err) {
    console.error("[sales-user/followup-dashboard] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
