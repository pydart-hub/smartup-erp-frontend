"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  School,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import { getAttendance } from "@/lib/api/attendance";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function InstructorDashboard() {
  const { user, instructorDisplayName, allowedBatches, defaultCompany } = useAuth();
  const { activeBatches, totalStudents, isLoading: loadingBatches, batches } = useInstructorBatches();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's attendance — only for instructor's own batches (not the whole branch)
  const batchGroupNames = activeBatches.map((b) => b.name);
  const { data: attendanceRes, isLoading: loadingAttendance } = useQuery({
    queryKey: ["instructor-attendance-today", today, batchGroupNames],
    queryFn: async () => {
      if (!batchGroupNames.length) return { data: [] };
      // Fetch attendance for each of the instructor's batches
      const results = await Promise.all(
        batchGroupNames.map((groupName) =>
          getAttendance(today, { student_group: groupName }).then((r) => r.data)
        )
      );
      return { data: results.flat() };
    },
    enabled: batchGroupNames.length > 0,
    staleTime: 300_000,
  });

  const todayRecords = attendanceRes?.data ?? [];
  const todayPresent = todayRecords.filter((a) => a.status === "Present").length;
  const todayTotal = todayRecords.length;
  const attendancePct = todayTotal > 0 ? `${Math.round((todayPresent / todayTotal) * 100)}%` : "—";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {instructorDisplayName || user?.full_name || "Instructor"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {defaultCompany && (
            <span className="mr-3">{defaultCompany.replace("Smart Up ", "")}</span>
          )}
          {allowedBatches.length > 0 && (
            <Badge variant="outline">{allowedBatches.join(", ")}</Badge>
          )}
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="My Batches"
          value={loadingBatches ? "..." : String(activeBatches.length)}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: batches.length, label: "total" }}
        />
        <StatsCard
          title="Total Students"
          value={loadingBatches ? "..." : String(totalStudents)}
          icon={<GraduationCap className="h-5 w-5" />}
          trend={{ value: activeBatches.length, label: "batches" }}
        />
        <StatsCard
          title="Today's Attendance"
          value={loadingAttendance ? "..." : attendancePct}
          icon={<ClipboardCheck className="h-5 w-5" />}
          trend={todayTotal > 0 ? { value: todayPresent, label: `of ${todayTotal} present` } : { value: 0, label: "No records yet" }}
        />
      </motion.div>

      {/* Batches List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                My Batches
              </CardTitle>
              <Link
                href="/dashboard/instructor/batches"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBatches ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="animate-spin h-5 w-5 text-primary" />
              </div>
            ) : activeBatches.length === 0 ? (
              <p className="text-center text-text-secondary text-sm py-6">
                No batches assigned to you yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBatches.slice(0, 6).map((batch) => {
                  const enrolled = batch.students?.filter((s) => s.active !== 0).length ?? 0;
                  return (
                    <Link
                      key={batch.name}
                      href={`/dashboard/instructor/batches/${encodeURIComponent(batch.name)}`}
                    >
                      <div className="bg-app-bg rounded-[12px] p-4 border border-border-light hover:border-primary/20 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-text-primary text-sm">
                            {batch.student_group_name}
                          </h4>
                          <Badge variant="success">Active</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-text-secondary">
                          {batch.program && (
                            <div className="flex items-center gap-1.5">
                              <School className="h-3 w-3 text-text-tertiary" />
                              {batch.program}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3 w-3 text-text-tertiary" />
                            {enrolled} students
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
