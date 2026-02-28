"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, AlertCircle, ShoppingCart,
  Building2, Calendar, Hash, User, Package,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSalesOrder, getSalesInvoices, cancelSalesOrder } from "@/lib/api/sales";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import type { SalesOrderStatus } from "@/lib/types/sales";

const STATUS_COLORS: Record<SalesOrderStatus, "default" | "success" | "warning" | "error" | "info"> = {
  Draft: "default",
  "On Hold": "warning",
  "To Deliver and Bill": "info",
  "To Bill": "info",
  "To Deliver": "info",
  Completed: "success",
  Cancelled: "error",
  Closed: "default",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const decodedId = decodeURIComponent(id);

  // ── SO data ───────────────────────────────────────────────
  const { data: soRes, isLoading, isError } = useQuery({
    queryKey: ["sales-order", decodedId],
    queryFn: () => getSalesOrder(decodedId),
    staleTime: 60_000,
  });
  const so = soRes?.data;

  // ── Linked invoices (filter by customer + company since sales_order field is restricted) ──
  const { data: invoicesRes } = useQuery({
    queryKey: ["so-invoices", decodedId, so?.customer, so?.company],
    queryFn: () => getSalesInvoices({ customer: so!.customer, company: so!.company, limit_page_length: 10 }),
    enabled: !!so?.customer,
    staleTime: 30_000,
  });
  const linkedInvoices = invoicesRes?.data ?? [];

  async function handleCancel() {
    if (!so || !confirm(`Cancel ${so.name}?`)) return;
    try {
      await cancelSalesOrder(so.name);
      await queryClient.invalidateQueries({ queryKey: ["sales-order", decodedId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Sales Order cancelled.");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to cancel"
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <BreadcrumbNav />
        <Skeleton className="h-10 w-64 rounded" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !so) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-error">
        <AlertCircle className="h-8 w-8" />
        <p className="font-medium">Sales Order not found</p>
        <button onClick={() => router.back()} className="text-sm text-primary underline">Go back</button>
      </div>
    );
  }

  const status = so.status as SalesOrderStatus;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary font-mono">{so.name}</h1>
            <p className="text-xs text-text-tertiary">{so.customer_name || so.customer}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_COLORS[status] ?? "default"}>{status}</Badge>
          <Link href={`/dashboard/branch-manager/invoices/new?so=${encodeURIComponent(so.name)}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" /> Create Invoice
            </Button>
          </Link>
          {so.docstatus === 1 && status !== "Cancelled" && (
            <Button variant="danger" size="sm" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Hero summary card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Grand Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(so.grand_total)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Billed</p>
              <p className="text-2xl font-bold text-success">{(so.per_billed ?? 0).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Advance Paid</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(so.advance_paid ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Invoices</p>
              <p className="text-2xl font-bold text-text-primary">{linkedInvoices.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order Details */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Order Details</h3>
            </div>
            <InfoRow label="Order No." value={so.name} />
            <InfoRow label="Customer" value={so.customer_name || so.customer} />
            <InfoRow label="Company" value={so.company} />
            <InfoRow label="Order Date" value={formatDate(so.transaction_date)} />
            <InfoRow label="Delivery Date" value={so.delivery_date ? formatDate(so.delivery_date) : null} />
            <InfoRow label="Order Type" value={so.order_type} />
            <InfoRow label="Currency" value={so.currency} />
            <InfoRow label="Created" value={so.creation ? formatDate(so.creation) : null} />
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                    <th className="text-left pb-2 pr-3">Item</th>
                    <th className="text-left pb-2 pr-3">Description</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                    <th className="text-right pb-2 pr-3">Rate</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {(so.items ?? []).map((item, i) => (
                    <tr key={item.name ?? i}>
                      <td className="py-2 pr-3 font-medium text-text-primary">{item.item_name || item.item_code}</td>
                      <td className="py-2 pr-3 text-text-secondary text-xs">{item.description || "—"}</td>
                      <td className="py-2 pr-3 text-right">{item.qty}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-light">
                    <td colSpan={4} className="pt-3 text-right font-semibold text-text-primary">Grand Total</td>
                    <td className="pt-3 text-right font-bold text-primary text-base">{formatCurrency(so.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Invoices */}
      {linkedInvoices.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-text-primary">Linked Invoices</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                  <th className="text-left pb-2 pr-3">Invoice #</th>
                  <th className="text-left pb-2 pr-3">Date</th>
                  <th className="text-right pb-2 pr-3">Grand Total</th>
                  <th className="text-right pb-2 pr-3">Outstanding</th>
                  <th className="text-left pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {linkedInvoices.map((inv) => (
                  <tr key={inv.name} className="hover:bg-app-bg transition-colors">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/dashboard/branch-manager/invoices/${encodeURIComponent(inv.name)}`}
                        className="font-mono text-xs text-primary font-semibold hover:underline"
                      >
                        {inv.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{formatDate(inv.posting_date)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{formatCurrency(inv.grand_total)}</td>
                    <td className="py-2 pr-3 text-right text-warning font-semibold">{formatCurrency(inv.outstanding_amount)}</td>
                    <td className="py-2">
                      <Badge variant={inv.outstanding_amount === 0 ? "success" : "warning"}>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
