"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getBranchAttendance } from "@/lib/api/director";
import apiClient from "@/lib/api/client";

export default function DirectorStudentBranchAttendancePage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.branchId as string);
  const shortName = branchName
    .replace("Smart Up ", "")
    .replace("Smart Up", "HQ");

  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const {
    data: attendance,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-student-attendance", branchName, selectedDate],
    queryFn: () => getBranchAttendance(branchName, selectedDate),
    staleTime: 60_000,
  });

  const records = attendance ?? [];
  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;
  const lateCount = records.filter((r) => r.status === "Late").length;

  // Group by student group
  const byGroup = records.reduce(
    (acc, r) => {
      const key = r.student_group || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {} as Record<string, typeof records>
  );

  // Fetch disabilities for all students in records
  const studentIds = useMemo(() => [...new Set(records.map((r) => r.student))], [records]);
  const { data: disabilityMap = {} } = useQuery({
    queryKey: ["student-disabilities", studentIds],
    queryFn: async () => {
      if (!studentIds.length) return {};
      const { data } = await apiClient.get("/resource/Student", {
        params: {
          fields: JSON.stringify(["name", "custom_disabilities"]),
          filters: JSON.stringify([["name", "in", studentIds]]),
          limit_page_length: studentIds.length,
        },
      });
      const map: Record<string, string> = {};
      for (const s of data.data ?? []) {
        if (s.custom_disabilities) map[s.name] = s.custom_disabilities;
      }
      return map;
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/director/attendance/students">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Student Attendance — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {records.length} records for selected date
          </p>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-text-tertiary" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {records.length}
            </p>
            <p className="text-xs text-text-tertiary">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-xs text-text-tertiary">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{absentCount}</p>
            <p className="text-xs text-text-tertiary">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{lateCount}</p>
            <p className="text-xs text-text-tertiary">Late</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load attendance</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <ClipboardCheck className="h-8 w-8 text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">
            No attendance records for this date
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byGroup)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([group, recs]) => {
              const gPresent = recs.filter(
                (r) => r.status === "Present"
              ).length;
              const total = recs.length;
              const pct =
                total > 0 ? Math.round((gPresent / total) * 100) : 0;
              return (
                <Card key={group}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {group}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {gPresent}/{total} present
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-border-light rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {recs.map((r) => (
                        <div
                          key={r.name}
                          className={`text-xs px-2 py-1.5 rounded-md border ${
                            r.status === "Present"
                              ? "bg-success/5 border-success/20 text-success"
                              : r.status === "Absent"
                                ? "bg-error/5 border-error/20 text-error"
                                : "bg-warning/5 border-warning/20 text-warning"
                          }`}
                        >
                          {r.student_name}                          {disabilityMap[r.student] && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">{disabilityMap[r.student]}</span>
                          )}                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
