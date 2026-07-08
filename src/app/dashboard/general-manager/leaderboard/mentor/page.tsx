"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
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
  AlertCircle,
  TrendingUp,
  Building2,
  Check,
  Search,
  ArrowLeft,
  X,
  Lock,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getGMMentorSummary } from "@/lib/api/mentors";
import { useAuthStore } from "@/lib/stores/authStore";

// -- Types ------------------------------------------------------------------

type Tab = "overall" | "assigned" | "feedbacks" | "pending";

const TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "overall", label: "Overall Score", icon: Trophy },
  { value: "assigned", label: "Assigned Students", icon: Users },
  { value: "feedbacks", label: "Feedback Logs", icon: ClipboardList },
  { value: "pending", label: "Pending Tasks", icon: ClipboardCheck },
];

interface MentorLeaderboardEntry {
  mentorName: string;
  branch: string;
  assignedStudents: number;
  capacity: number;
  pendingFollowUps: number;
  feedbackCount: number;
  nonContactedStudents: number;
  // Computed scores
  activityScore: number;
  loadScore: number;
  nonContactedPenalty: number;
  totalScore: number;
}

// --- SUB-COMPONENTS ----------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md p-4 shadow-sm">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-[0.08] blur-xl pointer-events-none`} />
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">{label}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-text-primary">{value}</span>
            <span className="text-[10px] text-text-tertiary">{sub}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBreakdown({ entry }: { entry: MentorLeaderboardEntry }) {
  const scores = [
    { label: "Activity Rate (50%)", score: entry.activityScore, max: 50, bar: "from-teal-400 to-teal-600" },
    { label: "Load Util. (50%)", score: entry.loadScore, max: 50, bar: "from-blue-400 to-blue-600" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/5 dark:bg-white/[0.02] p-4 rounded-xl border border-black/5 dark:border-white/5">
        {scores.map((s, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-text-secondary">{s.label}</span>
              <span className="text-text-primary font-bold">
                {s.score} <span className="text-[10px] text-text-tertiary">/ {s.max}</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${s.bar} rounded-full`}
                style={{ width: `${(s.score / s.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {entry.nonContactedStudents > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-bold">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Non-Contacted Students Penalty ({entry.nonContactedStudents} students)
          </span>
          <span>-{entry.nonContactedPenalty} pts</span>
        </div>
      )}
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  tab,
  delay,
}: {
  entry: MentorLeaderboardEntry;
  rank: 1 | 2 | 3;
  tab: Tab;
  delay: number;
}) {
  const isFirst = rank === 1;

  const config = {
    1: {
      height: "h-64",
      bg: "bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-amber-600/5 border-amber-400/50 dark:border-amber-400/30 shadow-amber-400/10",
      glow: "shadow-2xl shadow-yellow-500/20",
      badgeBg: "from-amber-400 via-yellow-500 to-amber-600",
      icon: Crown,
      iconColor: "text-amber-500",
    },
    2: {
      height: "h-56",
      bg: "bg-gradient-to-br from-slate-300/20 via-slate-400/10 to-slate-500/5 border-slate-400/50 dark:border-slate-400/30 shadow-slate-400/10",
      glow: "shadow-xl shadow-slate-400/10",
      badgeBg: "from-slate-400 via-slate-500 to-slate-600",
      icon: Medal,
      iconColor: "text-slate-400",
    },
    3: {
      height: "h-48",
      bg: "bg-gradient-to-br from-orange-400/20 via-amber-700/10 to-orange-900/5 border-orange-500/50 dark:border-orange-500/30 shadow-orange-500/10",
      glow: "shadow-lg shadow-orange-500/10",
      badgeBg: "from-orange-500 via-amber-700 to-orange-800",
      icon: Medal,
      iconColor: "text-orange-600",
    },
  }[rank];

  const displayVal = (() => {
    switch (tab) {
      case "assigned":
        return `${entry.assignedStudents} / ${entry.capacity} Students`;
      case "feedbacks":
        return `${entry.feedbackCount} logs`;
      case "pending":
        return `${entry.pendingFollowUps} pending`;
      default:
        return `${entry.totalScore} pts`;
    }
  })();

  const TrophyIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      className={`relative overflow-hidden rounded-3xl border backdrop-blur-md p-6 flex flex-col items-center justify-between text-center ${config.bg} ${config.glow} ${config.height}`}
    >
      <div className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
        <TrophyIcon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      <div className="space-y-2 mt-4">
        <div className={`mx-auto flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${config.badgeBg} text-white font-black text-xl shadow-lg`}>
          {rank}
        </div>
        <div>
          <h4 className="font-bold text-text-primary text-sm tracking-tight line-clamp-1">
            {entry.mentorName}
          </h4>
          <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">
            {entry.branch}
          </p>
        </div>
      </div>

      <div className="w-full bg-white/60 dark:bg-black/20 py-2.5 px-4 rounded-2xl border border-white dark:border-white/5">
        <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold">
          {tab === "overall" ? "Overall Score" : TABS.find((t) => t.value === tab)?.label}
        </p>
        <p className="text-base font-black text-text-primary mt-0.5">{displayVal}</p>
      </div>
    </motion.div>
  );
}

function RankRow({
  entry,
  rank,
  tab,
  expanded,
  onToggle,
}: {
  entry: MentorLeaderboardEntry;
  rank: number;
  tab: Tab;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isTop3 = rank <= 3;
  const displayVal = (() => {
    switch (tab) {
      case "assigned":
        return `${entry.assignedStudents} / ${entry.capacity}`;
      case "feedbacks":
        return `${entry.feedbackCount}`;
      case "pending":
        return `${entry.pendingFollowUps}`;
      default:
        return `${entry.totalScore}`;
    }
  })();

  const subLabel = (() => {
    switch (tab) {
      case "assigned":
        return "assigned students";
      case "feedbacks":
        return "feedback logs";
      case "pending":
        return "pending tasks";
      default:
        return "points";
    }
  })();

  return (
    <div className="border-b border-border-light dark:border-white/5 last:border-0">
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 sm:p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.01] cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
              isTop3
                ? rank === 1
                  ? "bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                  : rank === 2
                    ? "bg-slate-300/20 text-slate-600 dark:text-slate-300 border border-slate-300/30"
                    : "bg-orange-400/20 text-orange-700 dark:text-orange-400 border border-orange-400/30"
                : "bg-black/5 dark:bg-white/5 text-text-tertiary"
            }`}
          >
            {rank}
          </div>
          <div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base leading-tight">
              {entry.mentorName}
            </h4>
            <p className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mt-0.5">
              {entry.branch}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-base sm:text-lg font-black text-text-primary">{displayVal}</span>
            <span className="block text-[9px] sm:text-[10px] text-text-tertiary uppercase tracking-wider">
              {subLabel}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-text-tertiary transition-transform duration-300 ${
              expanded ? "rotate-180 text-text-primary" : ""
            }`}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-black/5 dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                  <span className="block text-[9px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Capacity Load
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {entry.assignedStudents} / {entry.capacity} ({Math.round((entry.assignedStudents / Math.max(1, entry.capacity)) * 100)}%)
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                  <span className="block text-[9px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Feedback Count
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {entry.feedbackCount} logs
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                  <span className="block text-[9px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Non-Contacted
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    {entry.nonContactedStudents} students
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                  <span className="block text-[9px] text-text-tertiary uppercase tracking-wider font-semibold">
                    Combined Rank
                  </span>
                  <span className="text-sm font-bold text-text-primary">
                    #{rank} of the system
                  </span>
                </div>
              </div>
              <ScoreBreakdown entry={entry} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- MAIN PAGE ---------------------------------------------------------------

export default function GMMentorLeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overall");
  const [searchQuery, setSearchQuery] = useState("");
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

  const branchParam = selectedBranch;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["gm-mentor-summary", branchParam],
    queryFn: () => getGMMentorSummary(branchParam === "all" ? undefined : branchParam),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  // End transition once fetch settles
  useEffect(() => {
    if (!isFetching) endTransition();
  }, [isFetching]);

  const displayLabel = selectedBranch === "all" ? "All Branches" : selectedBranch;

  const rawMentors = data?.mentorLoadComparison ?? [];

  // Compute leaderboard scores for all mentors
  const enrichedMentors = useMemo(() => {
    return rawMentors.map((m) => {
      // Activity rate score (50 points max)
      const activityRate = m.feedbackCount / Math.max(1, m.assignedStudents);
      const activityScore = Math.round(Math.min(50, activityRate * 25));

      // Capacity load score (50 points max)
      const loadRatio = m.assignedStudents / Math.max(1, m.capacity);
      const loadScore = Math.round(Math.min(50, loadRatio * 50));

      // Penalty for non-contacted students (deduct 5 points per student)
      const nonContactedPenalty = (m.nonContactedStudents || 0) * 5;

      const totalScore = Math.max(0, activityScore + loadScore - nonContactedPenalty);

      return {
        ...m,
        activityScore,
        loadScore,
        nonContactedPenalty,
        totalScore,
      };
    });
  }, [rawMentors]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return enrichedMentors;
    const q = searchQuery.toLowerCase();
    return enrichedMentors.filter(
      (m) =>
        m.mentorName.toLowerCase().includes(q) ||
        m.branch.toLowerCase().includes(q)
    );
  }, [enrichedMentors, searchQuery]);

  // Sort mentors based on active tab
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (activeTab) {
      case "assigned":
        arr.sort((a, b) => b.assignedStudents - a.assignedStudents);
        break;
      case "feedbacks":
        arr.sort((a, b) => b.feedbackCount - a.feedbackCount);
        break;
      case "pending":
        // Lower pending tasks is better
        arr.sort((a, b) => a.pendingFollowUps - b.pendingFollowUps);
        break;
      default:
        arr.sort((a, b) => b.totalScore - a.totalScore);
        break;
    }
    return arr;
  }, [filtered, activeTab]);

  // Podium order: 2nd place left, 1st center, 3rd right
  const podiumOrder = useMemo(() => {
    if (sorted.length === 0) return [];
    if (sorted.length === 1) return [sorted[0]];
    if (sorted.length === 2) return [sorted[1], sorted[0]];
    return [sorted[1], sorted[0], sorted[2]];
  }, [sorted]);

  const podiumRanks = useMemo(() => {
    if (sorted.length === 0) return [];
    if (sorted.length === 1) return [1] as const;
    if (sorted.length === 2) return [2, 1] as const;
    return [2, 1, 3] as const;
  }, [sorted]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* -- Header row with navigation & actions -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/general-manager/leaderboard"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Selector
          </Link>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">
            Mentor Leaderboard
          </h1>
          <p className="text-sm text-text-tertiary">
            Track and compare mentor engagement logs, load utilization, and pending follow-ups.
          </p>
        </div>

        {/* -- Branch filter dropdown -- */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative" ref={branchRef}>
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/[0.04] border border-white dark:border-white/5 rounded-2xl shadow-sm hover:bg-black/5 dark:hover:bg-white/10 transition-all font-semibold text-sm text-text-primary"
            >
              <Building2 className="w-4 h-4 text-text-tertiary" />
              <span>{displayLabel}</span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${branchOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {branchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 py-1"
                >
                  <button
                    onClick={() => {
                      startTransition();
                      setSelectedBranch("all");
                      setBranchOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-between ${
                      selectedBranch === "all" ? "text-primary bg-primary/5" : "text-text-primary"
                    }`}
                  >
                    <span>All Branches</span>
                    {selectedBranch === "all" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {branches.map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        startTransition();
                        setSelectedBranch(b);
                        setBranchOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-between ${
                        selectedBranch === b ? "text-primary bg-primary/5" : "text-text-primary"
                      }`}
                    >
                      <span className="line-clamp-1">{b}</span>
                      {selectedBranch === b && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* -- Criteria Explanation Banner -- */}
      <div className="p-5 rounded-3xl border border-teal-500/20 bg-teal-500/5 backdrop-blur-md flex flex-col gap-3 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-teal-800 dark:text-teal-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            Scoring Criteria & Rules
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            The overall score is calculated out of <strong>100 points</strong>. Below is the breakdown of the criteria and what they measure:
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white/60 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-3 rounded-2xl">
            <span className="font-bold text-teal-600 dark:text-teal-400 block mb-0.5">1. Activity Rate (50%)</span>
            <p className="text-[11px] text-text-tertiary leading-normal">
              Measures the total number of feedback logs relative to the mentor's active student load.
            </p>
          </div>
          <div className="bg-white/60 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-3 rounded-2xl">
            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">2. Load Utilized (50%)</span>
            <p className="text-[11px] text-text-tertiary leading-normal">
              Measures capacity utilization. It is the percentage of assigned students relative to the mentor's maximum student limit (capacity).
            </p>
          </div>
        </div>
      </div>

      {/* -- Search & filter -- */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search mentors by name or branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white/50 dark:bg-white/[0.02] border border-white/60 dark:border-white/5 rounded-2xl text-sm font-semibold text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* -- Transition alert loader -- */}
      <AnimatePresence>
        {(isFetching || isTransitioning) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-500/20 text-xs font-semibold"
          >
            <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
            <span>Updating leaderboard data...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Error state -- */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/10 text-error rounded-2xl border border-error/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-semibold">
            <p className="font-bold">Failed to load leaderboard</p>
            <p className="opacity-90">{error instanceof Error ? error.message : "Internal API Error"}</p>
          </div>
        </div>
      )}

      {/* -- Data content -- */}
      <div className="relative space-y-6">

        {/* -- Stat cards -- */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total Mentors" value={String(data.totalMentors)} sub="active" gradient="from-teal-500 to-emerald-600" />
            <StatCard icon={TrendingUp} label="Avg Load" value={String(data.averageStudentsPerMentor)} sub="students/mentor" gradient="from-blue-500 to-indigo-600" />
            <StatCard icon={ClipboardCheck} label="Assigned" value={String(data.totalAssignedStudents)} sub="students" gradient="from-purple-500 to-pink-600" />
            <StatCard icon={AlertCircle} label="Pending Tasks" value={String(data.pendingFollowUps)} sub="follow-ups" gradient="from-amber-500 to-orange-600" />
          </div>
        )}

        {/* -- Tab bar -- */}
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
                      layoutId="activeTabMentor"
                      className="absolute inset-0 bg-[#0D9488] rounded-xl shadow-md shadow-teal-500/30"
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

        {/* -- Empty state -- */}
        {sorted.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border-light flex items-center justify-center shadow-sm">
              <Users className="w-8 h-8 text-text-tertiary opacity-40" />
            </div>
            <p className="font-bold text-text-primary">No mentor data</p>
            <p className="text-sm text-text-tertiary">No matching mentor profiles found.</p>
          </motion.div>
        )}

        {/* -- Podium — 2-1-3 layout -- */}
        {sorted.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-4">Top Performers</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {podiumOrder.map((entry, idx) => (
                <PodiumCard
                  key={entry.mentorName}
                  entry={entry}
                  rank={podiumRanks[idx]}
                  tab={activeTab}
                  delay={idx * 0.1}
                />
              ))}
            </div>
          </div>
        )}

        {/* -- Full rankings -- */}
        {sorted.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary mb-3">
              Full Rankings — {TABS.find((t) => t.value === activeTab)?.label}
            </p>
            <div className="bg-surface rounded-2xl border border-border-light overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {sorted.map((entry, i) => (
                <RankRow
                  key={entry.mentorName}
                  entry={entry}
                  rank={i + 1}
                  tab={activeTab}
                  expanded={expandedId === entry.mentorName}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === entry.mentorName ? null : entry.mentorName))
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
