import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { resolveO2OHourlyRate } from "@/lib/utils/o2oFeeRates";
import { extractO2ORateFromRecord } from "@/lib/utils/o2oRateField";
import { resolveStoredO2ORateFromBackend } from "@/lib/server/o2oStoredRate";
import {
  buildO2OBillingDescription,
  getBillingMonthKey,
  resolveBilledScheduleNames,
} from "@/lib/utils/o2oBillingMetadata";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

type BillingAction = "sales-order" | "sales-invoice";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

async function fetchRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      const retryable =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_SOCKET" ||
        (err as { cause?: { code?: string } })?.cause?.code === "UND_ERR_SOCKET";
      if (!retryable || attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
}

async function readErrorText(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(text) as { error?: string; exception?: string; _server_messages?: string };
    if (parsed.error) return parsed.error;
    if (parsed.exception) return parsed.exception;
    if (parsed._server_messages) return parsed._server_messages;
  } catch {
    // fall through
  }
  return text.slice(0, 600);
}

function hoursBetween(fromTime?: string, toTime?: string): number {
  if (!fromTime || !toTime) return 0;
  const [fromH, fromM = "0", fromS = "0"] = fromTime.split(":");
  const [toH, toM = "0", toS = "0"] = toTime.split(":");
  const from = Number(fromH) * 3600 + Number(fromM) * 60 + Number(fromS);
  const to = Number(toH) * 3600 + Number(toM) * 60 + Number(toS);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return Number(((to - from) / 3600).toFixed(2));
}

async function resolveAcademicYear(studentId: string): Promise<string | undefined> {
  const headers = authHeaders();
  const peFilters = encodeURIComponent(JSON.stringify([["student", "=", studentId], ["docstatus", "!=", 2]]));
  const peFields = encodeURIComponent(JSON.stringify(["academic_year"]));
  const peRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${peFilters}&fields=${peFields}&order_by=enrollment_date desc&limit_page_length=1`,
    { headers, cache: "no-store" },
  );
  if (peRes.ok) {
    const peJson = await peRes.json();
    const year = peJson.data?.[0]?.academic_year as string | undefined;
    if (year) return year;
  }

  const today = new Date().toISOString().split("T")[0];
  const ayFilters = encodeURIComponent(JSON.stringify([["year_start_date", "<=", today], ["year_end_date", ">=", today]]));
  const ayFields = encodeURIComponent(JSON.stringify(["name"]));
  const ayRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Academic Year?filters=${ayFilters}&fields=${ayFields}&limit_page_length=1`,
    { headers, cache: "no-store" },
  );
  if (!ayRes.ok) return undefined;
  const ayJson = await ayRes.json();
  return ayJson.data?.[0]?.name as string | undefined;
}

