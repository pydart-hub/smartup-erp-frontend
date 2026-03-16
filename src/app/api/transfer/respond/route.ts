/**
 * POST /api/transfer/respond
 *
 * Accept or Reject a Student Branch Transfer.
 * On accept, triggers the full transfer execution chain.
 *
 * Body: { transfer_id, action, new_fee_structure?, new_payment_plan?,
 *         new_no_of_instalments?, rejection_reason? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL!;
const API_KEY = process.env.FRAPPE_API_KEY!;
const API_SECRET = process.env.FRAPPE_API_SECRET!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`Frappe GET ${path}: ${res.status}`);
  return (await res.json()).data;
}

async function frappePut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Frappe PUT ${path}: ${res.status} — ${errText}`);
  }
  return (await res.json()).data;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;
    const session = authResult;

    const body = await request.json();
    const {
      transfer_id,
      action,
      new_fee_structure,
      new_payment_plan,
      new_no_of_instalments,
      rejection_reason,
    } = body as {
      transfer_id: string;
      action: "accept" | "reject";
      new_fee_structure?: string;
      new_payment_plan?: string;
      new_no_of_instalments?: string;
      rejection_reason?: string;
    };

    if (!transfer_id || !action) {
      return NextResponse.json(
        { error: "transfer_id and action are required" },
        { status: 400 },
      );
    }

    // 1. Fetch transfer record
    const transfer = await frappeGet(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
    );

    if (transfer.status !== "Pending") {
      return NextResponse.json(
        { error: `Transfer is already ${transfer.status}` },
        { status: 400 },
      );
    }

    // Validate receiver BM owns the target branch
    const allowed = session.allowed_companies || [];
    if (
      !allowed.includes(transfer.to_branch) &&
      !session.roles?.includes("Director") &&
      !session.roles?.includes("Administrator") &&
      !session.roles?.includes("System Manager")
    ) {
      return NextResponse.json(
        { error: "You can only respond to transfers for your own branch" },
        { status: 403 },
      );
    }

    // ── REJECT ──
    if (action === "reject") {
      await frappePut(
        `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
        {
          status: "Rejected",
          rejection_reason: rejection_reason || "",
          approved_by: session.email,
        },
      );
      const updated = await frappeGet(
        `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
      );
      return NextResponse.json({ transfer: updated });
    }

    // ── ACCEPT — validate required fields ──
    if (!new_fee_structure || !new_no_of_instalments) {
      return NextResponse.json(
        { error: "new_fee_structure and new_no_of_instalments are required for accept" },
        { status: 400 },
      );
    }

    // Fetch new fee structure total
    let newTotalAmount = 0;
    try {
      const fsDoc = await frappeGet(
        `/api/resource/Fee Structure/${encodeURIComponent(new_fee_structure)}`,
      );
      newTotalAmount = fsDoc.total_amount || 0;
    } catch {
      return NextResponse.json(
        { error: "Could not fetch new fee structure" },
        { status: 400 },
      );
    }

    const adjustedAmount = Math.max(0, newTotalAmount - (transfer.amount_already_paid || 0));

    // Update transfer with accept info
    await frappePut(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
      {
        status: "Approved",
        approved_by: session.email,
        new_fee_structure,
        new_payment_plan: new_payment_plan || "",
        new_no_of_instalments,
        new_total_amount: newTotalAmount,
        adjusted_amount: adjustedAmount,
      },
    );

    // Trigger the execution chain
    const executeRes = await fetch(
      new URL("/api/transfer/execute", request.url).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ transfer_id }),
      },
    );

    if (!executeRes.ok) {
      const errBody = await executeRes.json().catch(() => ({}));
      console.error("[transfer/respond] Execute failed:", errBody);
      // Transfer is set to "Approved" but execution failed — update to Failed
      await frappePut(
        `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
        {
          status: "Failed",
          transfer_log: `Execution failed: ${(errBody as { error?: string }).error || "Unknown error"}`,
        },
      );
    }

    const final = await frappeGet(
      `/api/resource/Student Branch Transfer/${encodeURIComponent(transfer_id)}`,
    );
    return NextResponse.json({ transfer: final });
  } catch (err) {
    console.error("[transfer/respond] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
