"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  FileText,
  School,
  ChevronRight,
  Loader2,
  AlertCircle,
  CircleCheck,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getBranchFeeSchedules, getBranchSalesSummary, getBranchInvoiceStats } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const statusColors: Record<string, "warning" | "info" | "success" | "error" | "default"> = {
  Draft: "default",
  Submitted: "info",
  "Fee Creation Pending": "warning",
  "Fee Created": "success",
  Cancelled: "error",
  Failed: "error",
};

export default function BranchFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: feeSchedules,
    isLoading: loadFees,
    isError: feeError,
  } = useQuery({
    queryKey: ["director-branch-fees", branchName],
    queryFn: () => getBranchFeeSchedules(branchName),
    staleTime: 120_000,
  });

  const {
    data: salesStats,
    isLoading: loadSales,
  } = useQuery({
    queryKey: ["director-branch-sales-summary", branchName],
    queryFn: () => getBranchSalesSummary(branchName),
    staleTime: 120_000,
  });

  const {
    data: invoiceStats,
    isLoading: loadInvoices,
  } = useQuery({
    queryKey: ["director-branch-invoice-stats", branchName],
    queryFn: () => getBranchInvoiceStats(branchName),
    staleTime: 120_000,
  });

  const fees = feeSchedules ?? [];
  const totalFeeAmount = fees.reduce((sum, f) => sum + (f.total_amount || f.grand_total || 0), 0);
  const totalRevenue = salesStats?.totalRevenue ?? 0;
  const totalCollected = invoiceStats?.totalCollected ?? 0;
  const totalPending = invoiceStats?.totalOutstanding ?? 0;

  // Group fee schedules by program
  const feesByProgram = fees.reduce(
    (acc, f) => {
      const key = f.program || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    },
    {} as Record<string, typeof fees>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <motion.div variants={itemVariants}>
        <Link
          href={`/dashboard/director/branches/${encodedBranch}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {shortName}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Fees & Revenue — {shortName}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Fee schedules, sales orders, and collections overview
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">
            {branchName}
          </Badge>
        </div>
      </motion.div>

      {/* Financial Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {loadFees ? "..." : fees.length}
            </p>
            <p className="text-xs text-text-tertiary">Fee Schedules</p>
          </CardContent>
        </Card>
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {loadFees ? "..." : formatCurrency(totalFeeAmount)}
            </p>
            <p className="text-xs text-text-tertiary">Total Fees</p>
          </CardContent>
        </Card>
        <Link href={`/dashboard/director/branches/${encodedBranch}/sales-orders`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="h-5 w-5 text-info mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {loadSales ? "..." : formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-text-tertiary">Sales Revenue</p>
              <ChevronRight className="h-3.5 w-3.5 text-text-tertiary mx-auto mt-1" />
            </CardContent>
          </Card>
        </Link>
        <Card className="border-success/20">
          <CardContent className="p-4 text-center">
            <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-success">
              {loadInvoices ? "..." : formatCurrency(totalCollected)}
            </p>
            <p className="text-xs text-text-tertiary">Collected</p>
          </CardContent>
        </Card>
        <Card className="border-error/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-error">
              {loadInvoices ? "..." : formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-text-tertiary">Pending Fees</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee Schedules by Program */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Fee Schedules</h2>

        {loadFees ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : feeError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load fee schedules</p>
          </div>
        ) : fees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <FileText className="h-8 w-8 text-text-tertiary mb-2" />
            <p className="text-sm text-text-tertiary">No fee schedules found for this branch</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(feesByProgram)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([program, programFees]) => {
                const programTotal = programFees.reduce(
                  (sum, f) => sum + (f.total_amount || f.grand_total || 0),
                  0
                );
                return (
                  <Card key={program}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <School className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{program}</CardTitle>
                          <Badge variant="outline" className="text-[10px]">
                            {programFees.length} schedule{programFees.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold text-text-primary">
                          {formatCurrency(programTotal)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        {programFees.map((fee) => (
                          <div
                            key={fee.name}
                            className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light bg-surface"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {fee.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                                {fee.fee_structure && <span>{fee.fee_structure}</span>}
                                {fee.academic_year && (
                                  <>
                                    <span>·</span>
                                    <span>{fee.academic_year}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-text-primary">
                                {formatCurrency(fee.total_amount || fee.grand_total || 0)}
                              </p>
                            </div>
                            <Badge
                              variant={statusColors[fee.status] || "default"}
                              className="text-[10px] shrink-0"
                            >
                              {fee.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </motion.div>

      {/* Quick Link to Sales Orders */}
      <motion.div variants={itemVariants}>
        <Link href={`/dashboard/director/branches/${encodedBranch}/sales-orders`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-border-light hover:border-primary/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text-primary">View Sales Orders</p>
                <p className="text-xs text-text-tertiary">
                  {(loadSales || loadInvoices) ? "Loading..." : `${salesStats?.count ?? 0} orders · ${formatCurrency(totalRevenue)} revenue · ${formatCurrency(totalCollected)} collected`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
}
