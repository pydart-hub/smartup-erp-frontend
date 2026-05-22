"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  GraduationCap,
  Users,
  School,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import { getBatches } from "@/lib/api/batches";
import { getAttendance } from "@/lib/api/attendance";
import type { Batch } from "@/lib/types/batch";

const today = new Date().toISOString().split("T")[0];

export default function ClassInchargeDashboard() {
  const { defaultCompany, user } = useAuth();
  const { selectedYear } = useAcademicYearStore();

  const { data: batchesRes } = useQuery({
    queryKey: ["ci-batches", defaultCompany, selectedYear],
    queryFn: () =>
      getBatches({
        limit_page_length: 500,
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
        academic_year: selectedYear,
      }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });
  const batches = (batchesRes?.data ?? []).filter((b: Batch) => !b.disabled);

  const { data: attendanceRes } = useQuery({
    queryKey: ["ci-today-attendance", defaultCompany, today],
    queryFn: () =>
      getAttendance(today, { custom_branch: defaultCompany || undefined }),
    staleTime: 60_000,
    enabled: !!defaultCompany,
  });
  const records = attendanceRes?.data ?? [];

  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const late = records.filter((r) => r.status === "Late").length;
  const total = present + absent + late;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const stats = [
    { label: "Today's Attendance", value: `${pct}%`, color: "text-primary", icon: ClipboardCheck },
    { label: "Present", value: present, color: "text-success", icon: Users },
    { label: "Absent", value: absent, color: "text-error", icon: Users },
    { label: "Batches", value: batches.length, color: "text-info", icon: School },
  ];

  const quickActions = [
    {
      label: "Mark Attendance",
      description: "View and mark attendance for all classes",
      href: "/dashboard/class-incharge/attendance",
      icon: ClipboardCheck,
      color: "bg-brand-wash text-primary",
    },
    {
      label: "Students",
      description: "View students across all classes",
      href: "/dashboard/class-incharge/students",
      icon: GraduationCap,
      color: "bg-green-50 text-green-600",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {user?.full_name?.split(" ")[0] ?? "Class Incharge"} 👋
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {defaultCompany} — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-text-secondary font-medium mt-1">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((a, i) => (
          <motion.div key={a.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
            <Link href={a.href}>
              <Card className="cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-[12px] ${a.color} flex items-center justify-center shrink-0`}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm">{a.label}</p>
                    <p className="text-xs text-text-secondary truncate">{a.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
