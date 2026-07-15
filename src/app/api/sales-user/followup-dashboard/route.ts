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

    const baseFilters: any[][] = [
      ["Fee Follow Up", "called_by", "=", session.email],
    ];

    if (roles.includes("Sales User")) {
      if (branch) {
        if (!allowedCompanies.includes(branch)) {
          return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
        }
        baseFilters.push(["Fee Follow Up", "branch", "=", branch]);
      } else {
        if (allowedCompanies.length > 0) {
          baseFilters.push(["Fee Follow Up", "branch", "in", allowedCompanies]);
        }
      }
    } else {
      branch = branch || defaultCompany || "";
      if (branch) {
        baseFilters.push(["Fee Follow Up", "branch", "=", branch]);
      }
    }

    const filters = [...baseFilters];
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
      limit_page_length: "2000",
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
    // Use IST timezone (UTC+5:30) so dates match user's local day
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const todayStr = istDate.toISOString().slice(0, 10);

    const dayOfWeek = istDate.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(istDate.getTime());
    weekStart.setDate(istDate.getDate() - daysFromMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Fetch live logs without date constraints for live metrics (Today/Week Calls, Pending Followups)
    let liveLogs: FollowUpLog[] = [];
    try {
      const liveQs = new URLSearchParams({
        fields: JSON.stringify(fields),
        filters: JSON.stringify(baseFilters),
        limit_page_length: "2000",
        order_by: "call_date desc",
      });
      const liveRes = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent("Fee Follow Up")}?${liveQs}`, {
        headers: { Authorization: ADMIN_AUTH, Accept: "application/json" },
        cache: "no-store",
      });
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        liveLogs = liveData.data ?? [];
      }
    } catch (err) {
      console.error("Error fetching live logs for dashboard stats:", err);
    }

    let today_calls = 0;
    let week_calls = 0;
    let answered_count = 0;
    let no_answer_count = 0;
    let promised_count = 0;
    let converted_count = 0;
    let paid_amount = 0;
    let branch_converted_count = 0;
    let branch_paid_amount = 0;
    let branch_conversions_breakdown: { branch: string; converted_count: number; paid_amount: number }[] = [];
    let user_conversions_breakdown: { branch: string; converted_count: number; paid_amount: number }[] = [];
    let pending_followups = 0;
    let today_collected = 0;
    const today_calls_details: { student_name: string; call_status: string; amount_collected: number; call_time: string }[] = [];

    const uniqueStudents = new Set<string>();
    const latestByStudent = new Map<string, FollowUpLog>();
    const byBranch = new Map<string, { branch: string; calls: number; converted: number; promised: number; pending: number }>();
    const byStatus = new Map<string, number>();

    // Calculate live metrics from unfiltered liveLogs
    for (const log of liveLogs) {
      const logDate = toLocalDate(log.call_date);
      if (logDate === todayStr) {
        today_calls++;
        const amt = log.amount_received ?? 0;
        if (log.payment_received === 1 || log.call_status === "Already Paid") {
          today_collected += amt;
        }

        let callTime = "";
        if (log.call_date && log.call_date.includes(" ")) {
          callTime = log.call_date.split(" ")[1].slice(0, 5); // "HH:MM"
        }

        today_calls_details.push({
          student_name: log.student_name || log.student,
          call_status: log.call_status,
          amount_collected: amt,
          call_time: callTime
        });
      }
      if (logDate >= weekStartStr) week_calls++;
      if (
        !(log.payment_received || log.call_status === "Already Paid") &&
        ACTIONABLE_STATUSES.includes(log.call_status) &&
        (!log.next_followup_date || log.next_followup_date <= todayStr)
      ) {
        pending_followups++;
      }
    }

    // Calculate date-filtered metrics from logs
    const period_calls_details = logs.map(log => {
      let callTime = "";
      if (log.call_date && log.call_date.includes(" ")) {
        callTime = log.call_date.split(" ")[1].slice(0, 5); // "HH:MM"
      }
      return {
        student_name: log.student_name || log.student,
        call_status: log.call_status,
        amount_collected: log.amount_received ?? 0,
        call_time: callTime,
      };
    });

    for (const log of logs) {
      uniqueStudents.add(log.student);
      if (!NO_ANSWER_STATUSES.includes(log.call_status)) answered_count++;
      if (NO_ANSWER_STATUSES.includes(log.call_status)) no_answer_count++;
      if (PROMISED_STATUSES.includes(log.call_status)) promised_count++;
      
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

    // ── Converted counts + paid amounts ──
    // Fetch ALL payment_received=1 logs for the assigned branches (all-time).
    // This allows us to calculate both Branch-wide conversions and User-specific conversions in one query.
    {
      const allTimeFilters: any[][] = [
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

      if (from) {
        allTimeFilters.push(["Fee Follow Up", "call_date", ">=", `${from} 00:00:00`]);
      }
      if (to) {
        allTimeFilters.push(["Fee Follow Up", "call_date", "<=", `${to} 23:59:59`]);
      }

      try {
        const paidQs = new URLSearchParams({
          fields: JSON.stringify(["student", "amount_received", "call_date", "called_by", "branch"]),
          filters: JSON.stringify(allTimeFilters),
          limit_page_length: "2000",
          order_by: "call_date asc",
        });
        const paidRes = await fetch(
          `${FRAPPE_URL}/api/resource/${encodeURIComponent("Fee Follow Up")}?${paidQs}`,
          { headers: { Authorization: ADMIN_AUTH, Accept: "application/json" }, cache: "no-store" }
        );
        if (paidRes.ok) {
          const paidData = await paidRes.json();
          const paidLogs: { student: string; amount_received?: number; called_by?: string; branch?: string }[] = paidData.data ?? [];

          // Branch-wide calculations & breakdowns
          const branchBreakdown = new Map<string, { branch: string; converted_count: number; paid_amount: number; students: Set<string> }>();
          const userBreakdown = new Map<string, { branch: string; converted_count: number; paid_amount: number; students: Set<string> }>();

          const branchPaidStudents = new Set<string>();
          for (const log of paidLogs) {
            if (log.student) {
              branchPaidStudents.add(log.student);
            }
            branch_paid_amount += log.amount_received ?? 0;

            const bName = log.branch || "Unknown Branch";
            if (!branchBreakdown.has(bName)) {
              branchBreakdown.set(bName, { branch: bName, converted_count: 0, paid_amount: 0, students: new Set() });
            }
            const bEntry = branchBreakdown.get(bName)!;
            if (log.student) bEntry.students.add(log.student);
            bEntry.paid_amount += log.amount_received ?? 0;
          }
          branch_converted_count = branchPaidStudents.size;

          // User-specific calculations (for the current session email) & breakdowns
          const userPaidStudents = new Set<string>();
          for (const log of paidLogs) {
            const isUser = log.called_by?.trim().toLowerCase() === session.email.trim().toLowerCase();
            if (isUser) {
              if (log.student) {
                userPaidStudents.add(log.student);
              }
              paid_amount += log.amount_received ?? 0;

              const bName = log.branch || "Unknown Branch";
              if (!userBreakdown.has(bName)) {
                userBreakdown.set(bName, { branch: bName, converted_count: 0, paid_amount: 0, students: new Set() });
              }
              const uEntry = userBreakdown.get(bName)!;
              if (log.student) uEntry.students.add(log.student);
              uEntry.paid_amount += log.amount_received ?? 0;
            }
          }
          converted_count = userPaidStudents.size;

          // Format maps into arrays sorted by collection amount
          branch_conversions_breakdown = Array.from(branchBreakdown.values()).map(e => ({
            branch: e.branch,
            converted_count: e.students.size,
            paid_amount: e.paid_amount
          })).sort((a, b) => b.paid_amount - a.paid_amount);

          user_conversions_breakdown = Array.from(userBreakdown.values()).map(e => ({
            branch: e.branch,
            converted_count: e.students.size,
            paid_amount: e.paid_amount
          })).sort((a, b) => b.paid_amount - a.paid_amount);
        }
      } catch (err) {
        console.error("Error fetching all-time paid logs:", err);
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
        branch_converted_count,
        branch_paid_amount,
        branch_conversions_breakdown,
        user_conversions_breakdown,
        pending_followups,
        today_collected,
        today_calls_details,
        period_calls_details,
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
