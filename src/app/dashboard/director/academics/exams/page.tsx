"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAcademics } from "@/lib/api/analytics";
import { getAssessmentPlans } from "@/lib/api/assessment";
import { BranchDrillDown, safeNum, pctColor, pctBadgeColor } from "@/components/academics/BranchDrillDown";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Building2, Trophy, BarChart3, ChevronRight, ClipboardList, CalendarClock, CalendarDays, CheckCircle2 } from "lucide-react";

/* ─── 3-D tilt stat card ──────────────────────────────────────────── */
function StatCard3D({
  icon: Icon,
  iconClass,
  label,
  value,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 320, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 320, damping: 32 });
  const glowX   = useSpring(useTransform(mx, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const glowY   = useSpring(useTransform(my, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 800 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.18 }}
        className="relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group p-4"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([gx, gy]) => `radial-gradient(220px circle at ${gx}% ${gy}%, rgba(103,58,183,0.07), transparent 65%)`
            ),
          }}
        />
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(90deg, #673AB7, #7E57C2)" }}
        />
        <div className="relative flex items-start gap-3">
          <motion.div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
            style={{ transformStyle: "preserve-3d" }}
            whileHover={{ rotateY: 16, rotateX: -10, scale: 1.08 }}
            transition={{ duration: 0.28 }}
          >
            <Icon className="h-4 w-4" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
            <p className="text-2xl font-black leading-none">{value}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Branch row card ─────────────────────────────────────────────── */
function BranchRow({
  b,
  stats,
  onClick,
  delay,
}: {
  b: { branch: string; avg_exam_score_pct: number; total_exams_conducted: number; pass_rate: number; total_students: number };
  stats: { scheduled: number; upcoming: number; completed: number } | undefined;
  onClick: () => void;
  delay: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 300, damping: 32 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 300, damping: 32 });

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const score = safeNum(b.avg_exam_score_pct);
  const passRate = safeNum(b.pass_rate);
  const shortName = b.branch.replace("Smart Up ", "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
    >
      <motion.button
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.008, y: -1 }}
        transition={{ duration: 0.18 }}
        className="w-full text-left relative overflow-hidden rounded-xl bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200 group"
      >
        <div
          className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(180deg, #673AB7, #7E57C2)" }}
        />
        <div className="flex items-center gap-4 px-4 py-3 pl-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-black ${pctBadgeColor(score, 60, 40)}`}>
            {score}%
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text-primary truncate">{shortName}</p>
            <p className="text-[11px] text-text-tertiary">
              {safeNum(b.total_exams_conducted)} exams · Pass rate:{" "}
              <span className={`font-semibold ${pctColor(passRate)}`}>{passRate}%</span>
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
              <span className="text-text-tertiary">
                Scheduled: <span className="font-semibold text-primary">{stats?.scheduled ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Upcoming: <span className="font-semibold text-primary">{stats?.upcoming ?? 0}</span>
              </span>
              <span className="text-text-tertiary">
                Completed: <span className="font-semibold text-success">{stats?.completed ?? 0}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] uppercase tracking-widest text-text-tertiary mb-0.5">Pass Rate</p>
              <p className={`text-[13px] font-black ${pctColor(passRate)}`}>{passRate}%</p>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-light border border-primary/20">
              <ChevronRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

function normalizeBranchKey(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/^smart\s*up\s*/i, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function DirectorAcademicsExamsPage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["branch-academics"],
    queryFn: getBranchAcademics,
    staleTime: 120_000,
  });

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["director-academics-all-exams"],
    queryFn: () => getAssessmentPlans(),
    staleTime: 60_000,
  });

  if (isLoading || examsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const today = new Date().toISOString().split("T")[0];

  const examsByNormalizedBranch = new Map<string, typeof allExams>();
  for (const exam of allExams) {
    if (exam.docstatus === 2) continue;
    const key = normalizeBranchKey(exam.custom_branch);
    if (!key) continue;
    const bucket = examsByNormalizedBranch.get(key) ?? [];
    bucket.push(exam);
    examsByNormalizedBranch.set(key, bucket);
  }

  const examStatusByBranch = new Map(
    branches.map((b) => {
      const branchKey = normalizeBranchKey(b.branch);
      const branchNameKey = normalizeBranchKey((b as { branch_name?: string }).branch_name);
      const branchExams = [
        ...(examsByNormalizedBranch.get(branchKey) ?? []),
        ...(branchNameKey && branchNameKey !== branchKey ? examsByNormalizedBranch.get(branchNameKey) ?? [] : []),
      ];
      const upcoming = branchExams.filter((e) => e.schedule_date >= today).length;
      const completed = branchExams.filter((e) => e.schedule_date < today).length;
      const conductedFallback = safeNum(b.total_exams_conducted);
      const resolvedScheduled = branchExams.length > 0 ? branchExams.length : conductedFallback;
      const resolvedCompleted = branchExams.length > 0 ? completed : conductedFallback;
      return [
        b.branch,
        {
          scheduled: resolvedScheduled,
          upcoming,
          completed: resolvedCompleted,
        },
      ] as const;
    }),
  );

  const sorted = [...branches].sort((a, b) => b.avg_exam_score_pct - a.avg_exam_score_pct);
  const overallAvgScore = branches.length ? Math.round(branches.reduce((a, b) => a + safeNum(b.avg_exam_score_pct), 0) / branches.length) : 0;
  const overallPassRate = branches.length ? Math.round(branches.reduce((a, b) => a + safeNum(b.pass_rate), 0) / branches.length) : 0;
  const totalExams = branches.reduce((a, b) => a + safeNum(b.total_exams_conducted), 0);
  const totalScheduled = branches.reduce((acc, b) => acc + (examStatusByBranch.get(b.branch)?.scheduled ?? 0), 0);
  const totalUpcoming = branches.reduce((acc, b) => acc + (examStatusByBranch.get(b.branch)?.upcoming ?? 0), 0);
  const totalCompleted = branches.reduce((acc, b) => acc + (examStatusByBranch.get(b.branch)?.completed ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedBranch ? (
          <BranchDrillDown key={selectedBranch} branch={selectedBranch} onBack={() => setSelectedBranch(null)} defaultTab="exams" />
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

            {/* ── Header ── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex items-center gap-3"
            >
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)",
                  boxShadow: "0 4px 12px rgba(103,58,183,0.28)",
                }}
                animate={{ rotateY: [0, 14, 0, -14, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <Trophy className="h-4 w-4 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-text-primary tracking-tight">Exams Overview</h1>
                <p className="text-xs text-text-secondary">
                  Cross-branch exam performance — click a branch to drill down
                </p>
              </div>
            </motion.div>

            {/* ── Row 1: summary stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatCard3D icon={Building2}    iconClass="bg-primary-light text-primary"  label="Branches"   value={<span className="text-primary">{branches.length}</span>}                           delay={0}    />
              <StatCard3D icon={ClipboardList} iconClass="bg-primary-light text-primary" label="Total Exams" value={<span className="text-primary">{totalExams}</span>}                              delay={0.05} />
              <StatCard3D icon={BarChart3}    iconClass="bg-warning/10 text-warning"     label="Avg Score"   value={<span className={pctColor(overallAvgScore, 60, 40)}>{overallAvgScore}%</span>}  delay={0.1}  />
              <StatCard3D icon={Trophy}       iconClass="bg-success/15 text-success"     label="Pass Rate"   value={<span className={pctColor(overallPassRate)}>{overallPassRate}%</span>}           delay={0.15} />
            </div>

            {/* ── Row 2: schedule stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <StatCard3D icon={CalendarClock} iconClass="bg-info/10 text-info"         label="Scheduled"  value={<span className="text-primary">{totalScheduled}</span>}  delay={0.05} />
              <StatCard3D icon={CalendarDays}  iconClass="bg-primary-light text-primary" label="Upcoming"   value={<span className="text-primary">{totalUpcoming}</span>}   delay={0.1}  />
              <StatCard3D icon={CheckCircle2}  iconClass="bg-success/15 text-success"   label="Completed"  value={<span className="text-success">{totalCompleted}</span>}  delay={0.15} />
            </div>

            {/* ── Branch list ── */}
            <div className="space-y-1.5">
              {sorted.map((b, i) => (
                <BranchRow
                  key={b.branch}
                  b={b}
                  stats={examStatusByBranch.get(b.branch)}
                  onClick={() => setSelectedBranch(b.branch)}
                  delay={i * 0.04}
                />
              ))}
            </div>

            {/* ── Comparison table ── */}
            {branches.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-text-primary">Branch Comparison</h2>
                </div>
                <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light">
                          {["Branch", "Exams", "Avg Score", "Pass Rate", "Students"].map((h) => (
                            <th
                              key={h}
                              className={`py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-tertiary ${h === "Branch" ? "text-left" : "text-center"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((b) => (
                          <tr
                            key={b.branch}
                            onClick={() => setSelectedBranch(b.branch)}
                            className="border-b border-border-light last:border-0 hover:bg-brand-wash transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-2.5 font-semibold text-[13px] text-text-primary group-hover:text-primary transition-colors">
                              {b.branch.replace("Smart Up ", "")}
                            </td>
                            <td className="px-4 py-2.5 text-center text-[13px] text-text-secondary">
                              {safeNum(b.total_exams_conducted)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pctBadgeColor(safeNum(b.avg_exam_score_pct), 60, 40)}`}>
                                {safeNum(b.avg_exam_score_pct)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pctBadgeColor(safeNum(b.pass_rate))}`}>
                                {safeNum(b.pass_rate)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-[13px] text-text-secondary">
                              {b.total_students}
                            </td>
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
