"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Users,
  MapPin,
  Search,
  LayoutList,
  Grid3X3,
  CheckCircle2,
  Building2,
  Filter,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import {
  getCourseSchedules,
  getStudentGroups,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";
import { getBranches } from "@/lib/api/enrollment";
import { getInstructors } from "@/lib/api/employees";

// ── Helpers ──────────────────────────────────────────────────────────────────

type ViewMode = "week" | "calendar";

function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay(); // 0=Sun
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - ((startDay + 6) % 7));
  const endDay = last.getDay();
  const end = new Date(last);
  end.setDate(last.getDate() + ((7 - endDay) % 7));

  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const COLOR_BORDER: Record<string, string> = {
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  red: "border-l-red-400",
  yellow: "border-l-yellow-400",
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
  pink: "border-l-pink-400",
  teal: "border-l-teal-400",
  violet: "border-l-violet-400",
  cyan: "border-l-cyan-400",
  amber: "border-l-amber-400",
};

const COLOR_BG_LIGHT: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  yellow: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function APDCourseSchedulePage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");

  // ── Derived date ranges ────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const weekFrom = toISODate(weekDates[0]);
  const weekTo = toISODate(weekDates[6]);
  const today = toISODate(new Date());

  const calDates = useMemo(() => getMonthDates(calYear, calMonth), [calYear, calMonth]);
  const calFrom = toISODate(calDates[0]);
  const calTo = toISODate(calDates[calDates.length - 1]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-apd-schedules"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  const { data: schedRes, isLoading } = useQuery({
    queryKey: [
      "apd-schedules",
      selectedBranch,
      viewMode === "week" ? weekFrom : calFrom,
      viewMode === "week" ? weekTo : calTo,
    ],
    queryFn: () =>
      getCourseSchedules({
        branch: selectedBranch !== "all" ? selectedBranch : undefined,
        from_date: viewMode === "week" ? weekFrom : calFrom,
        to_date: viewMode === "week" ? weekTo : calTo,
      }),
  });
  const schedules = schedRes?.data ?? [];

  const { data: groupRes } = useQuery({
    queryKey: ["apd-student-groups", selectedBranch],
    queryFn: () => getStudentGroups({ branch: selectedBranch !== "all" ? selectedBranch : undefined }),
    staleTime: 60_000,
  });
  const studentGroups = groupRes?.data ?? [];

  const { data: instrRes } = useQuery({
    queryKey: ["apd-instructors", selectedBranch],
    queryFn: () => getInstructors({ limit_page_length: 500 }),
    staleTime: 60_000,
  });
  const instructors = instrRes?.data ?? [];

  // Filtered schedules
  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedBranch !== "all" && s.custom_branch !== selectedBranch) return false;
      if (groupFilter && s.student_group !== groupFilter) return false;
      if (instructorFilter && s.instructor !== instructorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const m1 = s.course?.toLowerCase().includes(q);
        const m2 = s.instructor_name?.toLowerCase().includes(q);
        const m3 = s.student_group?.toLowerCase().includes(q);
        const m4 = s.custom_branch?.toLowerCase().includes(q);
        const m5 = s.custom_topic?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }
      return true;
    });
  }, [schedules, selectedBranch, groupFilter, instructorFilter, search]);

  // Week navigation
  const prevWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  };
  const nextWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  };
  const goToday = () => {
    setAnchor(new Date());
    setCalYear(new Date().getFullYear());
    setCalMonth(new Date().getMonth());
  };

  // Calendar month navigation
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <BreadcrumbNav />

      {/* Header & Branch Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Master Timetable & Course Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Review cross-branch class schedules, room allocations, and faculty assignments.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Picker */}
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <Building2 className="w-4 h-4 text-text-tertiary" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-sm bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "week"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Week
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "calendar"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-border/80 bg-surface shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by course, topic, faculty..."
              className="pl-9 text-sm rounded-xl h-9"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="text-xs border border-border rounded-xl px-3 py-2 bg-surface text-text-primary h-9 focus:outline-none"
          >
            <option value="">All Batches / Classes</option>
            {studentGroups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.student_group_name || g.name}
              </option>
            ))}
          </select>

          <select
            value={instructorFilter}
            onChange={(e) => setInstructorFilter(e.target.value)}
            className="text-xs border border-border rounded-xl px-3 py-2 bg-surface text-text-primary h-9 focus:outline-none"
          >
            <option value="">All Faculty</option>
            {instructors.map((ins) => (
              <option key={ins.name} value={ins.name}>
                {ins.instructor_name || ins.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="rounded-xl text-xs h-9 px-3"
          >
            Today
          </Button>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={viewMode === "week" ? prevWeek : prevMonth}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold px-2 min-w-[120px] text-center text-text-primary">
              {viewMode === "week"
                ? `${weekFrom} to ${weekTo}`
                : `${MONTH_NAMES[calMonth]} ${calYear}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={viewMode === "week" ? nextWeek : nextMonth}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week View Grid */}
      {viewMode === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDates.map((d, i) => {
            const dateStr = toISODate(d);
            const isToday = dateStr === today;
            const daySchedules = filtered.filter((s) => s.schedule_date === dateStr);

            return (
              <div
                key={dateStr}
                className={`flex flex-col min-h-[420px] rounded-2xl border ${
                  isToday
                    ? "border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm"
                    : "border-border/80 bg-surface"
                } p-3 transition-colors`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div>
                    <span className="text-xs font-semibold uppercase text-text-tertiary tracking-wider block">
                      {DAY_LABELS[i]}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        isToday ? "text-primary" : "text-text-primary"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {daySchedules.length}
                  </Badge>
                </div>

                {/* Day Schedule Items */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[550px] pr-1">
                  {daySchedules.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-xs text-text-tertiary">
                      No sessions
                    </div>
                  ) : (
                    daySchedules.map((item) => (
                      <div
                        key={item.name}
                        className="p-2.5 rounded-xl border border-border/70 bg-background/80 hover:border-primary/40 hover:shadow-xs transition-all text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-text-primary truncate">
                            {item.course || item.custom_event_title || "Session"}
                          </span>
                          {item.custom_topic_covered === 1 && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          <span>
                            {item.from_time?.slice(0, 5)} - {item.to_time?.slice(0, 5)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-text-secondary truncate">
                          <Users className="w-3 h-3 text-text-tertiary" />
                          <span className="truncate">{item.student_group}</span>
                        </div>

                        {selectedBranch === "all" && item.custom_branch && (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-medium truncate">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate">{item.custom_branch}</span>
                          </div>
                        )}

                        {item.instructor_name && (
                          <p className="text-[11px] text-text-tertiary italic truncate">
                            {item.instructor_name}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month / Calendar View Grid */}
      {viewMode === "calendar" && (
        <Card className="border border-border/80 bg-surface shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 text-center text-xs font-semibold py-2.5 text-text-secondary">
            {DAY_LABELS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {calDates.map((d) => {
              const dateStr = toISODate(d);
              const isToday = dateStr === today;
              const isCurrentMonth = d.getMonth() === calMonth;
              const daySchedules = filtered.filter((s) => s.schedule_date === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[100px] p-2 flex flex-col justify-between ${
                    !isCurrentMonth ? "opacity-40 bg-muted/20" : ""
                  } ${isToday ? "bg-primary/5 font-semibold" : ""}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={isToday ? "text-primary font-bold" : "text-text-primary"}>
                      {d.getDate()}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-[10px] text-text-tertiary font-medium">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {daySchedules.slice(0, 2).map((item) => (
                      <div
                        key={item.name}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-text-secondary truncate border border-border/40"
                      >
                        {item.course || "Class"} • {item.from_time?.slice(0, 5)}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <p className="text-[9px] text-text-tertiary pl-1 font-medium">
                        +{daySchedules.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
