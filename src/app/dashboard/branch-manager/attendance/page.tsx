"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  ChevronRight,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getClassWiseAttendance } from "@/lib/api/attendance";
import { getEmployeeAttendance, getEmployees } from "@/lib/api/employees";

export default function AttendanceLandingPage() {
  const { defaultCompany } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // Quick student attendance stats for today
  const { data: classWiseRes } = useQuery({
    queryKey: ["class-wise-attendance-quick", defaultCompany, today],
    queryFn: () =>
      getClassWiseAttendance(today, {
        custom_branch: defaultCompany || undefined,
      }),
    staleTime: 60_000,
    enabled: !!defaultCompany,
  });

  const studentStats = React.useMemo(() => {
    const rawData = classWiseRes?.data ?? [];
    let present = 0, absent = 0, late = 0;
    for (const row of rawData) {
      if (row.status === "Present") present += row.cnt;
      else if (row.status === "Absent") absent += row.cnt;
      else if (row.status === "Late") late += row.cnt;
    }
    const total = present + absent + late;
    return { present, absent, late, total };
  }, [classWiseRes]);

  // Quick staff attendance stats for today
  const { data: empRes } = useQuery({
    queryKey: ["employees-quick", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active" }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });

  const { data: staffAttRes } = useQuery({
    queryKey: ["employee-attendance-quick", defaultCompany, today],
    queryFn: () =>
      getEmployeeAttendance({
        company: defaultCompany || undefined,
        date: today,
      }),
    staleTime: 60_000,
    enabled: !!defaultCompany,
  });

  const staffStats = React.useMemo(() => {
    const totalEmployees = empRes?.data?.length ?? 0;
    const records = staffAttRes?.data ?? [];
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const marked = records.length;
    return { present, absent, total: totalEmployees, marked };
  }, [empRes, staffAttRes]);

  const cards = [
    {
      title: "Student Attendance",
      description: "Mark and track daily attendance for students across all batches",
      href: "/dashboard/branch-manager/attendance/students",
      icon: GraduationCap,
      color: "text-primary",
      bg: "bg-primary/10",
      stats: [
        { label: "Present", value: studentStats.present, color: "text-success" },
        { label: "Absent", value: studentStats.absent, color: "text-error" },
        { label: "Late", value: studentStats.late, color: "text-warning" },
      ],
      total: studentStats.total,
      marked: studentStats.total > 0,
    },
    {
      title: "Staff Attendance",
      description: "Mark and view attendance for all branch employees and teachers",
      href: "/dashboard/branch-manager/attendance/staff",
      icon: Briefcase,
      color: "text-info",
      bg: "bg-info/10",
      stats: [
        { label: "Present", value: staffStats.present, color: "text-success" },
        { label: "Absent", value: staffStats.absent, color: "text-error" },
        { label: "Not Marked", value: staffStats.total - staffStats.marked, color: "text-text-tertiary" },
      ],
      total: staffStats.total,
      marked: staffStats.marked > 0,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Attendance
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage student and staff attendance for your branch
        </p>
      </div>

      {/* Today's quick summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {studentStats.total > 0
                ? `${Math.round((studentStats.present / studentStats.total) * 100)}%`
                : "—"}
            </p>
            <p className="text-xs text-text-secondary font-medium mt-1">Student Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{studentStats.present + staffStats.present}</p>
            <p className="text-xs text-success font-medium mt-1">Total Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{studentStats.absent + staffStats.absent}</p>
            <p className="text-xs text-error font-medium mt-1">Total Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">
              {staffStats.total > 0
                ? `${Math.round((staffStats.present / staffStats.total) * 100)}%`
                : "—"}
            </p>
            <p className="text-xs text-text-secondary font-medium mt-1">Staff Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Two main cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={card.href}>
                <Card className="hover:shadow-card-hover transition-all cursor-pointer group h-full">
                  <CardContent className="p-6">
                    {/* Icon + Title */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center`}>
                          <Icon className={`h-7 w-7 ${card.color}`} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                            {card.title}
                          </h2>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {card.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:text-primary transition-colors mt-1" />
                    </div>

                    {/* Today's stats */}
                    <div className="bg-app-bg rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                          Today&apos;s Summary
                        </p>
                        <div className="flex items-center gap-1 text-xs text-text-tertiary">
                          <Users className="h-3 w-3" />
                          {card.total} total
                        </div>
                      </div>

                      {card.marked ? (
                        <>
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
                            <div className="h-full flex">
                              {card.stats[0].value > 0 && (
                                <div
                                  className="bg-success transition-all"
                                  style={{
                                    width: `${card.total > 0 ? (card.stats[0].value / card.total) * 100 : 0}%`,
                                  }}
                                />
                              )}
                              {card.stats[2]?.value > 0 && (
                                <div
                                  className="bg-warning transition-all"
                                  style={{
                                    width: `${card.total > 0 ? (card.stats[2].value / card.total) * 100 : 0}%`,
                                  }}
                                />
                              )}
                              {card.stats[1].value > 0 && (
                                <div
                                  className="bg-error transition-all"
                                  style={{
                                    width: `${card.total > 0 ? (card.stats[1].value / card.total) * 100 : 0}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Stat badges */}
                          <div className="flex items-center gap-4">
                            {card.stats.map((stat) => (
                              <div key={stat.label} className="flex items-center gap-1.5">
                                <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                                <span className="text-xs text-text-tertiary">{stat.label}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-sm text-text-tertiary">Not marked yet</p>
                          <p className="text-xs text-primary font-medium mt-1">
                            Click to start marking attendance
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
