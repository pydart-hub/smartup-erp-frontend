"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileBarChart } from "lucide-react";

export function ReportButton() {
  return (
    <Link href="/dashboard/director/students/report" className="no-underline">
      <div className="relative group select-none inline-flex w-fit rounded-xl">
        {/* Minimal 3D Depth Underlay */}
        <div 
          className="absolute inset-0 rounded-xl bg-slate-300 dark:bg-slate-950 translate-y-[3px]"
        />

        <motion.div
          className="relative flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold cursor-pointer
            text-slate-700 dark:text-slate-200 
            bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700/80"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.8) inset, 0 2px 4px rgba(0, 0, 0, 0.05)",
          }}
          whileHover={{
            y: -1.5,
            boxShadow: "0 0 0 1px rgba(255,255,255,1) inset, 0 4px 8px rgba(0, 0, 0, 0.08)",
            borderColor: "rgba(148, 163, 184, 0.5)",
          }}
          whileTap={{
            y: 3,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.4) inset, 0 1px 1px rgba(0, 0, 0, 0.05)",
          }}
          transition={{ type: "spring", stiffness: 450, damping: 18 }}
          title="View Student Admission Report"
        >
          {/* Soft glossy highlight */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none rounded-t-xl" />

          <FileBarChart className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 relative z-10 shrink-0" />
          
          <span className="relative z-10 tracking-wider uppercase font-extrabold text-slate-600 dark:text-slate-300">
            Report
          </span>
        </motion.div>
      </div>
    </Link>
  );
}
