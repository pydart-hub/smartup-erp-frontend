"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Trophy,
  Crown,
  Medal,
  Star,
  ChevronDown,
  Users,
  ClipboardCheck,
  BookOpen,
  ClipboardList,
  GraduationCap,
  UserCheck,
  Clock,
  Flame,
  Zap,
  AlertCircle,
  TrendingUp,
  Building2,
  Check,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getInstructorLeaderboard } from "@/lib/api/analytics";
import { useAuthStore } from "@/lib/stores/authStore";
import type { InstructorLeaderboardEntry } from "@/lib/types/analytics";

// ── Types ──────────────────────────────────────────────────────────────────

type Period = "month" | "quarter" | "year" | "all";
type Tab = "overall" | "hr" | "classes" | "topics" | "work" | "exams" | "students";

const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "This Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "This FY" },
  { value: "all", label: "All Time" },
];

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "overall",  label: "Overall",       icon: Trophy       },
  { value: "hr",       label: "HR Att.",        icon: UserCheck    },
  { value: "classes",  label: "Classes",        icon: ClipboardCheck },
  { value: "topics",   label: "Topics",         icon: BookOpen     },
  { value: "work",     label: "Work Assign.",   icon: ClipboardList},
  { value: "exams",    label: "Exam Results",   icon: GraduationCap},
  { value: "students", label: "Student Att.",   icon: Users        },
];

const SCORE_COMPONENTS = [
  { key: "score_hr"       as const, label: "HR Attendance",    weight: 20, color: "bg-violet-500",  bar: "from-violet-400 to-violet-600",  pctKey: "hr_attendance_pct"      as const },
  { key: "score_classes"  as const, label: "Classes",          weight: 20, color: "bg-blue-500",    bar: "from-blue-400 to-blue-600",      pctKey: "classes_conducted_pct"  as const },
  { key: "score_topics"   as const, label: "Topic Coverage",   weight: 20, color: "bg-emerald-500", bar: "from-emerald-400 to-emerald-600",pctKey: "topic_coverage_pct"     as const },
  { key: "score_wa"       as const, label: "Work Assignments", weight: 15, color: "bg-amber-500",   bar: "from-amber-400 to-amber-600",    pctKey: "wa_completion_pct"      as const },
  { key: "score_exams"    as const, label: "Student Exams",    weight: 10, color: "bg-rose-500",    bar: "from-rose-400 to-rose-600",      pctKey: "student_pass_rate"      as const },
  { key: "score_students" as const, label: "Student Att.",     weight: 10, color: "bg-sky-500",     bar: "from-sky-400 to-sky-600",        pctKey: "student_attendance_pct" as const },
  { key: "score_ontime"   as const, label: "On-Time Submit",   weight:  5, color: "bg-orange-500",  bar: "from-orange-400 to-orange-600",  pctKey: "wa_on_time_pct"         as const },
];

const TAB_PRIMARY: Record<Tab, (typeof SCORE_COMPONENTS)[number]["pctKey"] | "total_score"> = {
  overall:  "total_score",
  hr:       "hr_attendance_pct",
  classes:  "classes_conducted_pct",
  topics:   "topic_coverage_pct",
  work:     "wa_completion_pct",
  exams:    "student_pass_rate",
  students: "student_attendance_pct",
};

const BADGE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  always_on_time:  { label: "Always On Time",  color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: Clock     },
  zero_rejections: { label: "Zero Rejections", color: "text-blue-600 bg-blue-500/10 border-blue-500/20",          icon: Zap       },
  punctual:        { label: "Punctual",         color: "text-violet-600 bg-violet-500/10 border-violet-500/20",    icon: UserCheck },
  full_syllabus:   { label: "Full Syllabus",    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",       icon: BookOpen  },
  had_rejections:  { label: "Had Rejections",   color: "text-orange-600 bg-orange-500/10 border-orange-500/20",   icon: AlertCircle },
  late_submissions:{ label: "Late Submissions", color: "text-red-600 bg-red-500/10 border-red-500/20",             icon: Clock     },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  if (grade === "A+") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (grade === "A")  return "text-blue-500 bg-blue-500/10 border-blue-500/20";
  if (grade === "B+") return "text-violet-500 bg-violet-500/10 border-violet-500/20";
  if (grade === "B")  return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  if (grade === "C")  return "text-orange-500 bg-orange-500/10 border-orange-500/20";
  return "text-red-500 bg-red-500/10 border-red-500/20";
}

