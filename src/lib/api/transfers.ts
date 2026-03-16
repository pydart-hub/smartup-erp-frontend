/**
 * transfers.ts
 * Frontend API helpers for the Student Branch Transfer feature.
 * All calls route through /api/proxy (client-side) or direct fetch to
 * our Next.js API routes for server-side operations.
 */

import apiClient from "./client";
import type { FrappeListResponse } from "@/lib/types/api";
import type {
  StudentBranchTransfer,
  TransferStatus,
} from "@/lib/types/transfer";

// ── List transfers ──────────────────────────────────────────

export async function getTransfers(params?: {
  from_branch?: string;
  to_branch?: string;
  status?: TransferStatus;
  limit_page_length?: number;
  limit_start?: number;
}): Promise<FrappeListResponse<StudentBranchTransfer>> {
  const filters: string[][] = [];
  if (params?.from_branch) filters.push(["from_branch", "=", params.from_branch]);
  if (params?.to_branch) filters.push(["to_branch", "=", params.to_branch]);
  if (params?.status) filters.push(["status", "=", params.status]);

  const fields = JSON.stringify([
    "name", "student", "student_name", "program", "academic_year",
    "from_branch", "to_branch", "status", "amount_already_paid",
    "adjusted_amount", "new_total_amount", "old_total_amount",
    "request_date", "completion_date", "requested_by", "approved_by",
    "reason", "creation",
  ]);

  const query = new URLSearchParams({
    fields,
    order_by: "creation desc",
    limit_page_length: String(params?.limit_page_length ?? 50),
    ...(params?.limit_start ? { limit_start: String(params.limit_start) } : {}),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });

  const { data } = await apiClient.get(`/resource/Student Branch Transfer?${query}`);
  return data;
}

/** Get transfers where this branch is either sender or receiver */
export async function getTransfersForBranch(
  branch: string,
  status?: TransferStatus,
): Promise<{ incoming: StudentBranchTransfer[]; outgoing: StudentBranchTransfer[] }> {
  // Fetch both directions in parallel
  const [inRes, outRes] = await Promise.all([
    getTransfers({ to_branch: branch, status }),
    getTransfers({ from_branch: branch, status }),
  ]);
  return {
    incoming: inRes.data ?? [],
    outgoing: outRes.data ?? [],
  };
}

// ── Single transfer ─────────────────────────────────────────

export async function getTransfer(name: string): Promise<StudentBranchTransfer> {
  const { data } = await apiClient.get(
    `/resource/Student Branch Transfer/${encodeURIComponent(name)}`
  );
  return data.data;
}

// ── Create transfer request ─────────────────────────────────

export async function createTransferRequest(payload: {
  student: string;
  to_branch: string;
  reason?: string;
}): Promise<{ transfer: StudentBranchTransfer }> {
  const res = await fetch("/api/transfer/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to create transfer request");
  }
  return res.json();
}

// ── Respond to transfer ─────────────────────────────────────

export async function respondToTransfer(payload: {
  transfer_id: string;
  action: "accept" | "reject";
  new_fee_structure?: string;
  new_payment_plan?: string;
  new_no_of_instalments?: string;
  rejection_reason?: string;
}): Promise<{ transfer: StudentBranchTransfer }> {
  const res = await fetch("/api/transfer/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to respond to transfer");
  }
  return res.json();
}

// ── Count pending transfers for notification badge ──────────

export async function getPendingTransferCount(branch: string): Promise<number> {
  const { data } = await apiClient.get(`/resource/Student Branch Transfer`, {
    params: {
      filters: JSON.stringify([
        ["to_branch", "=", branch],
        ["status", "=", "Pending"],
      ]),
      fields: JSON.stringify(["count(name) as cnt"]),
      limit_page_length: 1,
    },
  });
  return data.data?.[0]?.cnt ?? 0;
}
