"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Calendar, Users, CheckCircle,
  XCircle, Clock, Loader2, UserX, Save, ArrowLeft, Building2, LogIn, LogOut,
  Palmtree, Sliders, Sparkles, BookOpen, Plus, Trash2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type EmployeeAttendance,
  type AttendanceBranchSession,
  getEmployeeAttendance,
  getEmployees,
  getInstructorsWithCourses,
  createEmployeeAttendance,
  updateEmployeeAttendance,
} from "@/lib/api/employees";
import { getCourseSchedules } from "@/lib/api/courseSchedule";

type StaffStatus = "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home" | "At Head Office" | "Holiday" | "Not Marked";

export interface BranchSessionItem {
  id: string;
  title?: string;
  session_type?: "Morning" | "Afternoon" | "Evening" | "Full Day";
  class_time?: string;
  in_time?: string;
  out_time?: string;
  status: StaffStatus;
}

interface StaffAttendanceChange {
  status: StaffStatus;
  sessions: BranchSessionItem[];
}

const STATUS_OPTIONS: StaffStatus[] = ["Present", "Absent", "Half Day", "Work From Home", "At Head Office", "Holiday"];

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

// Convert 24-hour "HH:mm" to 12-hour format "hh:mm AM/PM"
function formatTo12Hour(time24?: string | null): string {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return time24;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes} ${period}`;
}

// Compact 12-hour input component (outputs 24-hour "HH:mm" to onChange)
interface Time12InputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  size?: "sm" | "md";
}

function Time12Input({ value, onChange, className = "", size = "sm" }: Time12InputProps) {
  // Parse incoming "HH:mm"
  let initialHour12 = "09";
  let initialMinute = "00";
  let initialPeriod = "AM";

  if (value && value.includes(":")) {
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr, 10);
    if (!isNaN(h)) {
      initialPeriod = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      initialHour12 = h12.toString().padStart(2, "0");
      initialMinute = (mStr || "00").slice(0, 2);
    }
  }

  const [hour, setHour] = useState(initialHour12);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState(initialPeriod);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value && value.includes(":")) {
      const [hStr, mStr] = value.split(":");
      const h = parseInt(hStr, 10);
      if (!isNaN(h)) {
        const p = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        setHour(h12.toString().padStart(2, "0"));
        setMinute((mStr || "00").slice(0, 2));
        setPeriod(p);
      }
    } else if (!value) {
      setHour("");
      setMinute("");
    }
  }, [value]);

  const updateTime = (newH: string, newM: string, newP: string) => {
    if (!newH && !newM) {
      onChange("");
      return;
    }
    const hNum = parseInt(newH || "0", 10);
    const mNum = parseInt(newM || "0", 10);
    let h24 = hNum % 12;
    if (newP === "PM") h24 += 12;
    const formatted = `${h24.toString().padStart(2, "0")}:${(isNaN(mNum) ? 0 : mNum).toString().padStart(2, "0")}`;
    onChange(formatted);
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  // Support all minutes from 00 to 59 for exact check-in / check-out records
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  if (size === "md") {
    return (
      <div className={`flex items-center gap-1 rounded-[10px] border border-border-input bg-surface px-2 py-1 ${className}`}>
        <select
          value={hour}
          onChange={(e) => {
            setHour(e.target.value);
            updateTime(e.target.value, minute || "00", period);
          }}
          className="bg-transparent text-sm font-medium text-text-primary focus:outline-none cursor-pointer"
        >
          {hoursList.map((h) => (
            <option key={h} value={h} className="bg-surface text-text-primary">
              {h}
            </option>
          ))}
        </select>
        <span className="text-text-tertiary text-xs font-bold">:</span>
        <select
          value={minute}
          onChange={(e) => {
            setMinute(e.target.value);
            updateTime(hour || "09", e.target.value, period);
          }}
          className="bg-transparent text-sm font-medium text-text-primary focus:outline-none cursor-pointer"
        >
          {minutesList.map((m) => (
            <option key={m} value={m} className="bg-surface text-text-primary">
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const nextP = period === "AM" ? "PM" : "AM";
            setPeriod(nextP);
            updateTime(hour || "09", minute || "00", nextP);
          }}
          className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold bg-brand-wash text-primary hover:bg-primary/20 transition-colors"
        >
          {period}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 bg-surface border border-border-input rounded px-1.5 py-0.5 ${className}`}>
      <select
        value={hour}
        onChange={(e) => {
          setHour(e.target.value);
          updateTime(e.target.value, minute || "00", period);
        }}
        className="bg-transparent text-[11px] font-semibold text-text-primary focus:outline-none cursor-pointer p-0"
      >
        {hoursList.map((h) => (
          <option key={h} value={h} className="bg-surface text-text-primary">
            {h}
          </option>
        ))}
      </select>
      <span className="text-text-tertiary text-[10px] font-bold leading-none">:</span>
      <select
        value={minute}
        onChange={(e) => {
          setMinute(e.target.value);
          updateTime(hour || "09", e.target.value, period);
        }}
        className="bg-transparent text-[11px] font-semibold text-text-primary focus:outline-none cursor-pointer p-0"
      >
        {minutesList.map((m) => (
          <option key={m} value={m} className="bg-surface text-text-primary">
            {m}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          const nextP = period === "AM" ? "PM" : "AM";
          setPeriod(nextP);
          updateTime(hour || "09", minute || "00", nextP);
        }}
        className="ml-0.5 px-1 py-0 rounded text-[9.5px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors leading-normal"
        title="Toggle AM / PM"
      >
        {period}
      </button>
    </div>
  );
}


const statusConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }>; variant: "success" | "error" | "warning" | "default" }> = {
  Present: { color: "text-success", bg: "bg-success-light", icon: CheckCircle, variant: "success" },
  Absent: { color: "text-error", bg: "bg-error-light", icon: XCircle, variant: "error" },
  "Half Day": { color: "text-warning", bg: "bg-warning-light", icon: Clock, variant: "warning" },
  "On Leave": { color: "text-info", bg: "bg-info/10", icon: UserX, variant: "default" },
  "Work From Home": { color: "text-primary", bg: "bg-brand-wash", icon: Users, variant: "default" },
  "At Head Office": { color: "text-indigo-600", bg: "bg-indigo-50", icon: Building2, variant: "default" },
  Holiday: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", icon: Palmtree, variant: "default" },
  "Not Marked": { color: "text-text-tertiary", bg: "bg-app-bg", icon: Clock, variant: "default" },
};

export default function StaffAttendancePage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, StaffAttendanceChange>>({});
  const [saving, setSaving] = useState(false);
  const [classTime, setClassTime] = useState("17:00");
  const [timingMode, setTimingMode] = useState<"same" | "different">("same");
  const [individualClassTimes, setIndividualClassTimes] = useState<Record<string, string>>({});

  const employeeAttendanceQueryKey = ["employee-attendance", defaultCompany, selectedDate] as const;

  // Reset pending changes and individual times when date changes
  useEffect(() => {
    setPendingChanges({});
    setIndividualClassTimes({});
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

  // Pre-fill classTime and detect if different times exist when attendance records are loaded
  useEffect(() => {
    if (attRes?.data && attRes.data.length > 0) {
      const distinctTimes = new Set(
        attRes.data
          .map((r) => r.custom_class_time?.slice(0, 5))
          .filter(Boolean)
      );

      if (distinctTimes.size > 1) {
        setTimingMode("different");
      }

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

  // Map employee name -> schedules on selectedDate
  const employeeSchedulesMap = React.useMemo(() => {
    const schedules = schedulesRes?.data ?? [];
    const map = new Map<string, typeof schedules>();
    for (const sched of schedules) {
      if (!sched.instructor) continue;
      const instr = instrMap.get(sched.instructor);
      if (!instr?.employee) continue;
      const existing = map.get(instr.employee) ?? [];
      existing.push(sched);
      map.set(instr.employee, existing);
    }
    return map;
  }, [schedulesRes, instrMap]);

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

  // Helper to resolve an employee's effective class time
  const getEmployeeEffectiveClassTime = useCallback(
    (empId: string, isVisiting = false): { time: string; source: "global" | "custom" | "schedule" | "saved"; scheduleDetail?: string } => {
      if (timingMode === "same") {
        return { time: classTime, source: "global" };
      }

      // 1. Manually typed / selected in UI during this session
      if (individualClassTimes[empId]) {
        return { time: individualClassTimes[empId], source: "custom" };
      }

      // 2. Previously saved in Frappe attendance record
      const existingAtt = isVisiting ? visitingAttMap.get(empId) : attMap.get(empId);
      if (existingAtt?.custom_class_time) {
        return { time: existingAtt.custom_class_time.slice(0, 5), source: "saved" };
      }

      // 3. Matched from today's course schedule if this employee has class
      const schedules = employeeSchedulesMap.get(empId);
      if (schedules && schedules.length > 0) {
        const firstSched = schedules[0];
        const timeFromSched = firstSched.from_time ? firstSched.from_time.slice(0, 5) : "";
        if (timeFromSched) {
          const detail = firstSched.title || firstSched.course || firstSched.student_group || "Class";
          return { time: timeFromSched, source: "schedule", scheduleDetail: detail };
        }
      }

      // 4. Fallback to default classTime
      return { time: classTime, source: "global" };
    },
    [timingMode, classTime, individualClassTimes, visitingAttMap, attMap, employeeSchedulesMap]
  );

  // Helper to parse sessions JSON safely
  const parseSessions = (jsonStr?: string): Array<AttendanceBranchSession & { id?: string }> => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Helper to extract branch sessions for current branch with global session numbering
  const getBranchSessionsFromAtt = useCallback(
    (att?: EmployeeAttendance, defaultClassTimeVal?: string): BranchSessionItem[] => {
      const allSessions = parseSessions(att?.custom_sessions_json);
      const otherBranchSessions = allSessions.filter((s) => s.branch !== defaultCompany);
      const branchSessions = allSessions.filter((s) => s.branch === defaultCompany);
      const priorCount = otherBranchSessions.length;

      if (!att) {
        return [
          {
            id: "sess_1",
            title: "Session 1",
            session_type: "Morning",
            class_time: defaultClassTimeVal || "09:00",
            in_time: DEFAULT_IN_TIME,
            out_time: DEFAULT_OUT_TIME,
            status: "Present",
          },
        ];
      }

      if (branchSessions.length > 0) {
        return branchSessions.map((s, idx) => {
          const globalNum = priorCount + idx + 1;
          return {
            id: s.id || `sess_${globalNum}`,
            title: s.title || s.remarks || `Session ${globalNum}`,
            session_type: s.session_type,
            class_time: formatTimeForInput(s.class_time) || defaultClassTimeVal || "",
            in_time: formatTimeForInput(s.in_time),
            out_time: formatTimeForInput(s.out_time),
            status: (s.status as StaffStatus) || (att.status as StaffStatus) || "Present",
          };
        });
      }

      // If other branch already marked sessions, start this branch session as Session (N + 1)
      if (priorCount > 0) {
        const globalNum = priorCount + 1;
        // Check if any prior session was in the morning (before 13:00)
        const hasMorningElsewhere = otherBranchSessions.some((s) => {
          const t = s.in_time || s.out_time || s.class_time;
          if (!t) return false;
          const timePart = t.includes(" ") ? t.split(" ")[1] : t;
          const hour = parseInt(timePart.slice(0, 2), 10);
          return !isNaN(hour) && hour < 13;
        });

        const defaultType = hasMorningElsewhere ? "Evening" : "Morning";
        const defaultClass = hasMorningElsewhere ? "16:00" : (defaultClassTimeVal || "09:00");
        const defaultIn = hasMorningElsewhere ? "16:00" : DEFAULT_IN_TIME;
        const defaultOut = hasMorningElsewhere ? "18:00" : DEFAULT_OUT_TIME;

        return [
          {
            id: `sess_${globalNum}`,
            title: `Session ${globalNum}`,
            session_type: defaultType,
            class_time: defaultClass,
            in_time: defaultIn,
            out_time: defaultOut,
            status: (att.status as StaffStatus) || "Present",
          },
        ];
      }

      // If no branch sessions found at all, fallback to top-level fields
      return [
        {
          id: "sess_1",
          title: "Session 1",
          session_type: "Morning",
          class_time: formatTimeForInput(att.custom_class_time) || defaultClassTimeVal || "",
          in_time: formatTimeForInput(att.in_time || att.custom_check_in) || (att.status === "Present" ? DEFAULT_IN_TIME : ""),
          out_time: formatTimeForInput(att.out_time || att.custom_check_out) || (att.status === "Present" ? DEFAULT_OUT_TIME : ""),
          status: (att.status as StaffStatus) || "Present",
        },
      ];
    },
    [defaultCompany]
  );

  // Merge regular employees and visiting instructors into a single unified list
  const unifiedStaffList = React.useMemo(() => {
    // 1. Regular employees
    const regular = (employees || []).map((emp) => {
      const att = attMap.get(emp.name);
      const pending = pendingChanges[emp.name];
      const classTimeInfo = getEmployeeEffectiveClassTime(emp.name, false);

      const allSessions = parseSessions(att?.custom_sessions_json);
      const otherBranchSessions = allSessions.filter((s) => s.branch !== defaultCompany);

      const defaultSessions = getBranchSessionsFromAtt(att, classTimeInfo.time);
      const sessions = pending?.sessions ?? defaultSessions;
      const status = pending?.status ?? (att?.status as StaffStatus | undefined) ?? "Not Marked";

      const hasChange = pending !== undefined;

      return {
        name: emp.name,
        employee_name: emp.employee_name,
        designation: emp.designation || emp.department || "-",
        image: emp.image,
        attendance_status: status as string,
        sessions,
        attendance_name: att?.name,
        hasChange,
        isVisiting: false,
        homeBranch: undefined,
        classTimeInfo,
        otherBranchSessions,
      };
    });

    // 2. Visiting instructors
    const visiting = (visitingInstructors || []).map((v) => {
      const pending = pendingChanges[`visiting_${v.employee}`];
      const existingAtt = visitingAttMap.get(v.employee);
      const classTimeInfo = getEmployeeEffectiveClassTime(v.employee, true);

      const allSessions = parseSessions(existingAtt?.custom_sessions_json);
      const otherBranchSessions = allSessions.filter((s) => s.branch !== defaultCompany);

      const defaultSessions = getBranchSessionsFromAtt(existingAtt, classTimeInfo.time);
      const sessions = pending?.sessions ?? defaultSessions;
      const status = pending?.status ?? (existingAtt?.status as StaffStatus | undefined) ?? "Not Marked";

      const hasChange = pending !== undefined;

      return {
        name: v.employee,
        employee_name: v.instructor_name,
        designation: v.custom_company ? `Visiting from ${v.custom_company.replace("Smart Up ", "").replace("Smart Up", "HQ")}` : "Visiting Instructor",
        image: v.image,
        attendance_status: status as string,
        sessions,
        attendance_name: existingAtt?.name,
        hasChange,
        isVisiting: true,
        homeBranch: v.custom_company,
        classTimeInfo,
        otherBranchSessions,
      };
    });

    return [...regular, ...visiting];
  }, [
    employees,
    visitingInstructors,
    attMap,
    visitingAttMap,
    pendingChanges,
    getEmployeeEffectiveClassTime,
    getBranchSessionsFromAtt,
    defaultCompany,
  ]);

  // Summary counts
  const presentCount = unifiedStaffList.filter((e) => e.attendance_status === "Present").length;
  const absentCount = unifiedStaffList.filter((e) => e.attendance_status === "Absent").length;
  const holidayCount = unifiedStaffList.filter((e) => e.attendance_status === "Holiday").length;
  const notMarkedCount = unifiedStaffList.filter((e) => e.attendance_status === "Not Marked").length;
  const otherCount = unifiedStaffList.length - presentCount - absentCount - holidayCount - notMarkedCount;

  const pendingCount = Object.keys(pendingChanges).length;
  const hasIndividualTimeChanges = Object.keys(individualClassTimes).length > 0;

  const savedClassTime = React.useMemo(() => {
    if (attRes?.data && attRes.data.length > 0) {
      const record = attRes.data.find((r) => r.custom_class_time);
      return record?.custom_class_time ? record.custom_class_time.slice(0, 5) : "";
    }
    return "";
  }, [attRes]);

  const isClassTimeChanged = classTime !== savedClassTime;
  const hasUnsavedChanges = pendingCount > 0 || hasIndividualTimeChanges || (isClassTimeChanged && (attendanceRecords.length > 0 || visitingAttMap.size > 0));

  function getLateMinutes(inTime?: string, cTime?: string): number {
    if (!inTime || !cTime) return 0;
    const [inH, inM] = inTime.split(":").map(Number);
    const [classH, classM] = cTime.split(":").map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(classH) || isNaN(classM)) return 0;
    const inTotal = inH * 60 + inM;
    const classTotal = classH * 60 + classM;
    return inTotal > classTotal ? inTotal - classTotal : 0;
  }

  // Cycle through top-level statuses on click
  function cycleStatus(employeeId: string, currentStatus: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);
    const currentIndex = STATUS_OPTIONS.indexOf(currentStatus as StaffStatus);
    const nextIndex = currentStatus === "Not Marked" ? 0 : (currentIndex + 1) % STATUS_OPTIONS.length;
    const nextStatus = STATUS_OPTIONS[nextIndex];

    const currentSessions = pendingChanges[key]?.sessions ?? getBranchSessionsFromAtt(existingAtt);
    const updatedSessions = currentSessions.map((s) => ({
      ...s,
      status: nextStatus,
      in_time: nextStatus === "Present" ? (s.in_time || DEFAULT_IN_TIME) : nextStatus === "Half Day" ? (s.in_time || DEFAULT_IN_TIME) : "",
      out_time: nextStatus === "Present" ? (s.out_time || DEFAULT_OUT_TIME) : nextStatus === "Half Day" ? (s.out_time || DEFAULT_HALF_DAY_OUT_TIME) : "",
    }));

    setPendingChanges((prev) => ({
      ...prev,
      [key]: { status: nextStatus, sessions: updatedSessions },
    }));
  }

  // Update session field
  function handleSessionChange(
    employeeId: string,
    sessionId: string,
    field: "in_time" | "out_time" | "class_time" | "status" | "title",
    value: string,
    isVisiting = false
  ) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);

    setPendingChanges((prev) => {
      const current = prev[key] ?? {
        status: (existingAtt?.status as StaffStatus) ?? "Present",
        sessions: getBranchSessionsFromAtt(existingAtt),
      };

      const updatedSessions = current.sessions.map((s) => {
        if (s.id === sessionId) {
          return { ...s, [field]: value };
        }
        return s;
      });

      return { ...prev, [key]: { ...current, sessions: updatedSessions } };
    });
  }

  // Add session slot for an employee
  function handleAddSession(employeeId: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);

    setPendingChanges((prev) => {
      const current = prev[key] ?? {
        status: (existingAtt?.status as StaffStatus) ?? "Present",
        sessions: getBranchSessionsFromAtt(existingAtt),
      };

      const allSessions = parseSessions(existingAtt?.custom_sessions_json);
      const otherBranchCount = allSessions.filter((s) => s.branch !== defaultCompany).length;
      const nextGlobalIndex = otherBranchCount + current.sessions.length + 1;

      const newSession: BranchSessionItem = {
        id: `sess_${Date.now()}_${nextGlobalIndex}`,
        title: `Session ${nextGlobalIndex}`,
        session_type: nextGlobalIndex >= 2 ? "Evening" : "Morning",
        class_time: nextGlobalIndex >= 2 ? "16:00" : "09:00",
        in_time: nextGlobalIndex >= 2 ? "16:00" : DEFAULT_IN_TIME,
        out_time: nextGlobalIndex >= 2 ? "18:00" : DEFAULT_OUT_TIME,
        status: current.status === "Not Marked" ? "Present" : current.status,
      };

      return {
        ...prev,
        [key]: {
          ...current,
          status: current.status === "Not Marked" ? "Present" : current.status,
          sessions: [...current.sessions, newSession],
        },
      };
    });
  }

  // Remove session slot
  function handleRemoveSession(employeeId: string, sessionId: string, isVisiting = false) {
    const key = isVisiting ? `visiting_${employeeId}` : employeeId;
    const existingAtt = isVisiting ? visitingAttMap.get(employeeId) : attMap.get(employeeId);

    setPendingChanges((prev) => {
      const current = prev[key] ?? {
        status: (existingAtt?.status as StaffStatus) ?? "Present",
        sessions: getBranchSessionsFromAtt(existingAtt),
      };

      if (current.sessions.length <= 1) {
        toast.info("Cannot delete the only session. Mark Absent instead.");
        return prev;
      }

      const filtered = current.sessions.filter((s) => s.id !== sessionId);
      return { ...prev, [key]: { ...current, sessions: filtered } };
    });
  }

  // Mark all present
  function markAllPresent() {
    const changes: Record<string, StaffAttendanceChange> = {};
    for (const emp of employees) {
      const original = attMap.get(emp.name);
      const originalSessions = getBranchSessionsFromAtt(original);
      changes[emp.name] = {
        status: "Present",
        sessions: originalSessions.map((s) => ({
          ...s,
          status: "Present",
          in_time: s.in_time || DEFAULT_IN_TIME,
          out_time: s.out_time || DEFAULT_OUT_TIME,
        })),
      };
    }
    for (const v of visitingInstructors) {
      const original = visitingAttMap.get(v.employee);
      const originalSessions = getBranchSessionsFromAtt(original);
      changes[`visiting_${v.employee}`] = {
        status: "Present",
        sessions: originalSessions.map((s) => ({
          ...s,
          status: "Present",
          in_time: s.in_time || DEFAULT_IN_TIME,
          out_time: s.out_time || DEFAULT_OUT_TIME,
        })),
      };
    }
    setPendingChanges(changes);
  }

  // Mark all holiday
  function markAllHoliday() {
    const changes: Record<string, StaffAttendanceChange> = {};
    for (const emp of employees) {
      const original = attMap.get(emp.name);
      const originalSessions = getBranchSessionsFromAtt(original);
      changes[emp.name] = {
        status: "Holiday",
        sessions: originalSessions.map((s) => ({
          ...s,
          status: "Holiday",
          in_time: "",
          out_time: "",
        })),
      };
    }
    for (const v of visitingInstructors) {
      const original = visitingAttMap.get(v.employee);
      const originalSessions = getBranchSessionsFromAtt(original);
      changes[`visiting_${v.employee}`] = {
        status: "Holiday",
        sessions: originalSessions.map((s) => ({
          ...s,
          status: "Holiday",
          in_time: "",
          out_time: "",
        })),
      };
    }
    setPendingChanges(changes);
  }

  function handleIndividualClassTimeChange(employeeId: string, time: string) {
    setIndividualClassTimes((prev) => ({
      ...prev,
      [employeeId]: time,
    }));
  }

  // Save attendance
  const saveAttendance = useCallback(async () => {
    const currentSavedClassTime = (attRes?.data || []).find((r) => r.custom_class_time)?.custom_class_time?.slice(0, 5) || "";
    const isCTChanged = classTime !== currentSavedClassTime;
    const hasIndChanges = Object.keys(individualClassTimes).length > 0;

    if (pendingCount === 0 && !isCTChanged && !hasIndChanges) return;
    setSaving(true);
    try {
      type SaveResult = { key: string; employee: string; status: StaffStatus; kind: "employee" | "visiting"; sessions: BranchSessionItem[] };
      
      const allChanges = { ...pendingChanges };
      if (isCTChanged || hasIndChanges) {
        for (const existing of attendanceRecords) {
          if (!allChanges[existing.employee]) {
            allChanges[existing.employee] = {
              status: existing.status as StaffStatus,
              sessions: getBranchSessionsFromAtt(existing),
            };
          }
        }
        for (const [empId, existing] of Array.from(visitingAttMap.entries())) {
          const key = `visiting_${empId}`;
          if (!allChanges[key]) {
            allChanges[key] = {
              status: existing.status as StaffStatus,
              sessions: getBranchSessionsFromAtt(existing),
            };
          }
        }
      }

      const entries = Object.entries(allChanges);
      if (entries.length === 0) {
        toast.error("Please mark at least one employee to save.");
        setSaving(false);
        return;
      }

      const saveSingleEntry = async ([key, change]: [string, StaffAttendanceChange]): Promise<SaveResult | undefined> => {
        const isVisiting = key.startsWith("visiting_");
        const empId = isVisiting ? key.replace("visiting_", "") : key;
        const v = isVisiting ? visitingInstructors.find((vi) => vi.employee === empId) : undefined;
        const emp = !isVisiting ? employees.find((e) => e.name === empId) : undefined;

        if (isVisiting && !v) return undefined;
        if (!isVisiting && !emp) return undefined;

        const existing = isVisiting ? visitingAttMap.get(empId) : attMap.get(empId);
        const effectiveTime = getEmployeeEffectiveClassTime(empId, isVisiting).time;

        const existingSessions = parseSessions(existing?.custom_sessions_json);
        const otherSessions = existingSessions.filter((s) => s.branch !== defaultCompany);

        // Convert current branch sessions to serialized format with global numbering
        const branchSessionsFormatted = change.sessions.map((s, idx) => {
          const globalNum = otherSessions.length + idx + 1;
          const inT = s.in_time ? `${selectedDate} ${s.in_time}:00` : "";
          const outT = s.out_time ? `${selectedDate} ${s.out_time}:00` : "";
          const isNoTimeStatus = s.status === "At Head Office" || s.status === "Holiday" || s.status === "Absent" || s.status === "On Leave";

          return {
            id: s.id || `sess_${globalNum}`,
            branch: defaultCompany || "",
            title: s.title || `Session ${globalNum}`,
            session_type: s.session_type || (globalNum >= 2 ? "Evening" : "Morning"),
            status: s.status,
            in_time: isNoTimeStatus ? "" : inT,
            out_time: isNoTimeStatus ? "" : outT,
            class_time: s.class_time || effectiveTime || "",
            is_visiting: isVisiting ? 1 : 0,
          };
        });

        const mergedSessions = [...otherSessions, ...branchSessionsFormatted];

        // Earliest in-time and latest out-time
        const activeInTimes = branchSessionsFormatted.map((s) => s.in_time).filter(Boolean).sort();
        const activeOutTimes = branchSessionsFormatted.map((s) => s.out_time).filter(Boolean).sort();
        const primaryIn = activeInTimes[0] || undefined;
        const primaryOut = activeOutTimes[activeOutTimes.length - 1] || undefined;

        // Prepare custom_branch_sessions for Frappe DocType child table
        const customBranchSessions = mergedSessions.map((s) => {
          const rawIn = s.in_time ? (s.in_time.includes(" ") ? s.in_time.split(" ")[1] : s.in_time) : "";
          const rawOut = s.out_time ? (s.out_time.includes(" ") ? s.out_time.split(" ")[1] : s.out_time) : "";
          const rawClass = s.class_time ? (s.class_time.includes(" ") ? s.class_time.split(" ")[1] : s.class_time) : "";

          const inTimeVal = rawIn ? (rawIn.length === 5 ? `${rawIn}:00` : rawIn) : undefined;
          const outTimeVal = rawOut ? (rawOut.length === 5 ? `${rawOut}:00` : rawOut) : undefined;
          const classTimeVal = rawClass ? (rawClass.length === 5 ? `${rawClass}:00` : rawClass) : undefined;

          return {
            branch: s.branch || defaultCompany || "",
            session_type: s.session_type || "Morning",
            status: s.status || "Present",
            in_time: inTimeVal,
            out_time: outTimeVal,
            class_time: classTimeVal,
            is_visiting: s.is_visiting ? 1 : 0,
            remarks: s.title || "Session",
          };
        });

        // Calculate total working hours from sessions (sum of active session durations)
        let totalWorkingMinutes = 0;
        mergedSessions.forEach((s) => {
          if (s.status === "Present" || s.status === "Half Day") {
            const rawIn = s.in_time ? (s.in_time.includes(" ") ? s.in_time.split(" ")[1] : s.in_time) : "";
            const rawOut = s.out_time ? (s.out_time.includes(" ") ? s.out_time.split(" ")[1] : s.out_time) : "";
            if (rawIn && rawOut) {
              const [inH, inM] = rawIn.split(":").map(Number);
              const [outH, outM] = rawOut.split(":").map(Number);
              if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
                let diff = (outH * 60 + outM) - (inH * 60 + inM);
                if (diff < 0) diff += 24 * 60;
                if (diff > 0) totalWorkingMinutes += diff;
              }
            }
          }
        });
        const calculatedWorkingHours = totalWorkingMinutes > 0 ? parseFloat((totalWorkingMinutes / 60).toFixed(2)) : undefined;

        const payload = {
          employee: empId,
          employee_name: isVisiting ? v!.instructor_name : emp!.employee_name,
          attendance_date: selectedDate,
          status: change.status,
          company: isVisiting ? (v!.custom_company || defaultCompany || "") : (defaultCompany || ""),
          session_branch: defaultCompany || "",
          is_visiting: isVisiting,
          sessions_json: JSON.stringify(mergedSessions),
          custom_branch_sessions: customBranchSessions,
          in_time: primaryIn,
          out_time: primaryOut,
          working_hours: calculatedWorkingHours,
          custom_class_time: effectiveTime || undefined,
          custom_visiting_branch: isVisiting ? (defaultCompany || undefined) : undefined,
        };

        if (existing && !existing.name.startsWith("LOCAL-")) {
          await updateEmployeeAttendance(existing.name, payload);
        } else {
          await createEmployeeAttendance(payload);
        }

        return { key, employee: empId, status: change.status, kind: isVisiting ? "visiting" : "employee", sessions: change.sessions } as SaveResult;
      };

      // Process in small batches of 4
      const BATCH_SIZE = 4;
      const failed: Array<{ key: string; reason: unknown }> = [];
      const succeeded: SaveResult[] = [];
      const nextPending: Record<string, StaffAttendanceChange> = {};

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(batch.map((entry) => saveSingleEntry(entry)));
        for (let j = 0; j < batchResults.length; j += 1) {
          const result = batchResults[j];
          const [key, change] = batch[j];
          if (result.status === "rejected") {
            failed.push({ key, reason: result.reason });
            nextPending[key] = change;
          } else if (result.value) {
            succeeded.push(result.value);
          }
        }
      }

      setPendingChanges(nextPending);
      if (failed.length === 0) {
        setIndividualClassTimes({});
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
        toast.success(`Staff attendance & sessions saved for ${selectedDate}`);
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
    individualClassTimes,
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
    getEmployeeEffectiveClassTime,
    getBranchSessionsFromAtt,
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
              Mark daily & multi-session attendance for branch employees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={markAllPresent} disabled={attLoading || employees.length === 0}>
            <CheckCircle className="h-4 w-4 text-success" />
            Mark All Present
          </Button>
          <Button variant="outline" size="md" onClick={markAllHoliday} disabled={attLoading || employees.length === 0}>
            <Palmtree className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Mark All Holiday
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{holidayCount}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Holiday</p>
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

      {/* Filters & Legend Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Legend / Keys */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-text-secondary flex items-center gap-1 mr-1">
                <Clock className="h-3.5 w-3.5 text-primary" /> Key:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-light text-success font-medium">
                <CheckCircle className="h-3 w-3" /> Present
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-light text-error font-medium">
                <XCircle className="h-3 w-3" /> Absent
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning-light text-warning font-medium">
                <Clock className="h-3 w-3" /> Half Day
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-wash text-primary font-medium">
                <Users className="h-3 w-3" /> Work From Home
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 font-medium">
                <Building2 className="h-3 w-3" /> At Head Office
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 font-medium">
                <Palmtree className="h-3 w-3" /> Holiday
              </span>
            </div>

            {/* Date & Class Time Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end lg:self-auto flex-wrap">
              {/* Timing Mode Toggle */}
              <div className="flex items-center bg-surface-muted/60 p-0.5 rounded-[10px] border border-border-input text-xs">
                <button
                  type="button"
                  onClick={() => setTimingMode("same")}
                  className={`px-2.5 py-1.5 rounded-[8px] font-medium transition-all flex items-center gap-1.5 ${
                    timingMode === "same"
                      ? "bg-surface text-primary shadow-xs font-semibold"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Same time for all
                </button>
                <button
                  type="button"
                  onClick={() => setTimingMode("different")}
                  className={`px-2.5 py-1.5 rounded-[8px] font-medium transition-all flex items-center gap-1.5 ${
                    timingMode === "different"
                      ? "bg-surface text-primary shadow-xs font-semibold"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Different time for all
                </button>
              </div>

              {/* Date picker */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-[10px] border border-border-input bg-surface px-2.5 text-sm"
                />
              </div>

              {/* Class Time control */}
              {timingMode === "same" ? (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Default Class Time
                  </label>
                  <Time12Input
                    value={classTime}
                    onChange={(val) => setClassTime(val)}
                    size="md"
                    className="h-9"
                  />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary font-medium bg-brand-wash px-2.5 py-1.5 rounded-[10px] border border-primary/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Individual class times per employee
                </div>
              )}
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
      ) : unifiedStaffList.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">
          No employees or visiting instructors found.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-text-tertiary" />
                Employees & Visiting Instructors
              </CardTitle>
              <Badge variant="outline">{unifiedStaffList.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {unifiedStaffList.map((emp, index) => {
                const cfg = statusConfig[emp.attendance_status] ?? statusConfig["Not Marked"];
                const Icon = cfg.icon as React.ComponentType<{ className?: string }>;
                const showTimings = emp.attendance_status && emp.attendance_status !== "Absent" && emp.attendance_status !== "On Leave" && emp.attendance_status !== "Work From Home" && emp.attendance_status !== "At Head Office" && emp.attendance_status !== "Holiday" && emp.attendance_status !== "Not Marked";

                return (
                  <motion.div
                    key={emp.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex flex-col gap-3 p-3.5 rounded-xl border-2 transition-all bg-surface shadow-xs ${
                      emp.hasChange ? "ring-2 ring-primary/40 border-primary/30" : "border-border-card"
                    } ${emp.isVisiting ? "border-amber-300 dark:border-amber-700/50" : ""}`}
                  >
                    {/* Header Row: Avatar, Name, and Status Badge */}
                    <div
                      onClick={() => cycleStatus(emp.name, emp.attendance_status, emp.isVisiting)}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                        emp.isVisiting ? "bg-amber-100 ring-2 ring-amber-400" : "bg-brand-wash"
                      }`}>
                        {emp.image ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${emp.image}`}
                            alt={emp.employee_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className={`text-sm font-semibold ${emp.isVisiting ? "text-amber-700" : "text-primary"}`}>
                            {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate flex items-center gap-1.5">
                          <span className="truncate">{emp.employee_name}</span>
                          {emp.isVisiting && (
                            <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">Visiting</Badge>
                          )}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          {emp.designation}
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

                    {/* Multi-Session Timing Controls */}
                    {showTimings && (
                      <div className="pt-2 border-t border-border-light/60 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            Sessions ({emp.sessions.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddSession(emp.name, emp.isVisiting)}
                            className="text-[10px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 bg-brand-wash hover:bg-brand-wash/80 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Add Session
                          </button>
                        </div>


                        {/* Sessions List */}
                        <div className="space-y-2">
                          {emp.sessions.map((sess, sIdx) => {
                            const lateMins = getLateMinutes(sess.in_time, sess.class_time || emp.classTimeInfo.time);

                            return (
                              <div
                                key={sess.id || sIdx}
                                className="p-2 rounded-lg bg-surface-muted/40 border border-border-light flex flex-col gap-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {sess.title || `Session ${sIdx + 1}`}
                                  </span>
                                  {emp.sessions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSession(emp.name, sess.id, emp.isVisiting)}
                                      className="text-text-tertiary hover:text-error transition-colors p-0.5"
                                      title="Remove session"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Per-Session Class Time */}
                                <div className="flex items-center justify-between gap-1.5 bg-surface px-2 py-1 rounded-[6px] border border-primary/20">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Clock className="h-3 w-3 text-primary flex-shrink-0" />
                                    <span className="text-[10px] text-text-secondary font-medium whitespace-nowrap">Class Time:</span>
                                    {sIdx === 0 && emp.classTimeInfo.source === "schedule" && emp.classTimeInfo.scheduleDetail && (
                                      <span className="text-[8.5px] px-1 py-0 rounded bg-info/10 text-info font-medium truncate flex items-center gap-0.5 max-w-[120px]" title={emp.classTimeInfo.scheduleDetail}>
                                        <BookOpen className="h-2.5 w-2.5" />
                                        {emp.classTimeInfo.scheduleDetail}
                                      </span>
                                    )}
                                  </div>
                                  <Time12Input
                                    value={sess.class_time || ""}
                                    onChange={(val) =>
                                      handleSessionChange(emp.name, sess.id, "class_time", val, emp.isVisiting)
                                    }
                                    size="sm"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* In Time */}
                                  <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-[6px] border border-border-light flex-1">
                                    <LogIn className="h-3 w-3 text-success flex-shrink-0" />
                                    <span className="text-[10px] text-text-secondary font-medium">In:</span>
                                    <Time12Input
                                      value={sess.in_time || ""}
                                      onChange={(val) =>
                                        handleSessionChange(emp.name, sess.id, "in_time", val, emp.isVisiting)
                                      }
                                      size="sm"
                                      className="border-0 bg-transparent px-0 py-0"
                                    />
                                  </div>

                                  {/* Out Time */}
                                  <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-[6px] border border-border-light flex-1">
                                    <LogOut className="h-3 w-3 text-error flex-shrink-0" />
                                    <span className="text-[10px] text-text-secondary font-medium">Out:</span>
                                    <Time12Input
                                      value={sess.out_time || ""}
                                      onChange={(val) =>
                                        handleSessionChange(emp.name, sess.id, "out_time", val, emp.isVisiting)
                                      }
                                      size="sm"
                                      className="border-0 bg-transparent px-0 py-0"
                                    />
                                  </div>
                                </div>

                                {lateMins > 0 && (
                                  <div className="text-[9px] text-error font-medium flex items-center gap-1 bg-error-light/50 px-1.5 py-0.5 rounded border border-error/10 w-fit">
                                    <Clock className="h-2.5 w-2.5" />
                                    {lateMins}m late (vs {formatTo12Hour(sess.class_time || emp.classTimeInfo.time)})
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cross-branch other sessions indicator */}
                    {emp.otherBranchSessions && emp.otherBranchSessions.length > 0 && (
                      <div className="pt-2 border-t border-border-light/40 flex flex-col gap-1">
                        <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">
                          Other Branch Sessions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {emp.otherBranchSessions.map((os, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200/70 rounded px-1.5 py-0.5"
                              title={`${os.title || `Session ${i + 1}`} at ${os.branch}: ${os.in_time || ""} - ${os.out_time || ""} (${os.status})`}
                            >
                              <Building2 className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
                              <span className="font-semibold text-amber-900">
                                {os.title || `Session ${i + 1}`}:
                              </span>
                              <span className="font-medium truncate max-w-[110px]">
                                {os.branch.replace("Smart Up ", "")}
                              </span>
                              <span className="text-[9px] font-semibold">({os.status})</span>
                              {os.in_time && (
                                <span className="text-[9px] text-amber-700">
                                  {os.in_time.slice(0, 5)}{os.out_time ? ` - ${os.out_time.slice(0, 5)}` : ""}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <p className="text-xs text-text-tertiary mt-4 text-center">
              Click on an employee card header to cycle overall status. Use <strong>+ Add Session</strong> to record split timings (e.g. 9-12 & 4-6).
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
