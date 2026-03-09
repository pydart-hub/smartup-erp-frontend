"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  IndianRupee,
  UserPlus,
  School,
  CalendarDays,
  FileText,
  TrendingUp,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import { getStudentGroups, getBatchEnrollmentCounts, getRecentEnrollments } from "@/lib/api/enrollment";
import { getStudentCount } from "@/lib/api/students";
import { getAttendance } from "@/lib/api/attendance";
import { getEmployeeAttendance } from "@/lib/api/employees";
import { getSalesStats } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils/formatters";

const quickActions = [
  {
    label: "Add New Student",
    description: "Create student profile & admission",
    href: "/dashboard/branch-manager/students/new",
    icon: <UserPlus className="h-5 w-5" />,
    color: "primary" as const,
  },
  {
    label: "Mark Attendance",
    description: "Daily attendance for batches",
    href: "/dashboard/branch-manager/attendance",
    icon: <CalendarDays className="h-5 w-5" />,
    color: "info" as const,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BranchManagerDashboard() {
  const { user, defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();
  const today = new Date().toISOString().split("T")[0];

  // ── Real Frappe API queries (filtered by branch) ───────────
  // Total active students for this branch (raw Student count)
  const { data: studentCount, isLoading: loadingStudents } = useQuery({
    queryKey: ["dashboard-student-count", defaultCompany],
    queryFn: () => {
      const filters: string[][] = [["enabled", "=", "1"]];
      if (defaultCompany) filters.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(filters);
    },
    staleTime: 60_000,
  });

  const { data: studentGroupsRes, isLoading: loadingGroups } = useQuery({
    queryKey: ["dashboard-student-groups", defaultCompany, selectedYear],
    queryFn: () =>
      getStudentGroups({
        limit_page_length: 500,
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
        academic_year: selectedYear,
      }),
    staleTime: 60_000,
  });

  const { data: todayAttendanceRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["dashboard-attendance-today", today, defaultCompany],
    queryFn: () =>
      getAttendance(today, defaultCompany ? { custom_branch: defaultCompany } : undefined),
    staleTime: 300_000,
  });

  const { data: staffAttendanceRes, isLoading: loadingStaffAttendance } = useQuery({
    queryKey: ["dashboard-staff-attendance-today", today, defaultCompany],
    queryFn: () =>
      getEmployeeAttendance({
        date: today,
        ...(defaultCompany ? { company: defaultCompany } : {}),
      }),
    staleTime: 300_000,
  });

  const { data: salesStats, isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard-sales-stats", defaultCompany],
    queryFn: () => getSalesStats(defaultCompany || undefined),
    staleTime: 300_000,
  });

  const { data: recentEnrollmentsRes, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-enrollments", defaultCompany, selectedYear],
    queryFn: () =>
      getRecentEnrollments({
        company: defaultCompany || undefined,
        academic_year: selectedYear,
        limit: 8,
      }),
    staleTime: 60_000,
  });

  const { data: batchEnrollmentCounts } = useQuery({
    queryKey: ["dashboard-batch-enrollment-counts", defaultCompany, selectedYear],
    queryFn: () => getBatchEnrollmentCounts(defaultCompany || undefined, selectedYear),
    staleTime: 60_000,
  });

  // ── Derived stats ────────────────────────────────────────
  const allGroups = studentGroupsRes?.data ?? [];
  const activeBatches = allGroups.filter((g) => !g.disabled).length;

  const todayRecords = todayAttendanceRes?.data ?? [];
  const todayPresent = todayRecords.filter((a) => a.status === "Present").length;
  const todayTotal = todayRecords.length;
  const studentAttendanceLabel = todayTotal > 0
    ? `${todayPresent}/${todayTotal}`
    : "Not marked";

  const staffRecords = staffAttendanceRes?.data ?? [];
  const staffPresent = staffRecords.filter((a) => a.status === "Present").length;
  const staffTotal = staffRecords.length;
  const staffAttendanceLabel = staffTotal > 0
    ? `${staffPresent}/${staffTotal}`
    : "Not marked";

  const outstandingFees = salesStats?.total_outstanding ?? 0;
  const collectionRate = salesStats?.collection_rate ?? 0;

  // ── Recent enrollments as activity items (year-filtered) ─────────────────
  const recentActivities: ActivityItem[] = useMemo(
    () =>
      (recentEnrollmentsRes ?? []).map((pe) => {
        // Derive short branch name from batch code prefix (e.g. "VYT-10th-25-1" → "Vyttila")
        // Fall back to the raw batch name if lookup fails.
        const matchedGroup = allGroups.find((g) => g.name === pe.student_batch_name);
        const branchLabel = matchedGroup?.custom_branch
          ? matchedGroup.custom_branch.replace(/^Smart Up\s*/i, "")
          : pe.student_batch_name || "";
        return {
          id: pe.name,
          type: "student_added" as const,
          message: `${pe.student_name} admitted${branchLabel ? ` to ${branchLabel}` : ""}`,
          timestamp: pe.creation ?? new Date().toISOString(),
        };
      }),
    [recentEnrollmentsRes, allGroups]
  );

  // ── Group student groups by program for batch overview ──────────
  const batchOverview = useMemo(() => {
    const groups = allGroups.filter((g) => !g.disabled && g.program);
    const byProgram = new Map<string, typeof groups>();
    groups.forEach((g) => {
      const prog = g.program!;
      if (!byProgram.has(prog)) byProgram.set(prog, []);
      byProgram.get(prog)!.push(g);
    });
    return Array.from(byProgram.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([program, groupList]) => ({
        program,
        groups: groupList.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [allGroups]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {user?.full_name?.split(" ")[0] || "Manager"}
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Here&apos;s what&apos;s happening at your branch today.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <Badge variant="default" className="px-3 py-1 text-sm">
              Branch Manager
            </Badge>
            {defaultCompany && (
              <span className="text-xs text-text-tertiary">
                {defaultCompany.replace(/^Smart Up\s*/i, "")}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={loadingStudents ? "…" : (studentCount ?? 0)}
          icon={<GraduationCap className="h-5 w-5" />}
          color="primary"
          loading={loadingStudents}
          href="/dashboard/branch-manager/students"
        />
        <StatsCard
          title="Student Attendance"
          value={loadingAttendance ? "…" : studentAttendanceLabel}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="info"
          loading={loadingAttendance}
          trend={todayTotal > 0 ? { value: Math.round((todayPresent / todayTotal) * 100), label: "present" } : undefined}
          href="/dashboard/branch-manager/attendance"
        />
        <StatsCard
          title="Staff Attendance"
          value={loadingStaffAttendance ? "…" : staffAttendanceLabel}
          icon={<Users className="h-5 w-5" />}
          color="secondary"
          loading={loadingStaffAttendance}
          trend={staffTotal > 0 ? { value: Math.round((staffPresent / staffTotal) * 100), label: "present" } : undefined}
          href="/dashboard/branch-manager/employee-attendance"
        />
        <StatsCard
          title="Outstanding Fees"
          value={loadingSales ? "…" : formatCurrency(outstandingFees)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="warning"
          trend={collectionRate > 0 ? { value: Math.round(collectionRate), label: "collected" } : undefined}
          loading={loadingSales}
          href="/dashboard/branch-manager/fees"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions + Batch Overview (2 cols) */}
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

          {/* Batch Overview */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Batch Overview</CardTitle>
                  <Badge variant="outline" className="text-xs">{activeBatches} batches</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingGroups ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="h-4 w-32 bg-border-light rounded mb-3" />
                        <div className="grid grid-cols-3 gap-2 ml-6">
                          {[1, 2, 3].map((j) => <div key={j} className="h-20 bg-border-light rounded-[10px]" />)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : batchOverview.length === 0 ? (
                  <p className="text-sm text-text-tertiary text-center py-8">No batches found</p>
                ) : (
                  <div className="space-y-5">
                    {batchOverview.map(({ program, groups }) => (
                      <div key={program}>
                        <div className="flex items-center gap-2 mb-2">
                          <School className="h-4 w-4 text-text-tertiary" />
                          <span className="text-sm font-semibold text-text-primary">{program}</span>
                          <span className="text-xs text-text-tertiary">({groups.length} batch{groups.length !== 1 ? "es" : ""})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                          {groups.map((group) => {
                            const enrolled = batchEnrollmentCounts?.get(group.name) ?? 0;
                            const maxStr = group.max_strength ?? 60;
                            const pct = maxStr > 0 ? Math.min((enrolled / maxStr) * 100, 100) : 0;
                            const isFull = enrolled >= maxStr;
                            return (
                              <div key={group.name} className="bg-app-bg rounded-[12px] p-4 border border-border-light">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-text-primary truncate max-w-[160px]" title={group.name}>
                                    {group.name}
                                  </span>
                                  {isFull
                                    ? <Badge variant="error" className="text-xs px-2 py-0.5 shrink-0">Full</Badge>
                                    : <Badge variant="success" className="text-xs px-2 py-0.5 shrink-0">Open</Badge>}
                                </div>
                                <div className="text-sm font-medium text-text-primary mb-2">{enrolled}/{maxStr} students</div>
                                <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                      isFull ? "bg-error" : pct > 80 ? "bg-warning" : "bg-primary"
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Fee Collection Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fee Collection Summary</CardTitle>
                  <TrendingUp className="h-4 w-4 text-text-tertiary" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-border-light rounded-[10px]" />)}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary mb-1">Total Orders</p>
                        <p className="text-xl font-bold text-text-primary">{salesStats?.total_orders ?? 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary mb-1">Total Invoiced</p>
                        <p className="text-xl font-bold text-text-primary">{formatCurrency(salesStats?.total_invoiced ?? 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary mb-1">Outstanding</p>
                        <p className="text-xl font-bold text-warning">{formatCurrency(outstandingFees)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-text-tertiary mb-1">Collection Rate</p>
                        <p className="text-xl font-bold text-success">{Math.round(collectionRate)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-text-tertiary mb-1">
                        <span>Collection Progress</span>
                        <span>{Math.round(collectionRate)}%</span>
                      </div>
                      <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(collectionRate, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-success"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity (1 col) */}
        <motion.div variants={itemVariants}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Recently Admitted</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivity activities={recentActivities} loading={loadingRecent} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
