"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, CheckCircle, XCircle, Clock, Users, Save,
  Loader2, School, ChevronRight, ArrowLeft, BarChart3,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";
import { getBatches, getBatch } from "@/lib/api/batches";
import { getAttendance, bulkMarkAttendance, getClassWiseAttendance } from "@/lib/api/attendance";
import type { Batch, BatchStudent } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";

type AttendanceStatus = "Present" | "Absent" | "Late";

interface ClassSummary {
  name: string;
  displayName: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export default function AttendancePage() {
  const { flags } = useFeatureFlagsStore();
  const { defaultCompany } = useAuth();

  // View mode: "dashboard" (class-wise overview) vs "batch" (detailed)
  const [viewMode, setViewMode] = useState<"dashboard" | "batch">("dashboard");

  // Shared date filter
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Batch detail state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Batches list ──
  const { data: batchesRes } = useQuery({
    queryKey: ["batches-list", defaultCompany],
    queryFn: () =>
      getBatches({
        limit_page_length: 500,
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });
  const batches = (batchesRes?.data ?? []).filter((b) => !b.disabled);
  const batchMap = useMemo(
    () => new Map(batches.map((b) => [b.name, b])),
    [batches]
  );

  // ── Class-wise attendance summary (dashboard view) ──
  const { data: classWiseRes, isLoading: classWiseLoading } = useQuery({
    queryKey: ["class-wise-attendance", defaultCompany, selectedDate],
    queryFn: () =>
      getClassWiseAttendance(selectedDate, {
        custom_branch: defaultCompany || undefined,
      }),
    staleTime: 30_000,
    enabled: !!defaultCompany && viewMode === "dashboard",
  });

  // Build class summaries
  const classSummaries: ClassSummary[] = useMemo(() => {
    const rawData = classWiseRes?.data ?? [];
    const groupMap = new Map<string, { present: number; absent: number; late: number }>();

    for (const row of rawData) {
      if (!row.student_group) continue;
      const existing = groupMap.get(row.student_group) ?? { present: 0, absent: 0, late: 0 };
      if (row.status === "Present") existing.present = row.cnt;
      else if (row.status === "Absent") existing.absent = row.cnt;
      else if (row.status === "Late") existing.late = row.cnt;
      groupMap.set(row.student_group, existing);
    }

    // Include ALL batches, even those with no attendance data
    const allGroups = new Set([...groupMap.keys(), ...batches.map((b) => b.name)]);

    return Array.from(allGroups)
      .map((groupName) => {
        const counts = groupMap.get(groupName) ?? { present: 0, absent: 0, late: 0 };
        const total = counts.present + counts.absent + counts.late;
        const batch = batchMap.get(groupName);
        return {
          name: groupName,
          displayName: batch?.student_group_name ?? groupName,
          ...counts,
          total,
          percentage: total > 0 ? Math.round((counts.present / total) * 100) : 0,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [classWiseRes, batches, batchMap]);

  // Overall totals
  const overallPresent = classSummaries.reduce((s, c) => s + c.present, 0);
  const overallAbsent = classSummaries.reduce((s, c) => s + c.absent, 0);
  const overallLate = classSummaries.reduce((s, c) => s + c.late, 0);
  const overallTotal = overallPresent + overallAbsent + overallLate;
  const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

  // ── Load students + attendance for batch detail ──
  const loadBatchAttendance = useCallback(async () => {
    if (!selectedBatchId || !selectedDate) return;
    setDataLoading(true);
    try {
      const [batchRes, attendanceRes] = await Promise.all([
        getBatch(selectedBatchId),
        getAttendance(selectedDate, { student_group: selectedBatchId }),
      ]);

      const batchStudents = (batchRes.data.students ?? []).filter((s) => s.active !== 0);
      setStudents(batchStudents);

      const existingMap: Record<string, AttendanceStatus> = {};
      for (const record of attendanceRes.data) {
        existingMap[record.student] = record.status as AttendanceStatus;
      }

      const initialAttendance: Record<string, AttendanceStatus> = {};
      for (const s of batchStudents) {
        initialAttendance[s.student] = existingMap[s.student] ?? "Present";
      }
      setAttendance(initialAttendance);
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setDataLoading(false);
    }
  }, [selectedBatchId, selectedDate]);

  useEffect(() => {
    if (viewMode === "batch" && selectedBatchId) loadBatchAttendance();
  }, [viewMode, loadBatchAttendance, selectedBatchId]);

  if (!flags.attendance) return null;

  // Open class detail
  function openClassAttendance(batchId: string) {
    setSelectedBatchId(batchId);
    setViewMode("batch");
  }

  function backToDashboard() {
    setViewMode("dashboard");
    setSelectedBatchId("");
    setStudents([]);
    setAttendance({});
  }

  // Batch detail helpers
  const presentCount = Object.values(attendance).filter((s) => s === "Present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "Absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "Late").length;

  function toggleStatus(studentId: string) {
    setAttendance((prev) => {
      const cycle: AttendanceStatus[] = ["Present", "Absent", "Late"];
      const current = prev[studentId] ?? "Present";
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return { ...prev, [studentId]: next };
    });
  }

  function markAllPresent() {
    setAttendance(Object.fromEntries(students.map((s) => [s.student, "Present" as AttendanceStatus])));
  }

  async function saveAttendance() {
    if (!selectedBatchId || students.length === 0) return;
    setSaving(true);
    try {
      const students_present = students.filter((s) => attendance[s.student] === "Present").map((s) => s.student);
      const students_absent = students.filter((s) => attendance[s.student] === "Absent").map((s) => s.student);
      const students_late = students.filter((s) => attendance[s.student] === "Late").map((s) => s.student);

      await bulkMarkAttendance({
        student_group: selectedBatchId,
        date: selectedDate,
        students_present,
        students_absent,
        students_late,
      });

      toast.success(`Attendance saved for ${selectedDate}`);
    } catch {
      toast.error("Failed to save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const statusConfig = {
    Present: { icon: CheckCircle, color: "text-success", bg: "bg-success-light", ring: "ring-success/20" },
    Absent: { icon: XCircle, color: "text-error", bg: "bg-error-light", ring: "ring-error/20" },
    Late: { icon: Clock, color: "text-warning", bg: "bg-warning-light", ring: "ring-warning/20" },
  };

  const selectedBatch = batchMap.get(selectedBatchId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <AnimatePresence mode="wait">
        {viewMode === "dashboard" ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Attendance Dashboard
                </h1>
                <p className="text-sm text-text-secondary mt-0.5">
                  Class-wise attendance overview
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Overall Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{overallPercentage}%</p>
                  <p className="text-xs text-text-secondary font-medium mt-1">Overall Attendance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">{overallPresent}</p>
                  <p className="text-xs text-success font-medium mt-1">Present</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-error">{overallAbsent}</p>
                  <p className="text-xs text-error font-medium mt-1">Absent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-warning">{overallLate}</p>
                  <p className="text-xs text-warning font-medium mt-1">Late</p>
                </CardContent>
              </Card>
            </div>

            {/* Class-wise Cards */}
            {classWiseLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : classSummaries.length === 0 ? (
              <div className="text-center py-16 text-text-secondary text-sm">
                No batches found. Create batches to start tracking attendance.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classSummaries.map((cls, index) => {
                  const hasData = cls.total > 0;
                  return (
                    <motion.div
                      key={cls.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all group"
                        onClick={() => openClassAttendance(cls.name)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-[10px] bg-brand-wash flex items-center justify-center">
                                <School className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-text-primary text-sm">
                                  {cls.displayName}
                                </h3>
                                <p className="text-[11px] text-text-tertiary font-mono">{cls.name}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                          </div>

                          {hasData ? (
                            <>
                              {/* Progress bar */}
                              <div className="w-full h-2 bg-app-bg rounded-full overflow-hidden mb-3">
                                <div className="h-full flex">
                                  <div
                                    className="bg-success transition-all"
                                    style={{ width: `${(cls.present / cls.total) * 100}%` }}
                                  />
                                  <div
                                    className="bg-warning transition-all"
                                    style={{ width: `${(cls.late / cls.total) * 100}%` }}
                                  />
                                  <div
                                    className="bg-error transition-all"
                                    style={{ width: `${(cls.absent / cls.total) * 100}%` }}
                                  />
                                </div>
                              </div>

                              {/* Stats row */}
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-success font-medium">
                                    <CheckCircle className="h-3 w-3" /> {cls.present}
                                  </span>
                                  <span className="flex items-center gap-1 text-error font-medium">
                                    <XCircle className="h-3 w-3" /> {cls.absent}
                                  </span>
                                  {cls.late > 0 && (
                                    <span className="flex items-center gap-1 text-warning font-medium">
                                      <Clock className="h-3 w-3" /> {cls.late}
                                    </span>
                                  )}
                                </div>
                                <Badge
                                  variant={cls.percentage >= 80 ? "success" : cls.percentage >= 60 ? "warning" : "error"}
                                  className="text-[10px]"
                                >
                                  {cls.percentage}%
                                </Badge>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-3">
                              <p className="text-xs text-text-tertiary">Not marked yet</p>
                              <p className="text-[11px] text-primary font-medium mt-1">Click to mark attendance</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Batch Detail View ── */
          <motion.div
            key="batch-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header with back button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={backToDashboard}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {selectedBatch?.student_group_name ?? selectedBatchId}
                  </h1>
                  <p className="text-sm text-text-secondary mt-0.5">Mark attendance for this class</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">Batch</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-[220px]"
                    >
                      {batches.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.student_group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                    />
                  </div>

                  <div className="flex items-end gap-2 ml-auto">
                    <Button variant="outline" size="md" onClick={markAllPresent} disabled={dataLoading || students.length === 0}>
                      <CheckCircle className="h-4 w-4" />
                      Mark All Present
                    </Button>
                    <Button variant="primary" size="md" onClick={saveAttendance} disabled={saving || students.length === 0}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {dataLoading && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            )}

            {!dataLoading && students.length > 0 && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-success-light rounded-[12px] p-4 text-center border border-success/10">
                    <p className="text-2xl font-bold text-success">{presentCount}</p>
                    <p className="text-xs text-success font-medium mt-1">Present</p>
                  </div>
                  <div className="bg-error-light rounded-[12px] p-4 text-center border border-error/10">
                    <p className="text-2xl font-bold text-error">{absentCount}</p>
                    <p className="text-xs text-error font-medium mt-1">Absent</p>
                  </div>
                  <div className="bg-warning-light rounded-[12px] p-4 text-center border border-warning/10">
                    <p className="text-2xl font-bold text-warning">{lateCount}</p>
                    <p className="text-xs text-warning font-medium mt-1">Late</p>
                  </div>
                </div>

                {/* Attendance Grid */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-text-tertiary" />
                        {selectedBatch?.student_group_name ?? selectedBatchId}
                      </CardTitle>
                      <Badge variant="outline">{students.length} students</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {students.map((student, index) => {
                        const status = attendance[student.student] ?? "Present";
                        const config = statusConfig[status];
                        const Icon = config.icon;

                        return (
                          <motion.button
                            key={student.student}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleStatus(student.student)}
                            className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all cursor-pointer text-left ${config.bg} ${config.ring} ring-2`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {student.student_name || student.student}
                              </p>
                              <p className="text-xs text-text-tertiary">{student.student}</p>
                            </div>
                            <Badge
                              variant={status === "Present" ? "success" : status === "Absent" ? "error" : "warning"}
                              className="text-[10px]"
                            >
                              {status}
                            </Badge>
                          </motion.button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-tertiary mt-4 text-center">
                      Click on a student card to cycle through: Present → Absent → Late
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {!dataLoading && students.length === 0 && selectedBatchId && (
              <div className="text-center py-12 text-text-secondary text-sm">
                No students found in this batch. Add students to the batch first.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
