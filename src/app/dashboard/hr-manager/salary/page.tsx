"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users, IndianRupee, CalendarDays, ChevronRight,
  Loader2, AlertCircle, UserPlus, FileText, Coins,
  TrendingUp, Clock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSalaryRecords,
  formatPeriod,
} from "@/lib/api/salary";
import { getEmployees } from "@/lib/api/employees";
import { formatCurrency } from "@/lib/utils/formatters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const quickActions = [
  {
    label: "Manage Staff",
    description: "Add or edit branch staff members",
    href: "/dashboard/hr-manager/salary/staff",
    icon: <Users className="h-5 w-5" />,
    color: "bg-primary text-white",
  },
  {
    label: "Process Salary",
    description: "Generate monthly salary records",
    href: "/dashboard/hr-manager/salary/process",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "bg-success text-white",
  },
];

export default function HRSalaryHubPage() {
  const { defaultCompany } = useAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentPeriodLabel = formatPeriod(currentMonth, currentYear);

  // Previous month for comparison
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const prevPeriodLabel = formatPeriod(prevMonth, prevYear);

  // ── Staff list ──
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
  const { data: currentRes, isLoading: loadingCurrent } = useQuery({
    queryKey: ["hr-salary-records", defaultCompany, currentYear, currentMonth],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        salary_year: currentYear,
        salary_month: currentMonth,
      }),
    staleTime: 60_000,
  });

  // ── Previous month salary records ──
  const { data: prevRes } = useQuery({
    queryKey: ["hr-salary-records", defaultCompany, prevYear, prevMonth],
    queryFn: () =>
      getSalaryRecords({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        salary_year: prevYear,
        salary_month: prevMonth,
      }),
    staleTime: 120_000,
  });

  const staff = staffRes?.data ?? [];
  const currentRecords = currentRes?.data ?? [];
  const prevRecords = prevRes?.data ?? [];

  const stats = useMemo(() => {
    const totalStaff = staff.length;
    const totalBasic = staff.reduce((s: number, e) => s + (e.custom_basic_salary ?? 0), 0);

    const currentNet = currentRecords.reduce((s, r) => s + r.net_salary, 0);
    const currentLop = currentRecords.reduce((s, r) => s + r.lop_deduction, 0);
    const paidCount = currentRecords.filter((r) => r.status === "Paid").length;
    const draftCount = currentRecords.filter((r) => r.status === "Draft").length;

    const prevNet = prevRecords.reduce((s, r) => s + r.net_salary, 0);

    return {
      totalStaff,
      totalBasic,
      currentNet,
      currentLop,
      paidCount,
      draftCount,
      prevNet,
      isGenerated: currentRecords.length > 0,
    };
  }, [staff, currentRecords, prevRecords]);

  const isLoading = loadingStaff || loadingCurrent;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Salary Management</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {defaultCompany
                ? defaultCompany.replace("Smart Up ", "")
                : "All Branches"}{" "}
              · Staff salary &amp; Loss of Pay tracking
            </p>
          </div>
          <Link href="/dashboard/hr-manager/salary/staff/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {isLoading ? (
        <motion.div variants={itemVariants} className="flex items-center gap-2 text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.totalStaff}</p>
                  <p className="text-xs text-text-tertiary">Active Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
                  <Coins className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(stats.totalBasic)}
                  </p>
                  <p className="text-xs text-text-tertiary">Total Basic / Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {stats.isGenerated ? formatCurrency(stats.currentNet) : "—"}
                  </p>
                  <p className="text-xs text-text-tertiary">Net Pay · {currentPeriodLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-error-light flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {stats.isGenerated ? formatCurrency(stats.currentLop) : "—"}
                  </p>
                  <p className="text-xs text-text-tertiary">LOP Deductions · {currentPeriodLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Month Status */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {currentPeriodLabel} — Salary Status
              </CardTitle>
              {stats.isGenerated && (
                <Link
                  href={`/dashboard/hr-manager/salary/${currentYear}/${currentMonth}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View Sheet <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!stats.isGenerated ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">Not yet generated</p>
                  <p className="text-sm text-text-secondary mt-1">
                    Salary records for {currentPeriodLabel} haven&apos;t been created yet.
                  </p>
                </div>
                <Link href="/dashboard/hr-manager/salary/process">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate {currentPeriodLabel} Salary
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Records generated</span>
                  <span className="font-medium text-text-primary">
                    {currentRecords.length} / {stats.totalStaff} staff
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Paid</span>
                  <Badge variant="success">{stats.paidCount}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Draft / Pending</span>
                  <Badge variant="warning">{stats.draftCount}</Badge>
                </div>
                {/* Progress bar */}
                {stats.paidCount + stats.draftCount > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{
                          width: `${(stats.paidCount / (stats.paidCount + stats.draftCount)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      {Math.round(
                        (stats.paidCount / (stats.paidCount + stats.draftCount)) * 100
                      )}
                      % paid
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">{action.label}</p>
                    <p className="text-xs text-text-secondary truncate">{action.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Periods */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Recent Salary Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { year: currentYear, month: currentMonth, label: currentPeriodLabel },
                { year: prevYear, month: prevMonth, label: prevPeriodLabel },
              ].map((period) => (
                <Link
                  key={`${period.year}-${period.month}`}
                  href={`/dashboard/hr-manager/salary/${period.year}/${period.month}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-secondary transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm font-medium text-text-primary">{period.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
