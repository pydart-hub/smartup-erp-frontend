import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/delete-student
 *
 * Fully deletes a student and ALL related records from Frappe:
 *   1. Cancel + delete Payment Entries linked to the student's Customer
 *   2. Cancel + delete Sales Invoices linked to the student's Customer
 *   3. Cancel + delete Sales Orders linked to the student's Customer
 *   4. Remove student from all Student Groups
 *   5. Cancel + delete Student Attendance
 *   6. Cancel + delete Fees (Education module)
 *   7. Cancel + delete Course Enrollments
 *   8. Cancel + delete Program Enrollments
 *   9. Delete the Customer record
 *  10. Delete the Student document
 *
 * Body: { student_id: string }
 *
 * Requires Branch Manager role. Uses admin credentials for cascade deletion.
 */

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
};

function getSessionInfo(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    return {
      roles: (sessionData.roles || []) as string[],
      allowedCompanies: (sessionData.allowed_companies || []) as string[],
      defaultCompany: (sessionData.default_company || "") as string,
    };
  } catch {
    return null;
  }
}

// Helper: Frappe GET list
async function frappeGetList(
  doctype: string,
  filters: (string | number | string[])[][],
  fields: string[],
  limit = 500
) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { headers: ADMIN_HEADERS, cache: "no-store" }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

// Helper: Cancel a submitted doc (docstatus 1 → 2) using amend_cancel whitelisted method
async function frappeCancel(doctype: string, name: string): Promise<boolean> {
  const res = await fetch(
    `${FRAPPE_URL}/api/method/frappe.client.cancel`,
    {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ doctype, name }),
    }
  );
  return res.ok;
}

// Helper: Delete a doc
async function frappeDelete(doctype: string, name: string): Promise<boolean> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "DELETE", headers: ADMIN_HEADERS }
  );
  return res.ok;
}

// Helper: Update a doc
async function frappePut(
  doctype: string,
  name: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: ADMIN_HEADERS,
      body: JSON.stringify(data),
    }
  );
  return res.ok;
}

interface DeletionLog {
  step: string;
  detail: string;
  ok: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const session = getSessionInfo(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const isBranchManager =
      session.roles.includes("Branch Manager") || session.roles.includes("Administrator");
    if (!isBranchManager) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const studentId = body.student_id as string;
    if (!studentId) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }

    const log: DeletionLog[] = [];

