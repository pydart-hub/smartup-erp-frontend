/**
 * GET /api/director/fee-followup
 *   Query params: branch?, from?, to?, called_by?, status?, kind?
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
const PROMISED_STATUSES = ["Promised to Pay", "Will Pay This Week"];
const NO_ANSWER_STATUSES = ["Called - No Answer", "Called - Busy"];
const NEEDS_FOLLOWUP_STATUSES = ["Called - No Answer", "Called - Busy", "Promised to Pay", "Will Pay This Week", "Disputed"];
const PAYMENT_STATUSES = ["Already Paid"];

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

type PaymentEntryRow = {
  name: string;
  party?: string;
  party_name?: string;
  company?: string;
  paid_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
};

type StudentCustomerRow = {
  name: string;
  student_name?: string;
  customer?: string;
  custom_branch?: string;
};

function isDirector(roles: string[]): boolean {
  return roles.some((r) => DIRECTOR_ROLES.includes(r));
}

function toLocalDate(isoDatetime: string): string {
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

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: { Authorization: ADMIN_AUTH, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe GET ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

function summarizeLogs(logs: FollowUpLog[]) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay();
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
    if (!log.payment_received && NEEDS_FOLLOWUP_STATUSES.includes(log.call_status)) {
      if (!log.next_followup_date || log.next_followup_date <= todayStr) {
        pending_callback_count++;
      }
    }
  }

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

  return {
    summary: {
      total_today,
      total_this_week,
      promised_count,
      paid_count,
      paid_amount,
      no_answer_count,
      pending_callback_count,
    },
    by_user: Array.from(userMap.values()).sort((a, b) => b.calls - a.calls),
  };
}

async function getCollectedLogs(params: {
  branch: string;
  from: string;
  to: string;
  calledBy: string;
  statusFilter: string;
}): Promise<FollowUpLog[]> {
  const paymentFilters: [string, string, string, string | number][] = [
    ["Payment Entry", "payment_type", "=", "Receive"],
    ["Payment Entry", "docstatus", "=", 1],
    ["Payment Entry", "party_type", "=", "Customer"],
  ];
  if (params.branch) paymentFilters.push(["Payment Entry", "company", "=", params.branch]);
  if (params.from) paymentFilters.push(["Payment Entry", "posting_date", ">=", params.from]);
  if (params.to) paymentFilters.push(["Payment Entry", "posting_date", "<=", params.to]);

  const studentFilters: [string, string, string, string][] = [["Student", "customer", "is", "set"]];
  if (params.branch) studentFilters.push(["Student", "custom_branch", "=", params.branch]);

  const [paymentsJson, studentsJson, followupsJson] = await Promise.all([
    frappeGet("resource/Payment Entry", {
      filters: JSON.stringify(paymentFilters),
      fields: JSON.stringify(["name", "party", "party_name", "company", "paid_amount", "mode_of_payment", "posting_date"]),
      order_by: "posting_date desc, creation desc",
      limit_page_length: "5000",
    }),
    frappeGet("resource/Student", {
      filters: JSON.stringify(studentFilters),
      fields: JSON.stringify(["name", "student_name", "customer", "custom_branch"]),
      limit_page_length: "5000",
    }),
    frappeGet("resource/Fee Follow Up", {
      filters: JSON.stringify(params.branch ? [["Fee Follow Up", "branch", "=", params.branch]] : []),
      fields: JSON.stringify([
        "name", "student", "student_name", "branch",
        "call_date", "called_by", "call_status",
        "payment_received", "amount_received", "payment_mode",
        "remarks", "next_followup_date", "invoice_ref",
      ]),
      order_by: "call_date desc, creation desc",
      limit_page_length: "5000",
    }),
  ]);

  const payments = (paymentsJson.data ?? []) as PaymentEntryRow[];
  const students = (studentsJson.data ?? []) as StudentCustomerRow[];
  const followups = (followupsJson.data ?? []) as FollowUpLog[];

  const customerToStudent = new Map<string, StudentCustomerRow>();
  for (const student of students) {
    const customer = student.customer?.trim();
    if (customer && !customerToStudent.has(customer)) {
      customerToStudent.set(customer, student);
    }
  }

  const logsByStudent = new Map<string, FollowUpLog[]>();
  for (const log of followups) {
    const isPaymentLog = log.payment_received === 1 || PAYMENT_STATUSES.includes(log.call_status);
    if (!isPaymentLog || !log.student) continue;
    if (!logsByStudent.has(log.student)) logsByStudent.set(log.student, []);
    logsByStudent.get(log.student)!.push(log);
  }

  const usedLogNames = new Set<string>();
  const collectedLogs: FollowUpLog[] = [];

  for (const payment of payments) {
    const customer = payment.party?.trim();
    const paymentDate = payment.posting_date || "";
    const paidAmt = payment.paid_amount ?? 0;
    const paymentBranch = payment.company || params.branch || "Unknown";

    const studentRow = customer ? customerToStudent.get(customer) : undefined;
    const studentId = studentRow?.name?.trim();
    if (!studentId) continue;

    const studentName = studentRow?.student_name || payment.party_name || studentId;
    const logsForStudent = logsByStudent.get(studentId) ?? [];

    let claimingLog: FollowUpLog | null = null;
    for (const log of logsForStudent) {
      if (usedLogNames.has(log.name)) continue;
      const logDate = log.call_date?.slice(0, 10) || "";
      const isAfterPayment = !paymentDate || !logDate || logDate >= paymentDate;
      const isPaymentLog = log.payment_received === 1 || PAYMENT_STATUSES.includes(log.call_status);
      if (!isPaymentLog || !isAfterPayment) continue;

      const logAmt = log.amount_received ?? 0;
      const amountMatches = logAmt === 0 || Math.abs(logAmt - paidAmt) <= 1;
      if (!amountMatches) continue;

      claimingLog = log;
      usedLogNames.add(log.name);
      break;
    }

    if (!claimingLog) continue;
    if (params.calledBy && claimingLog.called_by !== params.calledBy) continue;
    if (params.statusFilter && claimingLog.call_status !== params.statusFilter) continue;

    collectedLogs.push({
      name: claimingLog.name,
      student: studentId,
      student_name: studentName,
      branch: claimingLog.branch || paymentBranch,
      call_date: claimingLog.call_date || `${paymentDate} 00:00:00`,
      called_by: claimingLog.called_by,
      call_status: claimingLog.call_status || "Already Paid",
      payment_received: 1,
      amount_received: paidAmt,
      payment_mode: payment.mode_of_payment || claimingLog.payment_mode || "",
      remarks: claimingLog.remarks || `Collected on ${paymentDate || "unknown date"}`,
      next_followup_date: claimingLog.next_followup_date,
      invoice_ref: claimingLog.invoice_ref,
    });
  }

  return collectedLogs.sort((a, b) => (b.call_date || "").localeCompare(a.call_date || ""));
}

async function getDiscontinuedCustomers(): Promise<string[]> {
  try {
    const filters: (string | number | string[])[][] = [
      ["enabled", "=", 0],
      ["custom_discontinuation_date", "is", "set"],
    ];
    const res = await frappeGet("resource/Student", {
      filters: JSON.stringify(filters),
      fields: JSON.stringify(["customer"]),
      limit_page_length: "500",
    });
    return (res.data ?? [])
      .map((s: { customer?: string }) => s.customer)
      .filter(Boolean) as string[];
  } catch (err) {
    console.error("Failed to fetch discontinued customers", err);
    return [];
  }
}

async function getPendingOverdueByBranch(todayDate: string): Promise<Record<string, number>> {
  try {
    const discCustomers = await getDiscontinuedCustomers();
    const filters: (string | number | string[])[][] = [
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0],
      ["due_date", "<=", todayDate],
    ];
    if (discCustomers.length > 0) {
      filters.push(["customer", "not in", discCustomers]);
    }
    const res = await frappeGet("resource/Sales Invoice", {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        "company",
        "sum(outstanding_amount) as total_dues",
      ]),
      group_by: "company",
      limit_page_length: "100",
    });

    const duesMap: Record<string, number> = {};
    for (const row of (res.data ?? [])) {
      if (row.company) {
        duesMap[row.company] = row.total_dues ?? 0;
      }
    }
    return duesMap;
  } catch (err) {
    console.error("Failed to fetch pending overdue by branch", err);
    return {};
  }
}

function computeBranchBreakdown(logs: FollowUpLog[], pendingDuesMap: Record<string, number>) {
  const branchMap = new Map<string, {
    branch: string;
    converted_amount: number;
    pending_overdue: number;
    initial_overdue: number;
  }>();

  // Initialize from pending dues map
  for (const [branch, pending] of Object.entries(pendingDuesMap)) {
    if (!branchMap.has(branch)) {
      branchMap.set(branch, {
        branch,
        converted_amount: 0,
        pending_overdue: pending,
        initial_overdue: pending,
      });
    }
  }

  // Aggregate converted amounts from logs
  for (const log of logs) {
    if (log.payment_received && log.amount_received) {
      const branch = log.branch || "Unknown";
      if (!branchMap.has(branch)) {
        branchMap.set(branch, {
          branch,
          converted_amount: 0,
          pending_overdue: 0,
          initial_overdue: 0,
        });
      }
      const item = branchMap.get(branch)!;
      item.converted_amount += log.amount_received;
    }
  }

  // Recalculate initial overdue
  for (const item of branchMap.values()) {
    item.initial_overdue = item.pending_overdue + item.converted_amount;
  }

  return Array.from(branchMap.values()).sort((a, b) => b.initial_overdue - a.initial_overdue);
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
    const kind = searchParams.get("kind") || "";

    const todayDate = to || new Date().toISOString().slice(0, 10);
    const pendingDuesMap = await getPendingOverdueByBranch(todayDate);

    if (kind === "collected") {
      const logs = await getCollectedLogs({ branch, from, to, calledBy, statusFilter });
      const { summary, by_user } = summarizeLogs(logs);
      const by_branch = computeBranchBreakdown(logs, pendingDuesMap);
      return NextResponse.json({ summary, by_user, by_branch, logs });
    }

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
    const logs: FollowUpLog[] = data.data ?? [];
    const { summary, by_user } = summarizeLogs(logs);
    const by_branch = computeBranchBreakdown(logs, pendingDuesMap);

    return NextResponse.json({ summary, by_user, by_branch, logs });
  } catch (err) {
    console.error("[director/fee-followup] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}


