/**
 * POST /api/admission/convert-to-regular
 *
 * Converts a Demo student to a Regular (Fresher) student.
 *
 * Steps:
 *   1. Verify student is a Demo type
 *   2. Resolve paid amount from existing demo invoices (grand_total - outstanding_amount)
 *   3. Build regular instalment schedule from fee config XLSX (same as normal admission)
 *   4. Apply demo-paid credit to last invoice(s) backwards
 *   5. Create new Sales Order with correct qty/rate for the regular plan
 *   6. Create new Sales Invoices with adjusted amounts
 *   7. Update Program Enrollment fields (plan, instalments, fee structure, clear Demo category)
 *   8. Update Student record (custom_student_type = "Fresher")
 *
 * Body:
 *   studentId          — EDU-STU-YYYY-NNNNN
 *   plan               — "Basic" | "Intermediate" | "Advanced"
 *   instalments        — 1 | 4 | 6 | 8
 *   feeConfigEntry     — the FeeConfigEntry from /api/fee-config (pre-fetched on client)
 *   feeStructureName   — resolved Fee Structure name to store on PE (optional)
 *   academicYear       — e.g. "2026-2027"
 *   enrollmentDate     — ISO date string, used as the due-date anchor for all instalment options
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { generateInstalmentSchedule } from "@/lib/utils/feeSchedule";
import type { FeeConfigEntry, InstalmentEntry } from "@/lib/types/fee";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

// ── Frappe helpers ────────────────────────────────────────────────────────────

async function fetchRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      const isRetryable =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_SOCKET" ||
        (err as { cause?: { code?: string } })?.cause?.code === "UND_ERR_SOCKET";
      if (!isRetryable || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

async function frappeGet(path: string) {
  const res = await fetchRetry(`${FRAPPE_URL}/api${path}`, { headers: authHeaders });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Frappe GET ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()).data;
}

async function frappePost(path: string, body: unknown) {
  const res = await fetchRetry(`${FRAPPE_URL}/api${path}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Frappe POST ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()).data;
}

async function frappePut(path: string, body: unknown) {
  const res = await fetchRetry(`${FRAPPE_URL}/api${path}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Frappe PUT ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()).data;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function extractGuardianIds(studentDoc: Record<string, unknown>): string[] {
  const guardianRows = Array.isArray(studentDoc.guardians)
    ? studentDoc.guardians as Array<{ guardian?: unknown }>
    : [];

  return guardianRows
    .map((row) => asNonEmptyString(row.guardian))
    .filter((value): value is string => Boolean(value));
}

async function getGuardianSignatures(guardianIds: string[]): Promise<string[]> {
  const signatures = new Set<string>();

  for (const guardianId of guardianIds) {
    try {
      const guardianDoc = await frappeGet(`/resource/Guardian/${encodeURIComponent(guardianId)}`);
      const guardianName = asNonEmptyString(guardianDoc?.guardian_name)?.toLowerCase();
      const emailAddress = asNonEmptyString(guardianDoc?.email_address)?.toLowerCase();
      const mobileNumber = asNonEmptyString(guardianDoc?.mobile_number);
      const alternateNumber = asNonEmptyString(guardianDoc?.alternate_number);

      const signatureParts = [guardianName, emailAddress, mobileNumber, alternateNumber].filter(Boolean);
      if (signatureParts.length > 0) {
        signatures.add(signatureParts.join("|"));
      }
    } catch {
      // Ignore one bad guardian doc and continue.
    }
  }

  return Array.from(signatures);
}

async function resolveSiblingByGuardian(
  studentId: string,
  branch: string | undefined,
  guardianIds: string[],
): Promise<string | undefined> {
  if (!branch || guardianIds.length === 0) return undefined;

  const sourceGuardianSignatures = await getGuardianSignatures(guardianIds);

  for (const guardianId of guardianIds) {
    try {
      const guardianDoc = await frappeGet(`/resource/Guardian/${encodeURIComponent(guardianId)}`);
      const linkedStudents = Array.isArray(guardianDoc?.students)
        ? guardianDoc.students as Array<{ student?: unknown; student_name?: unknown }>
        : [];

      const guardianLinkedStudentId = linkedStudents
        .map((row) => asNonEmptyString(row.student) ?? asNonEmptyString(row.student_name))
        .find((value) => value && value !== studentId);

      if (guardianLinkedStudentId) return guardianLinkedStudentId;
    } catch {
      // Non-fatal. Fall back to branch scan below.
    }
  }

  const branchStudentFilters = encodeURIComponent(
    JSON.stringify([
      ["custom_branch", "=", branch],
      ["enabled", "=", 1],
      ["name", "!=", studentId],
    ]),
  );
  const branchStudentFields = encodeURIComponent(JSON.stringify(["name"]));
  const branchStudents = await frappeGet(
    `/resource/Student?filters=${branchStudentFilters}&fields=${branchStudentFields}&order_by=creation+asc&limit_page_length=500`,
  );

  for (const candidate of branchStudents ?? []) {
    const candidateId = asNonEmptyString(candidate?.name);
    if (!candidateId) continue;

    try {
      const candidateDoc = await frappeGet(`/resource/Student/${encodeURIComponent(candidateId)}`);
      const candidateGuardianIds = extractGuardianIds(candidateDoc);
      if (candidateGuardianIds.some((guardianId) => guardianIds.includes(guardianId))) {
        return candidateId;
      }

      if (sourceGuardianSignatures.length > 0) {
        const candidateGuardianSignatures = await getGuardianSignatures(candidateGuardianIds);
        if (candidateGuardianSignatures.some((signature) => sourceGuardianSignatures.includes(signature))) {
          return candidateId;
        }
      }
    } catch {
      // Ignore a single bad candidate and continue scanning.
    }
  }

  return undefined;
}

/**
 * Apply a credit amount backwards (last invoice → second last → ...).
 * Modifies a copy of the schedule — never mutates in place.
 */
