"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";

interface ParentScheduleItem {
  name: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  course?: string;
  student_group?: string;
  custom_event_title?: string | null;
  custom_event_type?: string | null;
  custom_branch?: string | null;
  group_display_name: string;
  program: string;
  is_one_to_one: boolean;
}

interface ParentScheduleChild {
  student: string;
  student_name: string;
  custom_branch?: string;
  custom_student_type?: string;
  enrollment?: {
    program?: string;
    academic_year?: string;
    student_batch_name?: string;
  };
  groups: Array<{
    name: string;
    student_group_name?: string;
    program?: string;
    custom_branch?: string;
    is_one_to_one: boolean;
  }>;
  schedules: ParentScheduleItem[];
}

interface ParentSchedulesResponse {
  month: string;
  children: ParentScheduleChild[];
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatTime12h(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: `pad-start-${i}`, day: 0, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: `pad-end-${cells.length}`, day: 0, inMonth: false });
  }

  return cells;
}

export default function ParentSchedulePage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState("all");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<ParentSchedulesResponse>({
    queryKey: ["parent-schedules", visibleMonth],
    queryFn: async () => {
      const res = await fetch(`/api/parent/schedules?month=${encodeURIComponent(visibleMonth)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch parent schedules");
      return res.json();
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  const children = data?.children ?? [];
  const filteredChildren = selectedChild === "all"
    ? children
    : children.filter((child) => child.student === selectedChild);

  const allSchedules = useMemo(
    () => filteredChildren.flatMap((child) =>
      child.schedules.map((schedule) => ({
        ...schedule,
        childName: child.student_name,
        childId: child.student,
      })),
    ),
    [filteredChildren],
  );

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, typeof allSchedules>();
    for (const schedule of allSchedules) {
      const items = map.get(schedule.schedule_date) ?? [];
      items.push(schedule);
      map.set(schedule.schedule_date, items);
    }
    for (const [date, items] of map.entries()) {
      items.sort((a, b) => `${a.from_time}`.localeCompare(`${b.from_time}`));
      map.set(date, items);
    }
    return map;
  }, [allSchedules]);

  const selectedDaySchedules = schedulesByDate.get(selectedDate) ?? [];
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const totalSchedules = allSchedules.length;
  const o2oCount = allSchedules.filter((item) => item.is_one_to_one).length;

  function shiftMonth(delta: number) {
    const [year, month] = visibleMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setVisibleMonth(nextKey);
    setSelectedDate(`${nextKey}-01`);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Course Schedule
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          View scheduled class times in a monthly calendar for your children.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-tertiary uppercase tracking-wide">Children</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{filteredChildren.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-tertiary uppercase tracking-wide">Scheduled Sessions</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{isLoading ? "..." : totalSchedules}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-tertiary uppercase tracking-wide">One-to-One Sessions</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{isLoading ? "..." : o2oCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="h-10 w-10 rounded-[10px] border border-border-input bg-surface flex items-center justify-center hover:border-primary/30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <div className="min-w-[180px] text-center text-sm font-semibold text-text-primary">
              {formatMonthLabel(visibleMonth)}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="h-10 w-10 rounded-[10px] border border-border-input bg-surface flex items-center justify-center hover:border-primary/30 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </button>
          </div>

          {children.length > 1 && (
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-[220px]"
            >
              <option value="all">All Children</option>
              {children.map((child) => (
                <option key={child.student} value={child.student}>
                  {child.student_name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((name) => (
                  <div key={name} className="text-xs font-semibold text-text-tertiary text-center py-2">
                    {name}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell) => {
                  if (!cell.inMonth) {
                    return <div key={cell.date} className="min-h-[92px] rounded-[12px] bg-app-bg/40" />;
                  }

                  const daySchedules = schedulesByDate.get(cell.date) ?? [];
                  const isSelected = selectedDate === cell.date;
                  const isToday = new Date().toISOString().slice(0, 10) === cell.date;

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[92px] rounded-[12px] border p-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-brand-wash/50"
                          : "border-border-light bg-surface hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-text-primary"}`}>
                          {cell.day}
                        </span>
                        {daySchedules.length > 0 && (
                          <Badge variant={daySchedules.some((item) => item.is_one_to_one) ? "warning" : "info"}>
                            {daySchedules.length}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {daySchedules.slice(0, 2).map((schedule) => (
                          <div key={schedule.name} className="rounded-[8px] bg-app-bg px-2 py-1">
                            <p className="text-[11px] font-medium text-text-primary truncate">
                              {schedule.custom_event_title || schedule.course || "Class"}
                            </p>
                            <p className="text-[10px] text-text-tertiary truncate">
                              {formatTime12h(schedule.from_time)}
                            </p>
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <p className="text-[10px] text-primary font-medium">+{daySchedules.length - 2} more</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDaySchedules.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">
                  No scheduled classes for this date.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDaySchedules.map((schedule) => (
                    <div key={schedule.name} className="rounded-[12px] border border-border-light bg-app-bg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {schedule.custom_event_title || schedule.course || "Scheduled Class"}
                          </p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime12h(schedule.from_time)} - {formatTime12h(schedule.to_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {schedule.program || "Program"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {schedule.is_one_to_one && <Badge variant="warning">One-to-One</Badge>}
                          {schedule.custom_event_type && <Badge variant="outline">{schedule.custom_event_type}</Badge>}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-text-secondary">
                        <p className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {schedule.childName}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {schedule.group_display_name || schedule.student_group || "Student Group"}
                        </p>
                        {schedule.custom_branch && <p>{schedule.custom_branch}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
