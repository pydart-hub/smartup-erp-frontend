import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

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
  creation: string;
};

type PaymentEntryRow = {
  name: string;
  party?: string;
  party_name?: string;
  paid_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
};

type StudentCustomerRow = {
  name: string;
  student_name?: string;
  customer?: string;
};

type OverdueStudentRow = {
  student_id: string;
  student_name?: string;
  class_name?: string;
  batch_name?: string;
  total_dues?: number;
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

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const branch = request.nextUrl.searchParams.get("branch") || "";
    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    const sinceDate = isoDaysAgo(4);

    const [followUpRes, overdueRes, paymentsRes, branchStudentsRes] = await Promise.all([
      frappeGet("resource/Fee Follow Up", {
        filters: JSON.stringify([["branch", "=", branch]]),
        fields: JSON.stringify([
          "name", "student", "student_name", "branch",
          "call_date", "called_by", "call_status",
          "payment_received", "amount_received", "payment_mode",
          "remarks", "next_followup_date", "invoice_ref",
          "creation",
        ]),
        order_by: "call_date desc",
        limit_page_length: "1000",
      }),
      fetch(
        `${request.nextUrl.origin}/api/fees/dues-till-today?${new URLSearchParams({
          level: "branch_students",
          branch,
        }).toString()}`,
        {
          headers: {
            cookie: request.headers.get("cookie") || "",
          },
          cache: "no-store",
        }
      ).then(async (res) => {
        if (!res.ok) throw new Error(`Overdue fetch failed: ${res.status}`);
        return res.json();
      }),
      frappeGet("resource/Payment Entry", {
        filters: JSON.stringify([
          ["payment_type", "=", "Receive"],
          ["docstatus", "=", 1],
          ["party_type", "=", "Customer"],
          ["company", "=", branch],
          ["posting_date", ">=", sinceDate],
        ]),
        fields: JSON.stringify([
          "name", "party", "party_name", "paid_amount", "mode_of_payment", "posting_date",
        ]),
        order_by: "posting_date desc",
        limit_page_length: "1000",
      }),
      frappeGet("resource/Student", {
        filters: JSON.stringify([
          ["custom_branch", "=", branch],
          ["customer", "is", "set"],
        ]),
        fields: JSON.stringify(["name", "student_name", "customer"]),
        limit_page_length: "2000",
      }),
    ]);

    const latestLogByStudent = new Map<string, FollowUpLog>();
    for (const log of (followUpRes.data ?? []) as FollowUpLog[]) {
      if (!log.student || latestLogByStudent.has(log.student)) continue;
      latestLogByStudent.set(log.student, log);
    }

    const overdueStudentMap = new Map<string, OverdueStudentRow>();
    for (const student of (overdueRes.data ?? []) as OverdueStudentRow[]) {
      if (student.student_id) {
        overdueStudentMap.set(student.student_id, student);
      }
    }

    const customerToStudent = new Map<string, StudentCustomerRow>();
    for (const student of (branchStudentsRes.data ?? []) as StudentCustomerRow[]) {
      const customer = student.customer?.trim();
      if (!customer || customerToStudent.has(customer)) continue;
      customerToStudent.set(customer, student);
    }

    const latestPaymentByStudent = new Map<string, PaymentEntryRow>();
    for (const pe of (paymentsRes.data ?? []) as PaymentEntryRow[]) {
      const customer = pe.party?.trim();
      if (!customer) continue;
      const student = customerToStudent.get(customer);
      const studentId = student?.name?.trim();
      if (!studentId || latestPaymentByStudent.has(studentId)) continue;
      latestPaymentByStudent.set(studentId, pe);
    }

    const data = Array.from(latestPaymentByStudent.entries())
      .filter(([studentId]) => {
        const log = latestLogByStudent.get(studentId);
        const hasOverdueContext = overdueStudentMap.has(studentId) || !!log;
        if (!hasOverdueContext) return false;
        return true;
      })
      .map(([studentId, payment]) => {
        const log = latestLogByStudent.get(studentId) ?? null;
        const overdueStudent = overdueStudentMap.get(studentId);
        const paymentDate = payment.posting_date || "";
        const logDate = log?.call_date || "";
        const claimedAfterPayment =
          !!log &&
          (log.payment_received === 1 || log.call_status === "Already Paid") &&
          (!paymentDate || !logDate || logDate >= paymentDate);

        return {
          student_id: studentId,
          student_name: overdueStudent?.student_name || log?.student_name || payment.party_name || studentId,
          branch,
          class_name: overdueStudent?.class_name || "",
          batch_name: overdueStudent?.batch_name || "",
          total_dues: overdueStudent?.total_dues ?? 0,
          claim_status: claimedAfterPayment ? "claimed" : "awaiting_claim",
          latest_followup: log,
          recent_payment: {
            name: payment.name,
            posting_date: payment.posting_date || "",
            paid_amount: payment.paid_amount ?? 0,
            mode_of_payment: payment.mode_of_payment || "",
          },
        };
      })
      .sort((a, b) => {
        if (a.claim_status !== b.claim_status) {
          return a.claim_status === "awaiting_claim" ? -1 : 1;
        }
        return b.recent_payment.posting_date.localeCompare(a.recent_payment.posting_date);
      });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[fees/recently-paid-claims] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch recently paid claims" },
      { status: 500 }
    );
  }
}
