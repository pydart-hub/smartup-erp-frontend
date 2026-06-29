import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { getSalesUserBranches } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

type StudentDoc = {
  name: string;
  student_name?: string;
  customer?: string;
  custom_branch?: string;
};

type PaymentEntryRow = {
  name: string;
  party?: string;
  party_name?: string;
  paid_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
  reference_no?: string;
  remarks?: string;
  docstatus?: number;
};

type InvoicePaymentRow = {
  name: string;
  paid_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
  reference_no?: string;
  remarks?: string;
  allocated_amount?: number;
};

type SalesInvoiceRow = {
  name: string;
};

function normalizeMode(mode?: string, referenceNo?: string): "Razorpay" | "UPI" | "Bank" | "Cash" {
  const normalizedMode = (mode || "").trim().toUpperCase();

  if (referenceNo?.startsWith("pay_") || normalizedMode === "RAZORPAY") {
    return "Razorpay";
  }
  if (normalizedMode === "UPI") {
    return "UPI";
  }
  if (normalizedMode === "CASH") {
    return "Cash";
  }
  return "Bank";
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: { Authorization: ADMIN_HEADERS.Authorization, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe GET ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function fetchPaymentEntries(filters: unknown): Promise<PaymentEntryRow[]> {
  const res = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name",
      "party",
      "party_name",
      "paid_amount",
      "mode_of_payment",
      "posting_date",
      "reference_no",
      "remarks",
      "docstatus",
    ]),
    order_by: "posting_date desc, creation desc",
    limit_page_length: "500",
  });

  return res.data ?? [];
}

async function fetchStudentInvoices(customer: string, branch: string): Promise<SalesInvoiceRow[]> {
  const res = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([
      ["customer", "=", customer],
      ["company", "=", branch],
      ["docstatus", "=", 1],
    ]),
    fields: JSON.stringify(["name"]),
    order_by: "posting_date desc, creation desc",
    limit_page_length: "500",
  });

  return res.data ?? [];
}

async function fetchInvoicePaymentEntries(invoiceId: string): Promise<InvoicePaymentRow[]> {
  const bt = "`";
  const payload = {
    doctype: "Payment Entry",
    fields: [
      "name",
      "paid_amount",
      "mode_of_payment",
      "posting_date",
      "reference_no",
      "remarks",
      `${bt}tabPayment Entry Reference${bt}.allocated_amount as allocated_amount`,
    ],
    filters: [
      ["Payment Entry Reference", "reference_name", "=", invoiceId],
      ["Payment Entry", "docstatus", "=", 1],
    ],
    order_by: "posting_date desc, creation desc",
    limit_page_length: 100,
  };

  const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe invoice payments ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.message ?? [];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const session = authResult;

    const studentId = request.nextUrl.searchParams.get("student_id");
    const branch = request.nextUrl.searchParams.get("branch");

    if (!studentId || !branch) {
      return NextResponse.json(
        { error: "student_id and branch are required" },
        { status: 400 },
      );
    }

    const roles = session.roles || [];
    let allowedCompanies = session.allowed_companies || [];
    if (roles.includes("Sales User") && session.email) {
      const mappedBranches = getSalesUserBranches(session.email);
      if (mappedBranches.length > 0) {
        allowedCompanies = mappedBranches;
      }
    }

    if (roles.includes("Sales User") && !allowedCompanies.includes(branch)) {
      return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
    }

    const studentRes = await frappeGet(`resource/Student/${encodeURIComponent(studentId)}`, {});
    const student = (studentRes.data ?? {}) as StudentDoc;

    const customer = student.customer?.trim();
    const matchers = [
      customer,
      studentId.trim(),
      student.student_name?.trim(),
    ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

    const data: Array<{
      payment_entry_id: string;
      invoice_id: string;
      posting_date: string;
      amount: number;
      mode: "Razorpay" | "UPI" | "Bank" | "Cash";
      raw_mode_of_payment: string;
      reference_no: string;
      remarks: string;
    }> = [];
    const invoicePaymentSeen = new Set<string>();

    if (customer) {
      try {
        const invoices = await fetchStudentInvoices(customer, branch);
        for (const invoice of invoices) {
          try {
            const rows = await fetchInvoicePaymentEntries(invoice.name);
            for (const row of rows) {
              const uniqueKey = `${row.name}::${invoice.name}`;
              if (invoicePaymentSeen.has(uniqueKey)) continue;
              invoicePaymentSeen.add(uniqueKey);
              data.push({
                payment_entry_id: row.name,
                invoice_id: invoice.name,
                posting_date: row.posting_date || "",
                amount: row.allocated_amount || row.paid_amount || 0,
                mode: normalizeMode(row.mode_of_payment, row.reference_no),
                raw_mode_of_payment: row.mode_of_payment || "",
                reference_no: row.reference_no || "",
                remarks: row.remarks || "",
              });
            }
          } catch (error) {
            console.warn("[student-transaction-history] Skipping invoice payment lookup", invoice.name, error);
          }
        }
      } catch (error) {
        console.warn("[student-transaction-history] Failed invoice scan, falling back to direct payment entries", error);
      }
    }

    const allPayments: PaymentEntryRow[] = [];
    const paymentEntrySeen = new Set<string>();

    for (const matcher of matchers) {
      const querySets = [
        [["payment_type", "=", "Receive"], ["party_type", "=", "Customer"], ["company", "=", branch], ["party", "=", matcher], ["docstatus", "=", 1]],
        [["payment_type", "=", "Receive"], ["party_type", "=", "Customer"], ["company", "=", branch], ["party_name", "=", matcher], ["docstatus", "=", 1]],
      ];

      for (const filters of querySets) {
        const rows = await fetchPaymentEntries(filters);
        for (const row of rows) {
          if (paymentEntrySeen.has(row.name)) continue;
          paymentEntrySeen.add(row.name);
          allPayments.push(row);
        }
      }
    }

    for (const payment of allPayments) {
      const alreadyLinked = data.some((row) => row.payment_entry_id === payment.name);
      if (alreadyLinked) continue;

      data.push({
        payment_entry_id: payment.name,
        invoice_id: "",
        posting_date: payment.posting_date || "",
        amount: payment.paid_amount ?? 0,
        mode: normalizeMode(payment.mode_of_payment, payment.reference_no),
        raw_mode_of_payment: payment.mode_of_payment || "",
        reference_no: payment.reference_no || "",
        remarks: payment.remarks || "",
      });
    }

    data.sort((a, b) => {
      const dateCompare = (b.posting_date || "").localeCompare(a.posting_date || "");
      if (dateCompare !== 0) return dateCompare;
      return (b.payment_entry_id || "").localeCompare(a.payment_entry_id || "");
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[student-transaction-history] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
