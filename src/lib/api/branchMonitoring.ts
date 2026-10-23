/**
 * branchMonitoring.ts
 * Client API layer for Branch Monitoring (Monthly Target Tracking).
 */

export interface BranchTargetConfig {
  admission_target: number;
  collection_target: number;
  is_custom: boolean;
  notes?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface BranchActuals {
  admissions: number;
  active_admissions: number;
  collection: number;
  payment_count: number;
  breakdown: {
    cash: number;
    upi: number;
    razorpay: number;
    bank_transfer: number;
    cheque: number;
    other: number;
  };
}

export interface BranchMetrics {
  admission_pct: number;
  collection_pct: number;
  admission_shortfall: number;
  collection_shortfall: number;
  current_admission_rate: number;
  required_admission_rate: number;
  current_collection_rate: number;
  required_collection_rate: number;
  status: "exceeded" | "on_track" | "behind" | "critical";
}

export interface BranchMonitoringRow {
  branch: string;
  branch_short: string;
  abbr: string;
  targets: BranchTargetConfig;
  actuals: BranchActuals;
  metrics: BranchMetrics;
}

export interface NetworkTotals {
  target_admissions: number;
  actual_admissions: number;
  admission_pct: number;
  admission_shortfall: number;
  target_collection: number;
  actual_collection: number;
  collection_pct: number;
  collection_shortfall: number;
  payment_count: number;
  cash: number;
  upi: number;
  razorpay: number;
  bank_transfer: number;
}

export interface BranchMonitoringResponse {
  month_key: string;
  month_label: string;
  from_date: string;
  to_date: string;
  days_in_month: number;
  elapsed_days: number;
  remaining_days: number;
  is_current_month: boolean;
  branches: BranchMonitoringRow[];
  network_totals: NetworkTotals;
}

export interface DrilldownStudent {
  name: string;
  student_name: string;
  joining_date: string;
  student_mobile_number?: string;
  custom_parent_name?: string;
  student_email_id?: string;
  enabled: 0 | 1;
}

export interface DrilldownPayment {
  name: string;
  posting_date: string;
  paid_amount: number;
  mode_of_payment: string;
  party_name?: string;
  reference_no?: string;
  remarks?: string;
}

export interface DrilldownResponse<T> {
  type: "admissions" | "collection";
  branch: string;
  month_key: string;
  count: number;
  total_amount?: number;
  data: T[];
}

export async function getBranchMonitoringData(
  monthKey?: string
): Promise<BranchMonitoringResponse> {
  const params = new URLSearchParams();
  if (monthKey) params.set("month", monthKey);
  const res = await fetch(`/api/director/monthly-targets?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function saveBranchTarget(payload: {
  branch: string;
  month_key: string;
  admission_target: number;
  collection_target: number;
  notes?: string;
}): Promise<{ success: boolean; data: unknown }> {
  const res = await fetch("/api/director/monthly-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function bulkSaveBranchTargets(payload: {
  month_key: string;
  targets: Array<{
    branch: string;
    admission_target: number;
    collection_target: number;
    notes?: string;
  }>;
}): Promise<{ success: boolean; count: number }> {
  const res = await fetch("/api/director/monthly-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "bulk", ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function copyBranchTargets(payload: {
  target_month: string;
  source_month: string;
  adjustment_pct?: number;
}): Promise<{ success: boolean; count: number }> {
  const res = await fetch("/api/director/monthly-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "copy", ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getDrilldownStudents(
  branch: string,
  monthKey: string
): Promise<DrilldownResponse<DrilldownStudent>> {
  const params = new URLSearchParams({
    branch,
    month: monthKey,
    type: "admissions",
  });
  const res = await fetch(`/api/director/monthly-targets/drilldown?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getDrilldownPayments(
  branch: string,
  monthKey: string
): Promise<DrilldownResponse<DrilldownPayment>> {
  const params = new URLSearchParams({
    branch,
    month: monthKey,
    type: "collection",
  });
  const res = await fetch(`/api/director/monthly-targets/drilldown?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
