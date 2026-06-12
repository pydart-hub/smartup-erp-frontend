/**
 * POST /api/admin/discontinue-student
 *
 * Marks a student as discontinued while keeping existing invoices intact.
 *
 * This is a non-destructive operation:
 *   - No records are deleted
 *   - Original invoices remain intact
 *   - No credit notes are created
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

const FRAPPE_FETCH_TIMEOUT_MS = 20000;
const FRAPPE_FETCH_RETRIES = 2;

function summarizeFrappeError(raw: string | undefined): string {
  const text = (raw ?? "").trim();
  if (!text) return "Unknown error";

  const validationMatch = text.match(/ValidationError:\s*([^,\n]+(?:cannot be [^,\n]+)?)/i);
  if (validationMatch?.[1]) {
    return validationMatch[1].replace(/\\"/g, "\"").trim();
  }

  const messageMatch = text.match(/"message"\s*:\s*"([^"]+)"/i);
  if (messageMatch?.[1]) {
    return messageMatch[1].replace(/\\"/g, "\"").trim();
  }

  const serverMessageMatch = text.match(/"_server_messages"\s*:\s*"([^"]+)"/i);
  if (serverMessageMatch?.[1]) {
    return serverMessageMatch[1].replace(/\\"/g, "\"").trim();
  }

  return text.slice(0, 220);
}

async function frappeFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= FRAPPE_FETCH_RETRIES; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(FRAPPE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt === FRAPPE_FETCH_RETRIES) break;
    }
  }

  throw lastError;
}

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
  const res = await frappeFetch(
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
  const res = await frappeFetch(
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
  const res = await frappeFetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "PUT", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  if (res.ok) {
    const json = await res.json();
    return { ok: true, data: json.data };
  }
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: summarizeFrappeError(errText) };
}

async function frappeSetValue(
  doctype: string,
  name: string,
  fieldname: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await frappeFetch(
    `${FRAPPE_URL}/api/method/frappe.client.set_value`,
    {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        doctype,
        name,
        fieldname,
      }),
    },
  );
  if (res.ok) return { ok: true };
  const errText = await res.text().catch(() => "Unknown error");
  return { ok: false, error: summarizeFrappeError(errText) };
}

async function frappeCancelByDocstatus(
  doctype: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await frappePut(doctype, name, { docstatus: 2 });
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error };
}

interface StepLog {
  step: string;
  detail: string;
  ok: boolean;
}

const NON_CRITICAL_STEPS = new Set(["remove_from_batch", "cancel_enrollment"]);

export async function POST(request: NextRequest) {
  try {
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

    const studentName = String(student.student_name ?? student_id);
    log.push({ step: "fetch_student", detail: `Found ${studentName}`, ok: true });

    let outstandingInvoices: Record<string, unknown>[] = [];
    if (student.customer) {
      outstandingInvoices = await frappeGetList(
        "Sales Invoice",
        [
          ["customer", "=", String(student.customer)],
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

    const today = new Date().toISOString().split("T")[0];
    const studentEnabledResult = await frappePut("Student", student_id, {
      enabled: 0,
    });
    const studentMetaResult = studentEnabledResult.ok
      ? await frappeSetValue("Student", student_id, {
          custom_discontinuation_date: today,
          custom_discontinuation_reason: reason,
          custom_discontinuation_remarks: remarks || "",
        })
      : { ok: false, error: studentEnabledResult.error };
    const studentUpdateResult = studentEnabledResult.ok && studentMetaResult.ok
      ? { ok: true as const }
      : {
          ok: false as const,
          error: [
            !studentEnabledResult.ok ? `enabled update failed: ${studentEnabledResult.error}` : null,
            !studentMetaResult.ok ? `metadata update failed: ${studentMetaResult.error}` : null,
          ].filter(Boolean).join(" | "),
        };

    log.push({
      step: "update_student",
      detail: studentUpdateResult.ok
        ? `Marked ${student_id} as discontinued`
        : `Failed to update student: ${studentUpdateResult.error}`,
      ok: studentUpdateResult.ok,
    });

    const studentBranch = String(student.custom_branch ?? "");
    const batchFilters: (string | number | string[])[][] = [
      ["group_based_on", "=", "Batch"],
    ];
    if (studentBranch) batchFilters.push(["custom_branch", "=", studentBranch]);

    const batches = await frappeGetList("Student Group", batchFilters, ["name"], 500);

    for (const batch of batches) {
      const batchName = String(batch.name ?? "");
      if (!batchName) continue;

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
      const enrName = String(enr.name ?? "");
      if (!enrName) continue;

      const cancelRes = await frappeCancelByDocstatus("Program Enrollment", enrName);
      log.push({
        step: "cancel_enrollment",
        detail: cancelRes.ok
          ? `Cancelled ${enrName}`
          : `Failed to cancel ${enrName}: ${cancelRes.error ?? "Unknown error"}`,
        ok: cancelRes.ok,
      });
    }

    const failed = log.filter((l) => !l.ok);
    const criticalFailed = failed.filter((l) => !NON_CRITICAL_STEPS.has(l.step));
    const cleanupFailed = failed.filter((l) => NON_CRITICAL_STEPS.has(l.step));
    const success = criticalFailed.length === 0;
    const status = success ? 200 : 207;
    const message = success
      ? cleanupFailed.length === 0
        ? `Student ${studentName} discontinued. ${outstandingInvoices.length} invoice(s) remain unchanged.`
        : `Student ${studentName} discontinued. ${outstandingInvoices.length} invoice(s) remain unchanged. ${cleanupFailed.length} cleanup step(s) need attention.`
      : `Student ${studentName} discontinuation partially completed. ${criticalFailed.length} critical step(s) failed.`;

    return NextResponse.json(
      {
        success,
        message,
        credit_notes: [],
        total_written_off: 0,
        log,
        ...(criticalFailed.length > 0 && { failed: criticalFailed }),
        ...(cleanupFailed.length > 0 && { cleanup_failed: cleanupFailed }),
      },
      { status },
    );
  } catch (err) {
    console.error("[discontinue-student] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
