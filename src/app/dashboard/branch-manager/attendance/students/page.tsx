"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, CheckCircle, XCircle, Clock, Users, Save,
  Loader2, School, ChevronRight, ArrowLeft, BarChart3,
  BookOpen, ChevronDown, GraduationCap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { getBatches, getBatch } from "@/lib/api/batches";
import { getAttendance, bulkMarkAttendance } from "@/lib/api/attendance";
import { getCourseSchedules, markTopicCovered } from "@/lib/api/courseSchedule";
import type { CourseSchedule } from "@/lib/api/courseSchedule";
import type { Batch, BatchStudent } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAcademicYearStore } from "@/lib/stores/academicYearStore";
import apiClient from "@/lib/api/client";

type AttendanceStatus = "Present" | "Absent" | "Late";

type SessionState = "ready" | "completed";

interface ClassSummary {
  name: string;
  displayName: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
  sessionCount: number;
  sessionsMarked: number;
}

/** Format HH:MM:SS → h:MM AM/PM */
function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const statusConfig = {
  Present: { icon: CheckCircle, color: "text-success", bg: "bg-success-light", ring: "ring-success/20" },
  Absent: { icon: XCircle, color: "text-error", bg: "bg-error-light", ring: "ring-error/20" },
  Late: { icon: Clock, color: "text-warning", bg: "bg-warning-light", ring: "ring-warning/20" },
};

