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
  /** Compact 2-column grid layout on mobile (<640px) */
  compactMobile?: boolean;
}

const colorMap = {
  primary: "bg-primary-light text-primary",
  secondary: "bg-secondary-light text-secondary",
  info: "bg-info-light text-info",
  warning: "bg-warning-light text-warning",
};

export function QuickActions({ actions, compactMobile = false }: QuickActionsProps) {
  const isOddCount = actions.length % 2 === 1;

  return (
    <div
      className={cn(
        compactMobile ? "grid grid-cols-2 gap-2.5 sm:gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"
      )}
    >
      {actions.map((action, index) => {
        const isSpanFullMobile = compactMobile && isOddCount && index === actions.length - 1;
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={isSpanFullMobile ? "col-span-2 sm:col-span-1 h-full" : "h-full"}
          >
            <Link href={action.href} className="block h-full">
              <div
                className={cn(
                  "group bg-surface rounded-[12px] border border-border-light hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer h-full",
                  compactMobile
                    ? isSpanFullMobile
                      ? "p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
                      : "p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4"
                    : "p-4 flex items-center gap-4"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between shrink-0",
                    compactMobile && !isSpanFullMobile ? "w-full sm:w-auto" : ""
                  )}
                >
                  <div
                    className={cn(
                      "rounded-[10px] flex items-center justify-center shrink-0",
                      compactMobile ? "w-9 h-9 sm:w-10 sm:h-10" : "w-10 h-10",
                      colorMap[action.color]
                    )}
                  >
                    {action.icon}
                  </div>
                  {compactMobile && !isSpanFullMobile && (
                    <ArrowRight className="h-3.5 w-3.5 text-text-tertiary group-hover:text-primary transition-colors sm:hidden" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-semibold text-text-primary group-hover:text-primary transition-colors",
                      compactMobile ? "text-xs sm:text-sm leading-snug" : "text-sm"
                    )}
                  >
                    {action.label}
                  </p>
                  <p
                    className={cn(
                      "text-text-tertiary",
                      compactMobile
                        ? "text-[11px] sm:text-xs line-clamp-1 sm:truncate mt-0.5 sm:mt-0"
                        : "text-xs truncate"
                    )}
                  >
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  className={cn(
                    "h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0",
                    compactMobile && !isSpanFullMobile ? "hidden sm:block" : ""
                  )}
                />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
