import apiClient from "./client";
import type {
  FeeStructure,
  FeeRecord,
  FeeCategory,
  PaymentEntry,
  PaymentFormData,
  FeeReportSummary,
  StudentFeeReport,
} from "@/lib/types/fee";
import type { FrappeListResponse, FrappeSingleResponse, PaginationParams } from "@/lib/types/api";

// ── Types for pending-fee drill-down ──
export interface ClassPendingSummary {
  item_code: string;
  student_count: number;
  total_outstanding: number;
}

export interface PendingInvoiceRow {
  name: string;
  customer: string;
  customer_name: string;
  item_code: string;
  outstanding_amount: number;
  grand_total: number;
  due_date: string;
  company: string;
  status: string;
}

// ── Fee Categories ──
export async function getFeeCategories(): Promise<FrappeListResponse<FeeCategory>> {
  const { data } = await apiClient.get("/resource/Fee Category?limit_page_length=0");
  return data;
}

export async function createFeeCategory(category: Partial<FeeCategory>): Promise<FrappeSingleResponse<FeeCategory>> {
  const { data } = await apiClient.post("/resource/Fee Category", category);
  return data;
}

// ── Fee Structures ──
export async function getFeeStructures(params?: {
  program?: string;
  academic_year?: string;
  company?: string;        // branch
  custom_plan?: string;
  custom_no_of_instalments?: string;
  docstatus?: number;
}): Promise<FrappeListResponse<FeeStructure>> {
  const filters: string[][] = [];
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.custom_plan) filters.push(["custom_plan", "=", params.custom_plan]);
  if (params?.custom_no_of_instalments) filters.push(["custom_no_of_instalments", "=", params.custom_no_of_instalments]);
  if (params?.docstatus !== undefined) filters.push(["docstatus", "=", String(params.docstatus)]);
  const query = new URLSearchParams({
    fields: JSON.stringify([
      "name", "program", "academic_year", "academic_term",
      "total_amount", "company", "receivable_account",
      "custom_plan", "custom_no_of_instalments", "custom_branch_abbr", "docstatus",
    ]),
    limit_page_length: "200",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Fee Structure?${query.toString()}`);
  return data;
}

export async function getFeeStructure(name: string): Promise<FrappeSingleResponse<FeeStructure>> {
  const { data } = await apiClient.get(`/resource/Fee Structure/${encodeURIComponent(name)}`);
  return data;
}

export async function createFeeStructure(structure: Partial<FeeStructure>): Promise<FrappeSingleResponse<FeeStructure>> {
  const { data } = await apiClient.post("/resource/Fee Structure", structure);
  return data;
}

// ── Fee Records (Fees doctype, per student) ──
export async function getFeeRecords(params?: {
  student?: string;
  program?: string;
  company?: string;          // branch
  academic_year?: string;
  pending_only?: boolean;    // outstanding_amount > 0
  fee_schedule?: string;
} & PaginationParams): Promise<FrappeListResponse<FeeRecord>> {
  const filters: string[][] = [];
  if (params?.student) filters.push(["student", "=", params.student]);
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);
  if (params?.fee_schedule) filters.push(["fee_schedule", "=", params.fee_schedule]);
  if (params?.pending_only) filters.push(["outstanding_amount", ">", "0"]);
  const searchParams = new URLSearchParams({
    fields: JSON.stringify([
      "name", "student", "student_name", "program", "program_enrollment",
      "fee_structure", "fee_schedule", "company", "academic_year",
      "posting_date", "due_date", "grand_total", "outstanding_amount", "docstatus",
    ]),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length));
  if (params?.order_by) searchParams.set("order_by", params.order_by);
  const { data } = await apiClient.get(`/resource/Fees?${searchParams.toString()}`);
  return data;
}

/**
 * Create a Fees record.
 * Required: student, program_enrollment (submitted), fee_structure, company, posting_date, due_date
 * The Fees doc is automatically submitted on save if include_payment = 0.
 */
export async function createFeeRecord(fee: import("@/lib/types/fee").FeeRecordFormData): Promise<FrappeSingleResponse<FeeRecord>> {
  const { data } = await apiClient.post("/resource/Fees", fee);
  return data;
}

export async function getFeeRecord(id: string): Promise<FrappeSingleResponse<FeeRecord>> {
  const { data } = await apiClient.get(`/resource/Fees/${encodeURIComponent(id)}`);
  return data;
}

// ── Payments ──
export async function createPayment(payment: PaymentFormData): Promise<FrappeSingleResponse<PaymentEntry>> {
  const payload = {
    payment_type: "Receive",
    party_type: "Student",
    party: payment.student,
    paid_amount: payment.amount,
    mode_of_payment: payment.mode_of_payment,
    reference_no: payment.reference_no,
    remarks: payment.remarks,
  };
  const { data } = await apiClient.post("/resource/Payment Entry", payload);
  return data;
}

export async function getPayments(params?: {
  student?: string;
  company?: string;
  from_date?: string;
  to_date?: string;
} & PaginationParams): Promise<FrappeListResponse<PaymentEntry>> {
  // Note: Payment Entries in this system use party_type = "Customer" (not "Student")
  const filters: string[][] = [["payment_type", "=", "Receive"], ["party_type", "=", "Customer"]];
  if (params?.student) filters.push(["party", "=", params.student]);
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  const searchParams = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(["name", "party", "party_name", "paid_amount", "mode_of_payment", "posting_date", "reference_no"]),
    order_by: "posting_date desc",
  });
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length));
  const { data } = await apiClient.get(`/resource/Payment Entry?${searchParams.toString()}`);
  return data;
}

// ── Reports ──
/**
 * Compute fee summary from Sales Invoice data.
 * The Fees doctype is not used at this school — fees are tracked via Sales Invoices.
 * Only submitted invoices (docstatus = 1) are counted.
 */
export async function getFeeReportSummary(company?: string): Promise<FeeReportSummary> {
  const filters: string[][] = [["docstatus", "=", "1"]];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["sum(grand_total) as invoiced", "sum(outstanding_amount) as outstanding"]),
    limit_page_length: "1",
    filters: JSON.stringify(filters),
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  const row = data.data?.[0] ?? {};
  const totalFees = row.invoiced ?? 0;
  const totalPending = row.outstanding ?? 0;
  const totalCollected = totalFees - totalPending;
  return {
    total_fees: totalFees,
    total_collected: totalCollected,
    total_pending: totalPending,
    collection_rate: totalFees > 0 ? (totalCollected / totalFees) * 100 : 0,
  };
}

export async function getStudentFeeReport(studentId: string): Promise<StudentFeeReport> {
  const { data } = await apiClient.get(
    `/method/frappe.client.get_list?doctype=Fees&filters=[["student","=","${studentId}"]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","student_name","program"]&order_by=due_date asc&limit_page_length=0`
  );
  const records = data.message || [];
  const totalFees = records.reduce((acc: number, r: { grand_total: number }) => acc + r.grand_total, 0);
  const outstanding = records.reduce((acc: number, r: { outstanding_amount: number }) => acc + r.outstanding_amount, 0);
  return {
    student: studentId,
    student_name: records[0]?.student_name || "",
    program: records[0]?.program || "",
    total_fees: totalFees,
    paid: totalFees - outstanding,
    outstanding,
    installments: records,
  };
}

// ── Pending-fee drill-down helpers ──────────────────────────────────────────

/**
 * Class-wise pending fee summary.
 * Calls server-side API route that uses admin credentials for the
 * aggregate query (group_by + count + sum on child-table join).
 */
export async function getClassPendingSummary(
  company?: string
): Promise<ClassPendingSummary[]> {
  const params = new URLSearchParams();
  if (company) params.set("company", company);

  const url = `/api/fees/class-summary?${params.toString()}`;
  console.log("[getClassPendingSummary] fetching:", url, "company:", company);
  const res = await fetch(url, {
    credentials: "include",
  });
  console.log("[getClassPendingSummary] status:", res.status);
  if (!res.ok) {
    const text = await res.text();
    console.error("[getClassPendingSummary] error body:", text);
    throw new Error(`class-summary failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

/**
 * Fetch all pending (outstanding > 0) Sales Invoices with their item_code.
 * Calls server-side API route that uses admin credentials for the
 * child-table join query.
 */
export async function getPendingInvoices(params?: {
  company?: string;
  item_code?: string;
  limit_page_length?: number;
}): Promise<PendingInvoiceRow[]> {
  const sp = new URLSearchParams();
  if (params?.company) sp.set("company", params.company);
  if (params?.item_code) sp.set("item_code", params.item_code);
  if (params?.limit_page_length)
    sp.set("limit", String(params.limit_page_length));

  const res = await fetch(`/api/fees/pending-invoices?${sp.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`pending-invoices failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}
