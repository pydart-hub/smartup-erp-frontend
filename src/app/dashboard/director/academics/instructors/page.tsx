"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Building2, UserCheck, ChevronRight, Users, GraduationCap } from "lucide-react";
import React from "react";

function StatCard3D({ icon: Icon, iconClass, label, value, sub, delay = 0 }: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string; label: string; value: React.ReactNode; sub?: React.ReactNode; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 320, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 320, damping: 32 });
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const glowY = useSpring(useTransform(my, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} style={{ perspective: 800 }}>
      <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.18 }}
        className="relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group p-4">
        <motion.div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: useTransform([glowX, glowY], ([gx, gy]) =>
            `radial-gradient(220px circle at ${gx}% ${gy}%, rgba(26,158,143,0.07), transparent 65%)`) }} />
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(90deg, #1A9E8F, #82C35B)" }} />
        <div className="relative flex items-start gap-3">
          <motion.div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
            style={{ transformStyle: "preserve-3d" }} whileHover={{ rotateY: 16, rotateX: -10, scale: 1.08 }}
            transition={{ duration: 0.28 }}><Icon className="h-4 w-4" /></motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
            <p className="text-2xl font-black leading-none">{value}</p>
            {sub && <div className="mt-1.5">{sub}</div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DirectorAcademicsInstructorsPage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["branch-academics"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface animate-pulse" />
          <div className="space-y-2"><div className="h-5 w-48 bg-surface rounded animate-pulse" /><div className="h-3 w-64 bg-surface rounded animate-pulse" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}</div>
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const sorted = [...branches].sort((a, b) => safeNum(b.avg_instructor_topic_pct) - safeNum(a.avg_instructor_topic_pct));
  const totalInstructors = branches.reduce((a, b) => a + (b.total_instructors ?? 0), 0);
  const avgTopicCompletion = branches.length ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_instructor_topic_pct), 0) / branches.length) : 0;
  const avgClassesDone = branches.length ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_classes_conducted_pct), 0) / branches.length) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown key={selectedBranch} branch={selectedBranch} onBack={() => setSelectedBranch(null)} defaultTab="instructors" />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
              className="flex items-center gap-3">
              <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #1A9E8F 0%, #82C35B 100%)", boxShadow: "0 4px 12px rgba(26,158,143,0.28)" }}
                animate={{ rotateY: [0, 14, 0, -14, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
                <GraduationCap className="h-4 w-4 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-text-primary tracking-tight">Instructors Overview</h1>
                <p className="text-xs text-text-secondary">Instructor performance across all branches — click a branch to drill down</p>
              </div>
            </motion.div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard3D icon={Users} iconClass="bg-primary-light text-primary" label="Total Instructors" value={totalInstructors} delay={0.05} />
              <StatCard3D icon={UserCheck} iconClass="bg-success/10 text-success" label="Avg Topic Completion" delay={0.1}
                value={<span className={pctColor(avgTopicCompletion, 70, 50)}>{avgTopicCompletion}%</span>} />
              <StatCard3D icon={Building2} iconClass="bg-brand-wash text-primary" label="Avg Classes Done" delay={0.15}
                value={<span className={pctColor(avgClassesDone, 80, 60)}>{avgClassesDone}%</span>} />
            </div>

            {/* ── Branch Rows ── */}
            <div className="space-y-2">
              {sorted.map((b, i) => {
                const topicPct = safeNum(b.avg_instructor_topic_pct);
                const classPct = safeNum(b.avg_classes_conducted_pct);
                return (
                  <BranchRow3D key={b.branch} branch={b.branch} topicPct={topicPct} classPct={classPct}
                    instructors={b.total_instructors ?? 0} delay={i * 0.04}
                    onClick={() => setSelectedBranch(b.branch)} />
                );
              })}
            </div>

            {/* ── Comparison Table ── */}
            {branches.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-3">Branch Comparison</p>
                <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-app-bg border-b border-border-light">
                          {["Branch","Instructors","Topic Completion","Classes Done","Batches"].map((h, hi) => (
                            <th key={h} className={`p-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary ${hi === 0 ? "text-left" : "text-center"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => (
                          <tr key={b.branch} onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-brand-wash transition-colors cursor-pointer">
                            <td className="p-3 font-semibold text-text-primary">{b.branch.replace("Smart Up ", "")}</td>
                            <td className="p-3 text-center text-text-secondary font-medium">{b.total_instructors ?? 0}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_instructor_topic_pct), 70, 50)}`}>
                                {safeNum(b.avg_instructor_topic_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${pctBadgeColor(safeNum(b.avg_classes_conducted_pct), 80, 60)}`}>
                                {safeNum(b.avg_classes_conducted_pct)}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-text-secondary">{b.total_batches}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BranchRow3D({ branch, topicPct, classPct, instructors, delay, onClick }: {
  branch: string; topicPct: number; classPct: number; instructors: number; delay: number; onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 280, damping: 30 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 280, damping: 30 });
  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  const topicColor = topicPct >= 70 ? "text-success" : topicPct >= 50 ? "text-warning" : "text-error";
  const classColor = classPct >= 80 ? "text-success" : classPct >= 60 ? "text-warning" : "text-error";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }} style={{ perspective: 900 }}>
      <motion.button ref={ref} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.01, y: -1 }} transition={{ duration: 0.18 }}
        className="relative w-full text-left overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group px-4 py-3 pl-5 flex items-center justify-between gap-3">
        {/* left accent stripe */}
        <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(180deg, #1A9E8F, #82C35B)" }} />
        {/* topic pct badge */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${pctBadgeColor(topicPct, 70, 50)}`}>
          {topicPct}%
        </div>
        {/* name + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{branch.replace("Smart Up ", "")}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{instructors} instructor{instructors !== 1 ? "s" : ""} · Topic: <span className={topicColor}>{topicPct}%</span></p>
        </div>
        {/* classes done chip */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Classes Done</span>
          <span className={`text-sm font-black ${classColor}`}>{classPct}%</span>
        </div>
        {/* chevron bubble */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-light border border-primary/20 group-hover:bg-primary group-hover:border-primary transition-colors duration-200 shrink-0">
          <ChevronRight className="h-3.5 w-3.5 text-primary group-hover:text-white transition-colors duration-200" />
        </div>
      </motion.button>
    </motion.div>
  );
}
