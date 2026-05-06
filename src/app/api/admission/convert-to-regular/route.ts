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
 *   enrollmentDate     — ISO date string, used as due date for 1-instalment option
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

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

// ── Instalment schedule types (mirrored from feeSchedule.ts) ─────────────────

interface InstalmentEntry {
  index: number;
  label: string;
  amount: number;
  dueDate: string;
  discountApplied?: number;
  discountRemark?: string;
}

interface FeeConfigEntry {
  otp: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  quarterly_total: number;
  inst6_per: number;
  inst6_last: number;
  inst6_total: number;
  inst8_per: number;
  inst8_last: number;
  inst8_total: number;
  annual_fee: number;
}

// ── Due-date templates (matches constants.ts) ─────────────────────────────────

const INSTALMENT_DUE_DATES = {
  quarterly: [
    { month: 5, day: 1 },   // Q1: June 1
    { month: 8, day: 1 },   // Q2: September 1
    { month: 11, day: 1 },  // Q3: December 1
    { month: 2, day: 1 },   // Q4: March 1 (next year)
  ],
  inst6: [
    { month: 5, day: 1 },
    { month: 7, day: 1 },
    { month: 9, day: 1 },
    { month: 11, day: 1 },
    { month: 1, day: 1 },
    { month: 2, day: 1 },
  ],
  inst8: [
    { month: 5, day: 1 },
    { month: 6, day: 1 },
    { month: 7, day: 1 },
    { month: 8, day: 1 },
    { month: 9, day: 1 },
    { month: 10, day: 1 },
    { month: 11, day: 1 },
    { month: 2, day: 1 },
  ],
};

function parseStartYear(academicYear: string): number {
  return parseInt(academicYear.split("-")[0], 10);
}

function buildDueDate(template: { month: number; day: number }, startYear: number): string {
  const calendarYear = template.month < 3 ? startYear + 1 : startYear;
  return `${calendarYear}-${String(template.month + 1).padStart(2, "0")}-${String(template.day).padStart(2, "0")}`;
}

function generateInstalmentSchedule(
  config: FeeConfigEntry,
  instalments: number,
  academicYear: string,
  enrollmentDate?: string,
): InstalmentEntry[] {
  const startYear = parseStartYear(academicYear);

  if (instalments === 1) {
    return [{
      index: 1,
      label: "Full Payment",
      amount: config.otp,
      dueDate: enrollmentDate || buildDueDate(INSTALMENT_DUE_DATES.quarterly[0], startYear),
    }];
  }

  if (instalments === 4) {
    const labels = ["Q1", "Q2", "Q3", "Q4"];
    const amounts = [config.q1, config.q2, config.q3, config.q4];
    return INSTALMENT_DUE_DATES.quarterly.map((tmpl, i) => ({
      index: i + 1,
      label: labels[i],
      amount: amounts[i],
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  if (instalments === 6) {
    return INSTALMENT_DUE_DATES.inst6.map((tmpl, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 5 ? config.inst6_per : config.inst6_last,
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  if (instalments === 8) {
    return INSTALMENT_DUE_DATES.inst8.map((tmpl, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 7 ? config.inst8_per : config.inst8_last,
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  return [];
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
      discountRemark: remark,
    };
    remaining -= applied;
  }

  return result;
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
  };

  const { studentId, plan, instalments, feeConfigEntry, feeStructureName, academicYear, enrollmentDate } = body;

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

    // Submit SO
    await frappePut(`/resource/Sales Order/${encodeURIComponent(salesOrderName)}`, { docstatus: 1 });
    log.push(`Sales Order submitted: ${salesOrderName}`);

    // ── 8. Create Sales Invoices via existing create-invoices route ──────────
    // Build the request to our own route (uses admin token, handles retry, WhatsApp etc.)
    const invRes = await fetch(
      new URL("/api/admission/create-invoices", request.url).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward the original cookies so requireRole passes in the sub-route
          Cookie: request.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ salesOrderName, schedule }),
      },
    );
    const invData = await invRes.json() as { invoices?: string[]; error?: string };
    if (!invRes.ok) {
      // Non-fatal — SO is already created, BM can create invoices from SO page
      log.push(`Invoice creation warning: ${invData.error ?? "unknown"}`);
    }
    const invoices: string[] = invData.invoices ?? [];
    log.push(`Invoices created: ${invoices.join(", ")}`);

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
    await frappePut(`/resource/Student/${encodeURIComponent(studentId)}`, {
      custom_student_type: "Fresher",
    });
    log.push(`Student type updated to Fresher: ${studentId}`);

    return NextResponse.json({
      success: true,
      salesOrderName,
      invoices,
      paidAmount,
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
