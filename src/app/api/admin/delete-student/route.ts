import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/delete-student
 *
 * Fully deletes a student and ALL related records from Frappe:
 *
 *   1.  Cancel + force-delete Payment Entries  (party = Customer)
 *   2.  Cancel + force-delete Sales Invoices   (customer = Customer)
 *   3.  Cancel + force-delete Sales Orders     (customer = Customer)
 *   4.  Remove student rows from Student Groups
 *   5.  Cancel + force-delete Student Attendance
 *   6.  Cancel + force-delete Fees (Education module)
 *   7.  Cancel + force-delete Course Enrollments
 *   8.  Cancel + force-delete Program Enrollments
 *   9.  Force-delete Student  (unlinks Guardian + Customer refs)
 *  10.  Delete Guardian records (only if not shared with other students)
 *  11.  Delete Parent User      (guardian email — only if guardian deleted)
 *  12.  Delete Student User     (student email)
 *  13.  Force-delete Customer
 *
 * Body: { student_id: string }
 *
 * Requires Branch Manager / Administrator role.
 */

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
};

/* ── Session helper ─────────────────────────────────────────── */
function getSessionInfo(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString(),
    );
    return {
      roles: (sessionData.roles || []) as string[],
      allowedCompanies: (sessionData.allowed_companies || []) as string[],
    };
  } catch {
    return null;
  }
}

/* ── Frappe helpers ─────────────────────────────────────────── */

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

async function frappeCancel(doctype: string, name: string): Promise<boolean> {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.cancel`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ doctype, name }),
  });
  return res.ok;
}

/** Force-delete via frappe.client.delete — bypasses LinkExistsError */
async function frappeForceDelete(doctype: string, name: string): Promise<boolean> {
  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.delete`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ doctype, name }),
  });
  if (res.ok) return true;
  // Fallback to REST DELETE
  const res2 = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "DELETE", headers: ADMIN_HEADERS },
  );
  return res2.ok;
}

async function frappePut(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "PUT", headers: ADMIN_HEADERS, body: JSON.stringify(data) },
  );
  return res.ok;
}

/* ── Cancel-then-force-delete helper for submitted docs ─────── */
interface DeletionLog {
  step: string;
  detail: string;
  ok: boolean;
}

async function cancelAndDelete(
  doctype: string,
  name: string,
  docstatus: number,
  stepPrefix: string,
  log: DeletionLog[],
) {
  if (docstatus === 1) {
    const cancelled = await frappeCancel(doctype, name);
    log.push({ step: `cancel_${stepPrefix}`, detail: name, ok: cancelled });
    if (!cancelled) return; // don't try delete if cancel failed
  }
  const deleted = await frappeForceDelete(doctype, name);
  log.push({ step: `delete_${stepPrefix}`, detail: name, ok: deleted });
}