    // ── 0. Fetch student to get customer link and validate branch access ──
    const studentRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
      { headers: ADMIN_HEADERS, cache: "no-store" }
    );
    if (!studentRes.ok) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const studentDoc = (await studentRes.json()).data;

    // Branch access check
    if (
      session.allowedCompanies.length > 0 &&
      studentDoc.custom_branch &&
      !session.allowedCompanies.includes(studentDoc.custom_branch)
    ) {
      return NextResponse.json(
        { error: "Access denied for this branch" },
        { status: 403 }
      );
    }

    const customerName = studentDoc.customer; // auto-linked Customer doctype name

    // ── 1. Cancel + delete Payment Entries linked to Sales Invoices ──
    if (customerName) {
      const payments: { name: string; docstatus: number }[] = await frappeGetList(
        "Payment Entry",
        [["party", "=", customerName], ["party_type", "=", "Customer"]],
        ["name", "docstatus"]
      );
      for (const pe of payments) {
        if (pe.docstatus === 1) {
          const cancelled = await frappeCancel("Payment Entry", pe.name);
          log.push({ step: "cancel_payment", detail: pe.name, ok: cancelled });
        }
        if (pe.docstatus !== 0) {
          // After cancel it's docstatus=2, need to delete
          const deleted = await frappeDelete("Payment Entry", pe.name);
          log.push({ step: "delete_payment", detail: pe.name, ok: deleted });
        } else {
          const deleted = await frappeDelete("Payment Entry", pe.name);
          log.push({ step: "delete_payment", detail: pe.name, ok: deleted });
        }
      }
    }

    // ── 2. Cancel + delete Sales Invoices ──
    if (customerName) {
      const invoices: { name: string; docstatus: number }[] = await frappeGetList(
        "Sales Invoice",
        [["customer", "=", customerName]],
        ["name", "docstatus"]
      );
      for (const inv of invoices) {
        if (inv.docstatus === 1) {
          const cancelled = await frappeCancel("Sales Invoice", inv.name);
          log.push({ step: "cancel_sinv", detail: inv.name, ok: cancelled });
        }
        const deleted = await frappeDelete("Sales Invoice", inv.name);
        log.push({ step: "delete_sinv", detail: inv.name, ok: deleted });
      }
    }

    // ── 3. Cancel + delete Sales Orders ──
    if (customerName) {
      const orders: { name: string; docstatus: number }[] = await frappeGetList(
        "Sales Order",
        [["customer", "=", customerName]],
        ["name", "docstatus"]
      );
      for (const so of orders) {
        if (so.docstatus === 1) {
          const cancelled = await frappeCancel("Sales Order", so.name);
          log.push({ step: "cancel_so", detail: so.name, ok: cancelled });
        }
        const deleted = await frappeDelete("Sales Order", so.name);
        log.push({ step: "delete_so", detail: so.name, ok: deleted });
      }
    }

    // ── 4. Remove student from all Student Groups ──
    const groups: { name: string }[] = await frappeGetList(
      "Student Group",
      [["Student Group Student", "student", "=", studentId]],
      ["name"]
    );
    for (const grp of groups) {
      // Fetch full group to get students child table
      const grpRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student Group/${encodeURIComponent(grp.name)}`,
        { headers: ADMIN_HEADERS, cache: "no-store" }
      );
      if (grpRes.ok) {
        const grpDoc = (await grpRes.json()).data;
        const filteredStudents = (grpDoc.students ?? []).filter(
          (s: { student: string }) => s.student !== studentId
        );
        const updated = await frappePut("Student Group", grp.name, {
          students: filteredStudents,
        });
        log.push({ step: "remove_from_group", detail: grp.name, ok: updated });
      }
    }

    // ── 5. Cancel + delete Student Attendance ──
    const attendanceRecords: { name: string; docstatus: number }[] =
      await frappeGetList(
        "Student Attendance",
        [["student", "=", studentId]],
        ["name", "docstatus"]
      );
    for (const att of attendanceRecords) {
      if (att.docstatus === 1) {
        const cancelled = await frappeCancel("Student Attendance", att.name);
        log.push({ step: "cancel_attendance", detail: att.name, ok: cancelled });
      }
      const deleted = await frappeDelete("Student Attendance", att.name);
      log.push({ step: "delete_attendance", detail: att.name, ok: deleted });
    }

    // ── 6. Cancel + delete Fees (Education module) ──
    const feesRecords: { name: string; docstatus: number }[] =
      await frappeGetList(
        "Fees",
        [["student", "=", studentId]],
        ["name", "docstatus"]
      );
    for (const fee of feesRecords) {
      if (fee.docstatus === 1) {
        const cancelled = await frappeCancel("Fees", fee.name);
        log.push({ step: "cancel_fee", detail: fee.name, ok: cancelled });
      }
      const deleted = await frappeDelete("Fees", fee.name);
      log.push({ step: "delete_fee", detail: fee.name, ok: deleted });
    }

    // ── 7. Cancel + delete Course Enrollments ──
    const courseEnrollments: { name: string; docstatus: number }[] =
      await frappeGetList(
        "Course Enrollment",
        [["student", "=", studentId]],
        ["name", "docstatus"]
      );
    for (const ce of courseEnrollments) {
      if (ce.docstatus === 1) {
        const cancelled = await frappeCancel("Course Enrollment", ce.name);
        log.push({ step: "cancel_ce", detail: ce.name, ok: cancelled });
      }
      const deleted = await frappeDelete("Course Enrollment", ce.name);
      log.push({ step: "delete_ce", detail: ce.name, ok: deleted });
    }

    // ── 8. Cancel + delete Program Enrollments ──
    const progEnrollments: { name: string; docstatus: number }[] =
      await frappeGetList(
        "Program Enrollment",
        [["student", "=", studentId]],
        ["name", "docstatus"]
      );
    for (const pe of progEnrollments) {
      if (pe.docstatus === 1) {
        const cancelled = await frappeCancel("Program Enrollment", pe.name);
        log.push({ step: "cancel_pe", detail: pe.name, ok: cancelled });
      }
      const deleted = await frappeDelete("Program Enrollment", pe.name);
      log.push({ step: "delete_pe", detail: pe.name, ok: deleted });
    }

    // ── 9. Delete the Customer (auto-linked) ──
    if (customerName) {
      const deleted = await frappeDelete("Customer", customerName);
      log.push({ step: "delete_customer", detail: customerName, ok: deleted });
    }

    // ── 10. Delete the Student document ──
    const studentDeleted = await frappeDelete("Student", studentId);
    log.push({ step: "delete_student", detail: studentId, ok: studentDeleted });

    const allOk = log.every((l) => l.ok);
    const failedSteps = log.filter((l) => !l.ok);

    return NextResponse.json(
      {
        success: allOk,
        message: allOk
          ? `Student ${studentId} and all related records deleted successfully.`
          : `Student deletion partially completed. ${failedSteps.length} step(s) failed.`,
        log,
        failed: failedSteps,
      },
      { status: allOk ? 200 : 207 }
    );
  } catch (err) {
    console.error("[delete-student] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
