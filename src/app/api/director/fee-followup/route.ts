/**
 * GET /api/director/fee-followup
 *   Query params: branch?, from?, to?, called_by?, status?
 *   Returns:
 *   {
 *     summary: { total_today, total_this_week, promised_count, paid_count, paid_amount,
 *                no_answer_count, pending_callback_count },
 *     by_user: [{ called_by, branch, calls, answered, promised, paid_count, paid_amount }],
 *     logs: FollowUpLog[]
 *   }
 *
 *   Role: Director / Management / General Manager / Administrator
 */

import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const DIRECTOR_ROLES = ["Director", "Management", "General Manager", "Administrator", "System Manager"];

function isDirector(roles: string[]): boolean {
  return roles.some((r) => DIRECTOR_ROLES.includes(r));
}

function toLocalDate(isoDatetime: string): string {
  // Frappe stores datetimes as "YYYY-MM-DD HH:MM:SS" (UTC) — treat as-is for date comparison
  return isoDatetime.slice(0, 10);
}

function normalizeDateParam(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const ddMmYyyy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyy) {
    const [, dd, mm, yyyy] = ddMmYyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isDirector(session.roles ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || "";
    const from = normalizeDateParam(searchParams.get("from") || "");
    const to = normalizeDateParam(searchParams.get("to") || "");
    const calledBy = searchParams.get("called_by") || "";
    const statusFilter = searchParams.get("status") || "";

    // Build Frappe filters
    const filters: [string, string, string, string][] = [];
    if (branch) filters.push(["Fee Follow Up", "branch", "=", branch]);
    if (from) filters.push(["Fee Follow Up", "call_date", ">=", `${from} 00:00:00`]);
    if (to) filters.push(["Fee Follow Up", "call_date", "<=", `${to} 23:59:59`]);
    if (calledBy) filters.push(["Fee Follow Up", "called_by", "=", calledBy]);
    if (statusFilter) filters.push(["Fee Follow Up", "call_status", "=", statusFilter]);

    const fields = [
      "name", "student", "student_name", "branch",
      "call_date", "called_by", "call_status",
      "payment_received", "amount_received", "payment_mode",
      "remarks", "next_followup_date", "invoice_ref",
    ];

    const qs = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: "500",
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
    const logs: Array<{
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
    }> = data.data ?? [];

    // ── Summary calculations ──
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    // Start of this week (Monday)
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    let total_today = 0;
    let total_this_week = 0;
    let promised_count = 0;
    let paid_count = 0;
    let paid_amount = 0;
    let no_answer_count = 0;
    let pending_callback_count = 0;

    const PROMISED_STATUSES = ["Promised to Pay", "Will Pay This Week"];
    const NO_ANSWER_STATUSES = ["Called – No Answer", "Called – Busy"];
    const NEEDS_FOLLOWUP_STATUSES = ["Called – No Answer", "Called – Busy", "Promised to Pay", "Will Pay This Week", "Disputed"];

    for (const log of logs) {
      const logDate = toLocalDate(log.call_date);
      if (logDate === todayStr) total_today++;
      if (logDate >= weekStartStr) total_this_week++;
      if (PROMISED_STATUSES.includes(log.call_status)) promised_count++;
      if (log.payment_received) {
        paid_count++;
        paid_amount += log.amount_received ?? 0;
      }
      if (NO_ANSWER_STATUSES.includes(log.call_status)) no_answer_count++;
      // Pending callback: unpaid + needs follow-up (with overdue date, OR no date set but status needs action)
      if (!log.payment_received && NEEDS_FOLLOWUP_STATUSES.includes(log.call_status)) {
        if (!log.next_followup_date || log.next_followup_date <= todayStr) {
          pending_callback_count++;
        }
      }
    }

    // ── By-user breakdown ──
    const userMap = new Map<string, {
      called_by: string;
      branch: string;
      calls: number;
      answered: number;
      promised: number;
      paid_count: number;
      paid_amount: number;
    }>();

    for (const log of logs) {
      const key = `${log.called_by}||${log.branch}`;
      if (!userMap.has(key)) {
        userMap.set(key, {
          called_by: log.called_by,
          branch: log.branch,
          calls: 0,
          answered: 0,
          promised: 0,
          paid_count: 0,
          paid_amount: 0,
        });
      }
      const entry = userMap.get(key)!;
      entry.calls++;
      if (!NO_ANSWER_STATUSES.includes(log.call_status)) entry.answered++;
      if (PROMISED_STATUSES.includes(log.call_status)) entry.promised++;
      if (log.payment_received) {
        entry.paid_count++;
        entry.paid_amount += log.amount_received ?? 0;
      }
    }

    const by_user = Array.from(userMap.values()).sort((a, b) => b.calls - a.calls);

    return NextResponse.json({
      summary: {
        total_today,
        total_this_week,
        promised_count,
        paid_count,
        paid_amount,
        no_answer_count,
        pending_callback_count,
      },
      by_user,
      logs,
    });
  } catch (err) {
    console.error("[director/fee-followup] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
