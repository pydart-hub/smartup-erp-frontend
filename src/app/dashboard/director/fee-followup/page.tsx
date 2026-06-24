"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate as animateValue } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Filter,
  Users,
  IndianRupee,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trophy,
  Crown,
  Medal,
  Star,
  Zap,
  Target,
  Flame,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { getAllBranches } from "@/lib/api/director";
import type { BranchDetail } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";
import { getStatusColor, CALL_STATUS_OPTIONS } from "@/lib/api/followup";

// ── Types ──────────────────────────────────────────────────────────────────
interface Summary {
  total_today: number;
  total_this_week: number;
  promised_count: number;
  paid_count: number;
  paid_amount: number;
  no_answer_count: number;
  pending_callback_count: number;
}

interface ByUser {
  called_by: string;
  branch: string;
  calls: number;
  answered: number;
  promised: number;
  paid_count: number;
  paid_amount: number;
}

interface LogEntry {
  name: string;
  student: string;
  student_name: string;
  branch: string;
  call_date: string;
  called_by: string;
  call_status: string;
  payment_received: number;
  amount_received?: number;
  payment_mode?: string;
  remarks?: string;
  next_followup_date?: string;
}

interface FeeFollowUpData {
  summary: Summary;
  by_user: ByUser[];
  logs: LogEntry[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function isoNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Scoring ─────────────────────────────────────────────────────────────────
interface ScoredUser extends ByUser {
  displayName: string;
  answerRate: number;   // 0-100
  promiseRate: number;  // 0-100
  scoreVolume: number;  // 0-25
  scoreAnswer: number;  // 0-25
  scorePromise: number; // 0-25
  scoreRevenue: number; // 0-25
  totalScore: number;   // 0-100
  badges: { label: string; icon: React.ComponentType<{ className?: string }>; color: string }[];
}

const SCORE_COMPONENTS = [
  { key: "scoreVolume"  as const, label: "Call Volume",    weight: 25, bar: "" },
  { key: "scoreAnswer"  as const, label: "Answer Rate",    weight: 25, bar: "" },
  { key: "scorePromise" as const, label: "Promise Rate",   weight: 25, bar: "" },
  { key: "scoreRevenue" as const, label: "Revenue Coll.",  weight: 25, bar: "" },
];

/** Merge per-branch rows into one row per user (sum all counts; pick highest-calls branch label) */
function aggregateByUser(users: ByUser[]): ByUser[] {
  const map = new Map<string, ByUser>();
  for (const u of users) {
    const existing = map.get(u.called_by);
    if (!existing) {
      map.set(u.called_by, { ...u });
    } else {
      // Keep branch label of whichever row has more calls
      if (u.calls > existing.calls) existing.branch = u.branch;
      existing.calls      += u.calls;
      existing.answered   += u.answered;
      existing.promised   += u.promised;
      existing.paid_count += u.paid_count;
      existing.paid_amount += u.paid_amount;
    }
  }
  return Array.from(map.values());
}

function scoreUsers(users: ByUser[]): ScoredUser[] {
  if (!users.length) return [];
  const aggregated = aggregateByUser(users);
  const maxCalls  = Math.max(...aggregated.map((u) => u.calls), 1);
  const maxAmount = Math.max(...aggregated.map((u) => u.paid_amount), 1);

  return aggregated
    .map((u) => {
      const answerRate  = u.calls  > 0 ? Math.round((u.answered / u.calls) * 100)   : 0;
      const promiseRate = u.answered > 0 ? Math.round((u.promised / u.answered) * 100) : 0;
      const scoreVolume  = Math.round((u.calls / maxCalls) * 25);
      const scoreAnswer  = Math.round((answerRate / 100) * 25);
      const scorePromise = Math.round((promiseRate / 100) * 25);
      const scoreRevenue = Math.round((u.paid_amount / maxAmount) * 25);
      const totalScore   = scoreVolume + scoreAnswer + scorePromise + scoreRevenue;

      const badges: ScoredUser["badges"] = [];
      if (u.calls === maxCalls)                         badges.push({ label: "Top Caller",      icon: Flame,    color: "text-orange-600 bg-orange-50 border-orange-200"  });
      if (answerRate >= 80)                             badges.push({ label: "High Answer Rate",icon: Phone,    color: "text-teal-600 bg-teal-50 border-teal-200"        });
      if (promiseRate >= 50 && u.answered >= 3)         badges.push({ label: "Best Converter",  icon: Target,   color: "text-amber-600 bg-amber-50 border-amber-200"     });
      if (u.paid_amount === maxAmount && maxAmount > 0) badges.push({ label: "Revenue Star",    icon: Sparkles, color: "text-emerald-600 bg-emerald-50 border-emerald-200" });

      return {
        ...u,
        displayName: u.called_by.includes("@") ? u.called_by.split("@")[0] : u.called_by,
        answerRate,
        promiseRate,
        scoreVolume,
        scoreAnswer,
        scorePromise,
        scoreRevenue,
        totalScore,
        badges,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

// ── Tilt Card (3D mouse-tracking wrapper) ───────────────────────────────────
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 25 });
  const scale   = useSpring(1, { stiffness: 300, damping: 25 });

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: "800px" }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top)  / rect.height - 0.5);
        scale.set(1.03);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); scale.set(1); }}
    >
      <motion.div style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </div>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls   = animateValue(count, value, { duration: 1.2, ease: "easeOut" });
    const unsub      = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{display.toLocaleString("en-IN")}</span>;
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-xs font-bold text-text-tertiary">#{rank}</span>;
}

