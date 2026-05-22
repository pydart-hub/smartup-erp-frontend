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

    return NextResponse.json({ data: res.data ?? [] });
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
      doc.payment_mode = payment_mode;
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
