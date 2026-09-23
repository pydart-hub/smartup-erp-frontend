"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Star,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

interface UnderDevelopmentViewProps {
  title?: string;
  subtitle?: string;
  description?: string;
  expectedFeatureList?: string[];
}

export function UnderDevelopmentView({
  title = "Instructor Reviews & Ratings",
  subtitle = "Feature Coming Soon",
  description = "This module is undergoing active development to bring comprehensive performance analytics, verified student feedback, and interactive instructor rating insights.",
  expectedFeatureList = [
    "Verified Multi-Category Student Feedback",
    "Branch & Faculty Performance Diagnostics",
    "Strengths & Areas of Growth Analytics",
    "Secure Anonymized Review Management",
  ],
}: UnderDevelopmentViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <BreadcrumbNav />

      {/* Main Glassmorphic Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-[#0E1526] dark:via-slate-900/60 dark:to-[#0E1526] shadow-xl p-8 sm:p-14 text-center">
        {/* Modern Ambient Mesh Gradients */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          {/* Animated Hero Icon Cluster */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mb-8"
          >
            {/* Outer Pulsing Aura */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 opacity-20 blur-xl animate-pulse" />

            {/* Central Icon Container */}
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#5f2ea8] to-indigo-600 p-[1.5px] shadow-2xl">
              <div className="w-full h-full rounded-[22px] bg-white dark:bg-[#0B1120] flex items-center justify-center">
                <Star className="w-11 h-11 text-[#5f2ea8] dark:text-violet-400 fill-[#5f2ea8]/20 dark:fill-violet-400/20" />
              </div>
            </div>

            {/* Floating Top Badge */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-3 rounded-full bg-amber-500 p-2 text-white shadow-lg shadow-amber-500/30 border-2 border-white dark:border-slate-900"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>

            {/* Floating Bottom Badge */}
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-2 -left-3 rounded-full bg-emerald-500 p-2 text-white shadow-lg shadow-emerald-500/30 border-2 border-white dark:border-slate-900"
            >
              <Zap className="w-3.5 h-3.5" />
            </motion.div>
          </motion.div>

          {/* Status Capsule */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-violet-50 text-[#5f2ea8] border border-violet-200/80 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60 shadow-xs mb-5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{subtitle}</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal"
          >
            {description}
          </motion.p>

          {/* Planned Capabilities Feature Badges */}
          {expectedFeatureList && expectedFeatureList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="w-full bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 mb-8 backdrop-blur"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Upcoming Module Highlights</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs text-slate-700 dark:text-slate-300">
                {expectedFeatureList.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5f2ea8] dark:bg-violet-400 shrink-0" />
                    <span className="font-medium truncate">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
