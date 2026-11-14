"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  subtitle?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  loading?: boolean;
  /** When provided, the card becomes a clickable link */
  href?: string;
  /** Compact 2-column sizing on mobile (<640px) while keeping sm:+ identical */
  compactMobile?: boolean;
}

const colorMap = {
  primary: {
    bg: "bg-primary-light",
    text: "text-primary",
    border: "border-t-primary",
  },
  secondary: {
    bg: "bg-secondary-light",
    text: "text-secondary",
    border: "border-t-secondary",
  },
  success: {
    bg: "bg-success-light",
    text: "text-success",
    border: "border-t-success",
  },
  warning: {
    bg: "bg-warning-light",
    text: "text-warning",
    border: "border-t-warning",
  },
  error: {
    bg: "bg-error-light",
    text: "text-error",
    border: "border-t-error",
  },
  info: {
    bg: "bg-info-light",
    text: "text-info",
    border: "border-t-info",
  },
};

export function StatsCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  color = "primary",
  loading,
  href,
  compactMobile = false,
}: StatsCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div
        className={cn(
          "bg-surface rounded-[14px] border border-border-light shadow-card animate-pulse",
          compactMobile ? "p-3 sm:p-5 h-full" : "p-5"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex-1", compactMobile ? "space-y-2 sm:space-y-3" : "space-y-3")}>
            <div className={cn("bg-border-light rounded", compactMobile ? "h-2.5 sm:h-3 w-16 sm:w-24" : "h-3 w-24")} />
            <div className={cn("bg-border-light rounded", compactMobile ? "h-6 sm:h-8 w-14 sm:w-16" : "h-8 w-16")} />
          </div>
          <div className={cn("bg-border-light rounded-[10px] shrink-0", compactMobile ? "w-7 h-7 sm:w-11 sm:h-11 rounded-[8px] sm:rounded-[10px]" : "w-11 h-11")} />
        </div>
      </div>
    );
  }

  const card = (
    <div
      className={cn(
        "bg-surface rounded-[14px] border border-border-light shadow-card border-t-[3px] transition-shadow hover:shadow-card-hover",
        compactMobile ? "p-3 sm:p-5 h-full flex flex-col justify-between" : "p-5",
        href && "cursor-pointer group",
        colors.border
      )}
    >
      <div className={cn("flex items-start justify-between gap-2", compactMobile && "flex-col sm:flex-row")}>
        <div className={cn("min-w-0", compactMobile && "w-full sm:w-auto")}>
          <div className={cn(compactMobile && "flex items-start justify-between gap-1.5 sm:block")}>
            <p
              className={cn(
                "font-medium text-text-secondary",
                compactMobile ? "text-[11px] leading-tight sm:text-sm" : "text-sm"
              )}
            >
              {title}
            </p>
            {compactMobile && (
              <div
                className={cn(
                  "w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 sm:hidden",
                  colors.bg
                )}
              >
                <div className={cn(colors.text, "[&>svg]:h-3.5 [&>svg]:w-3.5")}>{icon}</div>
              </div>
            )}
          </div>
          <p
            className={cn(
              "font-bold text-text-primary",
              compactMobile
                ? "text-[17px] leading-snug sm:text-2xl mt-1.5 sm:mt-1 tabular-nums break-words"
                : "text-2xl mt-1"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <div className={compactMobile ? "mt-1 sm:mt-1.5" : "mt-1.5"}>{subtitle}</div>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 flex-wrap", compactMobile ? "mt-1 sm:mt-2" : "mt-2")}>
              {trend.value > 0 ? (
                <TrendingUp className={cn("text-success shrink-0", compactMobile ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5")} />
              ) : trend.value < 0 ? (
                <TrendingDown className={cn("text-error shrink-0", compactMobile ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5")} />
              ) : (
                <Minus className={cn("text-text-tertiary shrink-0", compactMobile ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5")} />
              )}
              <span
                className={cn(
                  "font-medium",
                  compactMobile ? "text-[10px] sm:text-xs" : "text-xs",
                  trend.value > 0 ? "text-success" : trend.value < 0 ? "text-error" : "text-text-tertiary"
                )}
              >
                {trend.value > 0 && "+"}
                {trend.value}%
              </span>
              <span className={cn("text-text-tertiary", compactMobile ? "text-[10px] sm:text-xs" : "text-xs")}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex-col items-end gap-2 shrink-0",
            compactMobile ? "hidden sm:flex" : "flex"
          )}
        >
          <div className={cn("w-11 h-11 rounded-[10px] flex items-center justify-center", colors.bg)}>
            <div className={colors.text}>{icon}</div>
          </div>
          {href && (
            <ArrowRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={compactMobile ? "h-full" : undefined}
    >
      {href ? (
        <Link href={href} className={compactMobile ? "block h-full" : undefined}>
          {card}
        </Link>
      ) : (
        card
      )}
    </motion.div>
  );
}
