"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Plus, Search, Eye,
  ChevronLeft, ChevronRight, AlertCircle, IndianRupee,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSalesInvoices } from "@/lib/api/sales";
import { getBranches } from "@/lib/api/enrollment";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { useAuth } from "@/lib/hooks/useAuth";
import type { SalesInvoiceStatus } from "@/lib/types/sales";

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<SalesInvoiceStatus, "default" | "success" | "warning" | "error" | "info"> = {
  Draft: "default",
  Submitted: "info",
  Return: "warning",
  "Credit Note Issued": "warning",
  Paid: "success",
  Unpaid: "error",
  Overdue: "error",
  Cancelled: "default",
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "Overdue", label: "Overdue" },
  { value: "Paid", label: "Paid" },
];

export default function InvoicesPage() {
  const { defaultCompany, allowedCompanies } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(defaultCompany || "");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [statusFilter, branchFilter, outstandingOnly]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  const { data: invRes, isLoading, isError, error } = useQuery({
    queryKey: ["sales-invoices", search, statusFilter, branchFilter, outstandingOnly, page],
    queryFn: () =>
      getSalesInvoices({
        search: search || undefined,
        status: statusFilter || undefined,
        company: branchFilter || undefined,
        outstanding_only: outstandingOnly || undefined,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
      }),
    staleTime: 30_000,
  });

  const invoices = invRes?.data ?? [];
  const hasMore = invoices.length === PAGE_SIZE;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Sales Invoices
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading ? "Loading…" : `${page * PAGE_SIZE + invoices.length} invoices shown`}
          </p>
        </div>
        <Link href="/dashboard/branch-manager/invoices/new">
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {allowedCompanies.length <= 1 ? null : <option value="">All Branches</option>}
              {(allowedCompanies.length > 0
                ? branches.filter((b) => allowedCompanies.includes(b.name))
                : branches
              ).map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name.replace("Smart Up ", "")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all ${
                  statusFilter === tab.value && !outstandingOnly
                    ? "bg-primary text-white"
                    : "bg-app-bg text-text-secondary hover:bg-brand-wash"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => { setOutstandingOnly((v) => !v); setStatusFilter(""); }}
              className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all flex items-center gap-1.5 ${
                outstandingOnly
                  ? "bg-warning text-white"
                  : "bg-app-bg text-text-secondary hover:bg-brand-wash"
              }`}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              Outstanding Only
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-error">
            <AlertCircle className="h-8 w-8" />
            <p className="font-medium">Failed to load invoices</p>
            <p className="text-xs text-text-tertiary">{(error as Error)?.message}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Invoice #</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Branch</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Due</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Grand Total</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Outstanding</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-light">
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : invoices.length === 0
                  ? (
                      <tr>
                        <td colSpan={9} className="text-center py-16 text-text-tertiary">
                          No invoices found.
                        </td>
                      </tr>
                    )
                  : invoices.map((inv) => (
                      <tr
                        key={inv.name}
                        className="border-b border-border-light hover:bg-app-bg transition-colors"
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-primary font-semibold">{inv.name}</span>
                        </td>
                        <td className="px-5 py-3 font-medium text-text-primary">
                          {inv.customer_name || inv.customer}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {inv.company?.replace("Smart Up ", "")}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">{formatDate(inv.posting_date)}</td>
                        <td className="px-5 py-3 text-text-secondary">
                          {inv.due_date ? formatDate(inv.due_date) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{formatCurrency(inv.grand_total)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={inv.outstanding_amount > 0 ? "text-error font-semibold" : "text-success font-semibold"}>
                            {formatCurrency(inv.outstanding_amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={STATUS_COLORS[inv.status as SalesInvoiceStatus] ?? "default"}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/dashboard/branch-manager/invoices/${encodeURIComponent(inv.name)}`}>
                            <button className="p-1.5 rounded-[8px] text-text-tertiary hover:text-primary hover:bg-brand-wash transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-light">
            <span className="text-xs text-text-tertiary">
              {page === 0 && invoices.length < PAGE_SIZE
                ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
                : `Page ${page + 1}`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
