"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Calendar, Search, Users, CheckCircle,
  XCircle, Clock, Loader2, UserX, Save, ArrowLeft, Building2, LogIn, LogOut,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type EmployeeAttendance,
  getEmployeeAttendance,
  getEmployees,
  getInstructorsWithCourses,
  createEmployeeAttendance,
  updateEmployeeAttendance,
} from "@/lib/api/employees";
import { getCourseSchedules } from "@/lib/api/courseSchedule";

type StaffStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home" | "At Head Office";

interface StaffAttendanceChange {
  status: StaffStatus;
  in_time?: string;
  out_time?: string;
}

const STATUS_OPTIONS: StaffStatus[] = ["Present", "Absent", "Half Day", "Work From Home", "At Head Office"];

const DEFAULT_IN_TIME = "09:00";
const DEFAULT_OUT_TIME = "17:30";
const DEFAULT_HALF_DAY_OUT_TIME = "13:00";

function formatTimeForInput(val?: string | null): string {
  if (!val) return "";
  if (val.includes("T")) {
    const timePart = val.split("T")[1];
    return timePart ? timePart.slice(0, 5) : "";
  }
  if (val.includes(" ")) {
    const timePart = val.split(" ")[1];
    return timePart ? timePart.slice(0, 5) : "";
  }
  return val.slice(0, 5);
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }>; variant: "success" | "error" | "warning" | "default" }> = {
  Present: { color: "text-success", bg: "bg-success-light", icon: CheckCircle, variant: "success" },
  Absent: { color: "text-error", bg: "bg-error-light", icon: XCircle, variant: "error" },
  "Half Day": { color: "text-warning", bg: "bg-warning-light", icon: Clock, variant: "warning" },
  "On Leave": { color: "text-info", bg: "bg-info/10", icon: UserX, variant: "default" },
  "Work From Home": { color: "text-primary", bg: "bg-brand-wash", icon: Users, variant: "default" },
  "At Head Office": { color: "text-indigo-600", bg: "bg-indigo-50", icon: Building2, variant: "default" },
  "Not Marked": { color: "text-text-tertiary", bg: "bg-app-bg", icon: Clock, variant: "default" },
};

