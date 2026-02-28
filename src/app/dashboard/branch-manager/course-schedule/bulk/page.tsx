"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  BookOpen,
  Users,
  GraduationCap,
  MapPin,
  Clock,
  ArrowLeft,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getStudentGroups,
  getProgramCourses,
  getRooms,
  bulkCreateCourseSchedules,
  type BulkScheduleResult,
} from "@/lib/api/courseSchedule";
import { getInstructors } from "@/lib/api/employees";

// ── Day toggles ──────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { key: 0, label: "Sun", short: "S" },
  { key: 1, label: "Mon", short: "M" },
  { key: 2, label: "Tue", short: "T" },
  { key: 3, label: "Wed", short: "W" },
  { key: 4, label: "Thu", short: "T" },
  { key: 5, label: "Fri", short: "F" },
  { key: 6, label: "Sat", short: "S" },
];

// ── Shared classes ───────────────────────────────────────────────────────────

const selectCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50";

const inputCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

function Field({
  label,
  icon: Icon,
  required,
  children,
  error,
}: {
  label: string;
  icon: React.ElementType;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
        <Icon className="h-3.5 w-3.5 text-text-tertiary" />
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

// ── Date range helpers ───────────────────────────────────────────────────────

function getMatchingDates(
  from: string,
  to: string,
  selectedDays: Set<number>,
): string[] {
  if (!from || !to || selectedDays.size === 0) return [];
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    if (selectedDays.has(cur.getDay())) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Phase = "form" | "running" | "done";

export default function BulkSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [form, setForm] = useState({
    student_group: "",
    course: "",
    instructor: "",
    room: "",
    from_time: "09:00",
    to_time: "10:30",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Progress state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BulkScheduleResult | null>(null);

  // ── Lookups ────────────────────────────────────────────────────────────────
  const { data: groupRes } = useQuery({
    queryKey: ["student-groups", branch],
    queryFn: () => getStudentGroups({ branch: branch || undefined }),
    staleTime: 5 * 60_000,
  });
  const groups = groupRes?.data ?? [];

  const selectedGroupProgram = useMemo(() => {
    if (!form.student_group) return "";
    return groups.find((g) => g.name === form.student_group)?.program ?? "";
  }, [form.student_group, groups]);

  const { data: programCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ["program-courses", selectedGroupProgram],
    queryFn: () => getProgramCourses(selectedGroupProgram),
    enabled: !!selectedGroupProgram,
    staleTime: 10 * 60_000,
  });
  const courses = programCourses ?? [];

  const { data: instrRes } = useQuery({
    queryKey: ["instructors-all"],
    queryFn: () => getInstructors({ limit_page_length: 500 }),
    staleTime: 5 * 60_000,
  });
  const instructors = instrRes?.data ?? [];

  const { data: roomRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
    staleTime: 10 * 60_000,
  });
  const rooms = roomRes?.data ?? [];

  // ── Computed dates ─────────────────────────────────────────────────────────
  const matchingDates = useMemo(
    () => getMatchingDates(fromDate, toDate, selectedDays),
    [fromDate, toDate, selectedDays],
  );

  // ── Toggle day ─────────────────────────────────────────────────────────────
  const toggleDay = useCallback((day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, student_group: e.target.value, course: "" }));
    setErrors((prev) => ({ ...prev, student_group: "", course: "" }));
  };

  // ── Validate & submit ──────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.student_group) e.student_group = "Required";
    if (!form.course) e.course = "Required";
    if (!form.instructor) e.instructor = "Required";
    if (!form.room) e.room = "Required";
    if (!fromDate) e.fromDate = "Required";
    if (!toDate) e.toDate = "Required";
    if (fromDate && toDate && fromDate > toDate) e.toDate = "Must be after start date";
    if (form.from_time && form.to_time && form.from_time >= form.to_time)
      e.to_time = "End time must be after start time";
    if (selectedDays.size === 0) e.days = "Select at least one day";
    if (matchingDates.length === 0) e.days = "No dates match the selected days in this range";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setPhase("running");
    setProgress({ done: 0, total: matchingDates.length });

    const res = await bulkCreateCourseSchedules(
      {
        student_group: form.student_group,
        course: form.course,
        instructor: form.instructor,
        room: form.room || undefined,
        from_time: form.from_time + ":00",
        to_time: form.to_time + ":00",
        custom_branch: branch || undefined,
        dates: matchingDates,
      },
      (done, total) => setProgress({ done, total }),
    );

    setResult(res);
    setPhase("done");
  };

  const handleReset = () => {
    setPhase("form");
    setResult(null);
    setProgress({ done: 0, total: 0 });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/branch-manager/course-schedule">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Bulk Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Create recurring schedules across multiple days at once
          </p>
        </div>
      </div>

      {/* ── Running / Done ──────────────────────────────────────────────── */}
      {phase !== "form" && (
        <AnimatePresence mode="wait">
          {phase === "running" && (
            <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-text-primary">
                        Creating schedules…
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        {progress.done} of {progress.total} completed
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-md h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: progress.total > 0
                            ? `${(progress.done / progress.total) * 100}%`
                            : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Summary */}
                  <div className="flex items-start gap-4">
                    {result.failed.length === 0 ? (
                      <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0 mt-0.5" />
                    ) : result.created === 0 ? (
                      <XCircle className="h-8 w-8 text-error flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-warning flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">
                        {result.failed.length === 0
                          ? "All schedules created!"
                          : result.created === 0
                            ? "Failed to create schedules"
                            : `${result.created} of ${result.total} created`}
                      </h2>
                      <p className="text-sm text-text-secondary mt-1">
                        {result.created} created · {result.failed.length} failed · {result.total} total
                      </p>
                    </div>
                  </div>

                  {/* Failed list */}
                  {result.failed.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">
                        Failed dates
                      </h3>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {result.failed.map((f) => (
                          <div
                            key={f.date}
                            className="flex items-start gap-2 text-sm bg-error/5 border border-error/10 rounded-[8px] p-2"
                          >
                            <XCircle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-text-primary">
                                {new Date(f.date + "T00:00:00").toLocaleDateString("en-IN", {
                                  weekday: "short", day: "numeric", month: "short",
                                })}
                              </span>
                              <span className="text-text-secondary ml-2">{f.error}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href="/dashboard/branch-manager/course-schedule">
                      <Button>View Schedules</Button>
                    </Link>
                    <Button variant="outline" onClick={handleReset}>
                      Create More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Form ────────────────────────────────────────────────────────── */}
      {phase === "form" && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main fields */}
            <div className="lg:col-span-2 space-y-5">
              {/* Day toggles */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Repeat on Days
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((wd) => {
                      const active = selectedDays.has(wd.key);
                      return (
                        <button
                          key={wd.key}
                          type="button"
                          onClick={() => toggleDay(wd.key)}
                          className={`
                            flex items-center justify-center w-12 h-12 rounded-[12px] text-sm font-semibold
                            transition-all border-2
                            ${active
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-surface text-text-secondary border-border-light hover:border-primary/40 hover:text-primary"
                            }
                          `}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.days && <p className="text-xs text-error">{errors.days}</p>}

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set([1, 2, 3, 4, 5]))}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set([0, 6]))}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Weekend
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set([1]))}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Mon only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set([6]))}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Sat only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays(new Set())}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-surface-secondary text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Date Range */}
              <Card>
                <CardContent className="p-5 space-y-5">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Date Range
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Start Date" icon={CalendarDays} required error={errors.fromDate}>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={`${inputCls} ${errors.fromDate ? "border-error" : ""}`}
                      />
                    </Field>
                    <Field label="End Date" icon={CalendarDays} required error={errors.toDate}>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className={`${inputCls} ${errors.toDate ? "border-error" : ""}`}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Session Details */}
              <Card>
                <CardContent className="p-5 space-y-5">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Session Details
                  </h2>

                  <Field label="Student Group" icon={Users} required error={errors.student_group}>
                    <select
                      value={form.student_group}
                      onChange={handleGroupChange}
                      className={`${selectCls} ${errors.student_group ? "border-error" : ""}`}
                    >
                      <option value="">Select a group…</option>
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.student_group_name}
                          {g.program ? ` — ${g.program}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Course / Subject" icon={BookOpen} required error={errors.course}>
                    <select
                      value={form.course}
                      onChange={set("course")}
                      disabled={!form.student_group || coursesLoading}
                      className={`${selectCls} ${errors.course ? "border-error" : ""}`}
                    >
                      <option value="">
                        {!form.student_group
                          ? "Select a group first…"
                          : coursesLoading
                            ? "Loading courses…"
                            : courses.length === 0
                              ? "No courses found for this program"
                              : "Select a course…"}
                      </option>
                      {courses.map((c) => (
                        <option key={c.course} value={c.course}>
                          {c.course_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Instructor" icon={GraduationCap} required error={errors.instructor}>
                    <select
                      value={form.instructor}
                      onChange={set("instructor")}
                      className={`${selectCls} ${errors.instructor ? "border-error" : ""}`}
                    >
                      <option value="">Select an instructor…</option>
                      {instructors.map((i) => (
                        <option key={i.name} value={i.name}>
                          {i.instructor_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Room" icon={MapPin} required error={errors.room}>
                    <select
                      value={form.room}
                      onChange={set("room")}
                      className={`${selectCls} ${errors.room ? "border-error" : ""}`}
                    >
                      <option value="">Select a room…</option>
                      {rooms.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.room_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="From Time" icon={Clock} required error={errors.from_time}>
                      <input
                        type="time"
                        value={form.from_time}
                        onChange={set("from_time")}
                        className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                      />
                    </Field>
                    <Field label="To Time" icon={Clock} required error={errors.to_time}>
                      <input
                        type="time"
                        value={form.to_time}
                        onChange={set("to_time")}
                        className={`${inputCls} ${errors.to_time ? "border-error" : ""}`}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar — preview + submit */}
            <div className="space-y-5">
              {/* Date preview */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Schedule Preview
                  </h2>

                  {matchingDates.length === 0 ? (
                    <p className="text-sm text-text-tertiary">
                      Select days and a date range to see matching dates.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-primary/10 text-primary border-0">
                          {matchingDates.length} date{matchingDates.length !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-text-tertiary">
                          will be created
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {matchingDates.map((d) => (
                          <div
                            key={d}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] bg-surface-secondary text-xs"
                          >
                            <CalendarDays className="h-3 w-3 text-text-tertiary" />
                            <span className="text-text-primary font-medium">
                              {new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Session summary */}
              {(form.course || form.instructor) && (
                <Card>
                  <CardContent className="p-5 space-y-2">
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                      Session Summary
                    </h2>
                    <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5">
                      {form.course && (
                        <p className="font-semibold text-sm text-text-primary">{form.course}</p>
                      )}
                      {form.instructor && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {instructors.find((i) => i.name === form.instructor)?.instructor_name ?? form.instructor}
                        </p>
                      )}
                      {form.from_time && form.to_time && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {form.from_time} – {form.to_time}
                        </p>
                      )}
                      {form.student_group && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {groups.find((g) => g.name === form.student_group)?.student_group_name ?? form.student_group}
                        </p>
                      )}
                      {form.room && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rooms.find((r) => r.name === form.room)?.room_name ?? form.room}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2"
                disabled={matchingDates.length === 0}
              >
                <Layers className="h-4 w-4" />
                Create {matchingDates.length} Schedule{matchingDates.length !== 1 ? "s" : ""}
              </Button>
              <Link href="/dashboard/branch-manager/course-schedule" className="block">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
