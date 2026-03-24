"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { getBatch } from "@/lib/api/batches";
import { getAttendance, bulkMarkAttendance } from "@/lib/api/attendance";
import { getCourseSchedules } from "@/lib/api/courseSchedule";
import type { BatchStudent } from "@/lib/types/batch";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import apiClient from "@/lib/api/client";

type AttendanceStatus = "Present" | "Absent" | "Late";

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

export default function InstructorAttendancePage() {
  const { defaultCompany } = useAuth();
  const { activeBatches, isLoading: batchesLoading, isBatchAllowed } = useInstructorBatches();

  // Selected filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Students & attendance
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disabilityMap, setDisabilityMap] = useState<Record<string, string>>({});

  // Auto-select first batch once loaded
  useEffect(() => {
    if (!batchesLoading && activeBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(activeBatches[0].name);
    }
  }, [batchesLoading, activeBatches, selectedBatchId]);

  // ── Fetch course schedule for this batch + date to enforce class-end gating ──
  const { data: scheduleRes, isLoading: scheduleLoading } = useQuery({
    queryKey: ["attendance-schedule-check", selectedBatchId, selectedDate],
    queryFn: () =>
      getCourseSchedules({
        date: selectedDate,
        student_group: selectedBatchId || undefined,
        limit_page_length: 50,
      }),
    enabled: !!selectedBatchId && !!selectedDate,
    staleTime: 60_000,
    refetchInterval: 60_000, // re-check every minute so the gate lifts when class ends
  });

  /**
   * Determine if the instructor is allowed to mark attendance right now.
   *
   * Rules:
   *  - No schedule found for this batch+date → blocked (no class = no attendance)
   *  - Future dates → blocked
   *  - Past dates with a schedule → allowed (class already happened)
   *  - Today with a schedule → allowed only AFTER the latest class ends (current time ≥ to_time)
   */
  const { attendanceBlocked, blockReason } = useMemo(() => {
    // While loading schedules, stay blocked (we'll unlock once data arrives)
    if (scheduleLoading) {
      return { attendanceBlocked: true, blockReason: "" };
    }

    const schedules = scheduleRes?.data ?? [];
    const today = new Date().toISOString().split("T")[0];

    // No schedule at all for this batch on this date → block
    if (schedules.length === 0) {
      return {
        attendanceBlocked: true,
        blockReason: "No class is scheduled for this batch on this date. Attendance can only be marked for scheduled classes.",
      };
    }

    // Future date → block
    if (selectedDate > today) {
      return {
        attendanceBlocked: true,
        blockReason: "You cannot mark attendance for a future date.",
      };
    }

    // Past date with schedule → allow (class already happened)
    if (selectedDate < today) {
      return { attendanceBlocked: false, blockReason: "" };
    }

    // Today — check if the latest class has ended
    let maxEndMinutes = 0;
    let maxEndTimeStr = "";
    for (const s of schedules) {
      const endMinutes = parseTimeToMinutes(s.to_time);
      if (endMinutes > maxEndMinutes) {
        maxEndMinutes = endMinutes;
        maxEndTimeStr = s.to_time;
      }
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const ended = nowMinutes >= maxEndMinutes;

    return {
      attendanceBlocked: !ended,
      blockReason: !ended
        ? `Attendance can only be marked after class ends at ${formatTime12h(maxEndTimeStr)}.`
        : "",
    };
  }, [selectedDate, scheduleRes, scheduleLoading]);

  // Load students + existing attendance when batch or date changes
  const loadAttendanceData = useCallback(async () => {
    if (!selectedBatchId || !selectedDate) return;
    // Verify the selected batch is one of the instructor's allowed batches
    if (!isBatchAllowed(selectedBatchId)) {
      toast.error("Access denied: this batch is not assigned to you.");
      return;
    }
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

  useEffect(() => { loadAttendanceData(); }, [loadAttendanceData]);

  // Fetch disabilities for loaded students
  useEffect(() => {
    const ids = students.map((s) => s.student);
    if (!ids.length) return;
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

  const presentCount = Object.values(attendance).filter((s) => s === "Present").length;
  const absentCount  = Object.values(attendance).filter((s) => s === "Absent").length;
  const lateCount    = Object.values(attendance).filter((s) => s === "Late").length;
  const total = students.length;

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
    // Block if class hasn't ended yet
    if (attendanceBlocked) {
      toast.error("Attendance can only be marked after the class has ended.");
      return;
    }
    // Double-check batch access before saving
    if (!isBatchAllowed(selectedBatchId)) {
      toast.error("Access denied: you cannot mark attendance for this batch.");
      return;
    }
    setSaving(true);
    try {
      // Build the students array with name + status for each student
      const attendanceEntries = students.map((s) => ({
        student: s.student,
        student_name: s.student_name || s.student,
        status: attendance[s.student] ?? ("Present" as const),
      }));

      await bulkMarkAttendance({
        student_group: selectedBatchId,
        date: selectedDate,
        students: attendanceEntries,
        custom_branch: selectedBatch?.custom_branch || undefined,
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
    Absent:  { icon: XCircle,    color: "text-error",   bg: "bg-error-light",   ring: "ring-error/20" },
    Late:    { icon: Clock,      color: "text-warning",  bg: "bg-warning-light", ring: "ring-warning/20" },
  };

  const selectedBatch = activeBatches.find((b) => b.name === selectedBatchId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-secondary mt-0.5">Mark daily attendance for your batches</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Batch</label>
              {batchesLoading ? (
                <div className="h-10 w-52 rounded-[10px] bg-surface border border-border-input flex items-center px-3">
                  <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                </div>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-[220px]"
                >
                  {activeBatches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.student_group_name}
                    </option>
                  ))}
                  {activeBatches.length === 0 && <option value="">No batches assigned</option>}
                </select>
              )}
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
              <Button variant="outline" size="md" onClick={markAllPresent} disabled={dataLoading || students.length === 0 || attendanceBlocked}>
                <CheckCircle className="h-4 w-4" />
                Mark All Present
              </Button>
              <Button variant="primary" size="md" onClick={saveAttendance} disabled={saving || students.length === 0 || attendanceBlocked}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class-end gate warning */}
      {attendanceBlocked && blockReason && !dataLoading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-[12px] border border-warning/30 bg-warning-light px-4 py-3"
        >
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-primary">{blockReason}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              You&apos;ll be able to mark attendance once the scheduled class is over.
            </p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
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
                <Badge variant="outline">{total} students</Badge>
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
                      whileTap={attendanceBlocked ? undefined : { scale: 0.97 }}
                      onClick={() => !attendanceBlocked && toggleStatus(student.student)}
                      className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all text-left ${config.bg} ${config.ring} ring-2 ${attendanceBlocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {student.student_name || student.student}
                        </p>
                        {disabilityMap[student.student] && (
                          <p className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 mt-0.5">{disabilityMap[student.student]}</p>
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
              <p className="text-xs text-text-tertiary mt-4 text-center">
                Click on a student card to cycle through: Present → Absent → Late
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {!dataLoading && !batchesLoading && students.length === 0 && selectedBatchId && (
        <div className="text-center py-12 text-text-secondary text-sm">
          No students found in this batch.
        </div>
      )}

      {!batchesLoading && activeBatches.length === 0 && (
        <div className="text-center py-12 text-text-secondary text-sm">
          No batches assigned to you. Contact your branch manager.
        </div>
      )}
    </motion.div>
  );
}
