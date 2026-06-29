"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hammer, Construction, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function UnderDevelopment() {
  const router = useRouter();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background glowing elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

      {/* Floating construction icons */}
      <motion.div
        animate={{
          y: [0, -12, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative mb-8 text-indigo-600 dark:text-indigo-400 p-6 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/[0.05] shadow-2xl backdrop-blur-md"
      >
        <Construction className="h-16 w-16 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <motion.div
          animate={{ rotate: [0, 20, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 text-amber-500"
        >
          <Hammer className="h-6 w-6" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -bottom-1 -left-1 text-teal-400"
        >
          <Sparkles className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {/* Text Content */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-4"
      >
        Under Construction
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-slate-500 dark:text-slate-400 max-w-md text-base mb-8 leading-relaxed"
      >
        We are building something amazing here! This module is currently under development. Stay tuned for exciting new features.
      </motion.p>

      {/* Interactive Back Button */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg hover:shadow-indigo-500/25"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Go Back</span>
      </motion.button>
    </div>
  );
}