export default function StaffAttendancePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, StaffAttendanceChange>>({});
  const [saving, setSaving] = useState(false);
  const [classTime, setClassTime] = useState("17:00");

  const employeeAttendanceQueryKey = ["employee-attendance", defaultCompany, selectedDate] as const;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset pending changes when date changes
  useEffect(() => {
    setPendingChanges({});
  }, [selectedDate]);

  // Fetch employees for the branch
  const { data: empRes } = useQuery({
    queryKey: ["employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active" }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });

  // Fetch instructors via branch-manager route (includes visiting instructors)
  const { data: allInstrRes } = useQuery({
    queryKey: ["instructors-with-courses", defaultCompany],
    queryFn: () => getInstructorsWithCourses(defaultCompany!),
    staleTime: 10 * 60_000,
    enabled: !!defaultCompany,
  });

  // Fetch course schedules for the selected date at this branch
  const { data: schedulesRes } = useQuery({
    queryKey: ["course-schedules-date", defaultCompany, selectedDate],
    queryFn: () => getCourseSchedules({ branch: defaultCompany!, date: selectedDate, limit_page_length: 100 }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Fetch attendance for selected date
  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: employeeAttendanceQueryKey,
    queryFn: () =>
      getEmployeeAttendance({
        company: defaultCompany || undefined,
        date: selectedDate,
      }),
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // Pre-fill classTime when attendance records are loaded for the selected date
  useEffect(() => {
    if (attRes?.data && attRes.data.length > 0) {
      const recordWithClassTime = attRes.data.find((r) => r.custom_class_time);
      if (recordWithClassTime?.custom_class_time) {
        setClassTime(recordWithClassTime.custom_class_time.slice(0, 5));
        return;
      }
    }
    setClassTime("17:00");
  }, [attRes, selectedDate]);

  const employees = empRes?.data ?? [];
  const attendanceRecords = attRes?.data ?? [];

  // Build instructor map: instructor-doc-name → { employee, instructor_name, custom_company, image }
  const instrMap = React.useMemo(() => {
    const map = new Map<string, { employee: string; instructor_name: string; custom_company?: string; image?: string }>();
    for (const i of allInstrRes ?? []) {
      map.set(i.name, { employee: i.employee, instructor_name: i.instructor_name, custom_company: i.custom_company, image: i.image });
    }
    return map;
  }, [allInstrRes]);

  // Derive visiting instructors from today's schedules (not in branch employee list)
  const visitingInstructors = React.useMemo(() => {
    const employeeNames = new Set((empRes?.data ?? []).map((e) => e.name));
    const schedules = schedulesRes?.data ?? [];
    const seen = new Set<string>();
    const result: Array<{ instructorId: string; instructor_name: string; employee: string; custom_company?: string; image?: string; schedules: typeof schedules }> = [];
    for (const sched of schedules) {
      if (!sched.instructor || seen.has(sched.instructor)) continue;
      const instr = instrMap.get(sched.instructor);
      if (!instr) continue;
      if (employeeNames.has(instr.employee)) continue; // already in branch list
      seen.add(sched.instructor);
      result.push({
        instructorId: sched.instructor,
        instructor_name: instr.instructor_name,
        employee: instr.employee,
        custom_company: instr.custom_company,
        image: instr.image,
        schedules: schedules.filter((s) => s.instructor === sched.instructor),
      });
    }
    return result;
  }, [schedulesRes, instrMap, empRes]);

  // Fetch attendance for visiting instructors on selected date
  const visitingEmployeeIds = visitingInstructors.map((v) => v.employee);
  const visitingAttendanceQueryKey = ["visiting-attendance", defaultCompany, selectedDate, visitingEmployeeIds.join(",")] as const;
  const { data: visitingAttRes } = useQuery({
    queryKey: visitingAttendanceQueryKey,
    queryFn: async () => {
      const qs = new URLSearchParams({
        branch: defaultCompany || "",
        date: selectedDate,
        employees: visitingEmployeeIds.join(","),
      });

      const res = await fetch(`/api/branch-manager/visiting-attendance?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load visiting attendance");
      }

      const json = (await res.json()) as { data?: EmployeeAttendance[] };
      return { data: json.data ?? [] };
    },
    staleTime: 30_000,
    enabled: visitingEmployeeIds.length > 0 && !!defaultCompany,
  });

  const visitingAttMap = React.useMemo(
    () => new Map((visitingAttRes?.data ?? []).map((r) => [r.employee, r])),
    [visitingAttRes]
  );

  // Build lookup: employee name → attendance record
  const attMap = new Map(attendanceRecords.map((r) => [r.employee, r]));

  // Merge: show all employees with their attendance status
  const merged = employees
    .filter((emp) =>
      !search || emp.employee_name.toLowerCase().includes(search.toLowerCase())
    )
    .map((emp) => {
      const att = attMap.get(emp.name);
      const pending = pendingChanges[emp.name];
      const status = pending?.status ?? (att?.status as StaffStatus | undefined) ?? "Not Marked";
      const in_time = pending?.in_time ?? formatTimeForInput(att?.in_time);
      const out_time = pending?.out_time ?? formatTimeForInput(att?.out_time);
      const hasChange = pending !== undefined && (
        pending.status !== (att?.status ?? "Not Marked") ||
        pending.in_time !== formatTimeForInput(att?.in_time) ||
        pending.out_time !== formatTimeForInput(att?.out_time)
      );

      return {
        ...emp,
        attendance_status: status as string,
        in_time,
        out_time,
        attendance_name: att?.name,
        hasChange,
      };
    });

  // Summary counts (including pending changes)
  const presentCount = merged.filter((e) => e.attendance_status === "Present").length;
  const absentCount = merged.filter((e) => e.attendance_status === "Absent").length;
  const notMarkedCount = merged.filter((e) => e.attendance_status === "Not Marked").length;
  const otherCount = merged.length - presentCount - absentCount - notMarkedCount;

  const pendingCount = Object.keys(pendingChanges).length;

  const savedClassTime = React.useMemo(() => {
    if (attRes?.data && attRes.data.length > 0) {
      const record = attRes.data.find((r) => r.custom_class_time);
      return record?.custom_class_time ? record.custom_class_time.slice(0, 5) : "";
    }
    return "";
  }, [attRes]);

  const isClassTimeChanged = classTime !== savedClassTime;
  const hasUnsavedChanges = pendingCount > 0 || (isClassTimeChanged && (attendanceRecords.length > 0 || visitingAttMap.size > 0));

  function getLateMinutes(inTime?: string, cTime?: string): number {
    if (!inTime || !cTime) return 0;
    const [inH, inM] = inTime.split(":").map(Number);
    const [classH, classM] = cTime.split(":").map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(classH) || isNaN(classM)) return 0;
    const inTotal = inH * 60 + inM;
    const classTotal = classH * 60 + classM;
    return inTotal > classTotal ? inTotal - classTotal : 0;
  }

  // Cycle through statuses on click
  function cycleStatus(employeeId: string, currentStatus: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);
    const currentIndex = STATUS_OPTIONS.indexOf(currentStatus as StaffStatus);
    const nextIndex = currentStatus === "Not Marked" ? 0 : (currentIndex + 1) % STATUS_OPTIONS.length;
    const nextStatus = STATUS_OPTIONS[nextIndex];

    let in_time = pendingChanges[key]?.in_time ?? formatTimeForInput(existingAtt?.in_time);
    let out_time = pendingChanges[key]?.out_time ?? formatTimeForInput(existingAtt?.out_time);

    if (nextStatus === "Present") {
      if (!in_time) in_time = DEFAULT_IN_TIME;
      if (!out_time) out_time = DEFAULT_OUT_TIME;
    } else if (nextStatus === "Half Day") {
      if (!in_time) in_time = DEFAULT_IN_TIME;
      if (!out_time) out_time = DEFAULT_HALF_DAY_OUT_TIME;
    } else if (nextStatus === "Absent" || nextStatus === "On Leave" || nextStatus === "Work From Home" || nextStatus === "At Head Office") {
      in_time = "";
      out_time = "";
    }

    setPendingChanges((prev) => ({
      ...prev,
      [key]: { status: nextStatus, in_time, out_time },
    }));
  }

  function handleInTimeChange(employeeId: string, in_time: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);
    setPendingChanges((prev) => {
      const current = prev[key] ?? {
        status: (existingAtt?.status as StaffStatus) ?? "Present",
        out_time: formatTimeForInput(existingAtt?.out_time),
      };
      return { ...prev, [key]: { ...current, in_time } };
    });
  }

  function handleOutTimeChange(employeeId: string, out_time: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);
    setPendingChanges((prev) => {
      const current = prev[key] ?? {
        status: (existingAtt?.status as StaffStatus) ?? "Present",
        in_time: formatTimeForInput(existingAtt?.in_time),
      };
      return { ...prev, [key]: { ...current, out_time } };
    });
  }

  // Mark all present
  function markAllPresent() {
    const changes: Record<string, StaffAttendanceChange> = {};
    for (const emp of employees) {
      const original = attMap.get(emp.name);
      changes[emp.name] = {
        status: "Present",
        in_time: formatTimeForInput(original?.in_time) || DEFAULT_IN_TIME,
        out_time: formatTimeForInput(original?.out_time) || DEFAULT_OUT_TIME,
      };
    }
    for (const v of visitingInstructors) {
      const original = visitingAttMap.get(v.employee);
      changes[`visiting_${v.employee}`] = {
        status: "Present",
        in_time: formatTimeForInput(original?.in_time) || DEFAULT_IN_TIME,
        out_time: formatTimeForInput(original?.out_time) || DEFAULT_OUT_TIME,
      };
    }
    setPendingChanges(changes);
  }
  // Save attendance
  const saveAttendance = useCallback(async () => {
    const currentSavedClassTime = (attRes?.data || []).find((r) => r.custom_class_time)?.custom_class_time?.slice(0, 5) || "";
    const isCTChanged = classTime !== currentSavedClassTime;

    if (pendingCount === 0 && !isCTChanged) return;
    setSaving(true);
    try {
      type SaveResult = { key: string; employee: string; status: StaffStatus; in_time?: string; out_time?: string; kind: "employee" | "visiting" };
      
      const allChanges = { ...pendingChanges };
      if (isCTChanged) {
        for (const existing of attendanceRecords) {
          if (!allChanges[existing.employee]) {
            allChanges[existing.employee] = {
              status: existing.status as StaffStatus,
              in_time: formatTimeForInput(existing.in_time),
              out_time: formatTimeForInput(existing.out_time),
            };
          }
        }
        for (const [empId, existing] of Array.from(visitingAttMap.entries())) {
          const key = `visiting_${empId}`;
          if (!allChanges[key]) {
            allChanges[key] = {
              status: existing.status as StaffStatus,
              in_time: formatTimeForInput(existing.in_time),
              out_time: formatTimeForInput(existing.out_time),
            };
          }
        }
      }

      const entries = Object.entries(allChanges);
      if (entries.length === 0) {
        toast.error("Please mark at least one employee to save the class time.");
        setSaving(false);
        return;
      }
      const promises = entries.map(async ([key, change]) => {
        const inTimeISO = change.in_time ? `${selectedDate} ${change.in_time}:00` : undefined;
        const outTimeISO = change.out_time ? `${selectedDate} ${change.out_time}:00` : undefined;

        // Visiting instructor key: "visiting_{employeeId}"
        if (key.startsWith("visiting_")) {
          const empId = key.replace("visiting_", "");
          const v = visitingInstructors.find((vi) => vi.employee === empId);
          if (!v) return;
          const existing = visitingAttMap.get(empId);
          const payload = {
            employee: empId,
            employee_name: v.instructor_name,
            attendance_date: selectedDate,
            status: change.status,
            company: v.custom_company || defaultCompany || "",
            in_time: change.status === "At Head Office" ? undefined : inTimeISO,
            out_time: change.status === "At Head Office" ? undefined : outTimeISO,
            custom_class_time: classTime || undefined,
          };
          if (existing && !existing.name.startsWith("LOCAL-")) {
            await updateEmployeeAttendance(existing.name, payload);
          } else {
            await createEmployeeAttendance(payload);
          }
          return { key, employee: empId, status: change.status, in_time: inTimeISO, out_time: outTimeISO, kind: "visiting" } as SaveResult;
        }

        // Regular branch employee
        const empId = key;
        const existing = attMap.get(empId);
        const emp = employees.find((e) => e.name === empId);
        if (!emp) return;
        const payload = {
          employee: empId,
          employee_name: emp.employee_name,
          attendance_date: selectedDate,
          status: change.status,
          company: defaultCompany || "",
          in_time: change.status === "At Head Office" ? undefined : inTimeISO,
          out_time: change.status === "At Head Office" ? undefined : outTimeISO,
          custom_class_time: classTime || undefined,
        };

        if (existing && !existing.name.startsWith("LOCAL-")) {
          await updateEmployeeAttendance(existing.name, payload);
        } else {
          await createEmployeeAttendance(payload);
        }
        return { key, employee: empId, status: change.status, in_time: inTimeISO, out_time: outTimeISO, kind: "employee" } as SaveResult;
      });

      const results = await Promise.allSettled(promises);
      const failed: Array<{ key: string; reason: unknown }> = [];
      const succeeded: SaveResult[] = [];
      const nextPending: Record<string, StaffAttendanceChange> = {};
      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        const [key, change] = entries[i];
        if (result.status === "rejected") {
          failed.push({ key, reason: result.reason });
          nextPending[key] = change;
        } else if (result.value) {
          succeeded.push(result.value);
        }
      }

      setPendingChanges(nextPending);

      // Optimistically sync successful statuses into cache so UI updates immediately.
      if (succeeded.length > 0) {
        queryClient.setQueryData(employeeAttendanceQueryKey, (old: unknown) => {
          const prev = (old as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
          const byEmployee = new Map(prev.map((r) => [String(r.employee), { ...r }]));
          for (const row of succeeded.filter((s) => s.kind === "employee")) {
            const existing = byEmployee.get(row.employee) ?? {
              name: `LOCAL-${row.employee}-${selectedDate}`,
              employee: row.employee,
              employee_name: employees.find((e) => e.name === row.employee)?.employee_name ?? row.employee,
              attendance_date: selectedDate,
              company: defaultCompany || "",
            };
            byEmployee.set(row.employee, {
              ...existing,
              status: row.status,
              in_time: row.in_time,
              out_time: row.out_time,
              attendance_date: selectedDate,
            });
          }
          return { data: Array.from(byEmployee.values()) };
        });

        queryClient.setQueryData(visitingAttendanceQueryKey, (old: unknown) => {
          const prev = (old as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
          const byEmployee = new Map(prev.map((r) => [String(r.employee), { ...r }]));
          for (const row of succeeded.filter((s) => s.kind === "visiting")) {
            const v = visitingInstructors.find((vi) => vi.employee === row.employee);
            const existing = byEmployee.get(row.employee) ?? {
              name: `LOCAL-${row.employee}-${selectedDate}`,
              employee: row.employee,
              employee_name: v?.instructor_name ?? row.employee,
              attendance_date: selectedDate,
              company: v?.custom_company || defaultCompany || "",
            };
            byEmployee.set(row.employee, {
              ...existing,
              status: row.status,
              in_time: row.in_time,
              out_time: row.out_time,
              attendance_date: selectedDate,
            });
          }
          return { data: Array.from(byEmployee.values()) };
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: employeeAttendanceQueryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: ["employee-attendance-quick"] }),
        queryClient.invalidateQueries({ queryKey: visitingAttendanceQueryKey, exact: true }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: employeeAttendanceQueryKey, exact: true }),
        queryClient.refetchQueries({ queryKey: visitingAttendanceQueryKey, exact: true }),
      ]);
      if (failed.length > 0) {
        const firstError = failed[0].reason as { response?: { data?: { message?: string; exception?: string; _error_message?: string } }; message?: string };
        const backendMessage =
          firstError?.response?.data?._error_message ||
          firstError?.response?.data?.message ||
          firstError?.response?.data?.exception ||
          firstError?.message;

        toast.error(backendMessage ? `Failed for ${failed.length} record(s): ${String(backendMessage)}` : `Failed to save ${failed.length} record(s). Please try again.`);
      } else {
        toast.success(`Staff attendance saved for ${selectedDate}`);
      }
    } catch (error) {
      const e = error as { response?: { data?: { message?: string; exception?: string; _error_message?: string } }; message?: string };
      const backendMessage =
        e?.response?.data?._error_message ||
        e?.response?.data?.message ||
        e?.response?.data?.exception ||
        e?.message;
      toast.error(backendMessage ? `Failed to save attendance: ${String(backendMessage)}` : "Failed to save some records. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    pendingChanges,
    pendingCount,
    classTime,
    attendanceRecords,
    attRes,
    attMap,
    employees,
    selectedDate,
    defaultCompany,
    queryClient,
    visitingAttMap,
    visitingInstructors,
    employeeAttendanceQueryKey,
    visitingAttendanceQueryKey,
  ]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/attendance">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-info" />
              Staff Attendance
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Mark daily attendance for branch employees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={markAllPresent} disabled={attLoading || employees.length === 0}>
            <CheckCircle className="h-4 w-4" />
            Mark All Present
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={saveAttendance}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {pendingCount > 0 && `(${pendingCount})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-xs text-success font-medium mt-1">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{absentCount}</p>
            <p className="text-xs text-error font-medium mt-1">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-tertiary">{notMarkedCount}</p>
            <p className="text-xs text-text-tertiary font-medium mt-1">Not Marked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">{otherCount}</p>
            <p className="text-xs text-info font-medium mt-1">Leave / Other</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by employee name…"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                <Clock className="h-3 w-3" /> Class Time
              </label>
              <input
                type="time"
                value={classTime}
                onChange={(e) => setClassTime(e.target.value)}
                className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      {attLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : merged.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">
          No employees found for this branch.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-text-tertiary" />
                Employees
              </CardTitle>
              <Badge variant="outline">{merged.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {merged.map((emp, index) => {
                const cfg = statusConfig[emp.attendance_status] ?? statusConfig["Not Marked"];
                const Icon = cfg.icon as React.ComponentType<{ className?: string }>;
                const showTimings = emp.attendance_status && emp.attendance_status !== "Absent" && emp.attendance_status !== "On Leave" && emp.attendance_status !== "Work From Home" && emp.attendance_status !== "At Head Office" && emp.attendance_status !== "Not Marked";

                return (
                  <motion.div
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex flex-col gap-2 p-3 rounded-[10px] border-2 transition-all ${cfg.bg} ${
                      emp.hasChange ? "ring-2 ring-primary/30 border-primary/20" : "border-transparent"
                    }`}
                  >
                    <div
                      onClick={() => cycleStatus(emp.name, emp.attendance_status)}
                      className="flex items-center gap-3 cursor-pointer text-left"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center overflow-hidden flex-shrink-0">
                        {emp.image ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${emp.image}`}
                            alt={emp.employee_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {emp.employee_name}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          {emp.designation || emp.department || emp.name}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                        <Badge variant={cfg.variant} className="text-[10px]">
                          {emp.attendance_status}
                        </Badge>
                      </div>
                    </div>

                    {/* Check-In and Check-Out Time Controls */}
                    {showTimings && (() => {
                      const lateMins = getLateMinutes(emp.in_time, classTime);
                      return (
                        <div className="pt-2 border-t border-border-light/60 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 bg-surface/80 px-2 py-1 rounded-[6px] border border-border-light flex-1">
                              <LogIn className="h-3 w-3 text-success flex-shrink-0" />
                              <span className="text-[11px] text-text-secondary font-medium">In:</span>
                              <input
                                type="time"
                                value={emp.in_time || ""}
                                onChange={(e) => handleInTimeChange(emp.name, e.target.value)}
                                className="h-6 px-1.5 border border-border-input rounded bg-surface text-text-primary text-[11px] flex-1 min-w-[50px]"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 bg-surface/80 px-2 py-1 rounded-[6px] border border-border-light flex-1">
                              <LogOut className="h-3 w-3 text-error flex-shrink-0" />
                              <span className="text-[11px] text-text-secondary font-medium">Out:</span>
                              <input
                                type="time"
                                value={emp.out_time || ""}
                                onChange={(e) => handleOutTimeChange(emp.name, e.target.value)}
                                className="h-6 px-1.5 border border-border-input rounded bg-surface text-text-primary text-[11px] flex-1 min-w-[50px]"
                              />
                            </div>
                          </div>
                          {lateMins > 0 && (
                            <div className="text-[10px] text-error font-medium flex items-center gap-1 bg-error-light/50 px-2 py-0.5 rounded-[4px] border border-error/10 w-fit">
                              <Clock className="h-2.5 w-2.5" />
                              {lateMins} min late
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </div>

            <p className="text-xs text-text-tertiary mt-4 text-center">
              Click on an employee card header to cycle status. Set In & Out times directly below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Visiting Instructors Section */}
      {visitingInstructors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" />
                Visiting Instructors
              </CardTitle>
              <Badge variant="outline">{visitingInstructors.length} scheduled today</Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Instructors from other branches with classes scheduled on {selectedDate}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visitingInstructors
                .filter((v) =>
                  !search || v.instructor_name.toLowerCase().includes(search.toLowerCase())
                )
                .map((v, index) => {
                  const pending = pendingChanges[`visiting_${v.employee}`];
                  const existingAtt = visitingAttMap.get(v.employee);
                  const currentStatus = (pending?.status ?? existingAtt?.status ?? "Not Marked") as string;
                  const in_time = pending?.in_time ?? formatTimeForInput(existingAtt?.in_time);
                  const out_time = pending?.out_time ?? formatTimeForInput(existingAtt?.out_time);
                  const hasChange = pending !== undefined && (
                    pending.status !== (existingAtt?.status ?? "Not Marked") ||
                    pending.in_time !== formatTimeForInput(existingAtt?.in_time) ||
                    pending.out_time !== formatTimeForInput(existingAtt?.out_time)
                  );
                  const cfg = statusConfig[currentStatus] ?? statusConfig["Not Marked"];
                  const Icon = cfg.icon as React.ComponentType<{ className?: string }>;
                  const showTimings = currentStatus && currentStatus !== "Absent" && currentStatus !== "On Leave" && currentStatus !== "Work From Home" && currentStatus !== "At Head Office" && currentStatus !== "Not Marked";

                  return (
                    <motion.div
                      key={v.employee}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex flex-col gap-2 p-3 rounded-[10px] border-2 transition-all ${cfg.bg} ${
                        hasChange ? "ring-2 ring-primary/30 border-primary/20" : "border-transparent"
                      }`}
                    >
                      <div
                        onClick={() => cycleStatus(v.employee, currentStatus, true)}
                        className="flex items-center gap-3 cursor-pointer text-left"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {v.image ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${v.image}`}
                              alt={v.instructor_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-amber-700">
                              {v.instructor_name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-text-primary truncate">{v.instructor_name}</p>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              Visiting
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary truncate">
                            {v.custom_company ?? v.employee} · {v.schedules.length} class{v.schedules.length !== 1 ? "es" : ""}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                          <Badge variant={cfg.variant} className="text-[10px]">
                            {currentStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* Check-In and Check-Out Time Controls */}
                      {showTimings && (() => {
                        const lateMins = getLateMinutes(in_time, classTime);
                        return (
                          <div className="pt-2 border-t border-border-light/60 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 bg-surface/80 px-2 py-1 rounded-[6px] border border-border-light flex-1">
                                <LogIn className="h-3 w-3 text-success flex-shrink-0" />
                                <span className="text-[11px] text-text-secondary font-medium">In:</span>
                                <input
                                  type="time"
                                  value={in_time || ""}
                                  onChange={(e) => handleInTimeChange(v.employee, e.target.value, true)}
                                  className="h-6 px-1.5 border border-border-input rounded bg-surface text-text-primary text-[11px] flex-1 min-w-[50px]"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 bg-surface/80 px-2 py-1 rounded-[6px] border border-border-light flex-1">
                                <LogOut className="h-3 w-3 text-error flex-shrink-0" />
                                <span className="text-[11px] text-text-secondary font-medium">Out:</span>
                                <input
                                  type="time"
                                  value={out_time || ""}
                                  onChange={(e) => handleOutTimeChange(v.employee, e.target.value, true)}
                                  className="h-6 px-1.5 border border-border-input rounded bg-surface text-text-primary text-[11px] flex-1 min-w-[50px]"
                                />
                              </div>
                            </div>
                            {lateMins > 0 && (
                              <div className="text-[10px] text-error font-medium flex items-center gap-1 bg-error-light/50 px-2 py-0.5 rounded-[4px] border border-error/10 w-fit">
                                <Clock className="h-2.5 w-2.5" />
                                {lateMins} min late
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </motion.div>
                  );
                })}
            </div>
            <p className="text-xs text-text-tertiary mt-4 text-center">
              Click on a card to cycle through attendance statuses
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sticky save bar when there are pending changes */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-surface border border-border-card rounded-2xl shadow-lg px-6 py-3 flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-primary">{pendingCount}</span> unsaved change{pendingCount > 1 ? "s" : ""}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={saveAttendance}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Attendance
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