function pctColor(v: number) {
  if (v >= 85) return "text-emerald-500";
  if (v >= 65) return "text-amber-500";
  return "text-red-500";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-cyan-600",
];
function avatarGradient(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}



// ── Score breakdown ────────────────────────────────────────────────────────

function ScoreBreakdown({ entry }: { entry: InstructorLeaderboardEntry }) {
  return (
    <div className="space-y-2.5">
      {SCORE_COMPONENTS.map((c, idx) => {
        const raw = Number(entry[c.pctKey] ?? 0);
        const pts = Number(entry[c.key] ?? 0);
        const pct = Math.min(raw, 100);
        return (
          <div key={c.key} className="flex items-center gap-3">
            <div className="w-24 text-[10px] text-text-tertiary font-medium shrink-0 text-right leading-tight">
              {c.label}
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: idx * 0.06 }}
                className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
              />
            </div>
            <div className="w-16 text-[10px] font-bold tabular-nums text-right shrink-0">
              <span className="text-text-secondary">{pts.toFixed(1)}</span>
              <span className="text-text-tertiary font-normal">/{c.weight}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Badge chips ────────────────────────────────────────────────────────────

function BadgeChips({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const cfg = BADGE_CONFIG[b];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <motion.span
            key={b}
            whileHover={{ scale: 1.05 }}
            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full border ${cfg.color} shadow-sm`}
          >
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </motion.span>
        );
      })}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-14 h-14 text-lg"
      : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center font-black text-white shrink-0 shadow-md ring-2 ring-white/30 dark:ring-white/10`}
    >
      {initials(name)}
    </div>
  );
}

// ── Podium card ────────────────────────────────────────────────────────────

const PODIUM = [
  {
    border: "border-yellow-400/30",
    ring: "ring-1 ring-yellow-400/20",
    glow: "shadow-[0_20px_60px_rgba(234,179,8,0.22),0_4px_20px_rgba(234,179,8,0.12)]",
    headerBg: "from-yellow-400/20 via-amber-300/8 to-transparent",
    badgeBg: "from-yellow-400 to-amber-500",
    glowColor: "rgba(234,179,8,0.35)",
    icon: Crown,
    label: "1st Place",
    scale: "sm:scale-105 sm:-translate-y-3 z-10",
  },
  {
    border: "border-slate-300/30",
    ring: "ring-1 ring-slate-300/15",
    glow: "shadow-[0_12px_40px_rgba(148,163,184,0.15)]",
    headerBg: "from-slate-300/12 via-slate-200/5 to-transparent",
    badgeBg: "from-slate-300 to-slate-500",
    glowColor: "rgba(148,163,184,0.2)",
    icon: Medal,
    label: "2nd Place",
    scale: "",
  },
  {
    border: "border-orange-400/30",
    ring: "ring-1 ring-orange-400/15",
    glow: "shadow-[0_12px_40px_rgba(249,115,22,0.15)]",
    headerBg: "from-orange-400/15 via-amber-400/5 to-transparent",
    badgeBg: "from-orange-400 to-amber-600",
    glowColor: "rgba(249,115,22,0.2)",
    icon: Star,
    label: "3rd Place",
    scale: "",
  },
];

function PodiumCard({
  entry,
  rank,
  tab,
  delay,
}: {
  entry: InstructorLeaderboardEntry;
  rank: number;
  tab: Tab;
  delay: number;
}) {
  const p = PODIUM[rank - 1];
  const RankIcon = p.icon;
  const primaryPct = TAB_PRIMARY[tab];
  const isFirst = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, type: "spring", stiffness: 110, damping: 18 }}
      className={`${p.scale}`}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className={`relative rounded-2xl border ${p.border} ${p.ring} ${p.glow}
          bg-white dark:bg-slate-900 overflow-hidden`}
      >
        {/* Header gradient overlay */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${p.headerBg} pointer-events-none`} />

        {/* Crown glow pulse for rank 1 */}
        {isFirst && (
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${p.glowColor}, transparent 70%)` }}
          />
        )}

        {/* Ambient corner glow */}
        <div
          className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-50"
          style={{ background: `radial-gradient(circle, ${p.glowColor}, transparent)` }}
        />

        <div className="relative p-5">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-4">
            <motion.div
              animate={isFirst ? { rotate: [0, -8, 8, -4, 0] } : {}}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.badgeBg} flex items-center justify-center shadow-lg shrink-0`}
            >
              <RankIcon className="w-5 h-5 text-white drop-shadow-sm" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">{p.label}</p>
              <h3 className="text-sm font-extrabold text-text-primary leading-tight truncate">{entry.instructor_name}</h3>
            </div>
            <span
              className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeColor(entry.grade)}`}
            >
              {entry.grade}
            </span>
          </div>

          {/* Primary score */}
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-4xl font-black text-text-primary tabular-nums tracking-tight">
              {primaryPct === "total_score"
                ? entry.total_score
                : `${Number(entry[primaryPct] ?? 0).toFixed(0)}`}
            </span>
            <span className="text-sm text-text-tertiary font-semibold">
              {primaryPct === "total_score" ? "/100" : "%"}
            </span>
          </div>

          {/* Mini stat grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {[
              { label: "HR Att.", val: entry.hr_attendance_pct },
              { label: "Classes", val: entry.classes_conducted_pct },
              { label: "Topics", val: entry.topic_coverage_pct },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-black/[0.04] dark:bg-white/[0.06] rounded-xl p-2 text-center border border-black/[0.06] dark:border-white/[0.08]"
              >
                <p className="text-[8px] text-text-tertiary font-semibold mb-0.5">{s.label}</p>
                <p className={`text-xs font-extrabold tabular-nums ${pctColor(s.val)}`}>{s.val}%</p>
              </div>
            ))}
          </div>

          {tab === "overall" && (
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-3 mb-3">
              <ScoreBreakdown entry={entry} />
            </div>
          )}

          {entry.badges.length > 0 && <BadgeChips badges={entry.badges} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Rank row ───────────────────────────────────────────────────────────────

function RankRow({
  entry,
  rank,
  tab,
  expanded,
  onToggle,
}: {
  entry: InstructorLeaderboardEntry;
  rank: number;
  tab: Tab;
  expanded: boolean;
  onToggle: () => void;
}) {
  const primaryPct = TAB_PRIMARY[tab];
  const primaryVal =
    primaryPct === "total_score" ? entry.total_score : Number(entry[primaryPct] ?? 0);

  const rankStyle =
    rank === 1
      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-[0_2px_8px_rgba(234,179,8,0.4)]"
      : rank === 2
      ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-sm"
      : rank === 3
      ? "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
      : "bg-black/[0.04] dark:bg-white/[0.04] text-text-tertiary border border-black/[0.08] dark:border-white/[0.08]";

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-black/[0.05] dark:border-white/[0.05] last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gradient-to-r hover:from-primary/[0.04] hover:to-transparent transition-all text-left group"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${rankStyle}`}
        >
          {rank}
        </motion.div>

        <Avatar name={entry.instructor_name} size="sm" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{entry.instructor_name}</p>
          {entry.badges.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {entry.badges.slice(0, 2).map((b) => {
                const cfg = BADGE_CONFIG[b];
                if (!cfg) return null;
                return (
                  <span key={b} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 w-32 shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(primaryVal, 100)}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
            />
          </div>
          <span className={`text-xs font-bold tabular-nums w-10 text-right ${pctColor(primaryVal)}`}>
            {primaryPct === "total_score" ? primaryVal : `${primaryVal.toFixed(0)}%`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm font-black text-text-primary tabular-nums leading-none">{entry.total_score}</p>
            <p className="text-[9px] text-text-tertiary leading-none mt-0.5">/ 100</p>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${gradeColor(entry.grade)}`}>
            {entry.grade}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="text-text-tertiary group-hover:text-text-secondary transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-3">Score Breakdown</p>
                <ScoreBreakdown entry={entry} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-3">Raw Metrics</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      label: "HR Attendance",
                      val: `${entry.hr_attendance_pct}%`,
                      sub: `${entry.hr_present_days}/${entry.hr_total_days} days`,
                      note: entry.late_entries > 0 ? `${entry.late_entries} late` : undefined,
                      noteColor: "text-amber-500",
                      pct: entry.hr_attendance_pct,
                    },
                    {
                      label: "Classes",
                      val: `${entry.classes_conducted_pct}%`,
                      sub: `${entry.classes_conducted}/${entry.classes_scheduled}`,
                      note: undefined,
                      noteColor: "",
                      pct: entry.classes_conducted_pct,
                    },
                    {
                      label: "Topic Coverage",
                      val: `${entry.topic_coverage_pct}%`,
                      sub: `${entry.topics_covered}/${entry.topics_assigned} topics`,
                      note: undefined,
                      noteColor: "",
                      pct: entry.topic_coverage_pct,
                    },
                    {
                      label: "Work Assignments",
                      val: `${entry.wa_completion_pct}%`,
                      sub: `${entry.wa_approved}/${entry.wa_total} approved`,
                      note: entry.wa_rejected > 0 ? `${entry.wa_rejected} rejected` : undefined,
                      noteColor: "text-red-500",
                      pct: entry.wa_completion_pct,
                    },
                    {
                      label: "Student Pass Rate",
                      val: `${entry.student_pass_rate}%`,
                      sub: "across batches",
                      note: undefined,
                      noteColor: "",
                      pct: entry.student_pass_rate,
                    },
                    {
                      label: "Student Att.",
                      val: `${entry.student_attendance_pct}%`,
                      sub: "in batches",
                      note: undefined,
                      noteColor: "",
                      pct: entry.student_attendance_pct,
                    },
                    {
                      label: "On-Time Submit",
                      val: `${entry.wa_on_time_pct}%`,
                      sub: `${entry.wa_on_time}/${entry.wa_total}`,
                      note: undefined,
                      noteColor: "",
                      pct: entry.wa_on_time_pct,
                    },
                    {
                      label: "Total Score",
                      val: `${entry.total_score}/100`,
                      sub: `Grade ${entry.grade}`,
                      note: undefined,
                      noteColor: "",
                      pct: entry.total_score,
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="bg-surface rounded-xl p-3 border border-border-light"
                    >
                      <p className="text-[8px] text-text-tertiary uppercase tracking-wide font-semibold mb-1">{m.label}</p>
                      <p className={`text-base font-black leading-none ${pctColor(m.pct)}`}>{m.val}</p>
                      <p className="text-[9px] text-text-tertiary mt-1">{m.sub}</p>
                      {m.note && <p className={`text-[9px] font-semibold mt-0.5 ${m.noteColor}`}>{m.note}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {entry.badges.length > 0 && <BadgeChips badges={entry.badges} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 28 }}
      className="relative bg-surface rounded-2xl border border-border-light p-4 overflow-hidden
        shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-shadow"
    >
        {/* Ambient glow orb */}
        <div
          className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-25 bg-gradient-to-br ${gradient} translate-x-8 -translate-y-8 pointer-events-none`}
        />
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.08, rotate: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}
        >
          <Icon className="w-4 h-4 text-white drop-shadow-sm" />
        </motion.div>
        <p className="text-2xl font-black text-text-primary leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-text-tertiary mt-0.5">{sub}</p>}
        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider mt-1">{label}</p>
    </motion.div>
  );
}

// ═══ MAIN PAGE ═══════════════════════════════════════════════════════════════

export default function GMLeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [activeTab, setActiveTab] = useState<Tab>("overall");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [branchOpen, setBranchOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTransition() {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    setIsTransitioning(true);
  }
  function endTransition() {
    transitionTimer.current = setTimeout(() => setIsTransitioning(false), 800);
  }

  // Close branch dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
      }
    }
    if (branchOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [branchOpen]);

  const { allowedCompanies } = useAuthStore();
  const branches = allowedCompanies ?? [];

  // "all" → pass "all" to API (no filter); otherwise pass specific branch
  const branchParam = selectedBranch;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["instructor-leaderboard", branchParam, period],
    queryFn: () => getInstructorLeaderboard({ branch: branchParam, period }),
    staleTime: 120_000,
    placeholderData: keepPreviousData,
  });

  // End transition once fetch settles
  useEffect(() => {
    if (!isFetching) endTransition();
  }, [isFetching]);

  const displayLabel = selectedBranch === "all" ? "All Branches" : selectedBranch;

  const instructors = data?.instructors ?? [];
  const overall = data?.overall;

  const sorted = useMemo(() => {
    const arr = [...instructors];
    const pKey = TAB_PRIMARY[activeTab];
    if (pKey === "total_score") {
      arr.sort((a, b) => b.total_score - a.total_score);
    } else {
      arr.sort((a, b) => Number(b[pKey] ?? 0) - Number(a[pKey] ?? 0));
    }
    return arr;
  }, [instructors, activeTab]);

  // Classic podium order: 2nd left, 1st centre, 3rd right
  const podiumOrder = [sorted[1], sorted[0], sorted[2]].filter(Boolean) as InstructorLeaderboardEntry[];
  const podiumRanks = [2, 1, 3];

  // ── Loading ──
  // Only show full-page skeleton on true first load (no data — not even placeholder).
  // On branch/period switches, keepPreviousData keeps old data so we skip this
  // and let the shimmer+GIF overlay handle it instead.
  if (isLoading && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
        <div className="h-8 w-56 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 bg-surface rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="font-semibold text-text-primary">Failed to load leaderboard</p>
        <p className="text-sm text-text-tertiary max-w-xs">{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="relative p-4 sm:p-6 max-w-5xl mx-auto pb-16 space-y-6">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-500/10 blur-3xl" />
        <div className="absolute top-3/4 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-300/5 blur-3xl" />
      </div>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-3 mt-2">
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 0], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/35"
            >
              <Trophy className="w-5 h-5 text-white drop-shadow" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                  Instructor Leaderboard
                </h1>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1], scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                >
                  LIVE
                </motion.span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">7-metric performance ranking · {displayLabel}</p>
            </div>
          </div>
        </div>

        {/* Controls: branch + period */}
        <div className="flex flex-col gap-2 self-start sm:self-auto">
          {/* Branch selector — dropdown */}
          {branches.length > 0 && (
            <div ref={branchRef} className="relative">
              <button
                onClick={() => setBranchOpen((o) => !o)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold
                  bg-white/70 dark:bg-white/[0.06] border border-white/70 dark:border-white/10
                  backdrop-blur-md shadow-sm text-text-secondary hover:text-text-primary
                  hover:bg-white dark:hover:bg-white/[0.1] transition-all min-w-[160px]"
              >
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="flex-1 text-left truncate max-w-[140px]">
                  {selectedBranch === "all" ? "All Branches" : selectedBranch}
                </span>
                <motion.span animate={{ rotate: branchOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                </motion.span>
              </button>

              <AnimatePresence>
                {branchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-1.5 w-56 z-50
                      bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                      border border-white/60 dark:border-white/10
                      rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] overflow-hidden py-1"
                  >
                    {(["all", ...branches] as string[]).map((b) => {
                      const active = selectedBranch === b;
                      return (
                        <button
                          key={b}
                          onClick={() => { startTransition(); setSelectedBranch(b); setBranchOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold
                            transition-colors text-left
                            ${
                              active
                                ? "bg-primary/10 dark:bg-primary/15 text-primary"
                                : "text-text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-text-primary"
                            }`}
                        >
                          <span className="flex-1 truncate">{b === "all" ? "All Branches" : b}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Period selector */}
          <div className="flex gap-1 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-1 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => { startTransition(); setPeriod(p.value); }}
                className={`relative px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  period === p.value
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Full-screen loading overlay ── */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="shimmer-trophy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] overflow-hidden pointer-events-none"
          >
            {/* Frosted glass base */}
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-950/60 backdrop-blur-[3px]" />
            {/* Diagonal sweeping sheen */}
            <motion.div
              className="absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent skew-x-[-18deg]"
              animate={{ x: ["-50%", "220%"] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            />
            {/* GIF + label — centered on viewport */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/loading.gif"
                  alt="Loading"
                  className="w-48 h-48 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="px-3.5 py-1 rounded-full
                    bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                    border border-white/70 dark:border-white/10
                    shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                >
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Loading…</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Data content ── */}
      <div className="relative space-y-6">

        {/* ── Stat cards ── */}
        {overall && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Instructors" value={String(overall.total_instructors)} sub="ranked" gradient="from-violet-500 to-purple-600" />
            <StatCard icon={TrendingUp} label="Avg Score" value={String(overall.avg_score)} sub="out of 100" gradient="from-amber-400 to-orange-500" />
            <StatCard icon={ClipboardCheck} label="Avg Classes" value={`${overall.avg_classes_conducted_pct}%`} sub="conducted" gradient="from-blue-500 to-indigo-600" />
            <StatCard icon={BookOpen} label="Avg Topics" value={`${overall.avg_topic_coverage_pct}%`} sub="coverage" gradient="from-emerald-500 to-teal-600" />
          </div>
        )}

      {/* ── Tab bar ── */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="relative flex gap-1 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl p-1 min-w-max shadow-sm">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? "text-white"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {instructors.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border-light flex items-center justify-center shadow-sm">
            <Flame className="w-8 h-8 text-text-tertiary opacity-40" />
          </div>
          <p className="font-bold text-text-primary">No instructor data</p>
          <p className="text-sm text-text-tertiary">No course schedules found for this branch and period.</p>
        </motion.div>
      )}

      {/* ── Podium — 2-1-3 layout ── */}
      {sorted.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-4">Top Performers</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {podiumOrder.map((entry, idx) => (
              <PodiumCard
                key={entry.instructor}
                entry={entry}
                rank={podiumRanks[idx]}
                tab={activeTab}
                delay={idx * 0.1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Full rankings ── */}
      {sorted.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-3">
            Full Rankings — {TABS.find((t) => t.value === activeTab)?.label}
          </p>
          <div className="bg-surface rounded-2xl border border-border-light overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            {sorted.map((entry, i) => (
              <RankRow
                key={entry.instructor}
                entry={entry}
                rank={i + 1}
                tab={activeTab}
                expanded={expandedId === entry.instructor}
                onToggle={() =>
                  setExpandedId((prev) => (prev === entry.instructor ? null : entry.instructor))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Score weights legend ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-surface rounded-2xl border border-border-light p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-4">Score Weights</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SCORE_COMPONENTS.map((c) => (
            <div key={c.key} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-9 rounded-full bg-gradient-to-b ${c.bar} shrink-0 shadow-sm`} />
              <div>
                <p className="text-xs font-semibold text-text-secondary">{c.label}</p>
                <p className="text-[10px] text-text-tertiary">{c.weight} pts</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      </div>
    </div>
  );
}
