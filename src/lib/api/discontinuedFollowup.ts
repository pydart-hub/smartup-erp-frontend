export interface DiscontinuedFollowUpLog {
  name: string;
  student: string;
  student_name: string;
  branch: string;
  discontinuation_date?: string;
  discontinuation_reason?: string;
  call_date: string;
  called_by: string;
  call_status: string;
  feedback_category?: string;
  feedback_notes?: string;
  interested_to_rejoin?: 0 | 1;
  rejoin_probability?: string;
  reason_not_rejoining?: string;
  followup_outcome?: string;
  latest_mobile_used?: string;
  invoice_outstanding_at_call?: number;
  creation?: string;
}

export interface CreateDiscontinuedFollowUpPayload {
  student: string;
  student_name: string;
  branch: string;
  discontinuation_date?: string;
  discontinuation_reason?: string;
  call_status: string;
  feedback_category?: string;
  feedback_notes?: string;
  interested_to_rejoin?: boolean;
  rejoin_probability?: string;
  reason_not_rejoining?: string;
  followup_outcome?: string;
  latest_mobile_used?: string;
  invoice_outstanding_at_call?: number;
}

export interface DiscontinuedStudentListRow {
  student_id: string;
  student_name: string;
  branch: string;
  program?: string;
  batch?: string;
  mobile?: string;
  parent_mobile?: string;
  discontinuation_date?: string;
  discontinuation_reason?: string;
  outstanding_amount: number;
  overdue_outstanding_amount: number;
  future_outstanding_amount: number;
  latest_followup?: DiscontinuedFollowUpLog;
}

export async function getDiscontinuedFollowUps(student: string): Promise<DiscontinuedFollowUpLog[]> {
  const res = await fetch(`/api/discontinued/follow-up?student=${encodeURIComponent(student)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`discontinued follow-up fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function createDiscontinuedFollowUp(
  payload: CreateDiscontinuedFollowUpPayload,
): Promise<{ name: string }> {
  const res = await fetch("/api/discontinued/follow-up", {
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

export async function getSalesUserDiscontinuedStudents(branch?: string): Promise<{
  data: DiscontinuedStudentListRow[];
}> {
  const qs = new URLSearchParams();
  if (branch) qs.set("branch", branch);
  const res = await fetch(`/api/sales-user/discontinued-students?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`sales discontinued students failed: ${res.status}`);
  return res.json();
}

export const DISCONTINUED_CALL_STATUS_OPTIONS = [
  "Answered",
  "No Answer",
  "Busy",
  "Switched Off",
  "Wrong Number",
  "Callback Requested",
] as const;

export const DISCONTINUED_FEEDBACK_CATEGORY_OPTIONS = [
  "Financial Issue",
  "Personal Reason",
  "Shifted",
  "Poor Performance",
  "Not Interested",
  "Joined Elsewhere",
  "Timing Issue",
  "Health Issue",
  "Other",
] as const;

export const DISCONTINUED_OUTCOME_OPTIONS = [
  "Open",
  "Closed",
  "Will Rejoin",
  "Not Interested",
  "Wrong Number",
] as const;
