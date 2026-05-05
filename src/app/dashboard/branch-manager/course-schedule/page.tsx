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
  Plus,
  Search,
  Trash2,
  LayoutList,
  Grid3X3,
  X,
  GraduationCap,
  Layers,
  BookUser,
  FileText,
  CheckCircle2,
  PartyPopper,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getCourseSchedules,
  deleteCourseSchedule,
  getStudentGroups,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";
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
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  yellow: "bg-yellow-50 text-yellow-800",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-orange-700",
  pink: "bg-pink-50 text-pink-700",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
  cyan: "bg-cyan-50 text-cyan-700",
  amber: "bg-amber-50 text-amber-700",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Page Component ────────────────────────────────────────────────────────────

export default function BranchManagerCourseSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [addPopupDate, setAddPopupDate] = useState<string | null>(null);

  // ── Derived date ranges ────────────────────────────────────────────────────
  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const weekFrom = toISODate(weekDates[0]);
  const weekTo = toISODate(weekDates[6]);
  const today = toISODate(new Date());

  const calDates = useMemo(() => getMonthDates(calYear, calMonth), [calYear, calMonth]);
  const calFrom = toISODate(calDates[0]);
  const calTo = toISODate(calDates[calDates.length - 1]);

  // ── Lookup data ────────────────────────────────────────────────────────────
  const { data: groupRes } = useQuery({
    queryKey: ["student-groups", branch],
    queryFn: () => getStudentGroups({ branch: branch || undefined }),
    staleTime: 5 * 60_000,
  });
  const groups = groupRes?.data ?? [];

  const { data: instrRes } = useQuery({
    queryKey: ["instructors-all"],
    queryFn: () => getInstructors({ limit_page_length: 500 }),
    staleTime: 5 * 60_000,
  });
  const instructors = instrRes?.data ?? [];

  // ── Schedules query ────────────────────────────────────────────────────────
  const fromDate = viewMode === "week" ? weekFrom : calFrom;
  const toDate = viewMode === "week" ? weekTo : calTo;

  const { data: schedRes, isLoading } = useQuery({
    queryKey: ["bm-schedules", branch, fromDate, toDate, instructorFilter],
    queryFn: () =>
      getCourseSchedules({
        branch: branch || undefined,
        from_date: fromDate,
        to_date: toDate,
        instructor: instructorFilter || undefined,
        limit_page_length: 500,
      }),
    enabled: !!branch,
    staleTime: 60_000,
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: (name: string) => deleteCourseSchedule(name),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bm-schedules"] });
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const allSchedules = schedRes?.data ?? [];

  const filtered = useMemo(() => {
    let list = allSchedules;
    if (groupFilter) list = list.filter((s) => s.student_group === groupFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.course ?? "").toLowerCase().includes(q) ||
          (s.student_group ?? "").toLowerCase().includes(q) ||
          (s.instructor_name ?? "").toLowerCase().includes(q) ||
          (s.program ?? "").toLowerCase().includes(q) ||
          (s.custom_event_type ?? "").toLowerCase().includes(q) ||
          (s.custom_event_title ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allSchedules, groupFilter, search]);

  const byDate = useMemo(() => {
    const map = new Map<string, CourseSchedule[]>();
    filtered.forEach((s) => {
      const arr = map.get(s.schedule_date) ?? [];
      arr.push(s);
      map.set(s.schedule_date, arr);
    });
    return map;
  }, [filtered]);

  const totalInRange = filtered.length;

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goWeekPrev = useCallback(
    () => setAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; }),
    []
  );
  const goWeekNext = useCallback(
    () => setAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; }),
    []
  );
  const goCalPrev = useCallback(() => {
    setCalMonth((m) => {
      if (m === 0) { setCalYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);
  const goCalNext = useCallback(() => {
    setCalMonth((m) => {
      if (m === 11) { setCalYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);
  const goToday = useCallback(() => {
    const now = new Date();
    if (viewMode === "week") setAnchor(now);
    else { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); }
  }, [viewMode]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Course Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading
              ? "Loading…"
              : `${totalInRange} session${totalInRange !== 1 ? "s" : ""} ${viewMode === "week" ? "this week" : "this month"}`}
            {branch && <span className="ml-1 text-text-tertiary">· {branch}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/branch-manager/course-schedule/event">
            <Button variant="outline" className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4" />
              Event Planner
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/course-schedule/bulk">
            <Button variant="outline" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Bulk Schedule
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/course-schedule/one-to-one">
            <Button variant="outline" className="flex items-center gap-2">
              <BookUser className="h-4 w-4" />
              One-to-One
            </Button>
          </Link>
          <Link href="/dashboard/branch-manager/course-schedule/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* ── View toggle + filters ───────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Top row: view toggle + navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* View toggle pills */}
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
                Calendar
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <button
                onClick={viewMode === "week" ? goWeekPrev : goCalPrev}
                className="p-2 rounded-[8px] hover:bg-brand-wash text-text-secondary transition-colors"
              >
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
              <button
                onClick={goToday}
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Today
              </button>
              <button
                onClick={viewMode === "week" ? goWeekNext : goCalNext}
                className="p-2 rounded-[8px] hover:bg-brand-wash text-text-secondary transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Second row: search + group filter + instructor filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search course, group, instructor…"
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary min-w-[180px]"
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.student_group_name}
                </option>
              ))}
            </select>
            <select
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary min-w-[180px]"
            >
              <option value="">All instructors</option>
              {instructors.map((i) => (
                <option key={i.name} value={i.name}>
                  {i.instructor_name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {viewMode === "week" ? (
        <WeekView
          weekDates={weekDates}
          byDate={byDate}
          today={today}
          isLoading={isLoading}
          onDelete={setDeleteTarget}
          onAddClick={setAddPopupDate}
          onEditClick={(name) => router.push(`/dashboard/branch-manager/course-schedule/edit/${name}`)}
        />
      ) : (
        <CalendarView
          calDates={calDates}
          byDate={byDate}
          calMonth={calMonth}
          today={today}
          isLoading={isLoading}
          selectedDate={selectedCalDate}
          onSelectDate={setSelectedCalDate}
          onDelete={setDeleteTarget}
          onAddClick={setAddPopupDate}
          onEditClick={(name) => router.push(`/dashboard/branch-manager/course-schedule/edit/${name}`)}
        />
      )}

      {/* ── Add type chooser popup ──────────────────────────────────── */}
      <AnimatePresence>
        {addPopupDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setAddPopupDate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-[16px] p-6 shadow-xl max-w-xs w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-text-primary text-center">What do you want to add?</h3>
              <p className="text-xs text-text-secondary text-center">
                {new Date(addPopupDate + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    router.push(`/dashboard/branch-manager/course-schedule/new?date=${addPopupDate}`);
                    setAddPopupDate(null);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 border-border-light hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <BookOpen className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-text-primary">Class</span>
                  <span className="text-[10px] text-text-tertiary">Course session</span>
                </button>
                <button
                  onClick={() => {
                    router.push(`/dashboard/branch-manager/course-schedule/event?date=${addPopupDate}`);
                    setAddPopupDate(null);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-[12px] border-2 border-border-light hover:border-amber-400 hover:bg-amber-50 transition-all group"
                >
                  <PartyPopper className="h-8 w-8 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-text-primary">Event</span>
                  <span className="text-[10px] text-text-tertiary">Special event</span>
                </button>
              </div>
              <button
                onClick={() => setAddPopupDate(null)}
                className="w-full text-xs text-text-tertiary hover:text-text-secondary text-center py-1 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ─────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-[16px] p-6 shadow-xl max-w-sm w-full space-y-4"
            >
              <h3 className="font-bold text-text-primary">Delete Schedule?</h3>
              <p className="text-sm text-text-secondary">
                This will permanently remove the course schedule. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => doDelete(deleteTarget)}
                  disabled={deleting}
                  loading={deleting}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Week View ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function WeekView({
  weekDates,
  byDate,
  today,
  isLoading,
  onDelete,
  onAddClick,
  onEditClick,
}: {
  weekDates: Date[];
  byDate: Map<string, CourseSchedule[]>;
  today: string;
  isLoading: boolean;
  onDelete: (name: string) => void;
  onAddClick: (date: string) => void;
  onEditClick: (name: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {weekDates.map((date, dayIdx) => {
        const dateStr = toISODate(date);
        const sessions = byDate.get(dateStr) ?? [];
        const isToday = dateStr === today;

        return (
          <motion.div
            key={dateStr}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIdx * 0.04 }}
          >
            <Card className={isToday ? "ring-1 ring-primary/40" : ""}>
              <CardContent className="p-0">
                <div
                  className={`flex items-center justify-between px-4 py-2.5 border-b border-border-light rounded-t-[inherit] ${
                    isToday ? "bg-primary/5" : "bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-text-primary"}`}>
                      {DAY_LABELS[dayIdx]}
                    </span>
                    <span className={`text-sm ${isToday ? "text-primary font-bold" : "text-text-secondary"}`}>
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border-0">
                        Today
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {sessions.length > 0
                      ? `${sessions.length} session${sessions.length > 1 ? "s" : ""}`
                      : "No sessions"}
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <button
                    onClick={() => onAddClick(dateStr)}
                    className="px-4 py-6 text-xs text-text-tertiary text-center w-full hover:bg-surface-secondary hover:text-primary transition-colors group/add flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-5 w-5 opacity-0 group-hover/add:opacity-100 transition-opacity text-primary" />
                    <span>Click to add a class or event</span>
                  </button>
                ) : (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <AnimatePresence>
                      {sessions.map((s) => (
                        <ScheduleCard key={s.name} schedule={s} onDelete={onDelete} onEdit={onEditClick} />
                      ))}
                    </AnimatePresence>
                    {/* Add more button */}
                    <button
                      onClick={() => onAddClick(dateStr)}
                      className="rounded-[10px] border-2 border-dashed border-border-light hover:border-primary hover:bg-primary/5 p-3 flex items-center justify-center gap-1.5 text-xs text-text-tertiary hover:text-primary transition-all min-h-[60px] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
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
  calDates,
  byDate,
  calMonth,
  today,
  isLoading,
  selectedDate,
  onSelectDate,
  onDelete,
  onAddClick,
  onEditClick,
}: {
  calDates: Date[];
  byDate: Map<string, CourseSchedule[]>;
  calMonth: number;
  today: string;
  isLoading: boolean;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
  onDelete: (name: string) => void;
  onAddClick: (date: string) => void;
  onEditClick: (name: string) => void;
}) {
  const selectedSessions = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-[8px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calDates.map((date) => {
              const dateStr = toISODate(date);
              const sessions = byDate.get(dateStr) ?? [];
              const isCurrentMonth = date.getMonth() === calMonth;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasSchedules = sessions.length > 0;

              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  className={`
                    relative min-h-[72px] sm:min-h-[84px] rounded-[8px] p-1.5 text-left transition-all border
                    ${isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : isToday
                        ? "border-primary/40 bg-primary/[0.03]"
                        : hasSchedules
                          ? "border-transparent hover:bg-surface-secondary hover:border-border-light"
                          : "border-transparent hover:bg-surface-secondary"
                    }
                    ${!isCurrentMonth ? "opacity-40" : ""}
                  `}
                >
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-primary text-white"
                        : isSelected
                          ? "text-primary font-bold"
                          : "text-text-secondary"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {hasSchedules && (
                    <div className="mt-0.5 space-y-0.5">
                      {sessions.slice(0, 3).map((s) => {
                        const isEvent = !!s.custom_event_type;
                        const cls = isEvent
                          ? "bg-amber-100 text-amber-800"
                          : COLOR_BG_LIGHT[s.class_schedule_color ?? ""] ?? "bg-blue-50 text-blue-700";
                        const displayName = isEvent
                          ? s.custom_event_title || s.custom_event_type || "Event"
                          : s.course;
                        return (
                          <div
                            key={s.name}
                            className={`${cls} rounded px-1 py-[2px] text-[9px] sm:text-[10px] font-medium leading-tight`}
                            title={isEvent
                              ? `${s.custom_event_type}: ${s.custom_event_title || ""} • ${formatTime(s.from_time)} – ${formatTime(s.to_time)}`
                              : `${s.course} • ${s.instructor_name} • ${formatTime(s.from_time)} – ${formatTime(s.to_time)}`
                            }
                          >
                            <div className="hidden sm:flex sm:items-center sm:gap-1 truncate">
                              <span className="font-semibold truncate">{displayName}</span>
                              {!isEvent && s.instructor_name && (
                                <>
                                  <span className="opacity-60">·</span>
                                  <span className="truncate opacity-80">{s.instructor_name}</span>
                                </>
                              )}
                            </div>
                            <div className="hidden sm:block text-[8px] opacity-70 leading-none mt-[1px]">
                              {formatTime(s.from_time)} – {formatTime(s.to_time)}
                            </div>
                            <span className="sm:hidden truncate block">
                              {displayName.length > 10 ? displayName.slice(0, 10) + "…" : displayName}
                            </span>
                          </div>
                        );
                      })}
                      {sessions.length > 3 && (
                        <div className="text-[9px] text-text-tertiary font-medium pl-1">
                          +{sessions.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date detail panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="ring-1 ring-primary/20">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-primary/5 rounded-t-[inherit]">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-text-primary">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedSessions.length} session{selectedSessions.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <button
                    onClick={() => onSelectDate(null)}
                    className="p-1.5 rounded-[8px] hover:bg-surface-secondary text-text-tertiary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {selectedSessions.length === 0 ? (
                  <button
                    onClick={() => { onAddClick(selectedDate!); }}
                    className="px-4 py-8 text-center text-sm text-text-tertiary hover:text-primary hover:bg-surface-secondary transition-colors w-full cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    No sessions — click to add a class or event
                  </button>
                ) : (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedSessions.map((s) => (
                      <ScheduleCard key={s.name} schedule={s} onDelete={onDelete} onEdit={onEditClick} />
                    ))}
                    <button
                      onClick={() => onAddClick(selectedDate!)}
                      className="rounded-[10px] border-2 border-dashed border-border-light hover:border-primary hover:bg-primary/5 p-3 flex items-center justify-center gap-1.5 text-xs text-text-tertiary hover:text-primary transition-all min-h-[60px] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Schedule Card ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ScheduleCard({
  schedule: s,
  onDelete,
  onEdit,
}: {
  schedule: CourseSchedule;
  onDelete: (name: string) => void;
  onEdit: (name: string) => void;
}) {
  const isEvent = !!s.custom_event_type;
  const borderCls = isEvent
    ? "border-l-amber-400"
    : COLOR_BORDER[s.class_schedule_color ?? ""] ?? "border-l-primary";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div
        onClick={() => onEdit(s.name)}
        className={`relative rounded-[10px] border border-border-light border-l-4 ${borderCls} ${isEvent ? "bg-amber-50/50" : "bg-surface"} p-3 space-y-1.5 hover:shadow-card-hover transition-shadow group cursor-pointer`}
        style={!isEvent && s.color ? { backgroundColor: s.color + "33" } : undefined}
      >
        {/* Event badge */}
        {isEvent && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full mb-0.5">
            {s.custom_event_type}
          </span>
        )}

        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {isEvent ? (
              <PartyPopper className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            ) : (
              <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-text-primary truncate">
              {isEvent
                ? s.custom_event_title || s.custom_event_type
                : s.custom_topic || s.course}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(s.name); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-primary"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.name); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-error/10 text-error"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!isEvent && s.custom_topic && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <FileText className="h-3 w-3 text-text-tertiary" />
            <span className="truncate">{s.course}</span>
            {s.custom_topic_covered ? (
              <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
            ) : null}
          </div>
        )}

        {isEvent && s.course && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <BookOpen className="h-3 w-3 text-text-tertiary" />
            <span className="truncate">{s.course}</span>
          </div>
        )}

        {s.instructor_name && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <GraduationCap className="h-3 w-3 text-text-tertiary" />
            <span className="truncate font-medium">{s.instructor_name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="h-3 w-3 text-text-tertiary" />
          <span>{formatTime(s.from_time)} – {formatTime(s.to_time)}</span>
        </div>

        {s.student_group && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Users className="h-3 w-3 text-text-tertiary" />
            <span className="truncate">{s.student_group}</span>
          </div>
        )}

        {s.room && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="h-3 w-3 text-text-tertiary" />
            <span className="truncate">{s.room}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
