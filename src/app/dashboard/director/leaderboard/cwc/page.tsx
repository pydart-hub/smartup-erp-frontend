"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  Construction,
  Hammer,
  Sparkles,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useTheme } from "next-themes";

export default function CwcLeaderboardUnderDevelopmentPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="relative min-h-[70vh] w-full flex flex-col justify-between overflow-hidden rounded-3xl bg-slate-50/60 dark:bg-slate-900/60 p-6 md:p-10 border border-slate-200/60 dark:border-white/5 shadow-xl">
      {/* Background ambient orbs */}
      <motion.div
        className="absolute -top-16 -left-16 w-80 h-80 rounded-full pointer-events-none blur-[90px]"
        style={{
          background: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.12)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full pointer-events-none blur-[90px]"
        style={{
          background: isDark ? "rgba(234, 88, 12, 0.15)" : "rgba(234, 88, 12, 0.1)",
        }}
        animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <BreadcrumbNav />
        <button
          onClick={() => router.push("/dashboard/director/leaderboard")}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      {/* Centered Minimal Content */}
      <div className="relative z-10 text-center max-w-md mx-auto my-auto py-10 space-y-5">
        {/* Animated Icon */}
        <div className="relative inline-flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-orange-500/25 ring-4 ring-amber-400/20"
            animate={{
              y: [0, -6, 0],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Trophy className="h-10 w-10 text-white drop-shadow-md" />
          </motion.div>

          {/* Hammer Badge */}
          <motion.div
            className="absolute -top-1.5 -right-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-amber-500/30 text-amber-500"
            animate={{ rotate: [0, 20, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Hammer className="h-4 w-4" />
          </motion.div>

          {/* Sparkles Badge */}
          <motion.div
            className="absolute -bottom-1.5 -left-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-orange-200 dark:border-orange-500/30 text-orange-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </motion.div>
        </div>

        {/* Status Pill */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <Construction className="h-3.5 w-3.5 animate-pulse" />
            Under Development
          </span>
        </div>

        {/* Title & Short Description */}
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            CWC Leaderboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Instructor and branch rankings based on CWC assessments are currently under development.
          </p>
        </div>

        {/* Back Button */}
        <div className="pt-2">
          <button
            onClick={() => router.push("/dashboard/director/leaderboard")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Leaderboards
          </button>
        </div>
      </div>

      {/* Subtle bottom spacer for balanced layout */}
      <div className="h-4" />
    </div>
  );
}
