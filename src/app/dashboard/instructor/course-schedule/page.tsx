"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Users,
  MapPin,
  Loader2,
  LayoutList,
  Grid3X3,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getCourseSchedules,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";

// ── Helpers ──────────────────────────────────────────────────────────────────

type ViewMode = "week" | "calendar";

function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay();
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
  return d.toISOString().split("T")[0];
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLORS: Record<string, string> = {
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  red: "border-l-red-400",
  yellow: "border-l-yellow-400",
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
  pink: "border-l-pink-400",
  teal: "border-l-teal-400",
};

const DOT_COLORS: Record<string, string> = {
  blue: "bg-blue-400",
  green: "bg-green-400",
  red: "bg-red-400",
  yellow: "bg-yellow-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function InstructorCourseSchedulePage() {
  const { instructorName, isLoading: authLoading, allowedCompanies } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const weekFrom = toISODate(weekDates[0]);
  const weekTo = toISODate(weekDates[6]);
  const today = toISODate(new Date());

  const calDates = useMemo(() => getMonthDates(calYear, calMonth), [calYear, calMonth]);
  const calFrom = toISODate(calDates[0]);
  const calTo = toISODate(calDates[calDates.length - 1]);

  const fromDate = viewMode === "week" ? weekFrom : calFrom;
  const toDate = viewMode === "week" ? weekTo : calTo;

  // ── Fetch schedules ────────────────────────────────────────────────────────
  const { data: schedRes, isLoading } = useQuery({
    queryKey: ["instructor-schedules", instructorName, fromDate, toDate],
    queryFn: () =>
      getCourseSchedules({
        from_date: fromDate,
        to_date: toDate,
        instructor: instructorName || undefined,
        branches: allowedCompanies.length > 0 ? allowedCompanies : undefined,
        limit_page_length: 500,
      }),
    enabled: !!instructorName && allowedCompanies.length > 0,
    staleTime: 60_000,
  });

  const allSchedules = schedRes?.data ?? [];

  const byDate = useMemo(() => {
    const map = new Map<string, CourseSchedule[]>();
    allSchedules.forEach((s) => {
      const arr = map.get(s.schedule_date) ?? [];
      arr.push(s);
      map.set(s.schedule_date, arr);
    });
    map.forEach((sessions) =>
      sessions.sort((a, b) => a.from_time.localeCompare(b.from_time))
    );
    return map;
  }, [allSchedules]);

  const totalInRange = allSchedules.length;

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goWeekPrev = useCallback(
    () => setAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; }),
    []
  );
  const goWeekNext = useCallback(
    () => setAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; }),
    []
  );
  const goCalPrev = useCallback(() => {
    setCalMonth((m) => { if (m === 0) { setCalYear((y) => y - 1); return 11; } return m - 1; });
  }, []);
  const goCalNext = useCallback(() => {
    setCalMonth((m) => { if (m === 11) { setCalYear((y) => y + 1); return 0; } return m + 1; });
  }, []);
  const goToday = useCallback(() => {
    if (viewMode === "week") {
      setAnchor(new Date());
    } else {
      setCalYear(new Date().getFullYear());
      setCalMonth(new Date().getMonth());
    }
  }, [viewMode]);

  const goPrev = viewMode === "week" ? goWeekPrev : goCalPrev;
  const goNext = viewMode === "week" ? goWeekNext : goCalNext;

  // ── Loading / guard ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!instructorName) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-text-secondary text-sm">Instructor profile not found.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <BreadcrumbNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          My Schedule
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLoading
            ? "Loading…"
            : `${totalInRange} session${totalInRange !== 1 ? "s" : ""} ${viewMode === "week" ? "this week" : "this month"}`}
        </p>
      </div>

      {/* View toggle + Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Toggle pills */}
        <div className="flex rounded-[10px] bg-surface-secondary p-0.5 border border-border-light shrink-0">
          <button
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
              viewMode === "week"
                ? "bg-surface shadow-sm text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Week
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-surface shadow-sm text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Month
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-[8px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-text-primary text-sm min-w-[180px] text-center">
            {viewMode === "week" ? (
              <>
                {weekDates[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {" – "}
                {weekDates[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </>
            ) : (
              `${MONTH_NAMES[calMonth]} ${calYear}`
            )}
          </span>
          <button onClick={goToday} className="px-3 py-1.5 rounded-[8px] text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            Today
          </button>
          <button onClick={goNext} className="p-2 rounded-[8px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "week" ? (
        <WeekView weekDates={weekDates} byDate={byDate} today={today} isLoading={isLoading} />
      ) : (
        <CalendarView
          calDates={calDates}
          byDate={byDate}
          calMonth={calMonth}
          today={today}
          isLoading={isLoading}
          selectedDate={selectedCalDate}
          onSelectDate={setSelectedCalDate}
        />
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Week View ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function WeekView({
  weekDates, byDate, today, isLoading,
}: {
  weekDates: Date[];
  byDate: Map<string, CourseSchedule[]>;
  today: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-14 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {weekDates.map((date, dayIdx) => {
        const dateStr = toISODate(date);
        const sessions = byDate.get(dateStr) ?? [];
        const isToday = dateStr === today;

        return (
          <motion.div key={dateStr} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIdx * 0.03 }}>
            <Card className={isToday ? "ring-1 ring-primary/40" : ""}>
              <CardContent className="p-0">
                <div className={`flex items-center justify-between px-4 py-2 border-b border-border-light rounded-t-[inherit] ${isToday ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-text-primary"}`}>{DAY_LABELS[dayIdx]}</span>
                    <span className={`text-sm ${isToday ? "text-primary font-bold" : "text-text-secondary"}`}>{date.getDate()}</span>
                    {isToday && <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border-0">Today</Badge>}
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {sessions.length > 0 ? `${sessions.length} class${sessions.length > 1 ? "es" : ""}` : "Free"}
                  </span>
                </div>
                {sessions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-text-tertiary text-center">No classes</div>
                ) : (
                  <div className="divide-y divide-border-light">
                    {sessions.map((s) => <SessionRow key={s.name} schedule={s} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Calendar View ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function CalendarView({
  calDates, byDate, calMonth, today, isLoading, selectedDate, onSelectDate,
}: {
  calDates: Date[];
  byDate: Map<string, CourseSchedule[]>;
  calMonth: number;
  today: string;
  isLoading: boolean;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
}) {
  const selectedSessions = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  if (isLoading) {
    return (
      <Card><CardContent className="p-4"><div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[8px]" />)}
      </div></CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-1">
            {calDates.map((date) => {
              const dateStr = toISODate(date);
              const sessions = byDate.get(dateStr) ?? [];
              const isCurrentMonth = date.getMonth() === calMonth;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const count = sessions.length;

              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  className={`
                    relative min-h-[60px] sm:min-h-[72px] rounded-[8px] p-1.5 text-left transition-all border flex flex-col items-center
                    ${isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : isToday
                        ? "border-primary/40 bg-primary/[0.03]"
                        : count > 0
                          ? "border-transparent hover:bg-surface-secondary hover:border-border-light"
                          : "border-transparent hover:bg-surface-secondary"
                    }
                    ${!isCurrentMonth ? "opacity-30" : ""}
                  `}
                >
                  <span className={`
                    inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium
                    ${isToday ? "bg-primary text-white" : isSelected ? "text-primary font-bold" : "text-text-secondary"}
                  `}>
                    {date.getDate()}
                  </span>

                  {/* Dot indicators */}
                  {count > 0 && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {sessions.slice(0, 4).map((s) => (
                        <span
                          key={s.name}
                          className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[s.class_schedule_color ?? ""] ?? "bg-primary"}`}
                        />
                      ))}
                      {count > 4 && (
                        <span className="text-[8px] text-text-tertiary font-medium ml-0.5">+{count - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Count label on desktop */}
                  {count > 0 && (
                    <span className="hidden sm:block text-[9px] text-text-tertiary mt-0.5">
                      {count} class{count > 1 ? "es" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date detail */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <Card className="ring-1 ring-primary/20">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light bg-primary/5 rounded-t-[inherit]">
                  <span className="font-semibold text-sm text-text-primary">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {selectedSessions.length} class{selectedSessions.length !== 1 ? "es" : ""}
                  </span>
                </div>
                {selectedSessions.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-tertiary">No classes this day.</div>
                ) : (
                  <div className="divide-y divide-border-light">
                    {selectedSessions.map((s) => <SessionRow key={s.name} schedule={s} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ schedule: s }: { schedule: CourseSchedule }) {
  const borderCls = COLORS[s.class_schedule_color ?? ""] ?? "border-l-primary";

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-l-4 ${borderCls} hover:bg-surface-secondary/50 transition-colors`}
    >
      {/* Time block */}
      <div className="flex flex-col items-center shrink-0 w-[72px]">
        <span className="text-sm font-semibold text-text-primary">
          {formatTime(s.from_time)}
        </span>
        <span className="text-[10px] text-text-tertiary">
          {formatTime(s.to_time)}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold text-sm text-text-primary truncate">
            {s.course}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {s.student_group}
          </span>
          {s.room && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {s.room}
            </span>
          )}
        </div>
      </div>

      {/* Duration badge */}
      <div className="shrink-0 hidden sm:block">
        <Badge variant="outline" className="text-[10px] font-normal">
          <Clock className="h-2.5 w-2.5 mr-1" />
          {(() => {
            const [fh, fm] = s.from_time.split(":").map(Number);
            const [th, tm] = s.to_time.split(":").map(Number);
            const mins = (th * 60 + tm) - (fh * 60 + fm);
            return mins >= 60
              ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}`
              : `${mins}m`;
          })()}
        </Badge>
      </div>
    </div>
  );
}
