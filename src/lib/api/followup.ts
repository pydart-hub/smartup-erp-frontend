/** Client-side helpers for Fee Follow Up */

export interface FollowUpLog {
  name: string;
  student: string;
  student_name: string;
  branch: string;
  call_date: string;
  called_by: string;
  call_status: string;
  payment_received: 0 | 1;
  amount_received?: number;
  payment_mode?: string;
  remarks?: string;
  next_followup_date?: string;
  invoice_ref?: string;
  creation: string;
}

export interface CreateFollowUpPayload {
  student: string;
  student_name: string;
  branch: string;
  call_status: string;
  payment_received: boolean;
  amount_received?: number;
  payment_mode?: string;
  remarks?: string;
  next_followup_date?: string;
  invoice_ref?: string;
}

export interface BranchConversionBreakdown {
  branch: string;
  converted_count: number;
  paid_amount: number;
}

export interface SalesUserFollowUpSummary {
  today_calls: number;
  week_calls: number;
  total_calls: number;
  students_contacted: number;
  answered_count: number;
  no_answer_count: number;
  promised_count: number;
  converted_count: number;
  paid_amount: number;
  branch_converted_count: number;
  branch_paid_amount: number;
  branch_conversions_breakdown: BranchConversionBreakdown[];
  user_conversions_breakdown: BranchConversionBreakdown[];
  pending_followups: number;
}

export interface SalesUserFollowUpBranchRow {
  branch: string;
  calls: number;
  converted: number;
  promised: number;
  pending: number;
}

export interface SalesUserFollowUpStatusRow {
  status: string;
  count: number;
}

export interface SalesUserFollowUpDashboard {
  user: {
    email: string;
    full_name: string;
    branch: string;
  };
  summary: SalesUserFollowUpSummary;
  by_branch: SalesUserFollowUpBranchRow[];
  by_status: SalesUserFollowUpStatusRow[];
  recent_logs: FollowUpLog[];
  latest_by_student: FollowUpLog[];
}

/** Fetch follow-up logs for a specific student */
export async function getStudentFollowUps(student: string): Promise<FollowUpLog[]> {
  const res = await fetch(`/api/fees/follow-up?student=${encodeURIComponent(student)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`follow-up fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/**
 * Fetch all follow-up logs for a branch in one request,
 * returned as a map keyed by student_id (most recent log per student).
 */
export async function getBranchFollowUps(branch: string): Promise<Record<string, FollowUpLog>> {
  const res = await fetch(`/api/fees/follow-up?branch=${encodeURIComponent(branch)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`follow-up branch fetch failed: ${res.status}`);
  const json = await res.json();
  const logs: FollowUpLog[] = json.data ?? [];
  // Build map: most recent log per student (logs already ordered desc by call_date)
  const map: Record<string, FollowUpLog> = {};
  for (const log of logs) {
    if (!map[log.student]) {
      map[log.student] = log;
    }
  }
  return map;
}

/** Create a new follow-up log entry */
export async function createFollowUp(payload: CreateFollowUpPayload): Promise<{ name: string }> {
  const res = await fetch("/api/fees/follow-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed: ${res.status}`);
  }
  return res.json();
}

export async function getSalesUserFollowUpDashboard(params?: {
  from?: string;
  to?: string;
  branch?: string;
}): Promise<SalesUserFollowUpDashboard> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.branch) qs.set("branch", params.branch);
  const res = await fetch(`/api/sales-user/followup-dashboard?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`followup dashboard failed: ${res.status}`);
  return res.json();
}

/** Status display helpers */
export const CALL_STATUS_OPTIONS = [
  "Called – Answered",
  "Called – No Answer",
  "Called – Busy",
  "Promised to Pay",
  "Will Pay This Week",
  "Disputed",
  "Already Paid",
] as const;

export type CallStatus = (typeof CALL_STATUS_OPTIONS)[number];

export function getStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case "Already Paid":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
    case "Promised to Pay":
    case "Will Pay This Week":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" };
    case "Called – Answered":
      return { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" };
    case "Called – No Answer":
    case "Called – Busy":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" };
    case "Disputed":
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" };
    default:
      return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };
  }
}

export function formatCallDate(isoDatetime: string): string {
  try {
    return new Date(isoDatetime).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return isoDatetime;
  }
}
