"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  IndianRupee,
  School,
  ChevronRight,
  Loader2,
  AlertCircle,
  CircleCheck,
  Clock,
  TriangleAlert,
  Wifi,
  Banknote,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBranchInvoiceStats, getBranchProgramFeeStats, getBranchForfeitedFees, getBranchCollectedByMode } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function BranchFeesPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const { data: invoiceStats, isLoading: loadInvoices } = useQuery({
    queryKey: ["director-branch-invoice-stats", branchName],
    queryFn: () => getBranchInvoiceStats(branchName),
    staleTime: 120_000,
  });

  const { data: forfeitedTotal, isLoading: loadForfeited } = useQuery({
    queryKey: ["director-branch-forfeited-fees", branchName],
    queryFn: () => getBranchForfeitedFees(branchName),
    staleTime: 120_000,
  });

  const { data: collectedByMode, isLoading: loadCollectedByMode } = useQuery({
    queryKey: ["director-branch-collected-by-mode", branchName],
    queryFn: () => getBranchCollectedByMode(branchName),
    staleTime: 120_000,
  });

  const {
    data: programStats,
    isLoading: loadPrograms,
    isError: programError,
  } = useQuery({
    queryKey: ["director-branch-program-fees", branchName],
    queryFn: () => getBranchProgramFeeStats(branchName),
    staleTime: 120_000,
  });

  const totalFees = invoiceStats?.totalInvoiced ?? 0;
  const totalCollected = invoiceStats?.totalCollected ?? 0;
  const forfeited = forfeitedTotal ?? 0;
  const totalPending = (invoiceStats?.totalOutstanding ?? 0) - forfeited;
  const invoiceCount = invoiceStats?.count ?? 0;

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
            <h1 className="text-2xl font-bold text-text-primary">Fees — {shortName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Submitted invoices only · {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="self-start text-xs">{branchName}</Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border-light">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {loadInvoices ? "..." : formatCurrency(totalFees)}
            </p>
            <p className="text-xs text-text-tertiary">Total Fees</p>
          </CardContent>
        </Card>
        <Card className="border-success/20">
          <CardContent className="p-4 text-center">
            <CircleCheck className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-success">
              {loadInvoices ? "..." : formatCurrency(totalCollected)}
            </p>
            <p className="text-xs text-text-tertiary">Collected</p>
            <div className="flex justify-center gap-3 mt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Wifi className="h-3 w-3 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-600">
                    {loadCollectedByMode ? "..." : formatCurrency(collectedByMode?.razorpay ?? 0)}
                  </p>
                </div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Razorpay</p>
              </div>
              <div className="w-px bg-border-light" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Banknote className="h-3 w-3 text-green-500" />
                  <p className="text-xs font-semibold text-green-600">
                    {loadCollectedByMode ? "..." : formatCurrency(collectedByMode?.offline ?? 0)}
                  </p>
                </div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Offline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-error/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-error">
              {loadInvoices ? "..." : formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-text-tertiary">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/60">
          <CardContent className="p-4 text-center">
            <TriangleAlert className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">
              {loadForfeited ? "..." : formatCurrency(forfeited)}
            </p>
            <p className="text-xs text-text-tertiary">Forfeited</p>
            <p className="text-[10px] text-text-tertiary">Discontinued</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Program-wise breakdown */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-text-primary mb-3">By Program / Class</h2>

        {loadPrograms ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : programError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-sm text-error">Failed to load program stats</p>
          </div>
        ) : !programStats?.length ? (
          <div className="flex flex-col items-center justify-center h-48">
            <School className="h-8 w-8 text-text-tertiary mb-2" />
            <p className="text-sm text-text-tertiary">No invoice data found for this branch</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programStats.map((p) => (
              <Link
                key={p.program}
                href={`/dashboard/director/branches/${encodedBranch}/fees/${encodeURIComponent(p.program)}`}
              >
                <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border-light bg-surface hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                    <School className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{p.program}</p>
                    <p className="text-xs text-text-tertiary">{p.count} invoice{p.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(p.totalInvoiced)}</p>
                      <p className="text-[10px] text-text-tertiary">total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{formatCurrency(p.totalCollected)}</p>
                      <p className="text-[10px] text-success/70 flex items-center justify-end gap-0.5">
                        <CircleCheck className="h-2.5 w-2.5" /> collected
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-error">{formatCurrency(p.totalOutstanding - p.forfeitedFees)}</p>
                      <p className="text-[10px] text-error/70 flex items-center justify-end gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> pending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${p.forfeitedFees > 0 ? "text-amber-600" : "text-text-tertiary"}`}>
                        {formatCurrency(p.forfeitedFees)}
                      </p>
                      <p className="text-[10px] text-amber-500/80 flex items-center justify-end gap-0.5">
                        <TriangleAlert className="h-2.5 w-2.5" /> forfeited
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>


    </motion.div>
  );
}

