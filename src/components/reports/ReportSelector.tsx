"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  UserCheck,
  IndianRupee,
  Receipt,
  Users,
  ClipboardEdit,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import type { ReportDefinition } from "@/lib/reports/definitions";

const iconMap: Record<string, React.ElementType> = {
  GraduationCap,
  UserCheck,
  IndianRupee,
  Receipt,
  Users,
  ClipboardEdit,
  ClipboardCheck,
  LayoutDashboard,
};

interface ReportSelectorProps {
  reports: ReportDefinition[];
  selected: string | null;
  onSelect: (key: string) => void;
}

export function ReportSelector({ reports, selected, onSelect }: ReportSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {reports.map((report) => {
        const Icon = iconMap[report.icon] || LayoutDashboard;
        const isActive = selected === report.key;

        return (
          <motion.div
            key={report.key}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all h-full",
                isActive
                  ? "border-primary bg-brand-wash shadow-md"
                  : "border-border-light hover:border-primary/30 hover:shadow-sm"
              )}
              onClick={() => onSelect(report.key)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-[10px] flex items-center justify-center",
                    isActive ? "bg-primary text-white" : "bg-brand-wash text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-primary" : "text-text-primary"
                  )}>
                    {report.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-2">
                    {report.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
