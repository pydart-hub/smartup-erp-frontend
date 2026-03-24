"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  CircleCheck,
  Clock,
  TriangleAlert,
  Users,
  IndianRupee,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import {
  getAllBranches,
  getBranchInvoiceStats,
  getBranchForfeitedFees,
  getStudentCountForBranch,
  getDuesTodayByBranch,
  type DuesTodayBranchRow,
} from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";

/* ── tiny helpers ── */
const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const Pulse = ({ w = "w-14" }: { w?: string }) => (
  <span className={`inline-block ${w} h-5 bg-border-light rounded animate-pulse`} />
);

/* ── Branch card ── */
function BranchFeeCard({
  branch,
  dues,
}: {
  branch: { name: string; abbr: string };
  dues: DuesTodayBranchRow | undefined;
}) {
  const { data: invoiceStats, isLoading } = useQuery({
    queryKey: ["director-branch-invoice-stats", branch.name],
    queryFn: () => getBranchInvoiceStats(branch.name),
    staleTime: 120_000,
  });
  const { data: forfeitedFees, isLoading: loadForfeited } = useQuery({
    queryKey: ["director-branch-forfeited-fees", branch.name],
    queryFn: () => getBranchForfeitedFees(branch.name),
    staleTime: 120_000,
  });
  const { data: studentCount } = useQuery({
    queryKey: ["director-branch-student-count", branch.name],
    queryFn: () => getStudentCountForBranch(branch.name),
    staleTime: 300_000,
  });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const totalFees = invoiceStats?.totalInvoiced ?? 0;
  const collected = invoiceStats?.totalCollected ?? 0;
  const forfeited = forfeitedFees ?? 0;
  const pending = (invoiceStats?.totalOutstanding ?? 0) - forfeited;
  const collectedPct = pct(collected, totalFees);
  const duesAmount = dues?.total_dues ?? 0;

  return (
    <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/fees`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-xl border border-border-light bg-surface p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{shortName}</p>
              <p className="text-xs text-text-tertiary flex items-center gap-1">
                <Users className="h-3 w-3" />
                {studentCount ?? "–"} students
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-text-tertiary" />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            {isLoading ? (
              <Pulse w="w-20" />
            ) : (
              <span className="text-xs font-medium text-text-secondary">
                {formatCurrency(collected)} / {formatCurrency(totalFees)}
              </span>
            )}
            {!isLoading && (
              <span className="text-[10px] font-bold text-primary">{collectedPct}%</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-border-light overflow-hidden">
            {!isLoading && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${collectedPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              />
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-success/5 px-2.5 py-1.5">
            <p className="text-[10px] text-success/80 flex items-center gap-0.5 mb-0.5">
              <CircleCheck className="h-2.5 w-2.5" /> Collected
            </p>
            {isLoading ? <Pulse /> : (
              <p className="text-sm font-bold text-success">{formatCurrency(collected)}</p>
            )}
          </div>
          <div className="rounded-lg bg-error/5 px-2.5 py-1.5">
            <p className="text-[10px] text-error/80 flex items-center gap-0.5 mb-0.5">
              <Clock className="h-2.5 w-2.5" /> Pending
            </p>
            {isLoading ? <Pulse /> : (
              <p className="text-sm font-bold text-error">{formatCurrency(pending)}</p>
            )}
          </div>
          <div className="rounded-lg bg-amber-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-amber-600/80 flex items-center gap-0.5 mb-0.5">
              <TriangleAlert className="h-2.5 w-2.5" /> Forfeited
            </p>
            {loadForfeited ? <Pulse /> : (
              <p className={`text-sm font-bold ${forfeited > 0 ? "text-amber-600" : "text-text-tertiary"}`}>
                {formatCurrency(forfeited)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-orange-500/5 px-2.5 py-1.5">
            <p className="text-[10px] text-orange-600/80 flex items-center gap-0.5 mb-0.5">
              <CalendarClock className="h-2.5 w-2.5" /> Dues Today
            </p>
            <p className={`text-sm font-bold ${duesAmount > 0 ? "text-orange-600" : "text-text-tertiary"}`}>
              {formatCurrency(duesAmount)}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ── Aggregate summary cards ── */
function SummaryCards({
  branches,
  duesData,
}: {
  branches: { name: string }[];
  duesData: DuesTodayBranchRow[] | undefined;
}) {
  /* Collect per-branch invoice stats */
  const statQueries = branches.map((b) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["director-branch-invoice-stats", b.name],
      queryFn: () => getBranchInvoiceStats(b.name),
      staleTime: 120_000,
    })
  );
  const forfeitQueries = branches.map((b) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["director-branch-forfeited-fees", b.name],
      queryFn: () => getBranchForfeitedFees(b.name),
      staleTime: 120_000,
    })
  );
  const studentQueries = branches.map((b) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["director-branch-student-count", b.name],
      queryFn: () => getStudentCountForBranch(b.name),
      staleTime: 300_000,
    })
  );

  const anyLoading = statQueries.some((q) => q.isLoading);
  const total = statQueries.reduce((s, q) => s + (q.data?.totalInvoiced ?? 0), 0);
  const collected = statQueries.reduce((s, q) => s + (q.data?.totalCollected ?? 0), 0);
  const outstanding = statQueries.reduce((s, q) => s + (q.data?.totalOutstanding ?? 0), 0);
  const forfeited = forfeitQueries.reduce((s, q) => s + (q.data ?? 0), 0);
  const pending = outstanding - forfeited;
  const totalStudents = studentQueries.reduce((s, q) => s + (q.data ?? 0), 0);
  const totalDues = duesData?.reduce((s, r) => s + r.total_dues, 0) ?? 0;

  const cards = [
    { label: "Total Students", value: totalStudents.toLocaleString("en-IN"), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Fees", value: formatCurrency(total), icon: IndianRupee, color: "text-text-primary", bg: "bg-border-light" },
    { label: "Collected", value: formatCurrency(collected), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { label: "Pending", value: formatCurrency(pending), icon: Clock, color: "text-error", bg: "bg-error/10" },
    { label: "Dues Till Today", value: formatCurrency(totalDues), icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-border-light bg-surface p-3 flex items-center gap-3"
        >
          <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </div>
          <div>
            {anyLoading ? (
              <Pulse w="w-16" />
            ) : (
              <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
            )}
            <p className="text-[10px] text-text-tertiary">{c.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function DirectorFeesPage() {
  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });
  const { data: duesData } = useQuery({
    queryKey: ["director-dues-today-by-branch"],
    queryFn: () => getDuesTodayByBranch(),
    staleTime: 120_000,
  });

  const [search, setSearch] = useState("");
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => b.name !== "Smart Up"),
    [branches]
  );
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  const duesMap = useMemo(() => {
    const m = new Map<string, DuesTodayBranchRow>();
    (duesData ?? []).forEach((r) => m.set(r.branch, r));
    return m;
  }, [duesData]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Fees Overview</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Collection summary across all branches
        </p>
      </div>

      {/* Aggregate summaries */}
      {!isLoading && !isError && activeBranches.length > 0 && (
        <SummaryCards branches={activeBranches} duesData={duesData} />
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load branches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((branch, i) => (
            <motion.div
              key={branch.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BranchFeeCard branch={branch} dues={duesMap.get(branch.name)} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
