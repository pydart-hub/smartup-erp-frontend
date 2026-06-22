"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarCheck2,
  Building2,
  ChevronRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getDuesTodayByBranch, getRecentlyPaidClaims } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

type BranchPaidHistoryRow = {
  branch: string;
  shortName: string;
  overdueStudents: number;
  overdueAmount: number;
  paidStudentCount: number;
  recentPaidAmount: number;
};

export default function SalesOverduePaidOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales-overdue-paid-overview"],
    queryFn: async (): Promise<BranchPaidHistoryRow[]> => {
      const branches = await getDuesTodayByBranch();
      const rows = await Promise.all(
        branches.map(async (branch) => {
          const claims = await getRecentlyPaidClaims(branch.branch);
          const awaitingClaims = claims.filter((claim) => claim.claim_status === "awaiting_claim");
          return {
            branch: branch.branch,
            shortName: branch.branch.replace("Smart Up ", "").replace("Smart Up", "HQ"),
            overdueStudents: branch.student_count,
            overdueAmount: branch.total_dues,
            paidStudentCount: awaitingClaims.length,
            recentPaidAmount: awaitingClaims.reduce((sum, claim) => sum + (claim.recent_payment.paid_amount || 0), 0),
          };
        }),
      );

      return rows
        .filter((row) => row.paidStudentCount > 0)
        .sort((a, b) => {
          if (b.paidStudentCount !== a.paidStudentCount) return b.paidStudentCount - a.paidStudentCount;
          return b.recentPaidAmount - a.recentPaidAmount;
        });
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const totalPaidStudents = (data ?? []).reduce((sum, row) => sum + row.paidStudentCount, 0);
  const totalPaidAmount = (data ?? []).reduce((sum, row) => sum + row.recentPaidAmount, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">Overdue Paid Students</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Branch-wise list of overdue students who paid in the last 4 days and are awaiting follow-up claim
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-emerald-200/70 bg-emerald-50/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CalendarCheck2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Branches With Paid Overdue</p>
              <p className="text-2xl font-bold text-emerald-700">
                {isLoading ? "..." : data?.length ?? 0}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : totalPaidStudents}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Recent Paid Amount</p>
              <p className="text-xl font-bold text-emerald-700">
                {isLoading ? "..." : formatCurrency(totalPaidAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load overdue paid overview</p>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarCheck2 className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No overdue students with recent payments found in the last 4 days.</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {data.map((branch) => {
            const encodedBranch = encodeURIComponent(branch.branch);

            return (
              <motion.div key={branch.branch} variants={itemVariants}>
                <Link
                  href={`/dashboard/sales-user/fees/overdue/${encodedBranch}/paid-history`}
                  className="flex items-center gap-3 rounded-[10px] border border-emerald-200/70 hover:border-emerald-300 hover:shadow-sm transition-all bg-surface p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{branch.shortName}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {branch.paidStudentCount} overdue paid student{branch.paidStudentCount !== 1 ? "s" : ""} awaiting claim
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(branch.recentPaidAmount)}</p>
                    <p className="text-[10px] text-text-tertiary">
                      Recent paid • {branch.overdueStudents} overdue • {formatCurrency(branch.overdueAmount)} due
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
