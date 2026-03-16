"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  GraduationCap,
  CalendarDays,
  TrendingUp,
  Building2,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStudentCount } from "@/lib/api/students";
import { getAllBranches, getActiveStudentCountForBranch } from "@/lib/api/director";
import apiClient from "@/lib/api/client";

// ── Branch-wise count row ─────────────────────────────────
function BranchCountRow({
  branch,
  maxCount,
}: {
  branch: { name: string; abbr: string };
  maxCount: number;
}) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["sales-branch-active-count", branch.name],
    queryFn: () => getActiveStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const pct = maxCount > 0 && count != null ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-light last:border-0">
      <div className="w-8 h-8 rounded-[8px] bg-brand-wash flex items-center justify-center flex-shrink-0">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-text-primary truncate">{shortName}</p>
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />
          ) : (
            <span className="text-sm font-bold text-text-primary tabular-nums">{count ?? 0}</span>
          )}
        </div>
        <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: isLoading ? "0%" : `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  {
    label: "New Admission",
    description: "Register a new student",
    href: "/dashboard/sales-user/admit",
    icon: <UserPlus className="h-5 w-5" />,
    color: "primary" as const,
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

export default function SalesUserDashboard() {
  const { user, defaultCompany } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";

  // Total active students at this branch
  const { data: totalStudents, isLoading: loadingTotal } = useQuery({
    queryKey: ["sales-dashboard-total", defaultCompany],
    queryFn: () => {
      const filters: string[][] = [["enabled", "=", "1"]];
      if (defaultCompany) filters.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(filters);
    },
    staleTime: 60_000,
  });

  // Students admitted today
  const { data: todayCount, isLoading: loadingToday } = useQuery({
    queryKey: ["sales-dashboard-today", defaultCompany, today],
    queryFn: () => {
      const filters: string[][] = [
        ["enabled", "=", "1"],
        ["creation", ">=", `${today} 00:00:00`],
        ["creation", "<=", `${today} 23:59:59`],
      ];
      if (defaultCompany) filters.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(filters);
    },
    staleTime: 30_000,
  });

  // Students admitted this month
  const { data: monthCount, isLoading: loadingMonth } = useQuery({
    queryKey: ["sales-dashboard-month", defaultCompany, monthStart],
    queryFn: () => {
      const filters: string[][] = [
        ["enabled", "=", "1"],
        ["creation", ">=", `${monthStart} 00:00:00`],
      ];
      if (defaultCompany) filters.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(filters);
    },
    staleTime: 60_000,
  });

  // Recent admissions (last 10)
  const { data: recentStudents, isLoading: loadingRecent } = useQuery({
    queryKey: ["sales-dashboard-recent", defaultCompany],
    queryFn: async () => {
      const filters: string[][] = [["enabled", "=", "1"]];
      if (defaultCompany) filters.push(["custom_branch", "=", defaultCompany]);
      const { data } = await apiClient.get("/resource/Student", {
        params: {
          filters: JSON.stringify(filters),
          fields: JSON.stringify(["name", "student_name", "creation", "custom_branch"]),
          order_by: "creation desc",
          limit_page_length: 10,
        },
      });
      return data.data ?? [];
    },
    staleTime: 30_000,
  });

  // Convert recents to activity items
  const recentActivities: ActivityItem[] = (recentStudents ?? []).map(
    (s: { name: string; student_name: string; creation: string }) => ({
      id: s.name,
      type: "student_added" as const,
      message: `Admitted ${s.student_name}`,
      timestamp: s.creation,
    })
  );

  // All branches for branch-wise count
  const { data: allBranches = [] } = useQuery({
    queryKey: ["sales-all-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  // Per-branch active counts (fetched inside BranchCountRow, but we need max for bar scaling)
  // We pre-fetch all counts here to compute the max
  const { data: branchCounts = [] } = useQuery({
    queryKey: ["sales-all-branch-counts", allBranches.map((b) => b.name)],
    queryFn: () => Promise.all(allBranches.map((b) => getActiveStudentCountForBranch(b.name))),
    enabled: allBranches.length > 0,
    staleTime: 120_000,
  });

  const maxBranchCount = branchCounts.length > 0 ? Math.max(...branchCounts) : 1;

  const branchLabel = defaultCompany
    ? defaultCompany.replace("Smart Up ", "")
    : "Your Branch";

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
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {user?.full_name?.split(" ")[0] ?? "Sales User"}
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {branchLabel} — Admissions Dashboard
        </p>
      </motion.div>

      {/* Quick Action */}
      <motion.div variants={itemVariants}>
        <QuickActions actions={quickActions} />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Today's Admissions"
          value={todayCount ?? 0}
          icon={<CalendarDays className="h-5 w-5" />}
          loading={loadingToday}
        />
        <StatsCard
          title="This Month"
          value={monthCount ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loadingMonth}
        />
        <StatsCard
          title="Total Active Students"
          value={totalStudents ?? 0}
          icon={<GraduationCap className="h-5 w-5" />}
          loading={loadingTotal}
        />
      </motion.div>

      {/* Branch-wise Student Count */}
      {allBranches.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-text-primary">Branch-wise Active Students</h3>
              </div>
              <div>
                {allBranches.map((branch) => (
                  <BranchCountRow
                    key={branch.name}
                    branch={branch}
                    maxCount={maxBranchCount}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Admissions */}
      <motion.div variants={itemVariants}>
        <RecentActivity
          activities={recentActivities}
          loading={loadingRecent}
        />
      </motion.div>
    </motion.div>
  );
}
