"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart, Plus, Search, Eye, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, FileText,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSalesOrders } from "@/lib/api/sales";
import { getBranches } from "@/lib/api/enrollment";
import { getFeeSchedules } from "@/lib/api/employees";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { SalesOrderStatus } from "@/lib/types/sales";

const PAGE_SIZE = 25;

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

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "To Deliver and Bill", label: "Active" },
  { value: "To Bill", label: "To Bill" },
  { value: "Completed", label: "Completed" },
];

export default function SalesOrdersPage() {
  const { flags } = useFeatureFlagsStore();
  const { defaultCompany, allowedCompanies } = useAuth();
  if (!flags.sales_orders) return null;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(defaultCompany || "");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [statusFilter, branchFilter, classFilter]);

  // ── Branches for filter ──
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  // ── Fee Schedules (classes) for filter ──
  const { data: feeSchedulesRes } = useQuery({
    queryKey: ["fee-schedules", branchFilter],
    queryFn: () => getFeeSchedules({ company: branchFilter || undefined }),
    staleTime: 5 * 60_000,
    enabled: !!branchFilter,
  });
  const feeSchedules = feeSchedulesRes?.data ?? [];

  // ── Sales Orders query ──
  const { data: soRes, isLoading, isError, error } = useQuery({
    queryKey: ["sales-orders", search, statusFilter, branchFilter, classFilter, page],
    queryFn: () =>
      getSalesOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        company: branchFilter || undefined,
        fee_schedule: classFilter || undefined,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
      }),
    staleTime: 30_000,
  });

  const orders = soRes?.data ?? [];
  const hasMore = orders.length === PAGE_SIZE;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Sales Orders
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading ? "Loading…" : `${page * PAGE_SIZE + orders.length} orders shown`}
          </p>
        </div>
        <Link href="/dashboard/branch-manager/sales-orders/new">
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {/* Branch filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
            {/* Class (Fee Schedule) filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
            >
              <option value="">All Classes</option>
              {feeSchedules.map((fs) => (
                <option key={fs.name} value={fs.name}>
                  {fs.program}
                </option>
              ))}
            </select>
            {/* Status tabs */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all ${
                    statusFilter === tab.value
                      ? "bg-primary text-white"
                      : "bg-app-bg text-text-secondary hover:bg-brand-wash"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-error">
            <AlertCircle className="h-8 w-8" />
            <p className="font-medium">Failed to load sales orders</p>
            <p className="text-xs text-text-tertiary">{(error as Error)?.message}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Order #</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Company</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Delivery</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary">Grand Total</th>
                  <th className="text-center px-5 py-3 font-semibold text-text-secondary">Billed</th>
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
                  : orders.length === 0
                  ? (
                      <tr>
                        <td colSpan={9} className="text-center py-16 text-text-tertiary">
                          No sales orders found.
                        </td>
                      </tr>
                    )
                  : orders.map((order) => (
                      <tr
                        key={order.name}
                        className="border-b border-border-light hover:bg-app-bg transition-colors"
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-primary font-semibold">
                            {order.name}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-text-primary">
                          {order.customer_name || order.customer}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {order.company?.replace("Smart Up ", "")}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {formatDate(order.transaction_date)}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {order.delivery_date ? formatDate(order.delivery_date) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-text-primary">
                          {formatCurrency(order.grand_total)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-medium ${
                            (order.per_billed ?? 0) >= 100
                              ? "text-success"
                              : "text-warning"
                          }`}>
                            {(order.per_billed ?? 0).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={STATUS_COLORS[order.status as SalesOrderStatus] ?? "default"}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/branch-manager/sales-orders/${encodeURIComponent(order.name)}`}>
                              <button className="p-1.5 rounded-[8px] text-text-tertiary hover:text-primary hover:bg-brand-wash transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <Link href={`/dashboard/branch-manager/invoices/new?so=${encodeURIComponent(order.name)}`}>
                              <button className="p-1.5 rounded-[8px] text-text-tertiary hover:text-info hover:bg-info/10 transition-colors" title="Create Invoice">
                                <FileText className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
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
              {page === 0 && orders.length < PAGE_SIZE
                ? `${orders.length} order${orders.length !== 1 ? "s" : ""}`
                : `Page ${page + 1}`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
