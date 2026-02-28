"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getBranchSalesOrders } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const PAGE_SIZE = 25;

const statusColors: Record<string, string> = {
  "To Deliver and Bill": "warning",
  "To Bill": "info",
  "To Deliver": "secondary",
  Completed: "success",
  Cancelled: "error",
  Draft: "default",
};

export default function BranchSalesOrdersPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);
  const [page, setPage] = useState(0);

  const {
    data: salesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-sales-list", branchName, page],
    queryFn: () =>
      getBranchSalesOrders(branchName, {
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
      }),
    staleTime: 60_000,
  });

  const orders = salesRes?.data ?? [];
  const hasMore = orders.length === PAGE_SIZE;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <Link
        href={`/dashboard/director/branches/${encodedBranch}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {shortName}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Sales Orders — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Fee sales orders for this branch
          </p>
        </div>
        <Badge variant="outline" className="self-start text-xs">
          {branchName}
        </Badge>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load sales orders</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <ShoppingCart className="h-8 w-8 text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">No sales orders found</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-app-bg">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Order
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary hidden sm:table-cell">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">
                      Amount
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary hidden lg:table-cell">
                      Paid
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.name}
                      className="border-b border-border-light last:border-0 hover:bg-app-bg/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-primary">{o.name}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                        {o.customer_name || o.customer}
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                        {o.transaction_date}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">
                        {formatCurrency(o.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className={o.advance_paid > 0 ? "text-success font-medium" : "text-text-secondary"}>
                          {formatCurrency(o.advance_paid)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={(statusColors[o.status] as "warning" | "info" | "success" | "error" | "default") || "default"}
                          className="text-[10px]"
                        >
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && orders.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            Page {page + 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
