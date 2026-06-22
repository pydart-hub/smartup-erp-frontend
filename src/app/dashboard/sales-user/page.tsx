"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  CalendarDays,
  TrendingUp,
  Building2,
  Loader2,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  Phone,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { AnimatedNumber, AnimatedCurrency, AnimatedName } from "@/components/dashboard/AnimatedValue";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStudentCount } from "@/lib/api/students";
import { getAllBranches, getActiveStudentCountForBranch, getDuesTodayTotal } from "@/lib/api/director";
import apiClient from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/formatters";
import { getSalesUserFollowUpDashboard } from "@/lib/api/followup";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function Tilt({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 30 });
  const sy = useSpring(y, { stiffness: 280, damping: 30 });
  const rx = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const ry = useTransform(sx, [-0.5, 0.5], [-8, 8]);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: "800px", rotateX: rx, rotateY: ry }}
      whileTap={{ scale: 0.975 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  badge: string;
  accent: string;
  loading?: boolean;
  href?: string;
  warn?: boolean;
}

function KpiCard({ title, value, sub, icon, badge, accent, loading, href, warn }: KpiCardProps) {
  const inner = (
    <div
      className={`relative h-full rounded-2xl bg-white border transition-all duration-300 overflow-hidden group ${
        warn ? "border-orange-200 shadow-orange-100/60 shadow-md" : "border-gray-100 shadow-sm hover:shadow-md"
      }`}
    >
      <div className={`absolute top-0 inset-x-0 h-[3px] ${accent}`} />
      <div className="p-5 pt-6">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${badge} mb-4`}>{icon}</div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{title}</p>
        <div className="text-[2rem] font-extrabold text-gray-900 leading-tight">
          {loading ? <span className="block w-24 h-8 bg-gray-100 rounded-lg animate-pulse" /> : value}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {href && (
          <div className="flex items-center gap-1 mt-4 text-[11px] font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
            <span>View details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

const ACCENTS = ["bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500"];

function BranchRow({
  branch,
  maxCount,
  index,
}: {
  branch: { name: string; abbr: string };
  maxCount: number;
  index: number;
}) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["su-branch-count", branch.name],
    queryFn: () => getActiveStudentCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const pct = maxCount > 0 && count != null ? Math.round((count / maxCount) * 100) : 0;
  const bar = ACCENTS[index % ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
    >
      <span className="w-5 text-center text-[10px] font-bold text-gray-300 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-gray-700 truncate">{shortName}</p>
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-gray-300" />
          ) : (
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              <AnimatedNumber value={count ?? 0} />
            </span>
          )}
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${bar}`}
            initial={{ width: 0 }}
            animate={{ width: isLoading ? "0%" : `${pct}%` }}
            transition={{ duration: 0.8, delay: index * 0.05, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function SalesUserDashboard() {
  const { user, defaultCompany } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const branchLabel = defaultCompany?.replace("Smart Up ", "") ?? "All Branches";

  const { data: todayCount, isLoading: loadingToday } = useQuery({
    queryKey: ["su-today", defaultCompany, today],
    queryFn: () => {
      const f: string[][] = [
        ["enabled", "=", "1"],
        ["creation", ">=", `${today} 00:00:00`],
        ["creation", "<=", `${today} 23:59:59`],
      ];
      if (defaultCompany) f.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(f);
    },
    staleTime: 30_000,
  });

  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ["su-overdue"],
    queryFn: () => getDuesTodayTotal(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: followUpData, isLoading: loadingFollowUp } = useQuery({
    queryKey: ["su-followup-dashboard"],
    queryFn: () => getSalesUserFollowUpDashboard(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: recentStudents, isLoading: loadingRecent } = useQuery({
    queryKey: ["su-recent", defaultCompany],
    queryFn: async () => {
      const f: string[][] = [["enabled", "=", "1"]];
      if (defaultCompany) f.push(["custom_branch", "=", defaultCompany]);
      const { data } = await apiClient.get("/resource/Student", {
        params: {
          filters: JSON.stringify(f),
          fields: JSON.stringify(["name", "student_name", "creation", "custom_branch"]),
          order_by: "creation desc",
          limit_page_length: 8,
        },
      });
      return (data.data ?? []) as Array<{
        name: string;
        student_name: string;
        creation: string;
        custom_branch?: string;
      }>;
    },
    staleTime: 30_000,
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ["su-all-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const { data: branchCounts = [] } = useQuery({
    queryKey: ["su-branch-counts", allBranches.map((b) => b.name)],
    queryFn: () => Promise.all(allBranches.map((b) => getActiveStudentCountForBranch(b.name))),
    enabled: allBranches.length > 0,
    staleTime: 120_000,
  });

  const maxBranchCount = branchCounts.length > 0 ? Math.max(...branchCounts) : 1;
  const hasOverdue = (overdueData?.total_dues ?? 0) > 0;

  const recentActivities: ActivityItem[] = (recentStudents ?? []).map((s) => ({
    id: s.name,
    type: "student_added" as const,
    message: `Admitted ${s.student_name}`,
    timestamp: s.creation,
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5 pb-8">
      <BreadcrumbNav />

      <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/70 bg-white/70 backdrop-blur-sm p-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <AnimatedName name={user?.full_name ?? "Sales User"} />
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {branchLabel} · Admissions, overdue follow-up, and conversion tracking
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/sales-user/followup" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors">
            <Phone className="h-4 w-4" />
            Follow-Up Dashboard
          </Link>
          <Link href="/dashboard/sales-user/new-admission" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-light bg-surface text-sm font-semibold text-text-primary hover:bg-brand-wash transition-colors">
            <UserPlus className="h-4 w-4" />
            New Admission
          </Link>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tilt>
          <KpiCard
            title="Today's Admissions"
            value={<AnimatedNumber value={todayCount ?? 0} />}
            icon={<CalendarDays className="h-5 w-5 text-sky-600" />}
            badge="bg-sky-50"
            accent="bg-sky-500"
            loading={loadingToday}
          />
        </Tilt>

        <Tilt>
          <KpiCard
            title="Today Calls"
            value={<AnimatedNumber value={followUpData?.summary.today_calls ?? 0} />}
            sub={`${followUpData?.summary.week_calls ?? 0} this week`}
            icon={<Phone className="h-5 w-5 text-emerald-600" />}
            badge="bg-emerald-50"
            accent="bg-emerald-500"
            loading={loadingFollowUp}
          />
        </Tilt>

        <Tilt>
          <KpiCard
            title="Converted"
            value={<AnimatedNumber value={followUpData?.summary.converted_count ?? 0} />}
            sub={formatCurrency(followUpData?.summary.paid_amount ?? 0)}
            icon={<CheckCircle2 className="h-5 w-5 text-violet-600" />}
            badge="bg-violet-50"
            accent="bg-violet-500"
            loading={loadingFollowUp}
          />
        </Tilt>

        <Tilt>
          <KpiCard
            title="Overdue Fees"
            value={<AnimatedCurrency value={overdueData?.total_dues ?? 0} />}
            sub={`${overdueData?.student_count ?? 0} students`}
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            badge="bg-orange-50"
            accent={hasOverdue ? "bg-orange-500" : "bg-gray-200"}
            loading={loadingOverdue}
            href="/dashboard/sales-user/fees/overdue"
            warn={hasOverdue}
          />
        </Tilt>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock3 className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending Follow-Ups</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{loadingFollowUp ? "..." : followUpData?.summary.pending_followups ?? 0}</p>
          <p className="text-xs text-text-secondary mt-1">Need callback or more action</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-sky-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-sky-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Students Contacted</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{loadingFollowUp ? "..." : followUpData?.summary.students_contacted ?? 0}</p>
          <p className="text-xs text-text-secondary mt-1">Across {loadingFollowUp ? "..." : followUpData?.summary.total_calls ?? 0} logged calls</p>
        </div>
        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-rose-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">No Answer / Busy</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{loadingFollowUp ? "..." : followUpData?.summary.no_answer_count ?? 0}</p>
          <p className="text-xs text-text-secondary mt-1">Calls needing another attempt</p>
        </div>
      </motion.div>

      {hasOverdue && (
        <motion.div variants={fadeUp} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/dashboard/sales-user/fees/overdue">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-200 hover:bg-orange-100/60 transition-all cursor-pointer group">
              <div className="relative shrink-0">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-orange-800">Fee Overdue â€” Till Today</span>
                <span className="text-sm text-orange-500 ml-2">
                  {formatCurrency(overdueData?.total_dues ?? 0)} Â· {overdueData?.student_count ?? 0} students
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-300 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Branch-wise Active Students</h3>
            </div>
            {allBranches.length > 0 && <span className="text-xs text-gray-400 font-medium">{allBranches.length} branches</span>}
          </div>

          {allBranches.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : (
            <div>
              {allBranches.map((branch, idx) => (
                <BranchRow key={branch.name} branch={branch} maxCount={maxBranchCount} index={idx} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Phone className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Recent Call History</h3>
          </div>
          {loadingFollowUp ? (
            <RecentActivity activities={[]} loading />
          ) : !(followUpData?.recent_logs?.length) ? (
            <div className="text-center py-8">
              <p className="text-sm text-text-tertiary">No follow-up calls logged yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpData.recent_logs.slice(0, 8).map((log, index) => (
                <motion.div
                  key={log.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded-[10px] hover:bg-app-bg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-teal-50 text-teal-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{log.student_name || log.student}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {log.call_status}
                      {log.payment_received || log.call_status === "Already Paid" ? " â€¢ Converted" : ""}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Recent Admissions</h3>
          </div>
          <RecentActivity activities={recentActivities} loading={loadingRecent} />
        </div>
      </motion.div>
    </motion.div>
  );
}
