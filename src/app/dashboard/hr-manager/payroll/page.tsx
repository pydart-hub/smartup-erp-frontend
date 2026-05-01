"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, TrendingDown, Users,
  Loader2, AlertCircle, FileText, ChevronRight, Coins,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSalaryRecords, formatPeriod } from "@/lib/api/salary";
import type { SmartUpSalaryRecord } from "@/lib/types/salary";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

interface PeriodSummary {
  year: number;
  month: number;
  label: string;
  records: SmartUpSalaryRecord[];
  totalBasic: number;
  totalLop: number;
  totalNet: number;
  paidCount: number;
  staffCount: number;
}

export default function HRPayrollPage() {
  const { defaultCompany } = useAuth();

  const { data: recordsRes, isLoading, isError } = useQuery({
    queryKey: ["hr-payroll-all-records", defaultCompany],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        limit_page_length: 500,
      }),
    staleTime: 30_000,
  });

  const records = recordsRes?.data ?? [];

  const periodSummaries = useMemo<PeriodSummary[]>(() => {
    const map = new Map<string, PeriodSummary>();
    for (const r of records) {
      const key = `${r.salary_year}-${String(r.salary_month).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, {
          year: r.salary_year,
          month: r.salary_month,
          label: formatPeriod(r.salary_month, r.salary_year),
          records: [],
          totalBasic: 0,
          totalLop: 0,
          totalNet: 0,
          paidCount: 0,
          staffCount: 0,
        });
      }
      const entry = map.get(key)!;
      entry.records.push(r);
      entry.totalBasic += r.basic_salary;
      entry.totalLop += r.lop_deduction;
      entry.totalNet += r.net_salary;
      entry.staffCount += 1;
      if (r.status === "Paid") entry.paidCount += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [records]);

  const grandTotals = useMemo(() => ({
    totalNet: periodSummaries.reduce((s, p) => s + p.totalNet, 0),
    totalLop: periodSummaries.reduce((s, p) => s + p.totalLop, 0),
    totalRecords: records.length,
    periodCount: periodSummaries.length,
  }), [periodSummaries, records]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Payroll History</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Month-wise salary disbursement records
            </p>
          </div>
          <Link href="/dashboard/hr-manager/salary/process">
            <Button>
              <CalendarDays className="h-4 w-4 mr-2" />
              Process New Month
            </Button>
          </Link>
        </div>
      </motion.div>

      {!isLoading && records.length > 0 && (
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <CalendarDays className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-text-primary">{grandTotals.periodCount}</p>
              <p className="text-xs text-text-tertiary">Months Processed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-4 w-4 text-info mx-auto mb-1" />
              <p className="text-2xl font-bold text-text-primary">{grandTotals.totalRecords}</p>
              <p className="text-xs text-text-tertiary">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Coins className="h-4 w-4 text-success mx-auto mb-1" />
              <p className="text-sm font-bold text-text-primary">{formatCurrency(grandTotals.totalNet)}</p>
              <p className="text-xs text-text-tertiary">Total Net Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-4 w-4 text-error mx-auto mb-1" />
              <p className="text-sm font-bold text-error">{formatCurrency(grandTotals.totalLop)}</p>
              <p className="text-xs text-text-tertiary">Total LOP Deducted</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading payroll history...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20 gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load records</span>
          </div>
        ) : periodSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
              <CalendarDays className="h-12 w-12 text-text-tertiary opacity-20" />
              <div>
                <p className="font-semibold text-text-primary text-lg">No payroll records yet</p>
                <p className="text-sm text-text-secondary mt-1">
                  Generate your first monthly salary to see history here.
                </p>
              </div>
              <Link href="/dashboard/hr-manager/salary/process">
                <Button>Process First Month</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {periodSummaries.map((period) => {
              return (
                <motion.div key={`${period.year}-${period.month}`} variants={itemVariants} initial="hidden" animate="visible">
                  <Link
                    href={`/dashboard/hr-manager/salary/${period.year}/${period.month}`}
                  >
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-brand-wash flex items-center justify-center flex-shrink-0">
                              <CalendarDays className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                                {period.label}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-text-tertiary flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {period.staffCount} staff
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
                            <div>
                              <p className="text-xs text-text-tertiary mb-0.5">Basic</p>
                              <p className="text-sm font-semibold text-text-primary">
                                {formatCurrency(period.totalBasic)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-text-tertiary mb-0.5">LOP</p>
                              <p
                                className={`text-sm font-semibold ${
                                  period.totalLop > 0 ? "text-error" : "text-text-tertiary"
                                }`}
                              >
                                {period.totalLop > 0
                                  ? `- ${formatCurrency(period.totalLop)}`
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-text-tertiary mb-0.5">Net Pay</p>
                              <p className="text-sm font-bold text-success">
                                {formatCurrency(period.totalNet)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end sm:w-8">
                            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