function applyCreditToSchedule(
  schedule: InstalmentEntry[],
  creditAmount: number,
  remark: string,
): InstalmentEntry[] {
  if (creditAmount <= 0) return schedule;
  let remaining = creditAmount;
  const result = schedule.map((s) => ({ ...s }));

  for (let i = result.length - 1; i >= 0 && remaining > 0; i--) {
    const applied = Math.min(result[i].amount, remaining);
    if (applied <= 0) continue;
    result[i] = {
      ...result[i],
      amount: result[i].amount - applied,
      discountApplied: (result[i].discountApplied ?? 0) + applied,
      discountRemark: result[i].discountRemark
        ? `${result[i].discountRemark}; ${remark}`
        : remark,
    };
    remaining -= applied;
  }

  return result;
}

function applySiblingDiscountToSchedule(
  schedule: InstalmentEntry[],
  totalAmount: number,
  rate: number,
  remark: string,
): { schedule: InstalmentEntry[]; discountAmount: number } {
  if (!schedule.length || totalAmount <= 0 || rate <= 0) {
    return { schedule, discountAmount: 0 };
  }

  const discountAmount = Math.round(totalAmount * rate);
  if (discountAmount <= 0) {
    return { schedule, discountAmount: 0 };
  }

  let remaining = Math.min(discountAmount, totalAmount);
  const updated = schedule.map((entry) => ({ ...entry }));

  for (let index = updated.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const entry = updated[index];
    const applied = Math.min(entry.amount, remaining);
    if (applied <= 0) continue;

    updated[index] = {
      ...entry,
      amount: entry.amount - applied,
      discountApplied: (entry.discountApplied ?? 0) + applied,
      discountRemark: entry.discountRemark
        ? `${entry.discountRemark}; ${remark}`
        : remark,
    };
    remaining -= applied;
  }

  return { schedule: updated, discountAmount };
}

// ── Tuition fee item lookup (same logic as getTuitionFeeItem in sales.ts) ─────

