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
}): Promise<FrappeListResponse<FeeStructure>> {
  const filters: string[][] = [];
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);
  if (params?.company) filters.push(["company", "=", params.company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "program", "academic_year", "academic_term", "total_amount", "company", "receivable_account"]),
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
  from_date?: string;
  to_date?: string;
} & PaginationParams): Promise<FrappeListResponse<PaymentEntry>> {
  const filters: string[][] = [["payment_type", "=", "Receive"]];
  if (params?.student) filters.push(["party", "=", params.student]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  const searchParams = new URLSearchParams({ filters: JSON.stringify(filters) });
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length));
  const { data } = await apiClient.get(`/resource/Payment Entry?${searchParams.toString()}`);
  return data;
}

// ── Reports ──
export async function getFeeReportSummary(): Promise<FeeReportSummary> {
  const [totalRes, collectedRes, pendingRes] = await Promise.all([
    apiClient.get(`/method/frappe.client.get_list?doctype=Fees&fields=["sum(grand_total) as total"]&limit_page_length=1`),
    apiClient.get(`/method/frappe.client.get_list?doctype=Fees&fields=["sum(grand_total - outstanding_amount) as total"]&limit_page_length=1`),
    apiClient.get(`/method/frappe.client.get_list?doctype=Fees&filters=[["outstanding_amount",">",0]]&fields=["sum(outstanding_amount) as total"]&limit_page_length=1`),
  ]);
  const totalFees = totalRes.data.message?.[0]?.total || 0;
  const totalCollected = collectedRes.data.message?.[0]?.total || 0;
  const totalPending = pendingRes.data.message?.[0]?.total || 0;
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
