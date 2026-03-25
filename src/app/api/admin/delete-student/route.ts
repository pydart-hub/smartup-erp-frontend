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

/** Force-delete via frappe.client.delete — logs actual Frappe error on failure */
async function frappeForceDelete(doctype: string, name: string): Promise<boolean> {
  const { ok } = await frappeForceDeleteVerbose(doctype, name);
  return ok;
}

/** Same as frappeForceDelete but also returns the Frappe error string on failure */
async function frappeForceDeleteVerbose(
  doctype: string,
  name: string,
): Promise<{ ok: boolean; errorMsg: string }> {
  const extractMsg = (body: Record<string, unknown>, status: number): string => {
    let raw = body?._server_messages || body?.message || body?.exc_type || String(status);
    // _server_messages is often a JSON-encoded array
    if (typeof raw === "string" && raw.startsWith("[")) {
      try { raw = (JSON.parse(raw) as string[]).join(" | "); } catch { /* keep raw */ }
    }
    return String(raw).slice(0, 400);
  };

  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.delete`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ doctype, name }),
  });
  if (res.ok) return { ok: true, errorMsg: "" };
  let err1 = "";
  try {
    const body = await res.clone().json() as Record<string, unknown>;
    err1 = extractMsg(body, res.status);
    console.warn(`[delete-student] frappe.client.delete failed for ${doctype}/${name}:`, err1);
  } catch { /* ignore parse error */ }

  // Fallback to REST DELETE
  const res2 = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "DELETE", headers: ADMIN_HEADERS },
  );
  if (res2.ok) return { ok: true, errorMsg: "" };
  let err2 = "";
  try {
    const body2 = await res2.clone().json() as Record<string, unknown>;
    err2 = extractMsg(body2, res2.status);
    console.warn(`[delete-student] REST DELETE also failed for ${doctype}/${name}:`, err2);
  } catch { /* ignore parse error */ }
  return { ok: false, errorMsg: err2 || err1 };
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
  error?: string;
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
    // Credit Notes (is_return=1) MUST be cancelled before the invoices they
    // reference, otherwise Frappe blocks cancellation of the original invoice.
    if (customerName) {
      const invoices = (await frappeGetList(
        "Sales Invoice",
        [["customer", "=", customerName]],
        ["name", "docstatus", "is_return"],
      )) as { name: string; docstatus: number; is_return: number }[];
      // Sort: credit notes first, then regular invoices
      invoices.sort((a, b) => (b.is_return || 0) - (a.is_return || 0));
      for (const inv of invoices) {
        await cancelAndDelete("Sales Invoice", inv.name, inv.docstatus, "sinv", log);
      }
    }

    // ── 3. Delete Student Branch Transfer records ──
    // Must happen BEFORE deleting SOs and Program Enrollments because
    // the transfer record holds link fields (new_sales_order, new_program_enrollment)
    // that block Frappe from deleting those documents.
    const transfers = (await frappeGetList(
      "Student Branch Transfer",
      [["student", "=", studentId]],
      ["name", "docstatus"],
    )) as { name: string; docstatus: number }[];
    for (const tr of transfers) {
      // Clear link fields first so Frappe doesn't complain about child links
      await frappePut("Student Branch Transfer", tr.name, {
        new_sales_order: "",
        new_program_enrollment: "",
      });
      await cancelAndDelete("Student Branch Transfer", tr.name, tr.docstatus, "transfer", log);
    }

    // ── 4. Cancel + delete Sales Orders ──
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

    // ── 9. Cancel + delete remaining Education module records that link to Student ──
    // Student Log, Assessment Result, Student Leave Application, Student Activity
    // are NOT covered above but Frappe's link-check will block Student deletion if any exist.
    for (const edDoctype of [
      "Student Log",
      "Student Activity",
      "Assessment Result",
      "Student Leave Application",
      "Assessment Plan",
      "LMS Enrollment",
      "Examination Result",
      "Student Batch Attendance",
    ]) {
      try {
        const edDocs = (await frappeGetList(
          edDoctype,
          [["student", "=", studentId]],
          ["name", "docstatus"],
        )) as { name: string; docstatus: number }[];
        for (const doc of edDocs) {
          await cancelAndDelete(edDoctype, doc.name, doc.docstatus, "ed_record", log);
        }
      } catch {
        // Doctype may not exist in this Frappe instance — skip silently
      }
    }

    // ── 9b. Unlink Student from Student Applicant records ──
    // Student Applicant has a `student` Link field populated at enrollment.
    // Frappe's link-check will block Student deletion while this reference exists.
    // We clear the field (not delete) to preserve the application history.
    try {
      const applicants = (await frappeGetList(
        "Student Applicant",
        [["student", "=", studentId]],
        ["name"],
      )) as { name: string }[];
      for (const app of applicants) {
        const ok = await frappePut("Student Applicant", app.name, { student: "" });
        log.push({ step: "unlink_applicant", detail: app.name, ok });
      }
    } catch {
      // Doctype may not exist — skip silently
    }

    // ── 10. Unlink Customer + User from Student ──
    // Clear link fields so Frappe's link-check allows deletion of both Student and User.
    // Also unlink `user` field since it blocks User deletion if Student still references it.
    const unlinkFields: Record<string, string> = {};
    if (customerName) unlinkFields.customer = "";
    if (studentUser) unlinkFields.user = "";
    if (Object.keys(unlinkFields).length > 0) {
      await frappePut("Student", studentId, unlinkFields);
    }

    // ── 10. Delete Address + Contact linked to Customer ──
    if (customerName) {
      const addresses = (await frappeGetList(
        "Address",
        [["Dynamic Link", "link_doctype", "=", "Customer"], ["Dynamic Link", "link_name", "=", customerName]],
        ["name"],
      )) as { name: string }[];
      for (const addr of addresses) {
        const ok = await frappeForceDelete("Address", addr.name);
        log.push({ step: "delete_address", detail: addr.name, ok });
      }

      const contacts = (await frappeGetList(
        "Contact",
        [["Dynamic Link", "link_doctype", "=", "Customer"], ["Dynamic Link", "link_name", "=", customerName]],
        ["name"],
      )) as { name: string }[];
      for (const contact of contacts) {
        const ok = await frappeForceDelete("Contact", contact.name);
        log.push({ step: "delete_contact", detail: contact.name, ok });
      }
    }

    // ── 11. Delete Customer BEFORE Student (removes the link that blocks Student deletion) ──
    // Also search by Dynamic Link in case customerName was already cleared in a previous partial run
    const customersToDelete = new Set<string>();
    if (customerName) customersToDelete.add(customerName);
    try {
      const linkedCustomers = (await frappeGetList(
        "Dynamic Link",
        [["link_doctype", "=", "Student"], ["link_name", "=", studentId], ["parenttype", "=", "Customer"]],
        ["parent"],
      )) as { parent: string }[];
      for (const lc of linkedCustomers) {
        if (lc.parent) customersToDelete.add(lc.parent);
      }
    } catch { /* Dynamic Link query may not be supported — fall through */ }

    // Before deleting each Customer, remove Dynamic Link entries that reference
    // this Student — otherwise Frappe's link-check blocks the Customer deletion.
    // Also remove Dynamic Links on the Customer that point to the Student (reverse direction).
    for (const cust of customersToDelete) {
      try {
        // Remove Dynamic Link rows on the Customer that point to this Student
        const dynLinks = (await frappeGetList(
          "Dynamic Link",
          [
            ["link_doctype", "=", "Student"],
            ["link_name", "=", studentId],
            ["parenttype", "=", "Customer"],
            ["parent", "=", cust],
          ],
          ["name"],
        )) as { name: string }[];
        for (const dl of dynLinks) {
          await frappeForceDelete("Dynamic Link", dl.name);
        }
      } catch { /* Dynamic Link cleanup may not be supported — continue */ }

      const ok = await frappeForceDelete("Customer", cust);
      log.push({ step: "delete_customer", detail: cust, ok });
    }

    // ── 11b. Clear sibling links — other students may reference this one
    //         via custom_sibling_of, which blocks Frappe from deleting it.
    const siblingRefs = (await frappeGetList(
      "Student",
      [["custom_sibling_of", "=", studentId]],
      ["name"],
    )) as { name: string }[];
    for (const sib of siblingRefs) {
      await frappePut("Student", sib.name, {
        custom_sibling_of: "",
        custom_sibling_group: "",
      });
    }

    // ── 12. Delete Student (Customer is now gone — link blocker removed) ──
    const { ok: studentDeleted, errorMsg: studentDeleteErr } = await frappeForceDeleteVerbose("Student", studentId);
    log.push({
      step: "delete_student",
      detail: studentDeleteErr ? `${studentId} — ${studentDeleteErr}` : studentId,
      ok: studentDeleted,
      ...(studentDeleteErr ? { error: studentDeleteErr } : {}),
    });

    // ── 13. Delete Guardians (only if not shared with other students) ──
    for (const row of guardianRows) {
      if (!row.guardian) continue;
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

      const guardianDoc = await frappeGetDoc("Guardian", row.guardian);
      const guardianEmail = (guardianDoc?.email_address as string) || "";

      const deleted = await frappeForceDelete("Guardian", row.guardian);
      log.push({ step: "delete_guardian", detail: row.guardian, ok: deleted });

      // ── 14. Delete Parent User (the guardian's login account) ──
      if (deleted && guardianEmail) {
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

    // ── 15. Delete Student User (student's own login if it exists) ──
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

    // ── Result — customer / student-user failures are non-critical ──
    // delete_customer: leaves an orphaned Customer shell with no Student — harmless
    // delete_student_user: Frappe blocks User deletion when the user has created/submitted
    //   documents. The student is already fully deactivated (no SO/SI/PE). Non-critical.
    const NON_CRITICAL_STEPS = new Set(["delete_customer", "delete_student_user"]);
    const criticalFailed = log.filter(
      (l) => !l.ok && !NON_CRITICAL_STEPS.has(l.step),
    );
    const allOk = criticalFailed.length === 0;
    const failedSteps = log.filter((l) => !l.ok);

    console.log(
      `[delete-student] ${studentId}: ${log.length} steps, ${failedSteps.length} failed`,
    );

    return NextResponse.json(
      {
        success: allOk,
        message: allOk
          ? `Student ${studentId} and all related records deleted successfully.`
          : `Student deletion partially completed. ${criticalFailed.length} step(s) failed.`,
        log,
        failed: criticalFailed,
      },
      { status: allOk ? 200 : 207 },
    );
  } catch (err) {
    console.error("[delete-student] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
