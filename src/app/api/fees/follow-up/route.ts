/**
 * GET  /api/fees/follow-up?student=STU-XX-001
 *   → Returns last 10 follow-up logs for that student
 *
 * POST /api/fees/follow-up
 *   body: { student, student_name, branch, call_status, payment_received,
 *            amount_received?, payment_mode?, remarks?, next_followup_date?,
 *            invoice_ref? }
 *   → Creates a new Fee Follow Up record
 */

import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: ADMIN_AUTH,
};

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

async function frappePost(path: string, body: unknown) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe POST ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── GET: fetch follow-up logs for a student ──
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const student = sp.get("student");
    const branch = sp.get("branch");

    if (!student && !branch) {
      return NextResponse.json({ error: "student or branch param required" }, { status: 400 });
    }

    const filters: (string | number | string[])[][] = [];
    if (student) filters.push(["student", "=", student]);
    if (branch) filters.push(["branch", "=", branch]);

    const res = await frappeGet("resource/Fee Follow Up", {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        "name", "student", "student_name", "branch",
        "call_date", "called_by", "call_status",
        "payment_received", "amount_received", "payment_mode",
        "remarks", "next_followup_date", "invoice_ref",
        "creation",
      ]),
      order_by: "call_date desc",
      // When fetching by branch, return up to 500 records; per-student is capped at 20
      limit_page_length: branch && !student ? "500" : "20",
    });

    return NextResponse.json(
      { data: res.data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err) {
    console.error("[fees/follow-up GET]", err);
    return NextResponse.json({ error: "Failed to fetch follow-up logs" }, { status: 500 });
  }
}

// ── POST: create a new follow-up log ──
export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      student,
      student_name,
      branch,
      call_status,
      payment_received,
      amount_received,
      payment_mode,
      remarks,
      next_followup_date,
      invoice_ref,
    } = body;

    if (!student || !branch || !call_status) {
      return NextResponse.json(
        { error: "student, branch and call_status are required" },
        { status: 400 }
      );
    }

    // ── DEDUPLICATION GUARD ──
    // 1. If invoice_ref is provided, check if a claim for this payment already exists with the same amount
    if (invoice_ref && typeof invoice_ref === "string" && invoice_ref.trim()) {
      try {
        const existingClaimRes = await frappeGet("resource/Fee Follow Up", {
          filters: JSON.stringify([["invoice_ref", "=", invoice_ref.trim()]]),
          fields: JSON.stringify(["name", "amount_received"]),
          limit_page_length: "1",
        });
        const existing = existingClaimRes?.data?.[0];
        if (existing?.name) {
          const isSameAmount = (!amount_received && !existing.amount_received) ||
                               (Number(amount_received) === Number(existing.amount_received));
          if (isSameAmount) {
            console.log(`[fees/follow-up POST] Duplicate claim prevented for invoice_ref=${invoice_ref} with same amount, returning existing name=${existing.name}`);
            return NextResponse.json({ success: true, name: existing.name, deduplicated: true });
          }
        }
      } catch (checkErr) {
        console.warn("[fees/follow-up POST] Error checking existing invoice_ref claim:", checkErr);
      }
    }

    // 2. If student + call_status + branch was logged within the last 60 seconds by the same user, prevent duplicate double-click creation
    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      const recentLogsRes = await frappeGet("resource/Fee Follow Up", {
        filters: JSON.stringify([
          ["student", "=", student],
          ["called_by", "=", session.email],
          ["call_status", "=", call_status],
          ["branch", "=", branch],
          ["creation", ">=", `${todayDate} 00:00:00`],
        ]),
        fields: JSON.stringify(["name", "creation", "invoice_ref", "amount_received"]),
        order_by: "creation desc",
        limit_page_length: "1",
      });
      const recentLog = recentLogsRes?.data?.[0];
      if (recentLog?.creation) {
        const logTime = new Date(recentLog.creation).getTime();
        const nowTime = Date.now();
        if (nowTime - logTime < 60_000) {
          // Only block deduplication if the payment reference ID and amount are both identical
          const isSameInvoice = (!invoice_ref && !recentLog.invoice_ref) || 
                                (invoice_ref && recentLog.invoice_ref && invoice_ref.trim() === recentLog.invoice_ref.trim());
          
          const isSameAmount = (!amount_received && !recentLog.amount_received) ||
                               (Number(amount_received) === Number(recentLog.amount_received));

          if (isSameInvoice && isSameAmount) {
            console.log(`[fees/follow-up POST] Rapid duplicate follow-up log prevented for student=${student} within 60s, returning existing name=${recentLog.name}`);
            return NextResponse.json({ success: true, name: recentLog.name, deduplicated: true });
          }
        }
      }
    } catch (checkErr) {
      console.warn("[fees/follow-up POST] Error checking recent follow-up log creation:", checkErr);
    }

    // Build the Frappe document
    const now = new Date();
    const callDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

    const doc: Record<string, unknown> = {
      doctype: "Fee Follow Up",
      naming_series: "FU-.YYYY.-",
      student,
      student_name: student_name || "",
      branch,
      call_date: callDate,
      called_by: session.email,
      call_status,
      payment_received: payment_received ? 1 : 0,
    };

    if (payment_received && amount_received) {
      doc.amount_received = Number(amount_received);
    }
    if (payment_received && payment_mode) {
      doc.payment_mode = payment_mode === "Razorpay" ? "Bank Transfer" : payment_mode;
    }
    if (remarks) doc.remarks = String(remarks).slice(0, 500);
    if (next_followup_date) doc.next_followup_date = next_followup_date;
    if (invoice_ref) doc.invoice_ref = invoice_ref;

    const result = await frappePost("resource/Fee Follow Up", doc);

    return NextResponse.json({ success: true, name: result?.data?.name });
  } catch (err) {
    console.error("[fees/follow-up POST]", err);
    return NextResponse.json({ error: "Failed to save follow-up" }, { status: 500 });
  }
}