export default function AttendancePage() {
  const { defaultCompany } = useAuth();
  const { selectedYear } = useAcademicYearStore();
  const queryClient = useQueryClient();

  // View mode: "dashboard" (class-wise overview) vs "batch" (per-session detail)
  const [viewMode, setViewMode] = useState<"dashboard" | "batch">("dashboard");

  // Shared date filter
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Batch session detail state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [disabilityMap, setDisabilityMap] = useState<Record<string, string>>({});

  // ── Batches list ──
  const { data: batchesRes } = useQuery({
    queryKey: ["batches-list", defaultCompany, selectedYear],
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
  const batchMap = useMemo(
    () => new Map(batches.map((b: Batch) => [b.name, b])),
    [batches]
  );

  // ── Branch attendance records ──
  const { data: branchAttendanceRes, isLoading: classWiseLoading } = useQuery({
    queryKey: ["branch-attendance-records", defaultCompany, selectedDate],
    queryFn: () =>
      getAttendance(selectedDate, {
        custom_branch: defaultCompany || undefined,
      }),
    staleTime: 30_000,
    enabled: !!defaultCompany && viewMode === "dashboard",
  });

  // ── Batch member lists (to filter out transferred-out students) ──
  const { data: batchMembersMap } = useQuery({
    queryKey: ["batch-members-map", defaultCompany, selectedYear],
    queryFn: async () => {
      const memberMap = new Map<string, Set<string>>();
      for (const b of batches) {
        try {
          const res = await getBatch(b.name);
          const members = (res.data.students ?? [])
            .filter((s: BatchStudent) => s.active !== 0)
            .map((s: BatchStudent) => s.student);
          memberMap.set(b.name, new Set(members));
        } catch {
          memberMap.set(b.name, new Set());
        }
      }
      return memberMap;
    },
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany && batches.length > 0 && viewMode === "dashboard",
  });

  // ── Branch schedules for dashboard session counts ──
  const { data: branchSchedulesRes } = useQuery({
    queryKey: ["branch-schedules-dashboard", defaultCompany, selectedDate],
    queryFn: () =>
      getCourseSchedules({
        branch: defaultCompany || undefined,
        date: selectedDate,
        limit_page_length: 500,
      }),
    staleTime: 60_000,
    enabled: !!defaultCompany && viewMode === "dashboard",
  });

  // Build class summaries
  const classSummaries: ClassSummary[] = useMemo(() => {
    const rawRecords = branchAttendanceRes?.data ?? [];
    const groupMap = new Map<string, { present: number; absent: number; late: number }>();

    for (const row of rawRecords) {
      if (!row.student_group) continue;
      const members = batchMembersMap?.get(row.student_group);
      if (members && !members.has(row.student)) continue;

      const existing = groupMap.get(row.student_group) ?? { present: 0, absent: 0, late: 0 };
      if (row.status === "Present") existing.present += 1;
      else if (row.status === "Absent") existing.absent += 1;
      else if (row.status === "Late") existing.late += 1;
      groupMap.set(row.student_group, existing);
    }

    // Session counts per batch
    const schedules = branchSchedulesRes?.data ?? [];
    const sessionCountMap = new Map<string, number>();
    for (const s of schedules) {
      sessionCountMap.set(s.student_group, (sessionCountMap.get(s.student_group) ?? 0) + 1);
    }

    const allGroups = new Set([...groupMap.keys(), ...batches.map((b: Batch) => b.name)]);

    return Array.from(allGroups)
      .map((groupName) => {
        const counts = groupMap.get(groupName) ?? { present: 0, absent: 0, late: 0 };
        const total = counts.present + counts.absent + counts.late;
        const batch = batchMap.get(groupName);
        const sessionCount = sessionCountMap.get(groupName) ?? 0;
        return {
          name: groupName,
          displayName: batch?.student_group_name ?? groupName,
          ...counts,
          total,
          percentage: total > 0 ? Math.round((counts.present / total) * 100) : 0,
          sessionCount,
          sessionsMarked: total > 0 ? sessionCount : 0, // simplified — if attendance exists, all are marked
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [branchAttendanceRes, batchMembersMap, batches, batchMap, branchSchedulesRes]);

  // Overall totals
  const overallPresent = classSummaries.reduce((s, c) => s + c.present, 0);
  const overallAbsent = classSummaries.reduce((s, c) => s + c.absent, 0);
  const overallLate = classSummaries.reduce((s, c) => s + c.late, 0);
  const overallTotal = overallPresent + overallAbsent + overallLate;
  const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

  // ── Batch session detail: fetch schedules for selected batch ──
  const { data: batchSchedulesRes, isLoading: batchSchedulesLoading } = useQuery({
    queryKey: ["bm-batch-sessions", selectedBatchId, selectedDate],
    queryFn: () =>
      getCourseSchedules({
        date: selectedDate,
        student_group: selectedBatchId || undefined,
        limit_page_length: 50,
      }),
    enabled: !!selectedBatchId && viewMode === "batch",
    staleTime: 60_000,
  });

  const batchSchedules = batchSchedulesRes?.data ?? [];

  // Attendance check for session states
  const { data: batchAttendanceCount } = useQuery({
    queryKey: ["bm-batch-att-check", selectedBatchId, selectedDate],
    queryFn: async () => {
      const res = await getAttendance(selectedDate, { student_group: selectedBatchId });
      return res.data.length;
    },
    enabled: !!selectedBatchId && viewMode === "batch",
    staleTime: 30_000,
  });

  // Session states for batch detail (BM has no time gating)
  const sessionStates = useMemo(() => {
    const map = new Map<string, SessionState>();
    const attCount = batchAttendanceCount ?? 0;
    for (const s of batchSchedules) {
      map.set(s.name, attCount > 0 ? "completed" : "ready");
    }
    return map;
  }, [batchSchedules, batchAttendanceCount]);

  // Load students when session is expanded
  const loadSessionStudents = useCallback(
    async (schedule: CourseSchedule) => {
      setSessionLoading(true);
      try {
        const [batchRes, attendanceRes] = await Promise.all([
          getBatch(schedule.student_group),
          getAttendance(selectedDate, { student_group: schedule.student_group }),
        ]);

        const batchStudents = (batchRes.data.students ?? []).filter(
          (s: BatchStudent) => s.active !== 0
        );
        setStudents(batchStudents);

        const existingMap: Record<string, AttendanceStatus> = {};
        for (const record of attendanceRes.data) {
          existingMap[record.student] = record.status as AttendanceStatus;
        }

        const initial: Record<string, AttendanceStatus> = {};
        for (const s of batchStudents) {
          initial[s.student] = existingMap[s.student] ?? "Present";
        }
        setAttendance(initial);
      } catch {
        toast.error("Failed to load student data");
      } finally {
        setSessionLoading(false);
      }
    },
    [selectedDate]
  );

  // Fetch disabilities when students change
  useEffect(() => {
    const ids = students.map((s) => s.student);
    if (!ids.length) {
      setDisabilityMap({});
      return;
    }
    apiClient
      .get("/resource/Student", {
        params: {
          fields: JSON.stringify(["name", "custom_disabilities"]),
          filters: JSON.stringify([["name", "in", ids]]),
          limit_page_length: ids.length,
        },
      })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const s of data.data ?? []) {
          if (s.custom_disabilities) map[s.name] = s.custom_disabilities;
        }
        setDisabilityMap(map);
      })
      .catch(() => {});
  }, [students]);

  function openClassAttendance(batchId: string) {
    setSelectedBatchId(batchId);
    setExpandedSession(null);
    setStudents([]);
    setAttendance({});
    setViewMode("batch");
  }

  function backToDashboard() {
    setViewMode("dashboard");
    setSelectedBatchId("");
    setExpandedSession(null);
    setStudents([]);
    setAttendance({});
  }

  function handleSessionClick(schedule: CourseSchedule) {
    if (expandedSession === schedule.name) {
      setExpandedSession(null);
      setStudents([]);
      setAttendance({});
      return;
    }
    setExpandedSession(schedule.name);
    loadSessionStudents(schedule);
  }

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

  async function saveSessionAttendance(schedule: CourseSchedule) {
    if (students.length === 0) return;
    setSaving(schedule.name);
    try {
      const entries = students.map((s) => ({
        student: s.student,
        student_name: s.student_name || s.student,
        status: attendance[s.student] ?? ("Present" as const),
      }));

      await bulkMarkAttendance({
        student_group: schedule.student_group,
        date: selectedDate,
        students: entries,
        custom_branch: schedule.custom_branch || defaultCompany || undefined,
      });

      // Mark ONLY this session's topic as covered
      if (schedule.custom_topic && !schedule.custom_topic_covered) {
        await markTopicCovered(schedule.name).catch(() => {});
      }

      toast.success(
        `Attendance saved for ${schedule.custom_topic || schedule.course}`
      );

      // Refresh queries
      queryClient.invalidateQueries({
        queryKey: ["bm-batch-att-check", selectedBatchId, selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["bm-batch-sessions", selectedBatchId, selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-attendance-records", defaultCompany, selectedDate],
      });

      setExpandedSession(null);
      setStudents([]);
      setAttendance({});
    } catch {
      toast.error("Failed to save attendance. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  // Counts for expanded session
  const presentCount = Object.values(attendance).filter((s) => s === "Present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "Absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "Late").length;

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
                              {cls.sessionCount > 0 ? (
                                <p className="text-[11px] text-primary font-medium mt-1">
                                  {cls.sessionCount} session{cls.sessionCount > 1 ? "s" : ""} scheduled
                                </p>
                              ) : (
                                <p className="text-[11px] text-primary font-medium mt-1">Click to mark attendance</p>
                              )}
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
          /* ── Batch Session Detail View ── */
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
                  <p className="text-sm text-text-secondary mt-0.5">Mark attendance per session</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setExpandedSession(null);
                    setStudents([]);
                    setAttendance({});
                  }}
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                />
              </div>
            </div>

            {/* Loading */}
            {batchSchedulesLoading && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            )}

            {/* No sessions */}
            {!batchSchedulesLoading && batchSchedules.length === 0 && (
              <div className="text-center py-16 text-text-secondary text-sm">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-text-tertiary" />
                <p className="font-medium">No sessions scheduled</p>
                <p className="text-xs mt-1 text-text-tertiary">
                  No classes scheduled for this batch on this date.
                </p>
              </div>
            )}

            {/* Session Cards */}
            {!batchSchedulesLoading && batchSchedules.length > 0 && (
              <div className="space-y-4">
                {batchSchedules.map((schedule) => {
                  const state = sessionStates.get(schedule.name) ?? "ready";
                  const isExpanded = expandedSession === schedule.name;
                  const isSaving = saving === schedule.name;

                  return (
                    <motion.div
                      key={schedule.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card
                        className={`overflow-hidden transition-all ${
                          state === "completed"
                            ? "border-success/30 bg-success-light/30"
                            : isExpanded
                            ? "border-primary/40 shadow-card-hover"
                            : "border-primary/20 hover:border-primary/40 hover:shadow-card-hover cursor-pointer"
                        }`}
                        onClick={
                          !isExpanded
                            ? () => handleSessionClick(schedule)
                            : undefined
                        }
                      >
                        {/* Session Header */}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                                  state === "completed"
                                    ? "bg-success-light"
                                    : "bg-brand-wash"
                                }`}
                              >
                                {state === "completed" ? (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                ) : (
                                  <BookOpen className="h-4 w-4 text-primary" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-text-tertiary font-medium">
                                  {formatTime12h(schedule.from_time)} –{" "}
                                  {formatTime12h(schedule.to_time)}
                                </p>

                                <h3 className="font-semibold text-text-primary truncate mt-0.5">
                                  {schedule.custom_topic || schedule.course}
                                </h3>
                                {schedule.custom_topic && (
                                  <p className="text-xs text-text-secondary truncate">
                                    {schedule.course}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3 text-text-tertiary" />
                                    <span className="text-xs text-text-secondary">
                                      {schedule.student_group}
                                    </span>
                                  </div>
                                  {schedule.instructor_name && (
                                    <span className="text-xs text-text-tertiary">
                                      {schedule.instructor_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {state === "completed" && (
                                <Badge variant="success" className="text-[10px]">
                                  Saved
                                </Badge>
                              )}
                              {state === "ready" && !isExpanded && (
                                <Badge variant="info" className="text-[10px]">
                                  Ready
                                </Badge>
                              )}
                              <ChevronDown
                                className={`h-4 w-4 text-text-tertiary transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </CardContent>

                        {/* Expanded student grid */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border px-4 pb-4 pt-3">
                                {sessionLoading ? (
                                  <div className="flex items-center justify-center h-32">
                                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                  </div>
                                ) : students.length === 0 ? (
                                  <p className="text-center py-8 text-sm text-text-secondary">
                                    No students found in this batch.
                                  </p>
                                ) : (
                                  <>
                                    {/* Summary counters */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                      <div className="bg-success-light rounded-[10px] p-2.5 text-center border border-success/10">
                                        <p className="text-lg font-bold text-success">{presentCount}</p>
                                        <p className="text-[10px] text-success font-medium">Present</p>
                                      </div>
                                      <div className="bg-error-light rounded-[10px] p-2.5 text-center border border-error/10">
                                        <p className="text-lg font-bold text-error">{absentCount}</p>
                                        <p className="text-[10px] text-error font-medium">Absent</p>
                                      </div>
                                      <div className="bg-warning-light rounded-[10px] p-2.5 text-center border border-warning/10">
                                        <p className="text-lg font-bold text-warning">{lateCount}</p>
                                        <p className="text-[10px] text-warning font-medium">Late</p>
                                      </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs text-text-tertiary">
                                        <Users className="h-3 w-3 inline mr-1" />
                                        {students.length} students
                                      </p>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAllPresent();
                                          }}
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          All Present
                                        </Button>
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            saveSessionAttendance(schedule);
                                          }}
                                          disabled={!!isSaving}
                                        >
                                          {isSaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Save className="h-3.5 w-3.5" />
                                          )}
                                          Save
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Student grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {students.map((student, index) => {
                                        const status = attendance[student.student] ?? "Present";
                                        const config = statusConfig[status];
                                        const Icon = config.icon;

                                        return (
                                          <motion.button
                                            key={student.student}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleStatus(student.student);
                                            }}
                                            className={`flex items-center gap-3 p-2.5 rounded-[10px] border-2 transition-all cursor-pointer text-left ${config.bg} ${config.ring} ring-2`}
                                          >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                                              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-text-primary truncate">
                                                {student.student_name || student.student}
                                              </p>
                                              {disabilityMap[student.student] && (
                                                <p className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 mt-0.5">
                                                  {disabilityMap[student.student]}
                                                </p>
                                              )}
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

                                    <p className="text-xs text-text-tertiary mt-3 text-center">
                                      Tap a student to cycle: Present → Absent → Late
                                    </p>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
