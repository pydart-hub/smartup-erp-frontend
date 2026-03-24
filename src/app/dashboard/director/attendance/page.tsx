"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, ChevronRight } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

const options = [
  {
    label: "Students",
    description: "View student attendance across all branches",
    href: "/dashboard/director/attendance/students",
    icon: GraduationCap,
    color: "text-primary",
    bg: "bg-brand-wash",
  },
  {
    label: "Staff",
    description: "View staff attendance across all branches",
    href: "/dashboard/director/attendance/staff",
    icon: Briefcase,
    color: "text-info",
    bg: "bg-info/10",
  },
];

export default function DirectorAttendancePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
        <p className="text-sm text-text-secondary mt-0.5">Track student and staff attendance across branches</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <Link key={opt.href} href={opt.href}>
            <div className="flex items-center gap-4 p-5 rounded-[10px] border border-border-light hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer bg-surface">
              <div className={`w-11 h-11 rounded-xl ${opt.bg} flex items-center justify-center shrink-0`}>
                <opt.icon className={`h-5 w-5 ${opt.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{opt.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
