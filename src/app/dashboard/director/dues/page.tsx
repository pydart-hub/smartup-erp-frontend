"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  AlertCircle,
  CalendarClock,
  Users,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  buildDuesChildQs,
  formatDuesRangeLabel,
  getDuesTodayByBranch,
} from "@/lib/api/director";
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

function DuesBranchContent() {
  const searchParams = useSearchParams();
  const [fromDate, setFromDate] = useState(() => searchParams.get("from_date") || "");
  const [toDate, setToDate] = useState(
    () => searchParams.get("to_date") || searchParams.get("as_of") || todayISO
  );

  const isDefaultRange = !fromDate && toDate === todayISO;

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFromDate(val);
    if (val && toDate && val > toDate) {
      setToDate(val);
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || todayISO;
    setToDate(val);
    if (fromDate && val < fromDate) {
      setFromDate(val);
    }
  };

  const handleReset = () => {
    setFromDate("");
    setToDate(todayISO);
  };

  const effectiveToDate = isDefaultRange ? undefined : toDate;
  const effectiveFromDate = fromDate || undefined;

  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-dues-branches", fromDate, toDate],
    queryFn: () =>
      getDuesTodayByBranch(
        isDefaultRange ? undefined : { fromDate: effectiveFromDate, toDate: effectiveToDate }
      ),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const totalDues = (branches ?? []).reduce((s, b) => s + b.total_dues, 0);
  const totalStudents = (branches ?? []).reduce((s, b) => s + b.student_count, 0);

  // Build query string for child links
  const childQs = isDefaultRange ? "" : buildDuesChildQs(effectiveFromDate, toDate);
  const rangeLabel = formatDuesRangeLabel(effectiveFromDate, toDate, todayISO);

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
            {isDefaultRange ? "Dues Till Today" : `Dues (${rangeLabel})`}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Overdue instalments where due date falls in selected range — branch-wise breakdown
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label htmlFor="dues-from-date" className="text-sm text-text-secondary whitespace-nowrap">
              From
            </label>
            <input
              id="dues-from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={handleFromChange}
              className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="dues-to-date" className="text-sm text-text-secondary whitespace-nowrap">
              To
            </label>
            <input
              id="dues-to-date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={handleToChange}
              className="text-sm rounded-lg border border-border-input bg-surface px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {!isDefaultRange && (
            <button
              onClick={handleReset}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary card */}
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
          <p className="text-sm text-error">Failed to load dues</p>
        </div>
      ) : !branches?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CalendarClock className="h-8 w-8 text-success" />
          <p className="text-sm text-success font-medium">No overdue dues — all caught up!</p>
        </div>
      ) : (
        <motion.div key={`${fromDate}_${toDate}`} initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
          {branches.map((branch) => {
            const shortName = branch.branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
            return (
              <motion.div key={branch.branch} variants={itemVariants}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 hover:border-orange-300/60 hover:shadow-xs transition-all bg-white dark:bg-[#0E1526]/85">
                  <Link
                    href={`/dashboard/director/dues/${encodeURIComponent(branch.branch)}${childQs}`}
                    className="flex items-center gap-3.5 flex-1 min-w-0"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-[#5f2ea8] dark:text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-text-primary hover:text-[#5f2ea8] transition-colors">{shortName}</p>
                      <p className="text-xs text-text-tertiary">
                        {branch.student_count} student{branch.student_count !== 1 ? "s" : ""} with overdue
                      </p>
                    </div>
                    <div className="text-right shrink-0 pr-2">
                      <p className="text-lg font-black text-orange-600">
                        {formatCurrency(branch.total_dues)}
                      </p>
                      <Badge variant="outline" className="text-[10px] text-orange-600 dark:text-orange-400 border-orange-200/70 dark:border-orange-800/50">
                        {branch.invoice_count} invoice{branch.invoice_count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </Link>

                  {/* Actions: Class Breakdown & All Students Direct Button */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <Link
                      href={`/dashboard/director/dues/${encodeURIComponent(branch.branch)}/all${childQs}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#5f2ea8] hover:bg-[#5f2ea8]/90 transition-all shadow-xs cursor-pointer"
                      title={`View all ${branch.student_count} overdue students in ${shortName}`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>All Students ({branch.student_count})</span>
                    </Link>

                    <Link
                      href={`/dashboard/director/dues/${encodeURIComponent(branch.branch)}${childQs}`}
                      className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Drill down by classes"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function DuesBranchPage() {
  return (
    <Suspense fallback={<GifLoader />}>
      <DuesBranchContent />
    </Suspense>
  );
}
