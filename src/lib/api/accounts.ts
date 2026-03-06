/**
 * accounts.ts
 * API layer for Accountant — based on CONFIRMED Frappe backend data:
 *
 *   ✔ Sales Invoice      — 1,406+ records, real outstanding data
 *   ✔ Payment Entry      — 7,283+ records, all "Receive" type, Cash mode
 *   ✔ GL Entry           — 17,404+ records, from Payment Entry + Sales Invoice
 *   ✔ Journal Entry      — minimal records
 *   ✘ Purchase Invoice   — NO records in backend (removed)
 *   ✘ Expense Claim      — NO records in backend (removed)
 *
 * All calls go through /api/proxy which injects Frappe auth headers.
 */

import apiClient from "./client";
import type { FrappeListResponse } from "@/lib/types/api";

// ── Re-export Sales Invoice from sales.ts ──
export { getSalesInvoices, getSalesInvoice } from "./sales";
export type { SalesInvoice } from "@/lib/types/sales";

// ── Payment Entry ──

export interface PaymentEntry {
  name: string;
  payment_type: string; // "Receive" | "Pay" | "Internal Transfer"
  posting_date: string;
  company: string;
  party_type?: string;
  party?: string;
  party_name?: string;
  paid_amount: number;
  received_amount: number;
  mode_of_payment?: string;
  reference_no?: string;
  reference_date?: string;
  status: string;
  docstatus: number;
  paid_from?: string;
  paid_to?: string;
  remarks?: string;
}

const PAYMENT_ENTRY_FIELDS = JSON.stringify([
  "name", "payment_type", "posting_date", "company",
  "party_type", "party", "party_name",
  "paid_amount", "received_amount", "mode_of_payment",
  "reference_no", "reference_date", "status", "docstatus",
  "paid_from", "paid_to", "remarks",
]);

