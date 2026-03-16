/**
 * POST /api/admin/discontinue-student
 *
 * Marks a student as discontinued and creates credit notes for all
 * outstanding (unpaid/partially-paid) Sales Invoices.
 *
 * This is a NON-DESTRUCTIVE operation:
 *   - No records are deleted
 *   - Original invoices remain intact
 *   - Credit notes (return invoices) zero out the outstanding amounts
 *   - Student.enabled = 0 with discontinuation metadata
 *   - Student is removed from all Student Group (batch) records
 *
 * Body: {
 *   student_id: string,
 *   reason: string,
 *   remarks?: string
 * }
 *
 * Requires Branch Manager / Administrator / Director role.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

/* ── Frappe helpers (server-side only) ───────────────────────── */

async function frappeGetList(
  doctype: string,
  filters: (string | number | string[])[][],
  fields: string[],
  limit = 500,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

async function frappeGetDoc(
  doctype: string,
  name: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { headers: ADMIN_HEADERS, cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()).data ?? null;
}

async function frappePut(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "PUT", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  if (res.ok) {
    const json = await res.json();
    return { ok: true, data: json.data };
  }
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: errText };
}

async function frappePost(
  doctype: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`,
    { method: "POST", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  if (res.ok) {
    const json = await res.json();
    return { ok: true, data: json.data };
  }
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: errText };
}

/* ── Main handler ──────────────────────────────────────────── */

interface StepLog {
  step: string;
  detail: string;
  ok: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { student_id, reason, remarks } = body as {
      student_id: string;
      reason: string;
      remarks?: string;
    };

    if (!student_id || !reason) {
      return NextResponse.json(
        { error: "student_id and reason are required" },
        { status: 400 },
      );
    }

    const log: StepLog[] = [];
    const creditNotes: string[] = [];
    let totalWrittenOff = 0;

    // ── Step 1: Fetch student ──
    const student = await frappeGetDoc("Student", student_id);
    if (!student) {
      return NextResponse.json(
        { error: `Student ${student_id} not found` },
        { status: 404 },
      );
    }

    if (student.enabled === 0) {
      return NextResponse.json(
        { error: "Student is already inactive/discontinued" },
        { status: 400 },
      );
    }

    const customerName = student.customer as string | undefined;
    log.push({ step: "fetch_student", detail: `Found ${student.student_name}`, ok: true });

    // ── Step 2: Find outstanding Sales Invoices ──
    let outstandingInvoices: Record<string, unknown>[] = [];
    if (customerName) {
      outstandingInvoices = await frappeGetList(
        "Sales Invoice",
        [
          ["customer", "=", customerName],
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
          ["is_return", "=", 0],
        ],
        ["name", "grand_total", "outstanding_amount", "posting_date", "due_date", "company"],
        100,
      );
    }
    log.push({
      step: "find_outstanding",
      detail: `Found ${outstandingInvoices.length} outstanding invoice(s)`,
      ok: true,
    });

    // ── Step 3: Create Credit Notes for each outstanding invoice ──
    for (const inv of outstandingInvoices) {
      const invName = inv.name as string;
      const outstanding = inv.outstanding_amount as number;

      if (outstanding <= 0) continue;

      // Fetch full invoice to get items
      const fullInv = await frappeGetDoc("Sales Invoice", invName);
      if (!fullInv) {
        log.push({ step: "credit_note", detail: `Could not fetch ${invName}`, ok: false });
        continue;
      }

      const items = (fullInv.items as Record<string, unknown>[]) ?? [];
      const firstItem = items[0] ?? {};

      // Create credit note (return invoice)
      // The credit note amount = outstanding_amount (not grand_total)
      // This way, already-paid amounts are preserved as revenue
      const creditNotePayload = {
        doctype: "Sales Invoice",
        customer: customerName,
        company: fullInv.company,
        posting_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        is_return: 1,
        return_against: invName,
        update_outstanding_for_self: 1,
        update_billed_amount_in_sales_order: 0,
        items: [
          {
            item_code: firstItem.item_code,
            item_name: firstItem.item_name,
            description: `Discontinued — ${reason}${remarks ? ` (${remarks})` : ""}`,
            qty: -1,
            rate: outstanding,
            amount: -outstanding,
            sales_order: firstItem.sales_order || undefined,
            so_detail: firstItem.so_detail || undefined,
          },
        ],
      };

      const createResult = await frappePost("Sales Invoice", creditNotePayload);
      if (!createResult.ok) {
        log.push({
          step: "credit_note",
          detail: `Failed to create credit note for ${invName}: ${createResult.error}`,
          ok: false,
        });
        continue;
      }

      const cnName = createResult.data?.name as string;

      // Submit the credit note
      const submitResult = await frappePut("Sales Invoice", cnName, { docstatus: 1 });
      if (!submitResult.ok) {
        log.push({
          step: "credit_note_submit",
          detail: `Created ${cnName} but submission failed: ${submitResult.error}`,
          ok: false,
        });
        continue;
      }

      creditNotes.push(cnName);
      totalWrittenOff += outstanding;
      log.push({
        step: "credit_note",
        detail: `Created & submitted ${cnName} for ₹${outstanding.toLocaleString("en-IN")} against ${invName}`,
        ok: true,
      });
    }

    // ── Step 4: Update Student — mark as discontinued ──
    const today = new Date().toISOString().split("T")[0];
    const studentUpdateResult = await frappePut("Student", student_id, {
      enabled: 0,
      custom_discontinuation_date: today,
      custom_discontinuation_reason: reason,
      custom_discontinuation_remarks: remarks || "",
    });

    log.push({
      step: "update_student",
      detail: studentUpdateResult.ok
        ? `Marked ${student_id} as discontinued`
        : `Failed to update student: ${studentUpdateResult.error}`,
      ok: studentUpdateResult.ok,
    });

    // ── Step 5: Remove from all Student Group (batch) records ──
    const studentBranch = (student.custom_branch as string) || "";
    const batchFilters: (string | number | string[])[][] = [
      ["group_based_on", "=", "Batch"],
    ];
    if (studentBranch) batchFilters.push(["custom_branch", "=", studentBranch]);

    const batches = await frappeGetList(
      "Student Group",
      batchFilters,
      ["name"],
      500,
    );

    for (const batch of batches) {
      const batchName = batch.name as string;
      const batchDoc = await frappeGetDoc("Student Group", batchName);
      if (!batchDoc) continue;

      const members = (batchDoc.students as { student: string }[]) ?? [];
      const hasMember = members.some((m) => m.student === student_id);
      if (!hasMember) continue;

      const filtered = members.filter((m) => m.student !== student_id);
      const batchUpdate = await frappePut("Student Group", batchName, {
        students: filtered,
      });
      log.push({
        step: "remove_from_batch",
        detail: batchUpdate.ok
          ? `Removed from batch ${batchName}`
          : `Failed to remove from batch ${batchName}: ${batchUpdate.error}`,
        ok: batchUpdate.ok,
      });
    }

    // ── Step 6: Cancel Program Enrollment (set to Cancelled) ──
    const enrollments = await frappeGetList(
      "Program Enrollment",
      [
        ["student", "=", student_id],
        ["docstatus", "=", 1],
      ],
      ["name"],
      10,
    );

    for (const enr of enrollments) {
      const enrName = enr.name as string;
      // Cancel the enrollment via frappe.client.cancel
      const cancelRes = await fetch(`${FRAPPE_URL}/api/method/frappe.client.cancel`, {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ doctype: "Program Enrollment", name: enrName }),
      });
      log.push({
        step: "cancel_enrollment",
        detail: cancelRes.ok
          ? `Cancelled ${enrName}`
          : `Failed to cancel ${enrName}`,
        ok: cancelRes.ok,
      });
    }

    // ── Summary ──
    const failed = log.filter((l) => !l.ok);
    const status = failed.length === 0 ? 200 : 207;

    return NextResponse.json(
      {
        success: failed.length === 0,
        message: `Student ${student.student_name} discontinued. ${creditNotes.length} credit note(s) created. ₹${totalWrittenOff.toLocaleString("en-IN")} written off.`,
        credit_notes: creditNotes,
        total_written_off: totalWrittenOff,
        log,
        ...(failed.length > 0 && { failed }),
      },
      { status },
    );
  } catch (err) {
    console.error("[discontinue-student] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