/* ── POST handler ───────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const session = getSessionInfo(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (
      !session.roles.includes("Branch Manager") &&
      !session.roles.includes("Administrator")
    ) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const studentId = body.student_id as string;
    if (!studentId) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }

    console.log(`[delete-student] Starting cascade delete for ${studentId}`);
    const log: DeletionLog[] = [];

    // ── 0. Fetch student doc ──
    const studentDoc = await frappeGetDoc("Student", studentId);
    if (!studentDoc) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Branch access check
    if (
      session.allowedCompanies.length > 0 &&
      studentDoc.custom_branch &&
      !session.allowedCompanies.includes(studentDoc.custom_branch as string)
    ) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const customerName = studentDoc.customer as string | undefined;
    const studentEmail = studentDoc.student_email_id as string | undefined;
    const studentUser = studentDoc.user as string | undefined;
    const guardianRows = (studentDoc.guardians ?? []) as {
      guardian?: string;
      guardian_name?: string;
    }[];

    // ── 1. Cancel + delete Payment Entries ──
    if (customerName) {
      const payments = (await frappeGetList(
        "Payment Entry",
        [["party", "=", customerName], ["party_type", "=", "Customer"]],
        ["name", "docstatus"],
      )) as { name: string; docstatus: number }[];
      for (const pe of payments) {
        await cancelAndDelete("Payment Entry", pe.name, pe.docstatus, "payment", log);
      }
    }

    // ── 2. Cancel + delete Sales Invoices ──
    if (customerName) {
      const invoices = (await frappeGetList(
        "Sales Invoice",
        [["customer", "=", customerName]],
        ["name", "docstatus"],
      )) as { name: string; docstatus: number }[];
      for (const inv of invoices) {
        await cancelAndDelete("Sales Invoice", inv.name, inv.docstatus, "sinv", log);
      }
    }

    // ── 3. Cancel + delete Sales Orders ──
    if (customerName) {
      const orders = (await frappeGetList(
        "Sales Order",
        [["customer", "=", customerName]],
        ["name", "docstatus"],
      )) as { name: string; docstatus: number }[];
      for (const so of orders) {
        await cancelAndDelete("Sales Order", so.name, so.docstatus, "so", log);
      }
    }

    // ── 4. Remove student from Student Groups ──
    const groups = (await frappeGetList(
      "Student Group",
      [["Student Group Student", "student", "=", studentId]],
      ["name"],
    )) as { name: string }[];
    for (const grp of groups) {
      const grpDoc = await frappeGetDoc("Student Group", grp.name);
      if (grpDoc) {
        const filtered = ((grpDoc.students ?? []) as { student: string }[]).filter(
          (s) => s.student !== studentId,
        );
        const ok = await frappePut("Student Group", grp.name, { students: filtered });
        log.push({ step: "remove_from_group", detail: grp.name, ok });
      }
    }

    // ── 5. Cancel + delete Student Attendance ──
    const attendance = (await frappeGetList(
      "Student Attendance",
      [["student", "=", studentId]],
      ["name", "docstatus"],
    )) as { name: string; docstatus: number }[];
    for (const att of attendance) {
      await cancelAndDelete("Student Attendance", att.name, att.docstatus, "attendance", log);
    }

    // ── 6. Cancel + delete Fees ──
    const fees = (await frappeGetList(
      "Fees",
      [["student", "=", studentId]],
      ["name", "docstatus"],
    )) as { name: string; docstatus: number }[];
    for (const fee of fees) {
      await cancelAndDelete("Fees", fee.name, fee.docstatus, "fee", log);
    }

    // ── 7. Cancel + delete Course Enrollments ──
    const courseEnr = (await frappeGetList(
      "Course Enrollment",
      [["student", "=", studentId]],
      ["name", "docstatus"],
    )) as { name: string; docstatus: number }[];
    for (const ce of courseEnr) {
      await cancelAndDelete("Course Enrollment", ce.name, ce.docstatus, "ce", log);
    }

    // ── 8. Cancel + delete Program Enrollments ──
    const progEnr = (await frappeGetList(
      "Program Enrollment",
      [["student", "=", studentId]],
      ["name", "docstatus"],
    )) as { name: string; docstatus: number }[];
    for (const pe of progEnr) {
      await cancelAndDelete("Program Enrollment", pe.name, pe.docstatus, "pe", log);
    }

    // ── 9. Delete Student FIRST (so Guardian + Customer are no longer linked) ──
    const studentDeleted = await frappeForceDelete("Student", studentId);
    log.push({ step: "delete_student", detail: studentId, ok: studentDeleted });

    // ── 10. Delete Guardians (only if not shared with other students) ──
    for (const row of guardianRows) {
      if (!row.guardian) continue;
      // Check if this guardian is linked to any OTHER student
      const otherStudents = await frappeGetList(
        "Student",
        [["Student Guardian", "guardian", "=", row.guardian]],
        ["name"],
        1,
      );
      if (otherStudents.length > 0) {
        log.push({
          step: "skip_guardian",
          detail: `${row.guardian} (shared with ${otherStudents[0].name})`,
          ok: true,
        });
        continue;
      }

      // Get guardian email before deleting (needed for step 11)
      const guardianDoc = await frappeGetDoc("Guardian", row.guardian);
      const guardianEmail = (guardianDoc?.email_address as string) || "";

      const deleted = await frappeForceDelete("Guardian", row.guardian);
      log.push({ step: "delete_guardian", detail: row.guardian, ok: deleted });

      // ── 11. Delete Parent User (the guardian's login account) ──
      if (deleted && guardianEmail) {
        // Check the user exists and isn't also an admin/staff
        const userDoc = await frappeGetDoc("User", guardianEmail);
        if (userDoc) {
          const userRoles = (userDoc.roles ?? []) as { role: string }[];
          const isOnlyParent =
            userRoles.length === 0 ||
            userRoles.every(
              (r) => r.role === "Parent" || r.role === "All" || r.role === "Desk User",
            );
          if (isOnlyParent) {
            const ok = await frappeForceDelete("User", guardianEmail);
            log.push({ step: "delete_parent_user", detail: guardianEmail, ok });
          } else {
            log.push({
              step: "skip_parent_user",
              detail: `${guardianEmail} (has staff roles)`,
              ok: true,
            });
          }
        }
      }
    }

    // ── 12. Delete Student User (student's own login if it exists) ──
    const userEmail = studentUser || studentEmail;
    if (userEmail) {
      const userDoc = await frappeGetDoc("User", userEmail);
      if (userDoc) {
        const userRoles = (userDoc.roles ?? []) as { role: string }[];
        const isOnlyStudent =
          userRoles.length === 0 ||
          userRoles.every(
            (r) => r.role === "Student" || r.role === "All" || r.role === "Desk User",
          );
        if (isOnlyStudent) {
          const ok = await frappeForceDelete("User", userEmail);
          log.push({ step: "delete_student_user", detail: userEmail, ok });
        } else {
          log.push({
            step: "skip_student_user",
            detail: `${userEmail} (has staff roles)`,
            ok: true,
          });
        }
      }
    }

    // ── 13. Delete Customer ──
    if (customerName) {
      const ok = await frappeForceDelete("Customer", customerName);
      log.push({ step: "delete_customer", detail: customerName, ok });
    }

    // ── Result ──
    const failedSteps = log.filter((l) => !l.ok);
    const allOk = failedSteps.length === 0;

    console.log(
      `[delete-student] ${studentId}: ${log.length} steps, ${failedSteps.length} failed`,
    );

    return NextResponse.json(
      {
        success: allOk,
        message: allOk
          ? `Student ${studentId} and all related records deleted successfully.`
          : `Student deletion partially completed. ${failedSteps.length} step(s) failed.`,
        log,
        failed: failedSteps,
      },
      { status: allOk ? 200 : 207 },
    );
  } catch (err) {
    console.error("[delete-student] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
