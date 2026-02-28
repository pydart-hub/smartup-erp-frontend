import { z } from "zod";

// ── Sales Order Item ──────────────────────────────────────────
export const salesOrderItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(1, "Qty must be at least 1"),
  uom: z.string().optional(),
  rate: z.coerce.number().min(0, "Rate must be ≥ 0"),
});
export type SalesOrderItemValues = z.infer<typeof salesOrderItemSchema>;

// ── Sales Order ───────────────────────────────────────────────
export const salesOrderSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  transaction_date: z.string().min(1, "Date is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  company: z.string().min(1, "Branch / Company is required"),
  order_type: z.string().optional(),
  items: z
    .array(salesOrderItemSchema)
    .min(1, "At least one item is required"),
  taxes_and_charges: z.string().optional(),
});
export type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

// ── Sales Invoice Item ────────────────────────────────────────
export const salesInvoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.coerce.number().min(1, "Qty must be at least 1"),
  uom: z.string().optional(),
  rate: z.coerce.number().min(0, "Rate must be ≥ 0"),
  sales_order: z.string().optional(),
  so_detail: z.string().optional(),
});
export type SalesInvoiceItemValues = z.infer<typeof salesInvoiceItemSchema>;

// ── Sales Invoice ─────────────────────────────────────────────
export const salesInvoiceSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  due_date: z.string().optional(),
  company: z.string().min(1, "Branch / Company is required"),
  sales_order: z.string().optional(),
  items: z
    .array(salesInvoiceItemSchema)
    .min(1, "At least one item is required"),
  taxes_and_charges: z.string().optional(),
});
export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;

// ── Record Payment ────────────────────────────────────────────
export const recordPaymentSchema = z.object({
  paid_amount: z.coerce.number().min(1, "Amount must be > 0"),
  mode_of_payment: z.string().min(1, "Payment mode is required"),
  posting_date: z.string().min(1, "Date is required"),
  reference_no: z.string().optional(),
  reference_date: z.string().optional(),
  remarks: z.string().optional(),
});
export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
