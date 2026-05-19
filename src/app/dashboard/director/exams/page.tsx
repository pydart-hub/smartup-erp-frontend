"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getAssessmentPlans } from "@/lib/api/assessment";
import { getAllBranches } from "@/lib/api/director";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 24, rotateX: -10 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

export default function DirectorExamsPage() {
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 60_000,
  });

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["director-all-exams"],
    queryFn: () => getAssessmentPlans(),
    staleTime: 30_000,
  });

  const branchStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return branches
      .filter((b) => b.name !== "Smart Up" && b.company_name !== "Smart Up")
      .map((b) => {
      const branchExams = allExams.filter((e) => e.custom_branch === b.name);
      return {
        branch: b.name,
        branchLabel: b.company_name,
        total: branchExams.length,
        upcoming: branchExams.filter((e) => e.schedule_date >= today).length,
        completed: branchExams.filter((e) => e.schedule_date < today).length,
      };
    });
  }, [allExams, branches]);

  const totalExams   = branchStats.reduce((s, b) => s + b.total, 0);
  const totalUpcoming = branchStats.reduce((s, b) => s + b.upcoming, 0);
  const totalDone    = branchStats.reduce((s, b) => s + b.completed, 0);

  const isLoading = branchesLoading || examsLoading;

  const summaryCards = [
    {
      label: "Total Exams",
      value: totalExams,
      icon: ClipboardList,
      gradient: "from-violet-500 to-indigo-600",
      glow: "shadow-violet-500/25",
      ring: "ring-violet-500/20",
      text: "text-violet-400 dark:text-violet-300",
      bg: "bg-violet-500/10 dark:bg-violet-500/15",
      border: "border-violet-500/20 dark:border-violet-400/20",
    },
    {
      label: "Upcoming",
      value: totalUpcoming,
      icon: Clock,
      gradient: "from-amber-400 to-orange-500",
      glow: "shadow-amber-500/25",
      ring: "ring-amber-500/20",
      text: "text-amber-500 dark:text-amber-300",
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      border: "border-amber-500/20 dark:border-amber-400/20",
    },
    {
      label: "Completed",
      value: totalDone,
      icon: CheckCircle2,
      gradient: "from-emerald-400 to-teal-500",
      glow: "shadow-emerald-500/25",
      ring: "ring-emerald-500/20",
      text: "text-emerald-500 dark:text-emerald-300",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      border: "border-emerald-500/20 dark:border-emerald-400/20",
    },
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <h1 className="text-2xl font-bold text-text-primary">Exam Analytics</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Branch-wise exam breakdown — select a branch for details
        </p>
      </motion.div>

      {isLoading ? (
        <GifLoader />
      ) : (
        <>
          {/* ── Summary strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="grid grid-cols-3 gap-3"
          >
            {summaryCards.map((s) => (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-4 flex items-center gap-3.5 ring-1 ${s.ring}`}
              >
                {/* icon */}
                <div className={`shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg ${s.glow}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                {/* text */}
                <div className="min-w-0">
                  <p className={`text-2xl font-bold tabular-nums leading-none ${s.text}`}>{s.value}</p>
                  <p className={`text-[11px] font-medium mt-1 ${s.text} opacity-75`}>{s.label}</p>
                </div>
                {/* decorative orb */}
                <div className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.08]`} />
              </div>
            ))}
          </motion.div>

          {/* ── Branch grid ── */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ perspective: 1200 }}
          >
            {branchStats.map((bs) => {
              const pct = bs.total > 0 ? Math.round((bs.completed / bs.total) * 100) : 0;
              return (
                <motion.div key={bs.branch} variants={item} style={{ transformStyle: "preserve-3d" }}>
                  <Link href={`/dashboard/director/exams/${encodeURIComponent(bs.branch)}`}>
                    <div className="group relative overflow-hidden rounded-2xl cursor-pointer
                      bg-white dark:bg-white/[0.04]
                      border border-slate-200 dark:border-white/10
                      shadow-sm hover:shadow-lg dark:hover:shadow-black/40
                      hover:-translate-y-1
                      transition-all duration-200"
                    >
                      {/* hover accent bar */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="p-5">
                        {/* header row */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="min-w-0 pr-2">
                            <h3 className="font-semibold text-[13px] leading-tight text-slate-800 dark:text-slate-100 truncate">
                              {bs.branchLabel}
                            </h3>
                            <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500 truncate">{bs.branch}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-slate-300 dark:text-slate-600
                            group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        {/* stats row */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Total */}
                          <div className="flex flex-col items-center justify-center rounded-xl py-3 px-2
                            bg-slate-50 dark:bg-slate-800/60
                            border border-slate-100 dark:border-slate-700/50">
                            <span className="text-xl font-bold tabular-nums text-slate-700 dark:text-slate-100">{bs.total}</span>
                            <span className="text-[10px] font-medium mt-0.5 text-slate-400 dark:text-slate-500">Total</span>
                          </div>
                          {/* Upcoming */}
                          <div className="flex flex-col items-center justify-center rounded-xl py-3 px-2
                            bg-amber-50 dark:bg-amber-500/10
                            border border-amber-100 dark:border-amber-500/20">
                            <span className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{bs.upcoming}</span>
                            <span className="text-[10px] font-medium mt-0.5 text-amber-500 dark:text-amber-500">Upcoming</span>
                          </div>
                          {/* Done */}
                          <div className="flex flex-col items-center justify-center rounded-xl py-3 px-2
                            bg-emerald-50 dark:bg-emerald-500/10
                            border border-emerald-100 dark:border-emerald-500/20">
                            <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{bs.completed}</span>
                            <span className="text-[10px] font-medium mt-0.5 text-emerald-500 dark:text-emerald-500">Done</span>
                          </div>
                        </div>

                        {/* progress bar */}
                        {bs.total > 0 && (
                          <div className="mt-3.5">
                            <div className="h-1.5 w-full rounded-full overflow-hidden
                              bg-slate-100 dark:bg-slate-700/60">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                              />
                            </div>
                            <p className="text-[10px] mt-1 text-right text-slate-400 dark:text-slate-500">
                              {pct}% completed
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}


