// ─────────────────────────────────────────────────────────────────────────────
// Sales Order  (ERPNext /api/resource/Sales Order)
// ─────────────────────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | "Draft"
  | "On Hold"
  | "To Deliver and Bill"
  | "To Bill"
  | "To Deliver"
  | "Completed"
  | "Cancelled"
  | "Closed";

export interface SalesOrderItem {
  name?: string;            // row id
  item_code: string;        // link → Item
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  amount: number;           // qty × rate
  delivery_date?: string;
  warehouse?: string;
  // child meta
  idx?: number;
  parent?: string;
}

export interface SalesOrder {
  name: string;             // e.g. SAL-ORD-2026-00001
  customer: string;         // link → Customer  (required)
  customer_name?: string;
  transaction_date: string; // required
  delivery_date?: string;
  company: string;          // link → Company  (required)
  order_type?: "Sales" | "Maintenance" | "Shopping Cart";
  status: SalesOrderStatus;
  currency?: string;
  selling_price_list?: string;
  items: SalesOrderItem[];
  total?: number;
  net_total?: number;
  grand_total: number;
  taxes_and_charges?: string;
  per_billed?: number;      // % invoiced
  per_delivered?: number;   // % delivered
  advance_paid?: number;
  custom_academic_year?: string;
  student?: string;
  custom_no_of_instalments?: string;
  custom_plan?: string;
  docstatus?: 0 | 1 | 2;
  // ERPNext timestamps
  creation?: string;
  modified?: string;
}

export interface SalesOrderFormData {
  customer: string;
  transaction_date: string;
  delivery_date: string;
  company: string;
  order_type?: string;
  items: SalesOrderItemFormData[];
  taxes_and_charges?: string;
  // Payment Schedule child table
  payment_schedule?: PaymentScheduleEntry[];
  // Custom fields for student fee tracking
  custom_academic_year?: string;
  student?: string;
  custom_no_of_instalments?: string;
  custom_plan?: string;
  custom_mode_of_payment?: string;
}

/** Payment Schedule child table row on Sales Order */
export interface PaymentScheduleEntry {
  due_date: string;
  invoice_portion: number;  // percentage of grand_total
  payment_amount: number;
  description?: string;
}

export interface SalesOrderItemFormData {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales Invoice  (ERPNext /api/resource/Sales Invoice)
// ─────────────────────────────────────────────────────────────────────────────

export type SalesInvoiceStatus =
  | "Draft"
  | "Submitted"
  | "Return"
  | "Credit Note Issued"
  | "Paid"
  | "Partly Paid"
  | "Unpaid"
  | "Overdue"
  | "Cancelled";

export interface SalesInvoiceItem {
  name?: string;
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  amount: number;
  sales_order?: string;     // back-reference to SO
  so_detail?: string;       // back-reference to SO item row
  // child meta
  idx?: number;
  parent?: string;
}

export interface SalesInvoicePayment {
  mode_of_payment: string;
  amount: number;
  account?: string;
}

export interface SalesInvoice {
  name: string;             // e.g. ACC-SINV-2026-00001
  customer: string;         // link → Customer  (required)
  customer_name?: string;
  posting_date: string;     // required
  due_date?: string;
  company: string;          // link → Company  (required)
  currency?: string;
  selling_price_list?: string;
  sales_order?: string;     // optional link to originating SO
  status: SalesInvoiceStatus;
  is_return?: 0 | 1;
  items: SalesInvoiceItem[];
  payments?: SalesInvoicePayment[];
  total?: number;
  grand_total: number;
  outstanding_amount: number;
  total_advance?: number;
  taxes_and_charges?: string;
  payment_terms_template?: string;
  docstatus?: 0 | 1 | 2;
  creation?: string;
  modified?: string;
}

export interface SalesInvoiceFormData {
  customer: string;
  posting_date: string;
  due_date?: string;
  company: string;
  sales_order?: string;     // if creating from SO
  items: SalesInvoiceItemFormData[];
  taxes_and_charges?: string;
  payments?: SalesInvoicePayment[];
}

export interface SalesInvoiceItemFormData {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  sales_order?: string;
  so_detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer  (/api/resource/Customer)
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  name: string;             // CUST-XXXXX
  customer_name: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
  default_currency?: string;
  customer_type?: "Company" | "Individual";
  disabled?: 0 | 1;
  creation?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Item  (/api/resource/Item)
// ─────────────────────────────────────────────────────────────────────────────

export interface Item {
  name: string;             // item_code
  item_code: string;
  item_name: string;
  item_group?: string;
  description?: string;
  standard_rate?: number;
  uom?: string;             // default UOM
  sales_uom?: string;
  is_sales_item?: 0 | 1;
  disabled?: 0 | 1;
}
