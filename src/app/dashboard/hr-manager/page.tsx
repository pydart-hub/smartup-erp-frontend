"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users, IndianRupee, TrendingDown, Coins,
  UserPlus, PlayCircle, CalendarDays, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/formatters";
import { AnimatedNumber, AnimatedCurrency, AnimatedName } from "@/components/dashboard/AnimatedValue";
import {
  getSalaryRecords,
  getRecentPeriods,
  formatPeriod,
} from "@/lib/api/salary";
import { getEmployees } from "@/lib/api/employees";

const quickActions = [
  {
    label: "Manage Staff",
    description: "Add & manage branch staff",
    href: "/dashboard/hr-manager/salary/staff",
    icon: <UserPlus className="h-5 w-5" />,
    color: "primary" as const,
  },
  {
    label: "Process Salary",
    description: "Generate monthly salary records",
    href: "/dashboard/hr-manager/salary/process",
    icon: <PlayCircle className="h-5 w-5" />,
    color: "info" as const,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function HRManagerDashboard() {
  const { user, defaultCompany } = useAuth();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const periods = getRecentPeriods(3);

  // ── Active employees ──
  const { data: staffRes, isLoading: loadingStaff } = useQuery({
    queryKey: ["hr-salary-staff", defaultCompany],
    queryFn: () =>
      getEmployees({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        status: "Active",
        limit_page_length: 300,
      }),
    staleTime: 60_000,
  });

  // ── Current month salary records ──
  const { data: currentRecordsRes, isLoading: loadingCurrent } = useQuery({
    queryKey: ["hr-salary-records", defaultCompany, currentYear, currentMonth],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        salary_year: currentYear,
        salary_month: currentMonth,
      }),
    staleTime: 30_000,
  });

  const staff = staffRes?.data ?? [];
  const currentRecords = currentRecordsRes?.data ?? [];

  const stats = useMemo(() => {
    const totalBasic = staff.reduce((s, e) => s + (e.custom_basic_salary ?? 0), 0);
    const totalNet = currentRecords.reduce((s, r) => s + r.net_salary, 0);
    const totalLop = currentRecords.reduce((s, r) => s + r.lop_deduction, 0);
    const paidCount = currentRecords.filter((r) => r.status === "Paid").length;
    return { totalBasic, totalNet, totalLop, paidCount };
  }, [staff, currentRecords]);

  const currentLabel = formatPeriod(currentMonth, currentYear);
  const isGenerated = currentRecords.length > 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                Welcome back,{" "}
              </motion.span>
              <AnimatedName name={user?.full_name?.split(" ")[0] || "HR Manager"} />
            </h1>
            <motion.p className="text-text-secondary text-sm mt-0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }}>
              Here&apos;s your salary overview for today.
            </motion.p>
          </div>
          <Badge variant="default" className="self-start px-3 py-1 text-sm">
            HR Manager
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Staff"
          value={loadingStaff ? "…" : staff.length}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          loading={loadingStaff}
          href="/dashboard/hr-manager/salary/staff"
        />
        <StatsCard
          title="Total Basic / Month"
          value={loadingStaff ? "…" : formatCurrency(stats.totalBasic)}
          icon={<Coins className="h-5 w-5" />}
          color="info"
          loading={loadingStaff}
          href="/dashboard/hr-manager/salary"
        />
        <StatsCard
          title={`Net Pay — ${currentLabel}`}
          value={loadingCurrent ? "…" : (isGenerated ? formatCurrency(stats.totalNet) : "—")}
          icon={<IndianRupee className="h-5 w-5" />}
          color="success"
          loading={loadingCurrent}
          href={`/dashboard/hr-manager/salary/${currentYear}/${currentMonth}`}
        />
        <StatsCard
          title={`LOP Deductions — ${currentLabel}`}
          value={loadingCurrent ? "…" : (isGenerated ? formatCurrency(stats.totalLop) : "—")}
          icon={<TrendingDown className="h-5 w-5" />}
          color="error"
          loading={loadingCurrent}
          href={`/dashboard/hr-manager/salary/${currentYear}/${currentMonth}`}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickActions actions={quickActions} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Month Status */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Month — {currentLabel}</CardTitle>
                  {isGenerated ? (
                    <Badge variant="success" className="text-xs">Generated</Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">Not Generated</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingCurrent || loadingStaff ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-border-light rounded-[10px]" />)}
                  </div>
                ) : !isGenerated ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-text-tertiary">
                      Salary records for {currentLabel} have not been generated yet.
                    </p>
                    <Link href="/dashboard/hr-manager/salary/process">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                        <PlayCircle className="h-4 w-4" />
                        Generate Now
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-surface-secondary rounded-lg">
                        <p className="text-lg font-bold text-text-primary">{currentRecords.length}</p>
                        <p className="text-xs text-text-tertiary">Total Staff</p>
                      </div>
                      <div className="p-3 bg-success-light rounded-lg">
                        <p className="text-lg font-bold text-success">{stats.paidCount}</p>
                        <p className="text-xs text-text-tertiary">Paid</p>
                      </div>
                      <div className="p-3 bg-warning-light rounded-lg">
                        <p className="text-lg font-bold text-warning">
                          {currentRecords.length - stats.paidCount}
                        </p>
                        <p className="text-xs text-text-tertiary">Draft</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    {currentRecords.length > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-text-tertiary mb-1">
                          <span>Payment Progress</span>
                          <span>{Math.round((stats.paidCount / currentRecords.length) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all duration-700"
                            style={{ width: `${(stats.paidCount / currentRecords.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Link
                      href={`/dashboard/hr-manager/salary/${currentYear}/${currentMonth}`}
                      className="flex items-center justify-between p-3 bg-app-bg rounded-[10px] border border-border-light hover:border-primary/40 transition-colors group"
                    >
                      <span className="text-sm font-medium text-text-primary">Open Salary Sheet</span>
                      <span className="text-text-tertiary group-hover:text-primary transition-colors">→</span>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column — Recent Periods */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recent Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {periods.map((period) => (
                  <Link
                    key={`${period.year}-${period.month}`}
                    href={`/dashboard/hr-manager/salary/${period.year}/${period.month}`}
                  >
                    <div className="flex items-center justify-between p-3 bg-app-bg rounded-[10px] border border-border-light hover:border-primary/40 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-text-tertiary" />
                        <span className="text-sm text-text-secondary">{period.label}</span>
                      </div>
                      <span className="text-text-tertiary group-hover:text-primary transition-colors text-xs">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