// ── Score ring (brand palette) ───────────────────────────────────────────────
function ScoreRing({ score, size = 60 }: { score: number; size?: number }) {
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  // Use brand teal for high, secondary green for mid, muted for low
  const trackColor = "#E0F5F2";
  const arcColor   = score >= 70 ? "#673AB7" : score >= 40 ? "#7E57C2" : "#9CA3AF";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={6} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={arcColor} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px`, fontSize: 12, fontWeight: 700, fill: arcColor }}
      >{score}</text>
    </svg>
  );
}

// ── Score bar row (brand palette) ─────────────────────────────────────────────
function ScoreBarRow({ label, value, weight }: { label: string; value: number; weight: number; bar: string }) {
  const pct = Math.round((value / weight) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[9px] text-text-tertiary font-medium">{label}</span>
        <span className="text-[9px] font-semibold text-text-secondary tabular-nums">{value}/{weight}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E0F5F2" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(to right, #673AB7, #7E57C2)" }}
        />
      </div>
    </div>
  );
}

// ── Podium card (brand palette) ───────────────────────────────────────────────
function PodiumCard({ user, rank, expanded, onToggle }: {
  user: ScoredUser; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const heights  = { 1: "h-20", 2: "h-14", 3: "h-10" } as Record<number, string>;
  const configs  = {
    1: {
      card:   "from-[#EAF7F5] to-white border-[#673AB7]/30",
      base:   "from-[#E0F5F2] to-[#EAF7F5] border-[#673AB7]/20",
      shadow: "shadow-[0_4px_20px_rgba(103,58,183,0.18)]",
      crown:  true,
    },
    2: {
      card:   "from-[#F4F7F6] to-white border-border-light",
      base:   "from-[#F4F7F6] to-white border-border-light",
      shadow: "shadow-card",
      crown:  false,
    },
    3: {
      card:   "from-[#F0F9EC] to-white border-[#7E57C2]/25",
      base:   "from-[#EFF8E8] to-white border-[#7E57C2]/15",
      shadow: "shadow-card",
      crown:  false,
    },
  } as Record<number, { card: string; base: string; shadow: string; crown: boolean }>;
  const cfg = configs[rank];

  return (
    <TiltCard className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank === 1 ? 0 : rank * 0.12, duration: 0.6, ease: "easeOut" }}
        className="w-full flex flex-col items-center"
      >
        {/* Floating crown for #1 */}
        {cfg.crown && (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-1"
          >
            <Crown className="h-5 w-5 text-primary" />
          </motion.div>
        )}

        {/* Card body */}
        <div
          className={`w-full rounded-t-2xl bg-gradient-to-b ${cfg.card} border border-b-0 cursor-pointer select-none ${cfg.shadow} relative min-h-[210px] flex flex-col justify-center`}
          onClick={onToggle}
        >

          <div className="flex flex-col items-center gap-2 p-3 pt-4 relative">
            {/* Score ring + rank icon */}
            <div className="relative">
              <ScoreRing score={user.totalScore} size={64} />
              {!cfg.crown && (
                <div className="absolute -top-2 -right-2">
                  <RankIcon rank={rank} />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary">{user.displayName}</p>
              <p className="text-[10px] text-text-tertiary truncate max-w-[90px]">{user.branch}</p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 text-center">
              <div>
                <p className="text-xs font-semibold text-text-primary">{user.calls}</p>
                <p className="text-[9px] text-text-tertiary">calls</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-primary">{user.answerRate}%</p>
                <p className="text-[9px] text-text-tertiary">answered</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-success">{formatCurrency(user.paid_amount)}</p>
                <p className="text-[9px] text-text-tertiary">collected</p>
              </div>
            </div>

            {/* Badges */}
            {user.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {user.badges.map((b) => (
                  <span key={b.label} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${b.color}`}>
                    <b.icon className="h-2.5 w-2.5" />{b.label}
                  </span>
                ))}
              </div>
            )}

            {/* Expand toggle */}
            <div className="text-[9px] text-text-tertiary flex items-center gap-0.5">
              {expanded ? <><ChevronUp className="h-2.5 w-2.5" />Hide breakdown</> : <><ChevronDown className="h-2.5 w-2.5" />Score details</>}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full overflow-hidden border border-t-0 rounded-none bg-surface px-3 py-2 space-y-2 border-border-light"
            >
              {SCORE_COMPONENTS.map((c) => (
                <ScoreBarRow key={c.key} label={c.label} value={user[c.key]} weight={c.weight} bar={c.bar} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Podium base */}
        <div className={`w-full ${heights[rank]} rounded-b-2xl bg-gradient-to-b ${cfg.base} border border-t-0`} />
      </motion.div>
    </TiltCard>
  );
}

