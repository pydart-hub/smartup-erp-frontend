"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

export default function DuesBranchPage() {
  const [asOf, setAsOf] = useState(todayISO);
  const isToday = asOf === todayISO;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAsOf(e.target.value || todayISO);
  };

  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-dues-branches", asOf],
    queryFn: () => getDuesTodayByBranch(isToday ? undefined : asOf),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const totalDues = (branches ?? []).reduce((s, b) => s + b.total_dues, 0);
  const totalStudents = (branches ?? []).reduce((s, b) => s + b.student_count, 0);

  // Build query string for child links
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
            {isToday ? "Dues Till Today" : `Dues Till ${formatDisplayDate(asOf)}`}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Overdue instalments where due date has passed — branch-wise breakdown
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
            onChange={handleDateChange}
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
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
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
        <motion.div key={asOf} initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {branches.map((branch) => {
            const shortName = branch.branch.replace("Smart Up ", "").replace("Smart Up", "HQ");
            return (
              <motion.div key={branch.branch} variants={itemVariants}>
                <Link href={`/dashboard/director/dues/${encodeURIComponent(branch.branch)}${childQs}`}>
                  <div className="flex items-center gap-3 p-4 rounded-[10px] border border-border-light hover:border-orange-300/50 hover:shadow-sm transition-all cursor-pointer bg-surface">
                    <div className="w-10 h-10 rounded-lg bg-brand-wash flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{shortName}</p>
                      <p className="text-xs text-text-tertiary">
                        {branch.student_count} student{branch.student_count !== 1 ? "s" : ""} with overdue
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(branch.total_dues)}
                      </p>
                      <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200">
                        {branch.invoice_count} invoice{branch.invoice_count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
