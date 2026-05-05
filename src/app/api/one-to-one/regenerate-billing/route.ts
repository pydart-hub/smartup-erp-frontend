import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { getO2OHourlyRate } from "@/lib/utils/o2oFeeRates";

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

async function createAndSubmitInvoice(salesOrderName: string, amount: number, label: string): Promise<string> {
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
  const invoicePayload = {
    doctype: "Sales Invoice",
    customer: soData.customer,
    company: soData.company,
    posting_date: today,
    due_date: today,
    student: soData.student,
    custom_academic_year: academicYear,
    items: [
      {
        item_code: soItem.item_code,
        item_name: soItem.item_name,
        description: `${label} — ${soItem.item_name || soItem.item_code}`,
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

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, STAFF_ROLES);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId ?? "").trim();
    const action = String(body.action ?? "").trim() as BillingAction;

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
    const group = groupRows.find((row) => row.name.includes(`(${studentId})`) || row.student_group_name?.includes(studentId));
    if (!group) {
      return NextResponse.json({ error: "No One-to-One student group found for this student." }, { status: 404 });
    }
    if (!group.program) {
      return NextResponse.json({ error: "One-to-One group program is missing." }, { status: 400 });
    }

    const scheduleFilters = encodeURIComponent(JSON.stringify([["student_group", "=", group.name]]));
    const scheduleFields = encodeURIComponent(JSON.stringify(["name", "schedule_date", "from_time", "to_time"]));
    const scheduleRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Course Schedule?filters=${scheduleFilters}&fields=${scheduleFields}&order_by=schedule_date asc, from_time asc&limit_page_length=500`,
      { headers, cache: "no-store" },
    );
    if (!scheduleRes.ok) {
      return NextResponse.json({ error: `Failed to fetch scheduled courses: ${await readErrorText(scheduleRes)}` }, { status: 502 });
    }
    const schedules = ((await scheduleRes.json()).data ?? []) as Array<{ name: string; from_time?: string; to_time?: string }>;
    if (schedules.length === 0) {
      return NextResponse.json({ error: "No scheduled courses found for this One-to-One student." }, { status: 400 });
    }

    const totalHours = Number(
      schedules.reduce((sum, row) => sum + hoursBetween(row.from_time, row.to_time), 0).toFixed(2),
    );
    if (totalHours <= 0) {
      return NextResponse.json({ error: "Scheduled courses do not have a valid duration." }, { status: 400 });
    }

    const ratePerHour = getO2OHourlyRate(group.program);
    const totalAmount = Number((totalHours * ratePerHour).toFixed(2));
    const academicYear = await resolveAcademicYear(studentId);

    const soFields = encodeURIComponent(JSON.stringify(["name", "docstatus", "grand_total", "creation", "transaction_date"]));
    const soFilters = encodeURIComponent(JSON.stringify([["customer", "=", student.customer], ["docstatus", "!=", 2]]));
    const soRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Sales Order?filters=${soFilters}&fields=${soFields}&order_by=creation desc&limit_page_length=10`,
      { headers, cache: "no-store" },
    );
    if (!soRes.ok) {
      return NextResponse.json({ error: `Failed to check Sales Orders: ${await readErrorText(soRes)}` }, { status: 502 });
    }
    const salesOrders = ((await soRes.json()).data ?? []) as Array<{
      name: string;
      docstatus: number;
      grand_total?: number;
    }>;
    const submittedSO = salesOrders.find((row) => row.docstatus === 1);

    if (action === "sales-order") {
      if (submittedSO) {
        return NextResponse.json(
          { error: `Sales Order already exists: ${submittedSO.name}`, salesOrderName: submittedSO.name },
          { status: 409 },
        );
      }

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
            description: `One-to-One tuition: ${schedules.length} session(s), ${totalHours.toFixed(2)}h total x ₹${ratePerHour}/h`,
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

      return NextResponse.json({
        salesOrderName,
        amount: totalAmount,
        hours: totalHours,
        rate: ratePerHour,
        scheduleCount: schedules.length,
      });
    }

    if (!submittedSO) {
      return NextResponse.json({ error: "No submitted Sales Order found. Generate Sales Order first." }, { status: 400 });
    }

    const invFilters = encodeURIComponent(JSON.stringify([
      ["Sales Invoice Item", "sales_order", "=", submittedSO.name],
      ["docstatus", "=", 1],
    ]));
    const invFields = encodeURIComponent(JSON.stringify(["name"]));
    const invRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Sales Invoice?filters=${invFilters}&fields=${invFields}&limit_page_length=20`,
      { headers, cache: "no-store" },
    );
    if (!invRes.ok) {
      return NextResponse.json({ error: `Failed to check Sales Invoices: ${await readErrorText(invRes)}` }, { status: 502 });
    }
    const existingInvoices = ((await invRes.json()).data ?? []) as Array<{ name: string }>;
    if (existingInvoices.length > 0) {
      return NextResponse.json(
        { error: `Sales Invoice already exists: ${existingInvoices[0].name}`, invoices: existingInvoices.map((row) => row.name) },
        { status: 409 },
      );
    }

    const invoiceAmount = submittedSO.grand_total && submittedSO.grand_total > 0 ? submittedSO.grand_total : totalAmount;
    const invoiceName = await createAndSubmitInvoice(submittedSO.name, invoiceAmount, "One-to-One Tuition");

    return NextResponse.json({
      salesOrderName: submittedSO.name,
      invoices: [invoiceName],
      amount: invoiceAmount,
      hours: totalHours,
      rate: ratePerHour,
      scheduleCount: schedules.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[one-to-one/regenerate-billing] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}