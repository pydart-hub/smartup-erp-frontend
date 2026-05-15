"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  GraduationCap,
  CalendarDays,
  TrendingUp,
  Building2,
  Loader2,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import {
  AnimatedNumber,
  AnimatedCurrency,
  AnimatedName,
} from "@/components/dashboard/AnimatedValue";
import {
  RecentActivity,
  type ActivityItem,
} from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStudentCount } from "@/lib/api/students";
import {
  getAllBranches,
  getActiveStudentCountForBranch,
  getDuesTodayTotal,
} from "@/lib/api/director";
import apiClient from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/formatters";

// ── Stagger container ──────────────────────────────────────────────────────
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

// ── 3-D tilt card wrapper ──────────────────────────────────────────────────
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

// ── KPI card ───────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  /** Tailwind bg + text classes for the icon badge  */
  badge: string;
  /** Optional accent line color, e.g. "bg-sky-500" */
  accent: string;
  loading?: boolean;
  href?: string;
  warn?: boolean;
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  badge,
  accent,
  loading,
  href,
  warn,
}: KpiCardProps) {
  const inner = (
    <div
      className={`relative h-full rounded-2xl bg-white border transition-all duration-300
        overflow-hidden group
        ${warn ? "border-orange-200 shadow-orange-100/60 shadow-md" : "border-gray-100 shadow-sm hover:shadow-md"}
      `}
    >
      {/* Accent top strip */}
      <div className={`absolute top-0 inset-x-0 h-[3px] ${accent}`} />

      <div className="p-5 pt-6">
        {/* Icon badge */}
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${badge} mb-4`}>
          {icon}
        </div>

        {/* Title */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
          {title}
        </p>

        {/* Value */}
        <div className="text-[2rem] font-extrabold text-gray-900 leading-tight">
          {loading ? (
            <span className="block w-24 h-8 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            value
          )}
        </div>

        {/* Sub */}
        {sub && (
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        )}

        {/* CTA row */}
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

// ── Branch progress row ────────────────────────────────────────────────────
const ACCENTS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
];

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
      {/* Index pill */}
      <span className="w-5 text-center text-[10px] font-bold text-gray-300 shrink-0">
        {index + 1}
      </span>

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

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function SalesUserDashboard() {
  const { user, defaultCompany } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: totalStudents, isLoading: loadingTotal } = useQuery({
    queryKey: ["su-total", defaultCompany],
    queryFn: () => {
      const f: string[][] = [["enabled", "=", "1"]];
      if (defaultCompany) f.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(f);
    },
    staleTime: 60_000,
  });

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

  const { data: monthCount, isLoading: loadingMonth } = useQuery({
    queryKey: ["su-month", defaultCompany, monthStart],
    queryFn: () => {
      const f: string[][] = [
        ["enabled", "=", "1"],
        ["creation", ">=", `${monthStart} 00:00:00`],
      ];
      if (defaultCompany) f.push(["custom_branch", "=", defaultCompany]);
      return getStudentCount(f);
    },
    staleTime: 60_000,
  });

  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ["su-overdue"],
    queryFn: () => getDuesTodayTotal(),
    staleTime: 30_000,
    refetchInterval: 60_000,
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
    queryFn: () =>
      Promise.all(allBranches.map((b) => getActiveStudentCountForBranch(b.name))),
    enabled: allBranches.length > 0,
    staleTime: 120_000,
  });

  const maxBranchCount = branchCounts.length > 0 ? Math.max(...branchCounts) : 1;
  const branchLabel = defaultCompany?.replace("Smart Up ", "") ?? "All Branches";
  const hasOverdue = (overdueData?.total_dues ?? 0) > 0;

  const recentActivities: ActivityItem[] = (recentStudents ?? []).map((s) => ({
    id: s.name,
    type: "student_added" as const,
    message: `Admitted ${s.student_name}`,
    timestamp: s.creation,
  }));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-8"
    >
      <BreadcrumbNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl bg-gray-950 p-6"
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-32 rounded-full bg-violet-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1 uppercase">
              {greeting}
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              <AnimatedName name={user?.full_name ?? "Sales User"} />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {branchLabel} · Admissions &amp; Fees
            </p>
          </div>
          <Link href="/dashboard/sales-user/new-admission">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              New Admission
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* ── KPI cards ────────────────────────────────────────────────── */}
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
            title="This Month"
            value={<AnimatedNumber value={monthCount ?? 0} />}
            sub="admissions"
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            badge="bg-emerald-50"
            accent="bg-emerald-500"
            loading={loadingMonth}
          />
        </Tilt>

        <Tilt>
          <KpiCard
            title="Active Students"
            value={<AnimatedNumber value={totalStudents ?? 0} />}
            sub={branchLabel}
            icon={<GraduationCap className="h-5 w-5 text-violet-600" />}
            badge="bg-violet-50"
            accent="bg-violet-500"
            loading={loadingTotal}
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

      {/* ── Overdue alert strip (when overdue exists) ─────────────── */}
      {hasOverdue && (
        <motion.div
          variants={fadeUp}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/dashboard/sales-user/fees/overdue">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-200 hover:bg-orange-100/60 transition-all cursor-pointer group">
              <div className="relative shrink-0">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-orange-800">
                  Fee Overdue — Till Today
                </span>
                <span className="text-sm text-orange-500 ml-2">
                  {formatCurrency(overdueData?.total_dues ?? 0)} · {overdueData?.student_count ?? 0} students
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-300 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── Bottom grid ──────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Branch breakdown */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                Branch-wise Active Students
              </h3>
            </div>
            {allBranches.length > 0 && (
              <span className="text-xs text-gray-400 font-medium">
                {allBranches.length} branches
              </span>
            )}
          </div>

          {allBranches.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : (
            <div>
              {allBranches.map((branch, idx) => (
                <BranchRow
                  key={branch.name}
                  branch={branch}
                  maxCount={maxBranchCount}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Admissions */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Recent Admissions</h3>
          </div>
          <RecentActivity activities={recentActivities} loading={loadingRecent} />
        </div>

      </motion.div>
    </motion.div>
  );
}
