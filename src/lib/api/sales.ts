/**
 * sales.ts
 * API layer for ERPNext Sales module:
 *   - Sales Order  (/api/resource/Sales Order)
 *   - Sales Invoice (/api/resource/Sales Invoice)
 *   - Customer      (/api/resource/Customer)
 *   - Item          (/api/resource/Item)
 *
 * All calls go through /api/proxy which injects auth headers.
 * Frappe endpoint: https://smartup.m.frappe.cloud
 */

import apiClient from "./client";
import type {
  SalesOrder,
  SalesOrderFormData,
  SalesInvoice,
  SalesInvoiceFormData,
  Customer,
  Item,
} from "@/lib/types/sales";
import type {
  FrappeListResponse,
  FrappeSingleResponse,
  PaginationParams,
} from "@/lib/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helper — Frappe Sales Order fields (lean list)
// ─────────────────────────────────────────────────────────────────────────────
const SO_LIST_FIELDS = JSON.stringify([
  "name", "customer", "customer_name", "transaction_date", "delivery_date",
  "company", "status", "grand_total", "per_billed", "per_delivered",
  "advance_paid", "docstatus", "creation",
]);

const SINV_LIST_FIELDS = JSON.stringify([
  "name", "customer", "customer_name", "posting_date", "due_date",
  "company", "status", "grand_total", "outstanding_amount",
  "docstatus", "is_return", "creation",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Sales Order
// ─────────────────────────────────────────────────────────────────────────────

/** List Sales Orders with optional filters */
export async function getSalesOrders(params?: {
  customer?: string;
  company?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  fee_schedule?: string; // class-wise filter via Fee Schedule
} & PaginationParams): Promise<FrappeListResponse<SalesOrder>> {
  const filters: string[][] = [];
  if (params?.customer) filters.push(["customer", "=", params.customer]);
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.status) filters.push(["status", "=", params.status]);
  if (params?.from_date) filters.push(["transaction_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["transaction_date", "<=", params.to_date]);
  if (params?.search) filters.push(["customer_name", "like", `%${params.search}%`]);
  if (params?.fee_schedule) filters.push(["fee_schedule", "=", params.fee_schedule]);

  const query = new URLSearchParams({
    fields: SO_LIST_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 25),
    order_by: params?.order_by ?? "transaction_date desc",
    ...(params?.limit_start ? { limit_start: String(params.limit_start) } : {}),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Sales Order?${query}`);
  return data;
}

/** Single Sales Order with full items child table */
export async function getSalesOrder(name: string): Promise<FrappeSingleResponse<SalesOrder>> {
  const { data } = await apiClient.get(
    `/resource/Sales Order/${encodeURIComponent(name)}`
  );
  return data;
}

/**
 * Create a new Sales Order (saves as draft).
 * Call `submitSalesOrder` afterwards to submit.
 */
export async function createSalesOrder(
  payload: SalesOrderFormData
): Promise<FrappeSingleResponse<SalesOrder>> {
  const { data } = await apiClient.post("/resource/Sales Order", payload);
  return data;
}

/** Submit a draft Sales Order (docstatus 0 → 1) */
export async function submitSalesOrder(name: string): Promise<void> {
  await apiClient.put(`/resource/Sales Order/${encodeURIComponent(name)}`, {
    docstatus: 1,
  });
}

/** Update a draft Sales Order */
export async function updateSalesOrder(
  name: string,
  updates: Partial<SalesOrderFormData>
): Promise<FrappeSingleResponse<SalesOrder>> {
  const { data } = await apiClient.put(
    `/resource/Sales Order/${encodeURIComponent(name)}`,
    updates
  );
  return data;
}

/** Cancel a submitted Sales Order (docstatus 1 → 2) */
export async function cancelSalesOrder(name: string): Promise<void> {
  await apiClient.put(`/resource/Sales Order/${encodeURIComponent(name)}`, {
    docstatus: 2,
  });
}

/** Delete a draft (docstatus=0) Sales Order */
export async function deleteSalesOrder(name: string): Promise<void> {
  await apiClient.delete(`/resource/Sales Order/${encodeURIComponent(name)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales Invoice
// ─────────────────────────────────────────────────────────────────────────────

/** List Sales Invoices with optional filters */
export async function getSalesInvoices(params?: {
  customer?: string;
  company?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  outstanding_only?: boolean;
  search?: string;
} & PaginationParams): Promise<FrappeListResponse<SalesInvoice>> {
  const filters: string[][] = [];
  if (params?.customer) filters.push(["customer", "=", params.customer]);
  if (params?.company) filters.push(["company", "=", params.company]);
  if (params?.status) filters.push(["status", "=", params.status]);
  if (params?.from_date) filters.push(["posting_date", ">=", params.from_date]);
  if (params?.to_date) filters.push(["posting_date", "<=", params.to_date]);
  if (params?.outstanding_only) filters.push(["outstanding_amount", ">", "0"]);
  if (params?.search) filters.push(["customer_name", "like", `%${params.search}%`]);

  const query = new URLSearchParams({
    fields: SINV_LIST_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 25),
    order_by: params?.order_by ?? "posting_date desc",
    ...(params?.limit_start ? { limit_start: String(params.limit_start) } : {}),
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Sales Invoice?${query}`);
  return data;
}

/** Single Sales Invoice with full items + payments child tables */
export async function getSalesInvoice(
  name: string
): Promise<FrappeSingleResponse<SalesInvoice>> {
  const { data } = await apiClient.get(
    `/resource/Sales Invoice/${encodeURIComponent(name)}`
  );
  return data;
}

/**
 * Create a new Sales Invoice (saves as draft).
 * Items can be loaded from a Sales Order or entered manually.
 */
export async function createSalesInvoice(
  payload: SalesInvoiceFormData
): Promise<FrappeSingleResponse<SalesInvoice>> {
  const { data } = await apiClient.post("/resource/Sales Invoice", payload);
  return data;
}

/** Submit a draft Sales Invoice (docstatus 0 → 1) */
export async function submitSalesInvoice(name: string): Promise<void> {
  await apiClient.put(`/resource/Sales Invoice/${encodeURIComponent(name)}`, {
    docstatus: 1,
  });
}

/** Update a draft Sales Invoice */
export async function updateSalesInvoice(
  name: string,
  updates: Partial<SalesInvoiceFormData>
): Promise<FrappeSingleResponse<SalesInvoice>> {
  const { data } = await apiClient.put(
    `/resource/Sales Invoice/${encodeURIComponent(name)}`,
    updates
  );
  return data;
}

/** Cancel a submitted Sales Invoice */
export async function cancelSalesInvoice(name: string): Promise<void> {
  await apiClient.put(`/resource/Sales Invoice/${encodeURIComponent(name)}`, {
    docstatus: 2,
  });
}

/** Delete a draft Sales Invoice */
export async function deleteSalesInvoice(name: string): Promise<void> {
  await apiClient.delete(`/resource/Sales Invoice/${encodeURIComponent(name)}`);
}

/**
 * Create a Sales Invoice directly from a submitted Sales Order.
 * Uses frappe.client.run_doc_method to pull SO items into SINV.
 */
export async function createInvoiceFromOrder(
  salesOrderName: string
): Promise<SalesInvoice> {
  // Fetch the SO first to get customer + company + items
  const { data: soRes } = await apiClient.get(
    `/resource/Sales Order/${encodeURIComponent(salesOrderName)}`
  );
  const so: SalesOrder = soRes.data;

  const payload: SalesInvoiceFormData = {
    customer: so.customer,
    posting_date: new Date().toISOString().split("T")[0],
    company: so.company,
    sales_order: so.name,
    items: so.items.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      uom: item.uom,
      rate: item.rate,
      sales_order: so.name,
    })),
  };

  const { data } = await apiClient.post("/resource/Sales Invoice", payload);
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Entry (for recording invoice payments)
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesPaymentPayload {
  customer: string;           // Customer name (link)
  paid_amount: number;
  mode_of_payment: string;    // "Cash" | "Bank Transfer" | "UPI" etc.
  posting_date: string;
  company: string;
  reference_no?: string;
  reference_date?: string;
  remarks?: string;
  // Link to Sales Invoice
  references?: {
    reference_doctype: "Sales Invoice";
    reference_name: string;   // SINV name
    allocated_amount: number;
  }[];
}

export async function createSalesPayment(
  payload: SalesPaymentPayload
): Promise<{ name: string }> {
  const body = {
    payment_type: "Receive",
    party_type: "Customer",
    party: payload.customer,
    paid_amount: payload.paid_amount,
    received_amount: payload.paid_amount,
    mode_of_payment: payload.mode_of_payment,
    posting_date: payload.posting_date,
    company: payload.company,
    reference_no: payload.reference_no,
    reference_date: payload.reference_date,
    remarks: payload.remarks,
    references: payload.references ?? [],
  };
  const { data } = await apiClient.post("/resource/Payment Entry", body);
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────────────────────────────────────

/** Search customers by name (for autocomplete / link pickers) */
export async function searchCustomers(
  query: string,
  limit = 20
): Promise<Customer[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "customer_name", "mobile_no", "email_id", "customer_group"]),
    filters: JSON.stringify([
      ["customer_name", "like", `%${query}%`],
      ["disabled", "=", 0],
    ]),
    limit_page_length: String(limit),
  });
  const { data } = await apiClient.get(`/resource/Customer?${params}`);
  return data.data;
}

/** Get all customers (paginated) */
export async function getCustomers(params?: {
  search?: string;
  customer_group?: string;
} & PaginationParams): Promise<FrappeListResponse<Customer>> {
  const filters: string[][] = [["disabled", "=", "0"]];
  if (params?.search) filters.push(["customer_name", "like", `%${params.search}%`]);
  if (params?.customer_group) filters.push(["customer_group", "=", params.customer_group]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "customer_name", "mobile_no", "email_id", "customer_group", "customer_type"]),
    filters: JSON.stringify(filters),
    limit_page_length: String(params?.limit_page_length ?? 50),
    order_by: "customer_name asc",
  });
  const { data } = await apiClient.get(`/resource/Customer?${query}`);
  return data;
}

/** Get customer linked to a student (Student.customer field) */
export async function getCustomerForStudent(
  studentId: string
): Promise<Customer | null> {
  const { data: studentRes } = await apiClient.get(
    `/resource/Student/${encodeURIComponent(studentId)}`
  );
  const customerName: string | undefined = studentRes.data?.customer;
  if (!customerName) return null;
  const { data } = await apiClient.get(
    `/resource/Customer/${encodeURIComponent(customerName)}`
  );
  return data.data;
}

/** Find the Student record linked to a Customer (reverse lookup) */
export async function getStudentByCustomer(customerName: string): Promise<{
  name: string;
  student_name: string;
  custom_branch?: string;
  program?: string;
} | null> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "student_name", "custom_branch", "program"]),
    filters: JSON.stringify([["customer", "=", customerName]]),
    limit_page_length: "1",
  });
  const { data } = await apiClient.get(`/resource/Student?${params}`);
  return (data.data as { name: string; student_name: string; custom_branch?: string; program?: string }[])?.[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Item
// ─────────────────────────────────────────────────────────────────────────────

/** Search items by name/code (for autocomplete) */
export async function searchItems(query: string, limit = 20): Promise<Item[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name", "item_code", "item_name", "item_group",
      "standard_rate", "stock_uom", "description",
    ]),
    filters: JSON.stringify([
      ["item_name", "like", `%${query}%`],
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
    limit_page_length: String(limit),
  });
  const { data } = await apiClient.get(`/resource/Item?${params}`);
  return data.data;
}

/** Fetch all sales items (for dropdowns) */
export async function getSalesItems(): Promise<Item[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name", "item_code", "item_name", "item_group",
      "standard_rate", "stock_uom", "description",
    ]),
    filters: JSON.stringify([
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
    limit_page_length: "200",
    order_by: "item_name asc",
  });
  const { data } = await apiClient.get(`/resource/Item?${params}`);
  return data.data ?? [];
}

/** Get a single Item by item_code */
export async function getItem(itemCode: string): Promise<Item> {
  const { data } = await apiClient.get(
    `/resource/Item/${encodeURIComponent(itemCode)}`
  );
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer creation helpers (used by auto-SO flow)
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new Customer and return it */
export async function createCustomer(payload: {
  customer_name: string;
  customer_type?: "Individual" | "Company";
  customer_group?: string;
  mobile_no?: string;
  email_id?: string;
}): Promise<Customer> {
  const { data } = await apiClient.post("/resource/Customer", {
    customer_name: payload.customer_name,
    customer_type: payload.customer_type ?? "Individual",
    customer_group: payload.customer_group ?? "Student",
    mobile_no: payload.mobile_no,
    email_id: payload.email_id,
  });
  return data.data;
}

/**
 * Find an existing Customer by name or create a new one.
 * Used during the admission flow to link a guardian → Customer.
 */
export async function findOrCreateCustomer(
  customerName: string,
  opts?: { mobile_no?: string; email_id?: string }
): Promise<Customer> {
  // Try to find existing customer with exact name match
  const existing = await searchCustomers(customerName, 5);
  const exact = existing.find(
    (c) => c.customer_name.toLowerCase() === customerName.toLowerCase()
  );
  if (exact) return exact;

  // Create new customer
  return createCustomer({
    customer_name: customerName,
    customer_type: "Individual",
    customer_group: "Student",
    mobile_no: opts?.mobile_no,
    email_id: opts?.email_id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Program → Tuition Fee Item resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the tuition-fee Item for a program.
 * Convention: item_code = "{program_abbreviation} Tuition Fee"
 * e.g. "5th Grade" → abbr "5th" → item "5th Tuition Fee"
 *      "11th Commerce" → abbr "11co" → item "11co 4 Tuition Fee"
 *
 * NOTE: Program abbreviations use hyphens (e.g. "10th 1-1", "12sc 1-M")
 * but item codes use full words ("10th 1 to 1", "12sc 1 to M").
 * We normalise the abbreviation before searching.
 */
export async function getTuitionFeeItem(
  programName: string
): Promise<Item | null> {
  // 1. Get program abbreviation from Frappe
  const { data: progRes } = await apiClient.get(
    `/resource/Program/${encodeURIComponent(programName)}?fields=["name","program_abbreviation"]`
  );
  const rawAbbr: string | undefined = progRes.data?.program_abbreviation;
  if (!rawAbbr) return null;

  // 2. Normalise: "10th 1-1" → "10th 1 to 1", "12sc 1-M" → "12sc 1 to M"
  const abbr = rawAbbr.replace(/\b1-1\b/g, "1 to 1").replace(/\b1-M\b/g, "1 to M");

  // 3. Search for items matching "{abbr}%Tuition Fee"
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name", "item_code", "item_name", "item_group", "standard_rate", "stock_uom",
    ]),
    filters: JSON.stringify([
      ["item_code", "like", `${abbr}%Tuition Fee`],
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
    limit_page_length: "10",
  });
  const { data: itemsRes } = await apiClient.get(`/resource/Item?${params}`);
  const items: Item[] = itemsRes.data ?? [];
  if (items.length === 0) return null;

  // Prefer exact "{abbr} Tuition Fee" match, otherwise take the first
  const exact = items.find((i) => i.item_code === `${abbr} Tuition Fee`);
  return exact ?? items[0];
}

/**
 * Get the selling price of an item from the Item Price table.
 * Falls back to 0 if no Item Price record exists.
 */
export async function getItemPriceRate(
  itemCode: string,
  priceList = "Standard Selling"
): Promise<number> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["price_list_rate"]),
    filters: JSON.stringify([
      ["item_code", "=", itemCode],
      ["price_list", "=", priceList],
      ["selling", "=", 1],
    ]),
    limit_page_length: "1",
    order_by: "creation desc",
  });
  const { data } = await apiClient.get(`/resource/Item Price?${params}`);
  const rows = data.data ?? [];
  return rows[0]?.price_list_rate ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregates / report helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesStats {
  total_orders: number;
  total_invoiced: number;
  total_outstanding: number;
  collection_rate: number;
}

/** Summary stats for the current branch */
export async function getSalesStats(company?: string): Promise<SalesStats> {
  const companyFilter = company
    ? `&filters=[["company","=","${encodeURIComponent(company)}"]]`
    : "";

  const [ordersRes, invoicesRes] = await Promise.all([
    apiClient.get(
      `/resource/Sales Order?fields=["count(name) as cnt","sum(grand_total) as total"]&limit_page_length=1${companyFilter}`
    ),
    apiClient.get(
      `/resource/Sales Invoice?fields=["sum(grand_total) as invoiced","sum(outstanding_amount) as outstanding"]&limit_page_length=1${companyFilter}`
    ),
  ]);

  const orderData = ordersRes.data.data?.[0] ?? {};
  const invoiceData = invoicesRes.data.data?.[0] ?? {};

  const totalInvoiced = invoiceData.invoiced ?? 0;
  const totalOutstanding = invoiceData.outstanding ?? 0;

  return {
    total_orders: orderData.cnt ?? 0,
    total_invoiced: totalInvoiced,
    total_outstanding: totalOutstanding,
    collection_rate:
      totalInvoiced > 0
        ? ((totalInvoiced - totalOutstanding) / totalInvoiced) * 100
        : 0,
  };
}
