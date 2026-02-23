"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "info" | "warning";
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const colorMap = {
  primary: "bg-primary-light text-primary",
  secondary: "bg-secondary-light text-secondary",
  info: "bg-info-light text-info",
  warning: "bg-warning-light text-warning",
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {actions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Link href={action.href}>
            <div className="group bg-surface rounded-[12px] border border-border-light p-4 flex items-center gap-4 hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer">
              <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0", colorMap[action.color])}>
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-text-tertiary truncate">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
