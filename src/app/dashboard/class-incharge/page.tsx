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
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import { getBatches } from "@/lib/api/batches";
import { getAttendance } from "@/lib/api/attendance";
import { getChecklists } from "@/lib/api/checklists";
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

  const { data: checklists = [] } = useQuery({
    queryKey: ["my-checklists", user?.name],
    queryFn: () => getChecklists({ employee: user?.name || undefined }),
    enabled: !!user?.name,
  });
  const hasTodayChecklist = checklists.some((c) => c.date === today);

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

      {!hasTodayChecklist && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-text-primary">Daily Checklist Reminder</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                You haven't submitted your checklist for today yet. Please submit it before the end of the day.
              </p>
            </div>
          </div>
          <Link href="/dashboard/class-incharge/checklist">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md rounded-xl text-xs px-4 py-2 shrink-0 self-start sm:self-center">
              Complete Checklist Now
            </Button>
          </Link>
        </motion.div>
      )}

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
