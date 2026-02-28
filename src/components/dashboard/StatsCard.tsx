"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  loading?: boolean;
  /** When provided, the card becomes a clickable link */
  href?: string;
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

export function StatsCard({ title, value, icon, trend, color = "primary", loading, href }: StatsCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="bg-surface rounded-[14px] border border-border-light shadow-card p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 w-24 bg-border-light rounded" />
            <div className="h-8 w-16 bg-border-light rounded" />
          </div>
          <div className="w-11 h-11 bg-border-light rounded-[10px]" />
        </div>
      </div>
    );
  }

  const card = (
    <div className={cn(
      "bg-surface rounded-[14px] border border-border-light shadow-card p-5 border-t-[3px] transition-shadow hover:shadow-card-hover",
      href && "cursor-pointer group",
      colors.border
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : trend.value < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-error" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-text-tertiary" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend.value > 0 ? "text-success" : trend.value < 0 ? "text-error" : "text-text-tertiary"
              )}>
                {trend.value > 0 && "+"}{trend.value}%
              </span>
              <span className="text-xs text-text-tertiary">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
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
    >
      {href ? <Link href={href}>{card}</Link> : card}
    </motion.div>
  );
}
