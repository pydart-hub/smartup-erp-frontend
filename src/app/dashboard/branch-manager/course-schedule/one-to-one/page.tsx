"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Users,
  XCircle,
  Calendar,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { createCourseSchedule, getStudentGroups } from "@/lib/api/courseSchedule";

const selectCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50";

const inputCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

const WEEKDAYS = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];

type Phase = "setup" | "labels" | "running" | "done";

type SessionLabelRow = {
  date: string;
  label: string;
};

function formatLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function getMatchingDates(from: string, to: string, selectedDays: Set<number>): string[] {
  if (!from || !to || selectedDays.size === 0) return [];
  const dates: string[] = [];
  const cur = parseLocalDateInput(from);
  const end = parseLocalDateInput(to);
  while (cur <= end) {
    if (selectedDays.has(cur.getDay())) {
      dates.push(formatLocalDateInput(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function OneToOneSchedulePage() {
  return (
    <React.Suspense>
      <OneToOneScheduleContent />
    </React.Suspense>
  );
}

function OneToOneScheduleContent() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const searchParams = useSearchParams();
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const preselectedGroup = searchParams.get("group") ?? "";

  const [phase, setPhase] = useState<Phase>("setup");
  const [scheduleMode, setScheduleMode] = useState<"bulk" | "single">("bulk");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return formatLocalDateInput(d);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatLocalDateInput(d);
  });

  const [singleDate, setSingleDate] = useState(() => formatLocalDateInput(new Date()));
  const [singleLabel, setSingleLabel] = useState("");

  const [setup, setSetup] = useState({
    student_group: preselectedGroup,
    from_time: "09:00",
    to_time: "10:30",
  });

  const [sessionRows, setSessionRows] = useState<SessionLabelRow[]>([]);
  const [globalLabel, setGlobalLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ total: number; created: number; failed: { date: string; error: string }[] } | null>(null);

  const { data: groupRes } = useQuery({
    queryKey: ["o2o-student-groups", branch],
    queryFn: () =>
      getStudentGroups({
        branch: branch || undefined,
        oneToOneOnly: true,
        includeName: preselectedGroup || undefined,
      }),
    staleTime: 5 * 60_000,
  });
  const allGroups = groupRes?.data ?? [];
  const groups = preselectedGroup
    ? allGroups.filter((group) => group.name === preselectedGroup)
    : allGroups;

  const matchingDates = useMemo(
    () => getMatchingDates(fromDate, toDate, selectedDays),
    [fromDate, toDate, selectedDays],
  );

  const selectedGroupLabel = useMemo(() => {
    const g = groups.find((x) => x.name === setup.student_group);
    return g?.student_group_name ?? setup.student_group;
  }, [groups, setup.student_group]);

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
    setErrors((prev) => ({ ...prev, days: "" }));
  }

  function setField(field: keyof typeof setup, value: string) {
    setSetup((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validateSetup(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!fromDate) e.fromDate = "Required";
    if (!toDate) e.toDate = "Required";
    if (fromDate && toDate && fromDate > toDate) e.toDate = "Must be after start date";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start time";
    if (selectedDays.size === 0) e.days = "Select at least one day";
    if (matchingDates.length === 0) e.days = "No dates match selected days in this range";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToLabels() {
    if (!validateSetup()) return;
    setSessionRows(matchingDates.map((date) => ({ date, label: "" })));
    setPhase("labels");
  }

  function validateSingle(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!singleDate) e.singleDate = "Required";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function createSingle() {
    if (!validateSingle()) return;
    const rows = [{ date: singleDate, label: singleLabel }];
    setSessionRows(rows);
    void createSchedules(rows);
  }

  function setRowLabel(index: number, label: string) {
    setSessionRows((prev) => prev.map((row, i) => (i === index ? { ...row, label } : row)));
  }

  function fillAllLabels() {
    setSessionRows((prev) => prev.map((row) => ({ ...row, label: globalLabel })));
  }

  async function createSchedules(rowsOverride?: SessionLabelRow[]) {
    const rows = rowsOverride ?? sessionRows;
    setPhase("running");
    setProgress({ done: 0, total: rows.length });

    const out = { total: rows.length, created: 0, failed: [] as { date: string; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await createCourseSchedule({
          student_group: setup.student_group,
          schedule_date: row.date,
          from_time: setup.from_time + ":00",
          to_time: setup.to_time + ":00",
          custom_branch: branch || undefined,
          custom_event_title: row.label.trim() || undefined,
        });
        out.created += 1;
      } catch (err: unknown) {
        const resp = (err as { response?: { data?: { exception?: string } } })?.response?.data;
        const msg = resp?.exception ? String(resp.exception) : "Failed to create schedule";
        out.failed.push({ date: row.date, error: msg.slice(0, 140) });
      }
      setProgress({ done: i + 1, total: rows.length });
    }

    setResult(out);
    setPhase("done");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/branch-manager/course-schedule">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            One-to-One Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {scheduleMode === "bulk"
              ? "Step 1: assign dates and time · Step 2: add subject labels manually"
              : "Pick a single date and create one session instantly"}
          </p>
        </div>
      </div>

      {phase === "setup" && (
        <div className="flex gap-2 p-1 rounded-[12px] bg-surface border border-border-light w-fit">
          <button
            type="button"
            onClick={() => { setScheduleMode("bulk"); setErrors({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
              scheduleMode === "bulk"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Layers className="h-4 w-4" />
            Bulk Schedule
          </button>
          <button
            type="button"
            onClick={() => { setScheduleMode("single"); setErrors({}); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
              scheduleMode === "single"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Single Schedule
          </button>
        </div>
      )}

      {phase === "setup" && scheduleMode === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Single Session Setup
                </h2>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Student Group *</label>
                  <select
                    className={`${selectCls} ${errors.student_group ? "border-error" : ""}`}
                    value={setup.student_group}
                    onChange={(e) => setField("student_group", e.target.value)}
                  >
                    <option value="">Select one-to-one group...</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` - ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.student_group && <p className="text-xs text-error">{errors.student_group}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">From Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                      value={setup.from_time}
                      onChange={(e) => setField("from_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">To Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.to_time ? "border-error" : ""}`}
                      value={setup.to_time}
                      onChange={(e) => setField("to_time", e.target.value)}
                    />
                    {errors.to_time && <p className="text-xs text-error">{errors.to_time}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Date *</label>
                  <input
                    type="date"
                    className={`${inputCls} ${errors.singleDate ? "border-error" : ""}`}
                    value={singleDate}
                    onChange={(e) => { setSingleDate(e.target.value); setErrors((prev) => ({ ...prev, singleDate: "" })); }}
                  />
                  {errors.singleDate && <p className="text-xs text-error">{errors.singleDate}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Subject Label</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Physics, Maths (optional)"
                    value={singleLabel}
                    onChange={(e) => setSingleLabel(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">Preview</h2>
                <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5 text-xs">
                  <p className="text-text-secondary flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroupLabel || "No group selected"}
                  </p>
                  <p className="text-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {setup.from_time} - {setup.to_time}
                  </p>
                  {singleDate && (
                    <p className="text-text-secondary flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {parseLocalDateInput(singleDate).toLocaleDateString("en-IN", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  )}
                  {singleLabel && (
                    <p className="text-primary font-medium">{singleLabel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary/10 text-primary border-0">1 session</Badge>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={createSingle}>
              Create Schedule
            </Button>
          </div>
        </div>
      )}

      {phase === "setup" && scheduleMode === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  One-to-One Setup
                </h2>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Student Group *</label>
                  <select
                    className={`${selectCls} ${errors.student_group ? "border-error" : ""}`}
                    value={setup.student_group}
                    onChange={(e) => setField("student_group", e.target.value)}
                  >
                    <option value="">Select one-to-one group...</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` - ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.student_group && <p className="text-xs text-error">{errors.student_group}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">From Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                      value={setup.from_time}
                      onChange={(e) => setField("from_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">To Time *</label>
                    <input
                      type="time"
                      className={`${inputCls} ${errors.to_time ? "border-error" : ""}`}
                      value={setup.to_time}
                      onChange={(e) => setField("to_time", e.target.value)}
                    />
                    {errors.to_time && <p className="text-xs text-error">{errors.to_time}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-text-primary">Repeat on Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((wd) => {
                      const active = selectedDays.has(wd.key);
                      return (
                        <button
                          key={wd.key}
                          type="button"
                          onClick={() => toggleDay(wd.key)}
                          className={`flex items-center justify-center w-12 h-12 rounded-[12px] text-sm font-semibold transition-all border-2 ${
                            active
                              ? "bg-primary text-white border-primary"
                              : "bg-surface text-text-secondary border-border-light hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.days && <p className="text-xs text-error">{errors.days}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Start Date *</label>
                    <input
                      type="date"
                      className={`${inputCls} ${errors.fromDate ? "border-error" : ""}`}
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    {errors.fromDate && <p className="text-xs text-error">{errors.fromDate}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">End Date *</label>
                    <input
                      type="date"
                      className={`${inputCls} ${errors.toDate ? "border-error" : ""}`}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                    {errors.toDate && <p className="text-xs text-error">{errors.toDate}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">Preview</h2>

                <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5 text-xs">
                  <p className="text-text-secondary flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroupLabel || "No group selected"}
                  </p>
                  <p className="text-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {setup.from_time} - {setup.to_time}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary/10 text-primary border-0">
                    {matchingDates.length} date{matchingDates.length !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-xs text-text-tertiary">generated</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {matchingDates.map((d) => (
                    <div key={d} className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] bg-surface-secondary text-xs">
                      <CalendarDays className="h-3 w-3 text-text-tertiary" />
                      <span className="text-text-primary font-medium">
                        {parseLocalDateInput(d).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={goToLabels}>
              Next: Add Subject Labels
            </Button>
          </div>
        </div>
      )}

      {phase === "labels" && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                Step 2: Subject Labels (manual)
              </h2>
              <Badge variant="default" className="bg-primary/10 text-primary border-0">
                {sessionRows.length} sessions
              </Badge>
            </div>

            <div className="rounded-[10px] border border-primary/15 bg-primary/5 p-3 text-sm text-text-secondary">
              Billing is not created from this schedule page. One-to-One billing is generated later from the student page based on unbilled schedules.
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={globalLabel}
                onChange={(e) => setGlobalLabel(e.target.value)}
                className={inputCls}
                placeholder="Type a subject label (e.g. Physics)"
              />
              <Button variant="outline" onClick={fillAllLabels}>
                Fill All
              </Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-[10px] border border-border-light">
              {sessionRows.map((row, idx) => (
                <div key={row.date} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 p-3 border-b border-border-light last:border-b-0">
                  <div className="text-xs font-medium text-text-primary">
                    {parseLocalDateInput(row.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <input
                    value={row.label}
                    onChange={(e) => setRowLabel(idx, e.target.value)}
                    className={inputCls}
                    placeholder="Subject label (optional)"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("setup")}>Back</Button>
              <Button onClick={() => void createSchedules()}>Create {sessionRows.length} Schedules</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-text-primary">Creating schedules...</p>
                    <p className="text-sm text-text-secondary mt-1">{progress.done} of {progress.total} completed</p>
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
                <div className="flex items-start gap-4">
                  {result.failed.length === 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-8 w-8 text-error flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {result.failed.length === 0 ? "One-to-One schedules created" : `${result.created} of ${result.total} created`}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      {result.created} created · {result.failed.length} failed · {result.total} total
                    </p>
                  </div>
                </div>

                {result.failed.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.failed.map((f) => (
                      <div key={f.date} className="text-sm bg-error/5 border border-error/10 rounded-[8px] p-2">
                        <span className="font-medium">{f.date}</span>
                        <span className="text-text-secondary ml-2">{f.error}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-[10px] border border-primary/15 bg-primary/5 p-3 text-sm text-text-secondary">
                  Billing was not created here. Generate One-to-One billing later from the student page after reviewing unbilled schedules.
                </div>

                <div className="flex gap-2">
                  <Link href="/dashboard/branch-manager/course-schedule">
                    <Button>View Schedules</Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhase("setup");
                      setSessionRows([]);
                      setResult(null);
                      setProgress({ done: 0, total: 0 });
                      setSingleLabel("");
                    }}
                  >
                    Create More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