async function getTuitionItemCode(program: string): Promise<string | null> {
  const fields = encodeURIComponent(
    JSON.stringify(["name", "item_code", "item_name", "item_group", "standard_rate", "stock_uom"]),
  );

  // 1) Exact item code match: "{program} Tuition Fee"
  const exactFilters = encodeURIComponent(
    JSON.stringify([
      ["item_code", "=", `${program} Tuition Fee`],
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
  );
  const exactItems = await frappeGet(
    `/resource/Item?filters=${exactFilters}&fields=${fields}&limit_page_length=1`,
  );
  if (exactItems?.length) return exactItems[0].item_code;

  // 2) Wildcard by program prefix
  const likeFilters = encodeURIComponent(
    JSON.stringify([
      ["item_code", "like", `${program}%Tuition Fee`],
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
  );
  const likeItems = await frappeGet(
    `/resource/Item?filters=${likeFilters}&fields=${fields}&limit_page_length=10`,
  );
  if (likeItems?.length) return likeItems[0].item_code;

  // 3) Fallback via Program abbreviation
  try {
    const prog = await frappeGet(
      `/resource/Program/${encodeURIComponent(program)}?fields=["name","program_abbreviation"]`,
    );
    const rawAbbr: string | undefined = prog?.program_abbreviation;
    if (rawAbbr) {
      const abbr = rawAbbr.replace(/\b1-1\b/g, "1 to 1").replace(/\b1-M\b/g, "1 to M");
      const abbrFilters = encodeURIComponent(
        JSON.stringify([
          ["item_code", "like", `${abbr}%Tuition Fee`],
          ["is_sales_item", "=", 1],
          ["disabled", "=", 0],
        ]),
      );
      const abbrItems = await frappeGet(
        `/resource/Item?filters=${abbrFilters}&fields=${fields}&limit_page_length=10`,
      );
      if (abbrItems?.length) {
        const exactAbbr = abbrItems.find((row: { item_code: string }) => row.item_code === `${abbr} Tuition Fee`);
        return (exactAbbr ?? abbrItems[0]).item_code;
      }
    }
  } catch {
    // No-op: keep null if fallback lookup fails.
  }

  // 4) Broad fallback for non-standard item_code naming
  try {
    const broadFilters = encodeURIComponent(
      JSON.stringify([
        ["item_group", "=", "Tuition Fee"],
        ["item_name", "like", `%${program}%`],
        ["is_sales_item", "=", 1],
        ["disabled", "=", 0],
      ]),
    );
    const broadItems = await frappeGet(
      `/resource/Item?filters=${broadFilters}&fields=${fields}&limit_page_length=10`,
    );
    if (broadItems?.length) return broadItems[0].item_code;
  } catch {
    // No-op: keep null if broad lookup fails.
  }

  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = requireRole(request, STAFF_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json() as {
    studentId: string;
    plan: string;
    instalments: number;
    feeConfigEntry: FeeConfigEntry;
    feeStructureName?: string;
    academicYear: string;
    enrollmentDate?: string;
    useSiblingOffer?: boolean;
    siblingStudentId?: string;
    siblingGroup?: string;
  };

  const {
    studentId,
    plan,
    instalments,
    feeConfigEntry,
    feeStructureName,
    academicYear,
    enrollmentDate,
    useSiblingOffer,
    siblingStudentId,
    siblingGroup,
  } = body;

  if (!studentId || !plan || !instalments || !feeConfigEntry || !academicYear) {
    return NextResponse.json(
      { error: "studentId, plan, instalments, feeConfigEntry, and academicYear are required" },
      { status: 400 },
    );
  }

  const log: string[] = [];

  try {
    // ── 1. Fetch student ───────────────────────────────────────────────────────
    const student = await frappeGet(`/resource/Student/${encodeURIComponent(studentId)}`);

    if (student.custom_student_type !== "Demo") {
      return NextResponse.json({ error: "Student is not a Demo student" }, { status: 400 });
    }

    const customerName: string = student.customer;
    if (!customerName) {
      return NextResponse.json({ error: "Student has no linked Customer" }, { status: 400 });
    }
    log.push(`Student: ${studentId}, Customer: ${customerName}`);

    const siblingOfferEnabled = Boolean(useSiblingOffer || siblingStudentId?.trim());
    let effectiveSiblingStudentId = asNonEmptyString(siblingStudentId);

    if (siblingOfferEnabled && !effectiveSiblingStudentId) {
      const linkedSibling = asNonEmptyString(student.custom_sibling_of);
      if (linkedSibling && linkedSibling !== studentId) {
        effectiveSiblingStudentId = linkedSibling;
      }
    }

    if (siblingOfferEnabled && !effectiveSiblingStudentId) {
      const linkedGroup = asNonEmptyString(student.custom_sibling_group) ?? asNonEmptyString(siblingGroup);
      if (linkedGroup) {
        const siblingFilters = encodeURIComponent(
          JSON.stringify([
            ["custom_sibling_group", "=", linkedGroup],
            ["enabled", "=", 1],
            ["name", "!=", studentId],
          ]),
        );
        const siblingFields = encodeURIComponent(
          JSON.stringify(["name", "enabled", "custom_branch", "custom_sibling_group"]),
        );
        const linkedSiblings = await frappeGet(
          `/resource/Student?filters=${siblingFilters}&fields=${siblingFields}&limit_page_length=1`,
        );
        if (linkedSiblings?.length) {
          effectiveSiblingStudentId = linkedSiblings[0].name;
        }
      }
    }

    if (siblingOfferEnabled && !effectiveSiblingStudentId) {
      const parentName = asNonEmptyString(student.custom_parent_name);
      if (parentName && student.custom_branch) {
        const parentSiblingFilters = encodeURIComponent(
          JSON.stringify([
            ["custom_parent_name", "=", parentName],
            ["custom_branch", "=", student.custom_branch],
            ["enabled", "=", 1],
            ["name", "!=", studentId],
          ]),
        );
        const parentSiblingFields = encodeURIComponent(
          JSON.stringify(["name", "enabled", "custom_branch", "custom_parent_name"]),
        );
        const parentMatchedSiblings = await frappeGet(
          `/resource/Student?filters=${parentSiblingFilters}&fields=${parentSiblingFields}&order_by=creation+asc&limit_page_length=1`,
        );
        if (parentMatchedSiblings?.length) {
          effectiveSiblingStudentId = parentMatchedSiblings[0].name;
          log.push(`Sibling auto-resolved by parent name: ${effectiveSiblingStudentId}`);
        }
      }
    }

    if (siblingOfferEnabled && !effectiveSiblingStudentId) {
      const guardianSiblingId = await resolveSiblingByGuardian(
        studentId,
        asNonEmptyString(student.custom_branch),
        extractGuardianIds(student),
      );
      if (guardianSiblingId) {
        effectiveSiblingStudentId = guardianSiblingId;
        log.push(`Sibling auto-resolved by guardian link: ${effectiveSiblingStudentId}`);
      }
    }

    if (siblingOfferEnabled && !effectiveSiblingStudentId) {
      log.push("Sibling link not resolved; applying sibling offer by toggle-only mode.");
    }

    let siblingStudent: Record<string, unknown> | null = null;
    if (effectiveSiblingStudentId) {
      if (effectiveSiblingStudentId === studentId) {
        return NextResponse.json({ error: "Sibling student cannot be the same student" }, { status: 400 });
      }

      siblingStudent = await frappeGet(`/resource/Student/${encodeURIComponent(effectiveSiblingStudentId)}`);
      if (!siblingStudent) {
        return NextResponse.json({ error: "Selected sibling not found" }, { status: 404 });
      }
      if (siblingStudent.enabled !== 1) {
        return NextResponse.json({ error: "Selected sibling is not active" }, { status: 400 });
      }
      if (siblingStudent.custom_branch !== student.custom_branch) {
        return NextResponse.json({ error: "Sibling offer requires both students to be in the same branch" }, { status: 400 });
      }
      log.push(`Sibling selected: ${String(effectiveSiblingStudentId)}`);
    }

    // ── 2. Fetch latest Program Enrollment ────────────────────────────────────
    const peFilters = encodeURIComponent(
      JSON.stringify([["student", "=", studentId], ["docstatus", "!=", 2]]),
    );
    const peFields = encodeURIComponent(
      JSON.stringify(["name", "program", "academic_year", "docstatus"]),
    );
    const peList = await frappeGet(
      `/resource/Program Enrollment?filters=${peFilters}&fields=${peFields}&order_by=creation+desc&limit_page_length=1`,
    );
    const enrollment = peList?.[0];
    if (!enrollment) {
      return NextResponse.json({ error: "No Program Enrollment found for student" }, { status: 400 });
    }
    const peDocstatus: number = enrollment.docstatus ?? 0;
    log.push(`Enrollment: ${enrollment.name}, docstatus: ${peDocstatus}`);

    // ── 3. Compute paid amount from existing demo invoices ────────────────────
    const invFilters = encodeURIComponent(
      JSON.stringify([["customer", "=", customerName], ["docstatus", "=", 1]]),
    );
    const invFields = encodeURIComponent(
      JSON.stringify(["name", "grand_total", "outstanding_amount"]),
    );
    const demoInvoices = await frappeGet(
      `/resource/Sales Invoice?filters=${invFilters}&fields=${invFields}&limit_page_length=20`,
    );
    const totalInvoiced: number = (demoInvoices ?? []).reduce(
      (s: number, i: { grand_total: number }) => s + (i.grand_total ?? 0), 0,
    );
    const totalOutstanding: number = (demoInvoices ?? []).reduce(
      (s: number, i: { outstanding_amount: number }) => s + (i.outstanding_amount ?? 0), 0,
    );
    const paidAmount = Math.max(0, totalInvoiced - totalOutstanding);
    log.push(`Demo paid amount: ₹${paidAmount}`);

    // ── 4. Build regular instalment schedule ──────────────────────────────────
    let schedule = generateInstalmentSchedule(
      feeConfigEntry,
      instalments,
      academicYear,
      enrollmentDate,
    );

    if (schedule.length === 0) {
      return NextResponse.json({ error: "Could not generate instalment schedule" }, { status: 400 });
    }

    let siblingDiscountAmount = 0;
    if (siblingOfferEnabled) {
      const siblingDiscountRate = plan === "Advanced" ? 0.10 : 0.05;
      const siblingDiscount = applySiblingDiscountToSchedule(
        schedule,
        schedule.reduce((sum, item) => sum + item.amount, 0),
        siblingDiscountRate,
        `Sibling offer (${Math.round(siblingDiscountRate * 100)}%)`,
      );
      schedule = siblingDiscount.schedule;
      siblingDiscountAmount = siblingDiscount.discountAmount;
      log.push(`Applied sibling discount: ₹${siblingDiscountAmount}`);
    }

    // ── 5. Apply demo-paid credit to last invoice(s) backwards ────────────────
    if (paidAmount > 0) {
      schedule = applyCreditToSchedule(
        schedule,
        paidAmount,
        `Demo conversion credit (₹${paidAmount} already paid)`,
      );
      log.push(`Applied ₹${paidAmount} credit to instalment schedule`);
    }

    // ── 6. Find tuition fee item for this program ─────────────────────────────
    const program: string = enrollment.program || student.custom_branch;
    const itemCode = await getTuitionItemCode(program);
    if (!itemCode) {
      return NextResponse.json(
        { error: `No tuition fee item found for program "${program}"` },
        { status: 400 },
      );
    }
    log.push(`Tuition item: ${itemCode}`);

    // ── 7. Create new Sales Order ──────────────────────────────────────────────
    const scheduleSum = schedule.reduce((s, i) => s + i.amount, 0);
    const soQty = instalments;
    const soRate = instalments > 1 && scheduleSum > 0 ? scheduleSum / instalments : schedule[0]?.amount ?? 0;
    const txnDate = enrollmentDate || new Date().toISOString().split("T")[0];

    const soPayload = {
      customer: customerName,
      company: student.custom_branch,
      transaction_date: txnDate,
      delivery_date: txnDate,
      order_type: "Sales",
      items: [{
        item_code: itemCode,
        qty: soQty,
        rate: soRate,
        description: paidAmount > 0
          ? `Demo conversion — demo credit applied: -₹${paidAmount.toLocaleString("en-IN")}`
          : `Regular admission — converted from Demo`,
      }],
      custom_academic_year: academicYear,
      student: studentId,
      custom_no_of_instalments: String(instalments),
      custom_plan: plan,
    };

    const soCreated = await frappePost("/resource/Sales Order", soPayload);
    const salesOrderName: string = soCreated.name;
    log.push(`Sales Order created: ${salesOrderName}`);

    // ── Patch fractional SO totals to whole rupees (before submission) ─────────
    // Frappe computes grand_total = round(rate × qty, 2), which diverges from
    // scheduleSum when scheduleSum/instalments is irrational (e.g. 21461÷6 → 21460.98).
    // We use frappe.db.set_value via a transient Server Script — the only path that
    // bypasses Frappe's validate() recalculation hook on draft documents.
    const roundedScheduleSum = Math.round(scheduleSum);
    const soGrandTotal = typeof soCreated.grand_total === "number"
      ? soCreated.grand_total
      : parseFloat(String(soCreated.grand_total ?? "0"));
    if (Math.abs(soGrandTotal - roundedScheduleSum) > 0.005) {
      log.push(`SO total mismatch ₹${soGrandTotal} vs schedule ₹${roundedScheduleSum} — patching`);
      const patchScriptName = `patch_so_${salesOrderName.replace(/[^a-zA-Z0-9]/g, "_")}`;
      try {
        // Clean up any stale script first
        await fetch(`${FRAPPE_URL}/api/resource/Server Script/${encodeURIComponent(patchScriptName)}`, {
          method: "DELETE", headers: authHeaders,
        }).catch(() => {});
        await new Promise((r) => setTimeout(r, 200));

        const patchCode = `
so = "${salesOrderName}"
v = ${roundedScheduleSum}
item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
if item:
    frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total"]:
    frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True, "grand_total": frappe.db.get_value("Sales Order", so, "grand_total")}
`;
        const createSS = await fetch(`${FRAPPE_URL}/api/resource/Server Script`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: patchScriptName,
            script_type: "API",
            api_method: patchScriptName,
            allow_guest: 0,
            disabled: 0,
            script: patchCode,
          }),
        });
        const ssData = await createSS.json();
        const ssName: string | undefined = ssData.data?.name;
        if (ssName) {
          const runRes = await fetch(`${FRAPPE_URL}/api/method/${ssName}`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({}),
          });
          const runData = await runRes.json();
          if (runData.message?.patched) {
            log.push(`SO total patched to ₹${runData.message.grand_total}`);
          } else {
            log.push(`SO patch ran but no confirmation: ${JSON.stringify(runData).slice(0, 100)}`);
          }
          await fetch(`${FRAPPE_URL}/api/resource/Server Script/${encodeURIComponent(ssName)}`, {
            method: "DELETE", headers: authHeaders,
          }).catch(() => {});
        }
      } catch (patchErr) {
        // Non-fatal: SO still works; last invoice may land slightly fractional
        log.push(`SO patch warning: ${patchErr instanceof Error ? patchErr.message : String(patchErr)}`);
      }
    }

    // Submit SO
    await frappePut(`/resource/Sales Order/${encodeURIComponent(salesOrderName)}`, { docstatus: 1 });
    log.push(`Sales Order submitted: ${salesOrderName}`);

    // ── 9. Update Program Enrollment ──────────────────────────────────────────
    // Use frappe.client.set_value for each field (avoids cancel/resubmit cycle)
    const peUpdates: Record<string, string> = {
      custom_plan: plan,
      custom_no_of_instalments: String(instalments),
      student_category: "",
    };
    if (feeStructureName) {
      peUpdates.custom_fee_structure = feeStructureName;
    }

    // set_value endpoint can update submitted docs without cancel/amend
    await fetch(`${FRAPPE_URL}/api/method/frappe.client.set_value`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        doctype: "Program Enrollment",
        name: enrollment.name,
        fieldname: peUpdates,
      }),
    });
    log.push(`Program Enrollment updated: ${enrollment.name}`);

    // ── 10. Update Student record ──────────────────────────────────────────────
    const studentUpdates: Record<string, unknown> = {
      custom_student_type: "Fresher",
    };
    if (effectiveSiblingStudentId) {
      studentUpdates.custom_sibling_of = effectiveSiblingStudentId;
    }
    if (siblingOfferEnabled) {
      studentUpdates.custom_sibling_discount_applied = 1;
    }
    if (siblingGroup) {
      studentUpdates.custom_sibling_group = siblingGroup;
    }
    await frappePut(`/resource/Student/${encodeURIComponent(studentId)}`, {
      ...studentUpdates,
    });
    log.push(`Student type updated to Fresher: ${studentId}`);

    if (effectiveSiblingStudentId && siblingGroup && siblingStudent && !siblingStudent.custom_sibling_group) {
      await frappePut(`/resource/Student/${encodeURIComponent(effectiveSiblingStudentId)}`, {
        custom_sibling_group: siblingGroup,
      });
      log.push(`Sibling group linked on existing sibling: ${effectiveSiblingStudentId}`);
    }

    // ── 8. Create Sales Invoices (inline with timeout) ───
    // Invoice creation involves SO polling + sequential Frappe calls (10–40s).
    // We now do this inline (instead of background task via after()) to ensure:
    //   1. Errors are reported to user
    //   2. User can immediately retry if it fails
    //   3. Response includes actual invoice names if successful
    // If invoice creation takes >60s, we abort but SO still exists (can be billed manually).
    let createdInvoices: string[] = [];
    let invoiceError: string | undefined;

    try {
      const createInvoicesUrl = new URL("/api/admission/create-invoices", request.url).toString();
      const invoiceBody = JSON.stringify({ salesOrderName, schedule });

      // Use AbortController for 60-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Forward the session cookie so create-invoices can authenticate the caller.
      // Without this, requireRole() in create-invoices returns 401.
      const cookieHeader = request.headers.get("cookie") ?? "";

      const invoiceRes = await fetch(createInvoicesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: invoiceBody,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json();
        createdInvoices = invoiceData.invoices || [];
        if (createdInvoices.length > 0) {
          log.push(`✓ Created ${createdInvoices.length} invoice(s): ${createdInvoices.join(", ")}`);
        } else if (invoiceData.drafts?.length > 0) {
          log.push(`⚠️  Created as drafts (submission failed): ${invoiceData.drafts.join(", ")}`);
          invoiceError = "Invoices created as drafts but submission failed. Admin will submit manually.";
        } else {
          invoiceError = "No invoices created (check Sales Order status)";
          log.push(`⚠️  ${invoiceError}`);
        }
      } else {
        const errText = await invoiceRes.text().catch(() => "");
        invoiceError = `Invoice API error (${invoiceRes.status}): ${errText.slice(0, 200)}`;
        log.push(`❌ ${invoiceError}`);
      }
    } catch (invoiceErr) {
      // Invoice creation failed, but SO was created successfully
      // This is non-fatal — SO exists and can be billed manually or retried
      const errMsg = invoiceErr instanceof Error ? invoiceErr.message : String(invoiceErr);
      invoiceError = `Invoice creation failed: ${errMsg}`;
      log.push(`❌ ${invoiceError}`);
      console.error(`[convert-to-regular] ${invoiceError} for SO ${salesOrderName}`);
    }

    return NextResponse.json({
      success: true,
      salesOrderName,
      invoices: createdInvoices,
      ...(invoiceError && { invoiceError }), // Signal to frontend if invoices failed
      paidAmount,
      siblingDiscountAmount,
      instalments,
      plan,
      log,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[convert-to-regular]", message);
    return NextResponse.json({ error: message, log }, { status: 500 });
  }
}