export async function getPaymentEntries(params?: {
  company?: string;
  payment_type?: string;
  from_date?: string;
  to_date?: string;
  party?: string;
  docstatus?: number;
  limit_page_length?: number;
}): Promise<FrappeListResponse<PaymentEntry>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.payment_type) filters.push(["payment_type", "=", params.payment_type]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  if (params?.party) filters.push(["party_name", "like", `%${params.party}%`]);
  if (params?.docstatus !== undefined) filters.push(["docstatus", "=", String(params.docstatus)]);

  const query = new URLSearchParams({
    fields: PAYMENT_ENTRY_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Payment Entry?${query}`);
  return data;
}

// ── Journal Entry ──

export interface JournalEntry {
  name: string;
  posting_date: string;
  company: string;
  voucher_type: string; // "Journal Entry" | "Bank Entry" | "Cash Entry" etc.
  total_debit: number;
  total_credit: number;
  remark?: string;
  user_remark?: string;
  docstatus: number;
  title?: string;
  cheque_no?: string;
  cheque_date?: string;
}

const JOURNAL_ENTRY_FIELDS = JSON.stringify([
  "name", "posting_date", "company", "voucher_type",
  "total_debit", "total_credit", "remark", "user_remark",
  "docstatus", "title", "cheque_no", "cheque_date",
]);

export async function getJournalEntries(params?: {
  company?: string;
  voucher_type?: string;
  from_date?: string;
  to_date?: string;
  docstatus?: number;
  limit_page_length?: number;
}): Promise<FrappeListResponse<JournalEntry>> {
  const filters: string[][] = [];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.voucher_type) filters.push(["voucher_type", "=", params.voucher_type]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  if (params?.docstatus !== undefined) filters.push(["docstatus", "=", String(params.docstatus)]);

  const query = new URLSearchParams({
    fields: JOURNAL_ENTRY_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "posting_date desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Journal Entry?${query}`);
  return data;
}

// ── GL Entry (General Ledger) ──

export interface GLEntry {
  name: string;
  posting_date: string;
  account: string;
  party_type?: string;
  party?: string;
  debit: number;
  credit: number;
  against?: string;
  voucher_type: string;
  voucher_no: string;
  company: string;
  remarks?: string;
  is_cancelled: number;
}

const GL_ENTRY_FIELDS = JSON.stringify([
  "name", "posting_date", "account", "party_type", "party",
  "debit", "credit", "against", "voucher_type", "voucher_no",
  "company", "remarks", "is_cancelled",
]);

export async function getGLEntries(params?: {
  company?: string;
  account?: string;
  from_date?: string;
  to_date?: string;
  voucher_type?: string;
  party?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<GLEntry>> {
  const filters: string[][] = [["is_cancelled", "=", "0"]];
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.account) filters.push(["account", "like", `%${params.account}%`]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  if (params?.voucher_type) filters.push(["voucher_type", "=", params.voucher_type]);
  if (params?.party) filters.push(["party", "like", `%${params.party}%`]);

  const query = new URLSearchParams({
    fields: GL_ENTRY_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 200),
    order_by: "posting_date desc, name desc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/GL Entry?${query}`);
  return data;
}

// ── Dashboard stat helpers ──
// Only using doctypes that have confirmed data in the backend.

/**
 * Total outstanding amount across all unpaid Sales Invoices.
 * Uses Frappe aggregate: sum(outstanding_amount).
 * Confirmed real value: ₹1,86,79,200
 */
export async function getTotalReceivable(company?: string): Promise<number> {
  const filters: string[][] = [["outstanding_amount", ">", "0"], ["docstatus", "=", "1"]];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["sum(outstanding_amount) as total"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  return data.data?.[0]?.total ?? 0;
}

/**
 * Count of overdue Sales Invoices (docstatus=1, status=Overdue).
 * Confirmed real value: 1,293
 */
export async function getOverdueInvoiceCount(company?: string): Promise<number> {
  const filters: string[][] = [["status", "=", "Overdue"], ["docstatus", "=", "1"]];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["count(name) as cnt"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  return data.data?.[0]?.cnt ?? 0;
}

/**
 * Total amount collected via all submitted Payment Entries (type=Receive).
 * Confirmed real value: ₹1,48,88,880 (all Cash mode).
 */
export async function getTotalCollected(company?: string): Promise<number> {
  const filters: string[][] = [["docstatus", "=", "1"], ["payment_type", "=", "Receive"]];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["sum(paid_amount) as total"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Payment Entry?${query}`);
  return data.data?.[0]?.total ?? 0;
}

/**
 * Count of draft (unsubmitted) Sales Invoices.
 * Confirmed real value: 5
 */
export async function getDraftInvoiceCount(company?: string): Promise<number> {
  const filters: string[][] = [["docstatus", "=", "0"]];
  if (company) filters.push(["company", "=", company]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["count(name) as cnt"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  return data.data?.[0]?.cnt ?? 0;
}

/**
 * Outstanding amount grouped by branch (company).
 * Fetches all outstanding invoices and sums per company client-side.
 *
 * Confirmed branches: Smart Up Chullickal ₹69.4L, Thopumpadi ₹30.2L,
 *   Vyttila ₹26.7L, Kacheripady ₹24.8L, Moolamkuzhi ₹19.7L,
 *   Palluruthy ₹15.7L, Eraveli ₹0.14L, Smart Up ₹0.15L
 */
export interface BranchOutstanding {
  company: string;
  outstanding: number;
  count: number;
}

export async function getOutstandingByBranch(): Promise<BranchOutstanding[]> {
  const filters: string[][] = [["outstanding_amount", ">", "0"], ["docstatus", "=", "1"]];
  const query = new URLSearchParams({
    fields: JSON.stringify(["company", "outstanding_amount"]),
    filters: JSON.stringify(filters),
    limit_page_length: "0",
    order_by: "company asc",
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  const rows: { company: string; outstanding_amount: number }[] = data.data ?? [];

  const map: Record<string, { outstanding: number; count: number }> = {};
  for (const row of rows) {
    const co = row.company || "Unknown";
    if (!map[co]) map[co] = { outstanding: 0, count: 0 };
    map[co].outstanding += row.outstanding_amount ?? 0;
    map[co].count += 1;
  }
  return Object.entries(map)
    .map(([company, v]) => ({ company, ...v }))
    .sort((a, b) => b.outstanding - a.outstanding);
}
