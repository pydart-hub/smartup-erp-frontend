"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FrappeCpuOverloadWarningProps {
  redirectUrl: string;
}

// Premium cubic-bezier for easeOutExpo
const customEase = [0.16, 1, 0.3, 1] as any;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: customEase,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: customEase },
  },
};

export function FrappeCpuOverloadWarning({ redirectUrl }: FrappeCpuOverloadWarningProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[70vh]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full overflow-hidden rounded-[32px] border border-zinc-100 dark:border-zinc-800 bg-[linear-gradient(105deg,#ffffff_55%,#f5f3ff_100%)] dark:bg-[linear-gradient(105deg,#09090b_55%,#141124_100%)] p-8 sm:p-12 shadow-[0_20px_50px_rgba(99,102,241,0.04)] dark:shadow-none"
      >
        {/* Soft background glows */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[420px]">
          {/* Left Content Column */}
          <div className="lg:col-span-7 flex flex-col justify-center items-start text-left h-full py-2">
            {/* Status Badge */}
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/40 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-950/30 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-450 mb-5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              System Overload
            </motion.div>

            {/* Headings Group */}
            <motion.div variants={itemVariants} className="space-y-4 mb-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Level Exam Disabled
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-lg font-medium">
                The level exam dashboard and student mappings are disabled due to high CPU over-usage on the Frappe ERP backend.
              </p>
            </motion.div>

            {/* Info Box */}
            <motion.div 
              variants={itemVariants}
              className="flex gap-4.5 rounded-2xl bg-indigo-50/30 dark:bg-zinc-900/50 p-5 text-left text-xs sm:text-sm text-zinc-600 dark:text-zinc-350 w-full mb-8 max-w-xl border border-transparent dark:border-zinc-800/50"
            >
              <Info className="text-indigo-500 dark:text-indigo-400 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">What this means?</p>
                <p className="leading-relaxed font-medium">
                  You can bypass this issue by switching to the{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    Diagnosis Exam
                  </strong>{" "}
                  dashboard. It runs on a separate, high-performance PostgreSQL database and is fully operational.
                </p>
              </div>
            </motion.div>

            {/* Button */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button 
                asChild 
                size="lg" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-8 py-5.5 rounded-xl shadow-lg shadow-indigo-200/30 dark:shadow-none transition-all duration-300"
              >
                <Link href={redirectUrl}>
                  <TrendingUp className="h-5 w-5" />
                  Go to Diagnosis Exam
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Right Illustration Column (5 cols on large screens) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: customEase }}
            className="lg:col-span-5 relative w-full flex items-center justify-center lg:justify-end"
          >
            {/* Inline React styles for masking to guarantee cross-browser circular edge fading */}
            <div 
              style={{
                maskImage: "radial-gradient(circle at center, black 45%, transparent 95%)",
                WebkitMaskImage: "radial-gradient(circle at center, black 45%, transparent 95%)"
              }}
              className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-square flex items-center justify-center"
            >
              {/* Subtle indigo ambient glow ring backdrop */}
              <div className="absolute inset-4 bg-gradient-to-tr from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* 3D Illustration Asset with clean continuous floating animation */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full flex items-center justify-center"
              >
                <Image
                  src="/images/server_error_3d_white.png"
                  alt="Server Overload 3D Illustration"
                  width={340}
                  height={340}
                  priority
                  className="object-contain mix-blend-multiply dark:mix-blend-multiply"
                />

              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
