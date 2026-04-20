"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Save,
  Loader2,
  Lock,
  ChevronDown,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { getBatch } from "@/lib/api/batches";
import { getAttendance, bulkMarkAttendance } from "@/lib/api/attendance";
import { getCourseSchedules } from "@/lib/api/courseSchedule";
import type { CourseSchedule } from "@/lib/api/courseSchedule";
import type { BatchStudent } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import apiClient from "@/lib/api/client";

type AttendanceStatus = "Present" | "Absent" | "Late";

type SessionState = "locked" | "ready" | "completed";

/** Parse an HH:MM or HH:MM:SS time string into total minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Format HH:MM:SS → h:MM AM/PM */
function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const statusConfig = {
  Present: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success-light",
    ring: "ring-success/20",
  },
  Absent: {
    icon: XCircle,
    color: "text-error",
    bg: "bg-error-light",
    ring: "ring-error/20",
  },
  Late: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning-light",
    ring: "ring-warning/20",
  },
};

export default function InstructorAttendancePage() {
  const { instructorName } = useAuth();
  const { isBatchAllowed } = useInstructorBatches();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Per-session student state
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [disabilityMap, setDisabilityMap] = useState<
    Record<string, string>
  >({});

  // ── Query 1: Today's sessions for this instructor ──
  const { data: schedulesRes, isLoading: schedulesLoading } = useQuery({
    queryKey: ["instructor-sessions", instructorName, selectedDate],
    queryFn: () =>
      getCourseSchedules({
        date: selectedDate,
        instructor: instructorName || undefined,
        limit_page_length: 50,
      }),
    enabled: !!instructorName && !!selectedDate,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const schedules = schedulesRes?.data ?? [];

  // ── Query 2: Attendance records for all batches that have sessions today ──
  const batchIds = useMemo(
    () => [...new Set(schedules.map((s) => s.student_group))],
    [schedules]
  );

  const { data: attendanceByBatch } = useQuery({
    queryKey: ["session-attendance-check", selectedDate, batchIds],
    queryFn: async () => {
      const map = new Map<string, number>();
      for (const batchId of batchIds) {
        const res = await getAttendance(selectedDate, {
          student_group: batchId,
        });
        map.set(batchId, res.data.length);
      }
      return map;
    },
    enabled: batchIds.length > 0,
    staleTime: 30_000,
  });

  // ── Compute session state for each schedule ──
  const sessionStates = useMemo(() => {
    const map = new Map<string, SessionState>();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const s of schedules) {
      // If attendance exists for this batch → completed
      const attCount = attendanceByBatch?.get(s.student_group) ?? 0;
      if (attCount > 0) {
        map.set(s.name, "completed");
        continue;
      }

      // Future date → locked
      if (selectedDate > today) {
        map.set(s.name, "locked");
        continue;
      }

      // Past date → ready
      if (selectedDate < today) {
        map.set(s.name, "ready");
        continue;
      }

      // Today → check if session has ended
      const endMinutes = parseTimeToMinutes(s.to_time);
      if (nowMinutes >= endMinutes) {
        map.set(s.name, "ready");
      } else {
        map.set(s.name, "locked");
      }
    }
    return map;
  }, [schedules, selectedDate, attendanceByBatch]);

  // ── Load students when a session is expanded ──
  const loadSessionStudents = useCallback(
    async (schedule: CourseSchedule) => {
      if (!isBatchAllowed(schedule.student_group)) {
        toast.error("Access denied: this batch is not assigned to you.");
        return;
      }
      setSessionLoading(true);
      try {
        const [batchRes, attendanceRes] = await Promise.all([
          getBatch(schedule.student_group),
          getAttendance(selectedDate, {
            student_group: schedule.student_group,
          }),
        ]);

        const batchStudents = (batchRes.data.students ?? []).filter(
          (s) => s.active !== 0
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
    [selectedDate, isBatchAllowed]
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

  // Toggle session expand/collapse
  function handleSessionClick(schedule: CourseSchedule) {
    const state = sessionStates.get(schedule.name);
    if (state === "locked") return;

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
    setAttendance(
      Object.fromEntries(
        students.map((s) => [s.student, "Present" as AttendanceStatus])
      )
    );
  }

  async function saveSessionAttendance(schedule: CourseSchedule) {
    if (students.length === 0) return;
    if (!isBatchAllowed(schedule.student_group)) {
      toast.error("Access denied: you cannot mark attendance for this batch.");
      return;
    }
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
        custom_branch: schedule.custom_branch || undefined,
      });

      toast.success(
        `Attendance saved for ${schedule.custom_topic || schedule.course}`
      );

      // Refresh session states
      queryClient.invalidateQueries({
        queryKey: ["session-attendance-check", selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["instructor-sessions", instructorName, selectedDate],
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

  // Counts for the expanded session
  const presentCount = Object.values(attendance).filter(
    (s) => s === "Present"
  ).length;
  const absentCount = Object.values(attendance).filter(
    (s) => s === "Absent"
  ).length;
  const lateCount = Object.values(attendance).filter(
    (s) => s === "Late"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Mark attendance per session
          </p>
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
      {schedulesLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* No sessions */}
      {!schedulesLoading && schedules.length === 0 && (
        <div className="text-center py-16 text-text-secondary text-sm">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-text-tertiary" />
          <p className="font-medium">No sessions scheduled</p>
          <p className="text-xs mt-1 text-text-tertiary">
            You have no classes scheduled for this date.
          </p>
        </div>
      )}

      {/* Session Cards */}
      {!schedulesLoading && schedules.length > 0 && (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const state = sessionStates.get(schedule.name) ?? "locked";
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
                    state === "locked"
                      ? "opacity-60 border-border"
                      : state === "completed"
                      ? "border-success/30 bg-success-light/30"
                      : isExpanded
                      ? "border-primary/40 shadow-card-hover"
                      : "border-primary/20 hover:border-primary/40 hover:shadow-card-hover cursor-pointer"
                  }`}
                  onClick={
                    !isExpanded && state !== "locked"
                      ? () => handleSessionClick(schedule)
                      : undefined
                  }
                >
                  {/* Session Header */}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* State icon */}
                        <div
                          className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                            state === "locked"
                              ? "bg-app-bg"
                              : state === "completed"
                              ? "bg-success-light"
                              : "bg-brand-wash"
                          }`}
                        >
                          {state === "locked" ? (
                            <Lock className="h-4 w-4 text-text-tertiary" />
                          ) : state === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-primary" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Time */}
                          <p className="text-xs text-text-tertiary font-medium">
                            {formatTime12h(schedule.from_time)} –{" "}
                            {formatTime12h(schedule.to_time)}
                          </p>

                          {/* Topic / Course */}
                          <h3 className="font-semibold text-text-primary truncate mt-0.5">
                            {schedule.custom_topic || schedule.course}
                          </h3>
                          {schedule.custom_topic && (
                            <p className="text-xs text-text-secondary truncate">
                              {schedule.course}
                            </p>
                          )}

                          {/* Batch */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <GraduationCap className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-text-secondary">
                              {schedule.student_group}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - state badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {state === "locked" && (
                          <Badge variant="outline" className="text-[10px]">
                            Ends {formatTime12h(schedule.to_time)}
                          </Badge>
                        )}
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
                        {(state === "ready" || state === "completed") && (
                          <ChevronDown
                            className={`h-4 w-4 text-text-tertiary transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
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
                                  <p className="text-lg font-bold text-success">
                                    {presentCount}
                                  </p>
                                  <p className="text-[10px] text-success font-medium">
                                    Present
                                  </p>
                                </div>
                                <div className="bg-error-light rounded-[10px] p-2.5 text-center border border-error/10">
                                  <p className="text-lg font-bold text-error">
                                    {absentCount}
                                  </p>
                                  <p className="text-[10px] text-error font-medium">
                                    Absent
                                  </p>
                                </div>
                                <div className="bg-warning-light rounded-[10px] p-2.5 text-center border border-warning/10">
                                  <p className="text-lg font-bold text-warning">
                                    {lateCount}
                                  </p>
                                  <p className="text-[10px] text-warning font-medium">
                                    Late
                                  </p>
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
                                  const status =
                                    attendance[student.student] ?? "Present";
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
                                      <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}
                                      >
                                        <Icon
                                          className={`h-3.5 w-3.5 ${config.color}`}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">
                                          {student.student_name ||
                                            student.student}
                                        </p>
                                        {disabilityMap[student.student] && (
                                          <p className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 mt-0.5">
                                            {disabilityMap[student.student]}
                                          </p>
                                        )}
                                        <p className="text-xs text-text-tertiary">
                                          {student.student}
                                        </p>
                                      </div>
                                      <Badge
                                        variant={
                                          status === "Present"
                                            ? "success"
                                            : status === "Absent"
                                            ? "error"
                                            : "warning"
                                        }
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
  );
}
