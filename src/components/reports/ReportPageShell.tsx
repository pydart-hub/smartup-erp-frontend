"use client";

import React, { useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Building2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

type Mode = "branch" | "class";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  /** Whether we're at drill-down level (hides mode toggle) */
  isDetail?: boolean;
  children: (mode: Mode, onModeChange: (m: Mode) => void) => ReactNode;
}

export function ReportPageShell({ icon, title, description, isDetail, children }: Props) {
  const [mode, setMode] = useState<Mode>("branch");

  const handleModeSwitch = useCallback((m: Mode) => {
    setMode(m);
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            <p className="text-text-secondary text-sm mt-0.5">{description}</p>
          </div>
        </div>
      </motion.div>

      {/* Tab Selector — only visible at summary level */}
      {!isDetail && (
        <motion.div variants={itemVariants}>
          <div className="flex gap-2 p-1 bg-app-bg rounded-[12px] border border-border-light w-fit">
            <button
              onClick={() => handleModeSwitch("branch")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                mode === "branch"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface",
              )}
            >
              <Building2 className="h-4 w-4" />
              Branch Wise
            </button>
            <button
              onClick={() => handleModeSwitch("class")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all",
                mode === "class"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface",
              )}
            >
              <GraduationCap className="h-4 w-4" />
              Class Wise
            </button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        {children(mode, handleModeSwitch)}
      </motion.div>
    </motion.div>
  );
}
