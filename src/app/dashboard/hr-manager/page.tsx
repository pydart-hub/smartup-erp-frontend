"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users, ClipboardCheck, CalendarDays, IndianRupee, FileText,
  UserPlus, ClipboardEdit, Receipt,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getEmployeeCount,
  getOpenLeaveCount,
  getPendingExpenseCount,
  getEmployeeAttendance,
  getLeaveApplications,
} from "@/lib/api/hr";
import { formatCurrency } from "@/lib/utils/formatters";
import { AnimatedNumber, AnimatedCurrency, AnimatedName } from "@/components/dashboard/AnimatedValue";
import { getSalarySlips } from "@/lib/api/hr";

const quickActions = [
  {
    label: "View Employees",
    description: "Browse & manage employee records",
    href: "/dashboard/hr-manager/employees",
    icon: <Users className="h-5 w-5" />,
    color: "primary" as const,
  },
  {
    label: "Mark Attendance",
    description: "Daily attendance for employees",
    href: "/dashboard/hr-manager/attendance",
    icon: <ClipboardEdit className="h-5 w-5" />,
    color: "info" as const,
  },
  {
    label: "Leave Requests",
    description: "Review & approve leave applications",
    href: "/dashboard/hr-manager/leaves",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "secondary" as const,
  },
  {
    label: "Expense Claims",
    description: "Approve pending expense claims",
    href: "/dashboard/hr-manager/expense-claims",
    icon: <Receipt className="h-5 w-5" />,
    color: "warning" as const,
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
  const today = new Date().toISOString().split("T")[0];

  // ── Stats queries ──
  const { data: employeeCount, isLoading: loadingEmployees } = useQuery({
    queryKey: ["hr-employee-count", defaultCompany],
    queryFn: () => getEmployeeCount(defaultCompany || undefined),
    staleTime: 60_000,
  });

  const { data: todayAttendanceRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["hr-attendance-today", today, defaultCompany],
    queryFn: () =>
      getEmployeeAttendance({
        date: today,
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
    staleTime: 300_000,
  });

  const { data: openLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ["hr-open-leaves", defaultCompany],
    queryFn: () => getOpenLeaveCount(defaultCompany || undefined),
    staleTime: 60_000,
  });

  const { data: pendingExpenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["hr-pending-expenses", defaultCompany],
    queryFn: () => getPendingExpenseCount(defaultCompany || undefined),
    staleTime: 60_000,
  });

  // ── Recent leave applications ──
  const { data: recentLeaves, isLoading: loadingRecentLeaves } = useQuery({
    queryKey: ["hr-recent-leaves", defaultCompany],
    queryFn: () =>
      getLeaveApplications({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        limit_page_length: 5,
      }),
    staleTime: 60_000,
  });

  // ── Recent salary slips ──
  const { data: recentSalarySlips, isLoading: loadingSalary } = useQuery({
    queryKey: ["hr-recent-salary", defaultCompany],
    queryFn: () =>
      getSalarySlips({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        limit_page_length: 5,
      }),
    staleTime: 60_000,
  });

  // ── Derived stats ──
  const attendanceRecords = todayAttendanceRes?.data ?? [];
  const presentCount = attendanceRecords.filter((a) => a.status === "Present").length;
  const totalMarked = attendanceRecords.length;
  const attendanceLabel = totalMarked > 0 ? `${presentCount}/${totalMarked}` : "Not marked";
  const attendancePct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  const totalPayroll = (recentSalarySlips?.data ?? []).reduce((sum, s) => sum + (s.net_pay || 0), 0);

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
              Here&apos;s your HR overview for today.
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
          title="Total Employees"
          value={loadingEmployees ? "…" : (employeeCount ?? 0)}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          loading={loadingEmployees}
          href="/dashboard/hr-manager/employees"
        />
        <StatsCard
          title="Today's Attendance"
          value={loadingAttendance ? "…" : attendanceLabel}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="info"
          loading={loadingAttendance}
          trend={totalMarked > 0 ? { value: attendancePct, label: "present" } : undefined}
          href="/dashboard/hr-manager/attendance"
        />
        <StatsCard
          title="Pending Leaves"
          value={loadingLeaves ? "…" : (openLeaves ?? 0)}
          icon={<CalendarDays className="h-5 w-5" />}
          color="warning"
          loading={loadingLeaves}
          href="/dashboard/hr-manager/leaves"
        />
        <StatsCard
          title="Pending Expenses"
          value={loadingExpenses ? "…" : (pendingExpenses ?? 0)}
          icon={<FileText className="h-5 w-5" />}
          color="error"
          loading={loadingExpenses}
          href="/dashboard/hr-manager/expense-claims"
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

          {/* Recent Leave Applications */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Leave Applications</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {openLeaves ?? 0} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRecentLeaves ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 bg-border-light rounded-[10px]" />
                    ))}
                  </div>
                ) : (recentLeaves?.data ?? []).length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">
                    No recent leave applications
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(recentLeaves?.data ?? []).map((leave) => (
                      <div
                        key={leave.name}
                        className="flex items-center justify-between bg-app-bg rounded-[10px] p-3 border border-border-light"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-wash flex items-center justify-center">
                            <CalendarDays className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {leave.employee_name}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {leave.leave_type} &middot; {leave.total_leave_days} day
                              {leave.total_leave_days !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            leave.status === "Approved"
                              ? "success"
                              : leave.status === "Rejected"
                                ? "error"
                                : "warning"
                          }
                          className="text-xs"
                        >
                          {leave.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Payroll Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Payroll</CardTitle>
                  <IndianRupee className="h-4 w-4 text-text-tertiary" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSalary ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 bg-border-light rounded-[10px]" />
                    ))}
                  </div>
                ) : (recentSalarySlips?.data ?? []).length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">
                    No recent salary slips
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-text-tertiary mb-1">Slips</p>
                      <p className="text-xl font-bold text-text-primary">
                        <AnimatedNumber value={(recentSalarySlips?.data ?? []).length} />
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-tertiary mb-1">Total Net Pay</p>
                      <p className="text-xl font-bold text-text-primary">
                        <AnimatedCurrency value={totalPayroll} />
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-tertiary mb-1">Avg Net Pay</p>
                      <p className="text-xl font-bold text-text-primary">
                        <AnimatedCurrency value={
                          (recentSalarySlips?.data ?? []).length > 0
                            ? totalPayroll / (recentSalarySlips?.data ?? []).length
                            : 0
                        } />
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column — Attendance Breakdown */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Today&apos;s Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-border-light rounded-[10px]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      label: "Present",
                      count: attendanceRecords.filter((a) => a.status === "Present").length,
                      color: "bg-success",
                    },
                    {
                      label: "Absent",
                      count: attendanceRecords.filter((a) => a.status === "Absent").length,
                      color: "bg-error",
                    },
                    {
                      label: "Half Day",
                      count: attendanceRecords.filter((a) => a.status === "Half Day").length,
                      color: "bg-warning",
                    },
                    {
                      label: "On Leave",
                      count: attendanceRecords.filter((a) => a.status === "On Leave").length,
                      color: "bg-info",
                    },
                    {
                      label: "Work From Home",
                      count: attendanceRecords.filter((a) => a.status === "Work From Home").length,
                      color: "bg-secondary",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between bg-app-bg rounded-[10px] p-3 border border-border-light"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-sm text-text-secondary">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">
                        {item.count}
                      </span>
                    </div>
                  ))}
                  {totalMarked === 0 && (
                    <p className="text-sm text-text-tertiary text-center py-4">
                      No attendance marked yet today
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
