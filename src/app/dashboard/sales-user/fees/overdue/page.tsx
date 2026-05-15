"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getDuesTodayByBranch } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const todayISO = getLocalToday();

function formatDisplayDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SalesOverdueBranchPage() {
  const [asOf, setAsOf] = useState(todayISO);
  const isToday = asOf === todayISO;

  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["sales-dues-branches", asOf],
    queryFn: () => getDuesTodayByBranch(isToday ? undefined : asOf),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const totalDues = (branches ?? []).reduce((s, b) => s + b.total_dues, 0);
  const totalStudents = (branches ?? []).reduce((s, b) => s + b.student_count, 0);
  const childQs = isToday ? "" : `?as_of=${asOf}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isToday ? "Overdue Fees — Till Today" : `Overdue Fees — Till ${formatDisplayDate(asOf)}`}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Unpaid instalments past due date — all branches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="as-of-date" className="text-sm text-text-secondary whitespace-nowrap">
            As of
          </label>
          <input
            id="as-of-date"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value || todayISO)}
            className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {!isToday && (
            <button
              onClick={() => setAsOf(todayISO)}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-200/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Overdue</p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? "..." : formatCurrency(totalDues)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Students</p>
              <p className="text-xl font-bold text-text-primary">
                {isLoading ? "..." : totalStudents}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Branch rows */}
      {isLoading ? (
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load overdue data</p>
        </div>
      ) : !branches?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue fees! All clear.</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {branches.map((branch) => {
            const shortName = branch.branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
            const encodedBranch = encodeURIComponent(branch.branch);
            return (
              <motion.div key={branch.branch} variants={itemVariants}>
                <div className="flex items-stretch gap-0 rounded-[10px] border border-border-light hover:border-orange-300/50 hover:shadow-sm transition-all bg-surface overflow-hidden">
                  {/* Main row → class drill-down */}
                  <Link
                    href={`/dashboard/sales-user/fees/overdue/${encodedBranch}${childQs}`}
                    className="flex items-center gap-3 p-4 flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{shortName}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {branch.student_count} student{branch.student_count !== 1 ? "s" : ""} · {branch.invoice_count} invoice{branch.invoice_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-orange-600">
                        {formatCurrency(branch.total_dues)}
                      </p>
                      <p className="text-[10px] text-text-tertiary">overdue</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0 ml-2" />
                  </Link>

                  {/* Divider */}
                  <div className="w-px bg-border-light" />

                  {/* "All Students" quick link */}
                  <Link
                    href={`/dashboard/sales-user/fees/overdue/${encodedBranch}/all${childQs}`}
                    className="flex flex-col items-center justify-center gap-1 px-3 text-text-tertiary hover:text-primary hover:bg-brand-wash transition-all shrink-0 min-w-[64px]"
                    title="View all students"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[9px] font-semibold uppercase tracking-wide">All</span>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