async function resolveStoredO2ORate(studentId: string, program: string, studentGroupName?: string, groupRate?: unknown): Promise<number> {
  try {
    const resolved = await resolveStoredO2ORateFromBackend({
      studentId,
      program,
      studentGroupName,
      fallbackGroupRate: groupRate,
    });
    return resolved.rate;
  } catch {
    // fall through
  }

  const headers = authHeaders();
  const peFilters = encodeURIComponent(JSON.stringify([["student", "=", studentId], ["docstatus", "!=", 2]]));
  const peFields = encodeURIComponent(JSON.stringify(["custom_o2o_rate_per_class", "custom_o2o_rate_per_hour"]));
  const peRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${peFilters}&fields=${peFields}&order_by=enrollment_date desc, creation desc&limit_page_length=1`,
    { headers, cache: "no-store" },
  );
  if (!peRes.ok) return resolveO2OHourlyRate(program, groupRate);
  const peJson = await peRes.json().catch(() => ({}));
  const peRate = extractO2ORateFromRecord(peJson.data?.[0]);
  return resolveO2OHourlyRate(program, peRate ?? groupRate);
}

async function resolveTuitionItem(program: string): Promise<{ item_code: string; item_name?: string } | null> {
  const headers = authHeaders();
  const fields = encodeURIComponent(JSON.stringify(["item_code", "item_name"]));

  const exactCode = `${program} Tuition Fee`;
  const exactFilters = encodeURIComponent(JSON.stringify([
    ["item_code", "=", exactCode],
    ["is_sales_item", "=", 1],
    ["disabled", "=", 0],
  ]));
  const exactRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Item?fields=${fields}&filters=${exactFilters}&limit_page_length=1`,
    { headers, cache: "no-store" },
  );
  if (exactRes.ok) {
    const exactJson = await exactRes.json();
    if (exactJson.data?.[0]) return exactJson.data[0] as { item_code: string; item_name?: string };
  }

  const likeFilters = encodeURIComponent(JSON.stringify([
    ["item_code", "like", `${program}%Tuition Fee`],
    ["is_sales_item", "=", 1],
    ["disabled", "=", 0],
  ]));
  const likeRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Item?fields=${fields}&filters=${likeFilters}&limit_page_length=5`,
    { headers, cache: "no-store" },
  );
  if (!likeRes.ok) return null;
  const likeJson = await likeRes.json();
  return (likeJson.data?.[0] as { item_code: string; item_name?: string } | undefined) ?? null;
}

async function createAndSubmitInvoice(salesOrderName: string, amount: number, label: string, dueDate?: string): Promise<string> {
  const headers = authHeaders();
  const soRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`,
    { headers, cache: "no-store" },
  );
  if (!soRes.ok) {
    throw new Error(`Failed to fetch Sales Order ${salesOrderName}: ${await readErrorText(soRes)}`);
  }

  const soData = (await soRes.json()).data;
  if (soData.docstatus !== 1) {
    throw new Error(`Sales Order ${salesOrderName} is not submitted.`);
  }
  const soItem = soData.items?.[0];
  if (!soItem) throw new Error("Sales Order has no items.");

  const academicYear = (soData.custom_academic_year as string | undefined) || await resolveAcademicYear(soData.student);
  const today = new Date().toISOString().split("T")[0];
  const finalDueDate = dueDate || today;
  const invoicePayload = {
    doctype: "Sales Invoice",
    customer: soData.customer,
    company: soData.company,
    posting_date: today,
    due_date: finalDueDate,
    student: soData.student,
    custom_academic_year: academicYear,
    items: [
      {
        item_code: soItem.item_code,
        item_name: soItem.item_name,
        description: `${label} - ${soItem.item_name || soItem.item_code}`,
        qty: 1,
        rate: amount,
        amount,
        sales_order: salesOrderName,
        so_detail: soItem.name,
      },
    ],
  };

  const createRes = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Invoice`, {
    method: "POST",
    headers,
    body: JSON.stringify(invoicePayload),
  });
  if (!createRes.ok) {
    throw new Error(`Invoice creation failed: ${await readErrorText(createRes)}`);
  }
  const created = (await createRes.json()).data;
  const invName = created.name as string;

  const submitRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ docstatus: 1 }),
    },
  );
  if (!submitRes.ok) {
    throw new Error(`Invoice submit failed: ${await readErrorText(submitRes)}`);
  }

  return invName;
}

type ScheduleRow = {
  name: string;
  schedule_date?: string;
  from_time?: string;
  to_time?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, STAFF_ROLES);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId ?? "").trim();
    const action = String(body.action ?? "").trim() as BillingAction;
    const billingMonth = String(body.billingMonth ?? "").trim();
    const salesOrderNameFromBody = String(body.salesOrderName ?? "").trim();
    const explicitRate = Number(body.rate ?? 0);
    const dueDate = String(body.dueDate ?? "").trim();

    if (!studentId || !["sales-order", "sales-invoice"].includes(action)) {
      return NextResponse.json({ error: "studentId and valid action are required" }, { status: 400 });
    }

    const headers = authHeaders();
    const studentFields = encodeURIComponent(JSON.stringify(["name", "student_name", "customer", "custom_branch"]));
    const studentRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}?fields=${studentFields}`,
      { headers, cache: "no-store" },
    );
    if (!studentRes.ok) {
      return NextResponse.json({ error: `Student not found: ${studentId}` }, { status: 404 });
    }
    const student = (await studentRes.json()).data as {
      name: string;
      student_name?: string;
      customer?: string;
      custom_branch?: string;
    };
    if (!student.customer) {
      return NextResponse.json({ error: "Student has no linked customer." }, { status: 400 });
    }

    const allowedCompanies = auth.allowed_companies ?? [];
    if (allowedCompanies.length > 0 && student.custom_branch && !allowedCompanies.includes(student.custom_branch)) {
      return NextResponse.json({ error: "Access denied for this branch." }, { status: 403 });
    }

    const groupPayload = {
      doctype: "Student Group",
      fields: ["name", "student_group_name", "program", "custom_branch"],
      filters: [
        ["name", "like", `%(${studentId})%`],
        ...(student.custom_branch ? [["custom_branch", "=", student.custom_branch]] : []),
      ],
      order_by: "creation desc",
      limit_page_length: 5,
    };
    const groupRes = await fetchRetry(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
      method: "POST",
      headers,
      body: JSON.stringify(groupPayload),
      cache: "no-store",
    });
    if (!groupRes.ok) {
      return NextResponse.json({ error: `Failed to resolve One-to-One group: ${await readErrorText(groupRes)}` }, { status: 502 });
    }
    const groupRows = ((await groupRes.json()).message ?? []) as Array<{
      name: string;
      student_group_name?: string;
      program?: string;
      custom_branch?: string;
    }>;
    const groupMatch = groupRows.find((row) => row.name.includes(`(${studentId})`) || row.student_group_name?.includes(studentId));
    if (!groupMatch) {
      return NextResponse.json({ error: "No One-to-One student group found for this student." }, { status: 404 });
    }
    const groupDetailRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(groupMatch.name)}?fields=${encodeURIComponent(JSON.stringify(["name", "student_group_name", "program", "custom_branch"]))}`,
      { headers, cache: "no-store" },
    );
    if (!groupDetailRes.ok) {
      return NextResponse.json({ error: `Failed to read One-to-One group details: ${await readErrorText(groupDetailRes)}` }, { status: 502 });
    }
    const group = (await groupDetailRes.json()).data as {
      name: string;
      student_group_name?: string;
      program?: string;
      custom_branch?: string;
    };
    if (!group.program) {
      return NextResponse.json({ error: "One-to-One group program is missing." }, { status: 400 });
    }

    const manualHours = Number(body.hours ?? 0);
    const ratePerHour = Number(body.rate ?? 0);
    const monthKey = String(body.billingMonth ?? "").trim();

    if (!monthKey) {
      return NextResponse.json({ error: "Billing month is required." }, { status: 400 });
    }
    if (!Number.isFinite(manualHours) || manualHours <= 0) {
      return NextResponse.json({ error: "Please enter a valid number of hours." }, { status: 400 });
    }
    if (!Number.isFinite(ratePerHour) || ratePerHour <= 0) {
      return NextResponse.json({ error: "Please enter a valid hourly rate." }, { status: 400 });
    }

    const totalAmount = Number((manualHours * ratePerHour).toFixed(2));
    const academicYear = await resolveAcademicYear(studentId);

    const tuitionItem = await resolveTuitionItem(group.program);
    if (!tuitionItem) {
      return NextResponse.json({ error: `No tuition fee item found for program "${group.program}".` }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const soPayload = {
      doctype: "Sales Order",
      customer: student.customer,
      company: student.custom_branch,
      transaction_date: today,
      delivery_date: today,
      order_type: "Sales",
      student: studentId,
      custom_academic_year: academicYear,
      items: [
        {
          item_code: tuitionItem.item_code,
          qty: 1,
          rate: totalAmount,
          description: `One-to-One Tuition Fee for ${monthKey} - ${manualHours} hours @ ₹${ratePerHour}/hr`,
        },
      ],
    };

    const createSORes = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Order`, {
      method: "POST",
      headers,
      body: JSON.stringify(soPayload),
    });
    if (!createSORes.ok) {
      return NextResponse.json({ error: `Sales Order creation failed: ${await readErrorText(createSORes)}` }, { status: 502 });
    }
    const createdSO = (await createSORes.json()).data;
    const salesOrderName = createdSO.name as string;

    const submitSORes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      },
    );
    if (!submitSORes.ok) {
      return NextResponse.json({ error: `Sales Order submit failed: ${await readErrorText(submitSORes)}` }, { status: 502 });
    }

    const invoiceName = await createAndSubmitInvoice(salesOrderName, totalAmount, `One-to-One Tuition for ${monthKey}`, dueDate);

    return NextResponse.json({
      salesOrderName,
      invoices: [invoiceName],
      amount: totalAmount,
      hours: manualHours,
      rate: ratePerHour,
      billingMonth: monthKey,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[one-to-one/regenerate-billing] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