// ── Animations ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// ── Stat Card (clean brand palette) ─────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color, onClick,
}: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  // Icon + accent strip color — all within brand/semantic palette
  const configs: Record<string, { iconBg: string; iconColor: string; accent: string }> = {
    blue:    { iconBg: "bg-primary-light",   iconColor: "text-primary",  accent: "#673AB7" },
    violet:  { iconBg: "bg-primary-light",   iconColor: "text-primary",  accent: "#673AB7" },
    amber:   { iconBg: "bg-warning-light",   iconColor: "text-warning",  accent: "#D97706" },
    emerald: { iconBg: "bg-success-light",   iconColor: "text-success",  accent: "#059669" },
    red:     { iconBg: "bg-error-light",     iconColor: "text-error",    accent: "#DC2626" },
    teal:    { iconBg: "bg-primary-light",   iconColor: "text-primary",  accent: "#673AB7" },
  };
  const c = configs[color] ?? configs.teal;
  const numValue = typeof value === "number" ? value : 0;
  const isNumeric = typeof value === "number";

  return (
    <TiltCard>
      <div
        className={`relative rounded-xl bg-surface border border-border-light shadow-card overflow-hidden${onClick ? " cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow" : ""}`}
        onClick={onClick}
      >
        {/* Accent strip on top */}
        <div className="h-[3px] rounded-t-xl" style={{ background: c.accent }} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className={`w-9 h-9 rounded-lg ${c.iconBg} ${c.iconColor} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {isNumeric ? <AnimatedNumber value={numValue} /> : value}
          </p>
          <p className="text-xs font-medium text-text-secondary mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>}
        </div>
      </div>
    </TiltCard>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function FeeFollowUpDashboard() {
  const router = useRouter();
  const today = isoNow();
  const recentStart = isoDaysAgo(7);

  const [branch, setBranch] = useState("");
  const [from, setFrom] = useState(recentStart);
  const [to, setTo] = useState(today);
  const [calledBy, setCalledBy] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedUsers, setExpandedUsers] = useState(true);
  const [logSearch, setLogSearch] = useState("");
  const [leaderboardOpen, setLeaderboardOpen] = useState(true);
  const [expandedPodium, setExpandedPodium] = useState<Record<number, boolean>>({});
  const [expandedUserRows, setExpandedUserRows] = useState<Set<string>>(new Set());

  function buildDetailHref(kind: "promised" | "collected") {
    const params = new URLSearchParams({ kind });
    if (branch) params.set("branch", branch);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (calledBy) params.set("called_by", calledBy);
    if (statusFilter) params.set("status", statusFilter);
    return `/dashboard/director/fee-followup/detail?${params.toString()}`;
  }

  function toggleUserRow(user: string) {
    setExpandedUserRows((prev) => {
      const next = new Set(prev);
      if (next.has(user)) next.delete(user); else next.add(user);
      return next;
    });
  }

  // Branches
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => getAllBranches(),
    staleTime: 300_000,
  });

  // Main data
  const { data, isLoading, isError } = useQuery<FeeFollowUpData>({
    queryKey: ["director-fee-followup", branch, from, to, calledBy, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branch) params.set("branch", branch);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (calledBy) params.set("called_by", calledBy);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/director/fee-followup?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch follow-up data");
      return res.json();
    },
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const byUser = data?.by_user ?? [];
  const rawLogs = data?.logs ?? [];

  // Aggregate per-branch rows into one row per user
  const aggregatedUsers = useMemo(() => aggregateByUser(byUser), [byUser]);

  // Scored + ranked users for leaderboard
  const scoredUsers = useMemo(() => scoreUsers(byUser), [byUser]);
  const podium = scoredUsers.slice(0, 3);
  const rankList = scoredUsers.slice(3);

  // Unique calledBy list for filter
  const calledByOptions = useMemo(() => {
    const set = new Set(rawLogs.map((l) => l.called_by));
    return Array.from(set).sort();
  }, [rawLogs]);

  // Filter logs client-side by search
  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return rawLogs;
    return rawLogs.filter(
      (l) =>
        l.student_name.toLowerCase().includes(q) ||
        l.student.toLowerCase().includes(q) ||
        l.called_by.toLowerCase().includes(q) ||
        l.call_status.toLowerCase().includes(q) ||
        (l.remarks ?? "").toLowerCase().includes(q)
    );
  }, [rawLogs, logSearch]);

  return (
    <div className="min-h-screen pb-12 bg-app-bg">

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 4px 12px rgba(103,58,183,0.30)" }}
            >
              <PhoneCall className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Fee Follow-Up Analytics</h1>
              <p className="text-xs text-text-tertiary">Sales-user call activity overview</p>
            </div>
          </div>
        </motion.div>

        {/* ── Filters ── */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Branch */}
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">All Branches</option>
                  {(branches ?? []).map((b: BranchDetail) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* From */}
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* To */}
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Called By */}
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">Sales User</label>
                <select
                  value={calledBy}
                  onChange={(e) => setCalledBy(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">All Users</option>
                  {calledByOptions.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">All Statuses</option>
                  {CALL_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Loading / Error ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <video src="/Logo%20Icon%20Smile%20ALPHA.webm" autoPlay loop muted playsInline  className="w-20 h-20 object-contain" />
            <p className="text-xs font-semibold text-text-tertiary animate-pulse tracking-wide">Fetching Call Datas…</p>
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load follow-up data. Please try again.
          </div>
        )}

        {data && (
          <>
            {/* ── Summary Cards ── */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              <motion.div variants={item}>
                <StatCard
                  label="Calls Today"
                  value={summary?.total_today ?? 0}
                  icon={<Phone className="h-5 w-5" />}
                  color="blue"
                  onClick={() => router.push(`/dashboard/director/fee-followup/today${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`)}
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  label="Calls This Week"
                  value={summary?.total_this_week ?? 0}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="violet"
                  onClick={() => router.push(`/dashboard/director/fee-followup/week${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`)}
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  label="Promised to Pay"
                  value={summary?.promised_count ?? 0}
                  sub="students committed"
                  icon={<Clock className="h-5 w-5" />}
                  color="amber"
                  onClick={() => router.push(buildDetailHref("promised"))}
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  label="Payments Collected"
                  value={summary?.paid_count ?? 0}
                  sub={summary?.paid_amount ? formatCurrency(summary.paid_amount) : undefined}
                  icon={<IndianRupee className="h-5 w-5" />}
                  color="emerald"
                  onClick={() => router.push(buildDetailHref("collected"))}
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  label="No Answer / Busy"
                  value={summary?.no_answer_count ?? 0}
                  icon={<PhoneOff className="h-5 w-5" />}
                  color="red"
                />
              </motion.div>
            </motion.div>

            {/* ── Performance Leaderboard ── */}
            {scoredUsers.length > 0 && (
              <Card>
                <div
                  className="flex items-center justify-between px-4 pt-4 pb-3 cursor-pointer select-none"
                  onClick={() => setLeaderboardOpen((v) => !v)}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-text-primary">Sales Performance Leaderboard</span>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {scoredUsers.length} user{scoredUsers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {leaderboardOpen ? (
                    <ChevronUp className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>

                <AnimatePresence>
                  {leaderboardOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="pt-0 pb-5">
                        {/* Score legend */}
                        <div className="flex flex-wrap gap-3 mb-4">
                          {SCORE_COMPONENTS.map((c) => (
                            <span key={c.key} className="inline-flex items-center gap-1.5 text-[10px] text-text-tertiary">
                              <span className="w-2 h-2 rounded-full bg-primary/70" />
                              {c.label} ({c.weight}pts)
                            </span>
                          ))}
                        </div>

                        {/* Podium row: 2nd | 1st | 3rd */}
                        {podium.length > 0 && (
                          <div className="grid grid-cols-3 gap-3 items-end mb-5">
                            {/* 2nd place */}
                            {podium[1] ? (
                              <div className="mt-6">
                                <PodiumCard
                                  user={podium[1]}
                                  rank={2}
                                  expanded={!!expandedPodium[1]}
                                  onToggle={() => setExpandedPodium((p) => ({ ...p, 1: !p[1] }))}
                                />
                              </div>
                            ) : <div />}
                            {/* 1st place */}
                            <PodiumCard
                              user={podium[0]}
                              rank={1}
                              expanded={!!expandedPodium[0]}
                              onToggle={() => setExpandedPodium((p) => ({ ...p, 0: !p[0] }))}
                            />
                            {/* 3rd place */}
                            {podium[2] ? (
                              <div className="mt-12">
                                <PodiumCard
                                  user={podium[2]}
                                  rank={3}
                                  expanded={!!expandedPodium[2]}
                                  onToggle={() => setExpandedPodium((p) => ({ ...p, 2: !p[2] }))}
                                />
                              </div>
                            ) : <div />}
                          </div>
                        )}

                        {/* Rank list: 4th+ */}
                        {rankList.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">Other Rankings</p>
                            {rankList.map((u, i) => {
                              const rank = i + 4;
                              return (
                                <motion.div
                                  key={`${u.called_by}-${u.branch}`}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-3 rounded-lg border border-border-light bg-surface px-3 py-2.5"
                                >
                                  {/* Rank */}
                                  <div className="w-6 flex justify-center">
                                    <RankIcon rank={rank} />
                                  </div>
                                  {/* Name + branch */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-text-primary truncate">{u.displayName}</p>
                                    <p className="text-[10px] text-text-tertiary">{u.branch}</p>
                                  </div>
                                  {/* Score bar */}
                                  <div className="w-24 hidden sm:block">
                                    <div className="flex justify-between mb-0.5">
                                      <span className="text-[9px] text-text-tertiary">Score</span>
                                      <span className="text-[9px] font-semibold text-primary">{u.totalScore}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E0F5F2" }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${u.totalScore}%` }}
                                        transition={{ duration: 0.8 }}
                                        className="h-full rounded-full"
                                        style={{ background: "linear-gradient(to right, #673AB7, #7E57C2)" }}
                                      />
                                    </div>
                                  </div>
                                  {/* Stats */}
                                  <div className="flex gap-3 text-right">
                                    <div>
                                      <p className="text-xs font-semibold text-text-primary">{u.calls}</p>
                                      <p className="text-[9px] text-text-tertiary">calls</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-primary">{u.answerRate}%</p>
                                      <p className="text-[9px] text-text-tertiary">ans.</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-success">{formatCurrency(u.paid_amount)}</p>
                                      <p className="text-[9px] text-text-tertiary">coll.</p>
                                    </div>
                                  </div>
                                  {/* Badges */}
                                  <div className="flex gap-1 flex-wrap justify-end w-20 hidden lg:flex">
                                    {u.badges.map((b) => (
                                      <span key={b.label} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${b.color}`}>
                                        <b.icon className="h-2.5 w-2.5" />
                                      </span>
                                    ))}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )}

            {/* ── By-User Breakdown ── */}
            {byUser.length > 0 && (
              <Card>
                <div
                  className="flex items-center justify-between px-4 pt-4 pb-3 cursor-pointer select-none"
                  onClick={() => setExpandedUsers((v) => !v)}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-text-primary">Sales User Breakdown</span>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                      {aggregatedUsers.length} user{aggregatedUsers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {expandedUsers ? (
                    <ChevronUp className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>

                {expandedUsers && (
                  <CardContent className="pt-0 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-light">
                            <th className="text-left py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">User</th>
                            <th className="text-right py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">Calls</th>
                            <th className="text-right py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">Answered</th>
                            <th className="text-right py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">Promised</th>
                            <th className="text-right py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">Paid #</th>
                            <th className="text-right py-2 px-2 text-text-tertiary font-semibold uppercase tracking-wide text-[10px]">Paid ₹</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggregatedUsers.sort((a, b) => b.calls - a.calls).map((u, i) => {
                            const branchRows = byUser.filter((b) => b.called_by === u.called_by).sort((a, b) => b.calls - a.calls);
                            const isExpanded = expandedUserRows.has(u.called_by);
                            const hasMultiBranch = branchRows.length > 1;
                            return (
                              <React.Fragment key={u.called_by}>
                                <tr
                                  className={`border-b border-border-light/50 ${i % 2 === 0 ? "" : "bg-surface-alt/30"} ${hasMultiBranch ? "cursor-pointer hover:bg-primary/5" : ""}`}
                                  onClick={() => hasMultiBranch && toggleUserRow(u.called_by)}
                                >
                                  <td className="py-2.5 px-2 font-medium text-text-primary">
                                    <div className="flex items-center gap-1.5">
                                      {hasMultiBranch && (
                                        isExpanded
                                          ? <ChevronDown className="h-3 w-3 text-primary flex-shrink-0" />
                                          : <ChevronRight className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                                      )}
                                      <span>{u.called_by.split("@")[0]}</span>
                                      {hasMultiBranch && (
                                        <span className="text-[9px] text-text-tertiary font-normal">{branchRows.length} branches</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-semibold text-text-primary">{u.calls}</td>
                                  <td className="py-2.5 px-2 text-right text-teal-700 font-medium">{u.answered}</td>
                                  <td className="py-2.5 px-2 text-right text-amber-700 font-medium">{u.promised}</td>
                                  <td className="py-2.5 px-2 text-right text-emerald-700 font-medium">{u.paid_count}</td>
                                  <td className="py-2.5 px-2 text-right text-emerald-700 font-medium">{formatCurrency(u.paid_amount)}</td>
                                </tr>
                                {isExpanded && branchRows.map((b) => (
                                  <tr key={`${b.called_by}-${b.branch}`} className="bg-primary/5 border-b border-border-light/30">
                                    <td className="py-2 pl-7 pr-2 text-text-secondary italic">
                                      <div className="flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                                        {b.branch}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-text-secondary">{b.calls}</td>
                                    <td className="py-2 px-2 text-right text-teal-600">{b.answered}</td>
                                    <td className="py-2 px-2 text-right text-amber-600">{b.promised}</td>
                                    <td className="py-2 px-2 text-right text-emerald-600">{b.paid_count}</td>
                                    <td className="py-2 px-2 text-right text-emerald-600">{formatCurrency(b.paid_amount)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* ── Log List ── */}
            <div>
              {/* Section header + search */}
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-text-tertiary" />
                  <span className="text-sm font-semibold text-text-primary">Call Logs</span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-text-secondary">
                    {filteredLogs.length}
                  </span>
                </div>
                <input
                  type="search"
                  placeholder="Search name, user, status…"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border-light bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 w-48"
                />
              </div>

              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-secondary">
                  <PhoneOff className="h-6 w-6 text-text-tertiary" />
                  <p className="text-sm">No call logs found for the selected filters.</p>
                </div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                  {filteredLogs.map((log) => {
                    const sc = getStatusColor(log.call_status);
                    return (
                      <motion.div
                        key={log.name}
                        variants={item}
                        whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.09)" }}
                        transition={{ duration: 0.18 }}
                        className="rounded-lg border border-border-light bg-surface p-3.5 relative overflow-hidden pl-5"
                      >
                        {/* Left accent strip using brand/status color */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${sc.dot}`} style={{ borderRadius: "8px 0 0 8px" }} />
                        <div className="flex items-start justify-between gap-3">
                          {/* Left info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-text-primary">{log.student_name}</p>
                              <span className="text-[10px] text-text-tertiary font-mono">{log.student}</span>
                              {log.branch && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {log.branch}
                                </span>
                              )}
                            </div>

                            {/* Status + meta */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {log.call_status}
                              </span>
                              <span className="text-xs text-text-tertiary">{formatDateTime(log.call_date)}</span>
                              <span className="text-xs text-text-secondary">by <strong>{log.called_by.split("@")[0]}</strong></span>
                            </div>

                            {/* Remarks */}
                            {log.remarks && (
                              <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">{log.remarks}</p>
                            )}

                            {/* Next follow-up */}
                            {log.next_followup_date && (
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-teal-700">
                                <CalendarDays className="h-3 w-3" />
                                <span>Follow-up: {formatDate(log.next_followup_date)}</span>
                              </div>
                            )}
                          </div>

                          {/* Right: payment info */}
                          {log.payment_received ? (
                            <div className="shrink-0 text-right">
                              <div className="flex items-center gap-1 justify-end text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold">Paid</span>
                              </div>
                              {log.amount_received ? (
                                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                                  {formatCurrency(log.amount_received)}
                                </p>
                              ) : null}
                              {log.payment_mode && (
                                <p className="text-[10px] text-text-tertiary">{log.payment_mode}</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
