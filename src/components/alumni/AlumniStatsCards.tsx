"use client";

import { Users, GraduationCap, BookOpen, Award } from "lucide-react";
import type { AlumniListSummary } from "@/lib/types/alumni";

interface AlumniStatsCardsProps {
  summary: AlumniListSummary;
}

const statConfig = [
  {
    key: "total",
    label: "Total Alumni",
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    iconBg: "bg-blue-500",
    text: "text-blue-600",
    border: "border-blue-100",
  },
  {
    key: "currentYearPassouts",
    label: "This Year Passouts",
    icon: GraduationCap,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-500",
    text: "text-emerald-600",
    border: "border-emerald-100",
  },
  {
    key: "ugCount",
    label: "UG Graduates",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    iconBg: "bg-violet-500",
    text: "text-violet-600",
    border: "border-violet-100",
  },
  {
    key: "pgCount",
    label: "PG Graduates",
    icon: Award,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    iconBg: "bg-amber-500",
    text: "text-amber-600",
    border: "border-amber-100",
  },
] as const;

export function AlumniStatsCards({ summary }: AlumniStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statConfig.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className={`relative overflow-hidden rounded-2xl border ${stat.border} ${stat.bg} p-5 flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-sm`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-3xl font-bold tabular-nums ${stat.text}`}>{summary[stat.key]}</p>
              <p className="text-xs font-medium text-text-secondary mt-1 uppercase tracking-wide">{stat.label}</p>
            </div>
            {/* decorative circle */}
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${stat.gradient}`} />
          </div>
        );
      })}
    </div>
  );
}
