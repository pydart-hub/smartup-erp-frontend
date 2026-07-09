import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { getBranchStudentsOverdueData } from "../dues-till-today/route";
import { getSalesUserBranches } from "@/lib/utils/constants";

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
  // Use IST (UTC+5:30) so payments near midnight aren't missed
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setDate(ist.getDate() - days);
  return ist.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roles = session.roles || [];
    let allowedCompanies = session.allowed_companies || [];

    if (roles.includes("Sales User") && session.email) {
      const mappedBranches = getSalesUserBranches(session.email);
      if (mappedBranches.length > 0) {
        allowedCompanies = mappedBranches;
      }
    }

    const branch = request.nextUrl.searchParams.get("branch") || "";
    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    if (roles.includes("Sales User") && !allowedCompanies.includes(branch)) {
      return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
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
      getBranchStudentsOverdueData(branch, new Date().toISOString().slice(0, 10)).then((rows) => ({
        data: rows,
      })),
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

    // ── All follow-up logs per student (ordered desc by call_date) ──
    const allLogsByStudent = new Map<string, FollowUpLog[]>();
    for (const log of (followUpRes.data ?? []) as FollowUpLog[]) {
      if (!log.student) continue;
      if (!allLogsByStudent.has(log.student)) allLogsByStudent.set(log.student, []);
      allLogsByStudent.get(log.student)!.push(log);
    }

    // Latest log per student (logs are desc so first = latest)
    const latestLogByStudent = new Map<string, FollowUpLog>();
    for (const [studentId, logs] of allLogsByStudent) {
      latestLogByStudent.set(studentId, logs[0]);
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

    // ── Build all payments per student (not just the latest) ──
    // Key: studentId → PaymentEntryRow[]  (sorted desc by posting_date already)
    const allPaymentsByStudent = new Map<string, PaymentEntryRow[]>();
    let unmatchedPayments = 0;
    for (const pe of (paymentsRes.data ?? []) as PaymentEntryRow[]) {
      const customer = pe.party?.trim();
      if (!customer) continue;
      const student = customerToStudent.get(customer);
      const studentId = student?.name?.trim();
      if (!studentId) { unmatchedPayments++; continue; }
      if (!allPaymentsByStudent.has(studentId)) allPaymentsByStudent.set(studentId, []);
      allPaymentsByStudent.get(studentId)!.push(pe);
    }
    console.log(`[recently-paid-claims] branch=${branch} | paymentEntries=${(paymentsRes.data ?? []).length} | unmatchedCustomers=${unmatchedPayments} | studentsWithPayments=${allPaymentsByStudent.size} | studentMapSize=${customerToStudent.size} | overdueStudents=${overdueStudentMap.size}`);


    // ── Emit one row per payment entry (handle multiple payments per student) ──
    // A payment is "claimed" if there is a follow-up log that:
    //   1. Was created AFTER (or on) the payment posting_date
    //   2. Has payment_received=1 or call_status="Already Paid"
    //   3. The amount_received matches (within ₹1 tolerance) OR amount_received is 0/null
    //      (some users don't fill amount when marking Already Paid)
    const rows: {
      student_id: string;
      student_name: string;
      branch: string;
      class_name: string;
      batch_name: string;
      total_dues: number;
      claim_status: "claimed" | "awaiting_claim";
      latest_followup: FollowUpLog | null;
      recent_payment: {
        name: string;
        posting_date: string;
        paid_amount: number;
        mode_of_payment: string;
      };
      // Which specific follow-up log claimed this payment (for display)
      claimed_by_log: FollowUpLog | null;
    }[] = [];

    for (const [studentId, payments] of allPaymentsByStudent) {
      const overdueStudent = overdueStudentMap.get(studentId);
      const logsForStudent = allLogsByStudent.get(studentId) ?? [];
      const latestLog = latestLogByStudent.get(studentId) ?? null;

      // BUG FIX: Removed hasOverdueContext gate.
      // Previously this blocked students who:
      //   (a) paid their dues (so no longer in overdueStudentMap), AND
      //   (b) were never called (logsForStudent.length === 0)
      // That’s exactly the students this page is meant to show.
      // We now show ANY student with a recent payment entry for this branch.

      for (const payment of payments) {
        const paidAmt = payment.paid_amount ?? 0;

        // PRIMARY: A payment is "claimed" if there is a follow-up log whose
        // invoice_ref exactly matches this Payment Entry's docname.
        // The "Claim Conversion" button explicitly sets invoice_ref = payment.name
        // so this link is unambiguous for all new claims.
        let claimingLog = logsForStudent.find(
          (log) => log.invoice_ref && log.invoice_ref.trim() === payment.name?.trim()
        ) ?? null;

        // FALLBACK (legacy claims): Before the invoice_ref system was introduced,
        // sales users claimed payments by marking "Payment Received" in the Fee
        // Overdue section. Those logs have no invoice_ref but can be identified by:
        //   1. payment_received = 1 (or call_status = "Already Paid")
        //   2. call_date >= payment posting_date (claimed on or after payment)
        //   3. amount_received roughly matches paid_amount (within ₹1, or 0/null)
        if (!claimingLog) {
          claimingLog = logsForStudent.find((log) => {
            const isPaymentLog =
              log.payment_received === 1 || log.call_status === "Already Paid";
            if (!isPaymentLog) return false;
            const logDate = log.call_date || log.creation?.slice(0, 10) || "";
            const paymentDate = payment.posting_date || "";
            if (logDate < paymentDate) return false; // must be on or after payment
            const amtReceived = log.amount_received ?? 0;
            const amtMatches =
              amtReceived === 0 || Math.abs(amtReceived - paidAmt) <= 1;
            return amtMatches;
          }) ?? null;
        }

        const isClaimed = claimingLog !== null;

        rows.push({
          student_id: studentId,
          student_name: overdueStudent?.student_name || latestLog?.student_name || payment.party_name || studentId,
          branch,
          class_name: overdueStudent?.class_name || "",
          batch_name: overdueStudent?.batch_name || "",
          total_dues: overdueStudent?.total_dues ?? 0,
          claim_status: isClaimed ? "claimed" : "awaiting_claim",
          latest_followup: latestLog,
          recent_payment: {
            name: payment.name,
            posting_date: payment.posting_date || "",
            paid_amount: paidAmt,
            mode_of_payment: payment.mode_of_payment || "",
          },
          claimed_by_log: claimingLog,
        });
      }
    }

    // Sort: awaiting_claim first, then by payment date desc
    rows.sort((a, b) => {
      if (a.claim_status !== b.claim_status) {
        return a.claim_status === "awaiting_claim" ? -1 : 1;
      }
      return b.recent_payment.posting_date.localeCompare(a.recent_payment.posting_date);
    });

    // Filter rows for Sales Users to prevent cross-user double-claiming:
    // 1. Keep if claim_status === "awaiting_claim" (can be claimed by this user).
    // 2. Keep if claim_status === "claimed" AND it was claimed by the current user (called_by matches session.email).
    // 3. Exclude if claimed by another user.
    let filteredRows = rows;
    if (roles.includes("Sales User") && session.email) {
      const emailLower = session.email.trim().toLowerCase();
      filteredRows = rows.filter((row) => {
        if (row.claim_status === "awaiting_claim") return true;
        return row.claimed_by_log?.called_by?.trim().toLowerCase() === emailLower;
      });
    }

    return NextResponse.json({ data: filteredRows });
  } catch (err) {
    console.error("[fees/recently-paid-claims] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch recently paid claims" },
      { status: 500 }
    );
  }
}
