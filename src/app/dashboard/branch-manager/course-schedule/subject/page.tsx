"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  XCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { createCourseSchedule, getStudentGroups } from "@/lib/api/courseSchedule";
import { getInstructorsWithCourses } from "@/lib/api/employees";
import { getProgramCourses, getRooms } from "@/lib/api/courseSchedule";

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

type Phase = "setup" | "running" | "done";
type SessionRow = { date: string; label: string };
type SetupState = {
  student_group: string;
  course: string;
  instructor: string;
  room: string;
  custom_topic: string;
  from_time: string;
  to_time: string;
};

const INITIAL_SETUP: SetupState = {
  student_group: "",
  course: "",
  instructor: "",
  room: "",
  custom_topic: "",
  from_time: "09:00",
  to_time: "10:30",
};

function getMatchingDates(from: string, to: string, days: Set<number>): string[] {
  if (!from || !to || days.size === 0) return [];
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    if (days.has(cur.getDay())) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function SubjectSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<"bulk" | "single">("bulk");

  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [setup, setSetup] = useState(INITIAL_SETUP);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    total: number;
    created: number;
    failed: { date: string; error: string }[];
  } | null>(null);

  // ── Data fetches ──────────────────────────────────────────────
  const { data: groupRes } = useQuery({
    queryKey: ["subject-groups", branch],
    queryFn: () => getStudentGroups({ branch: branch || undefined, subjectWiseOnly: true }),
    staleTime: 5 * 60_000,
  });
  const groups = useMemo(() => groupRes?.data ?? [], [groupRes?.data]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.name === setup.student_group),
    [groups, setup.student_group],
  );

  const { data: programCourses } = useQuery({
    queryKey: ["program-courses", selectedGroup?.program],
    queryFn: () => getProgramCourses(selectedGroup!.program),
    enabled: !!selectedGroup?.program,
    staleTime: 10 * 60_000,
  });
  const allCourses = useMemo(() => programCourses ?? [], [programCourses]);

  const { data: allInstructors } = useQuery({
    queryKey: ["instructors-with-courses", branch],
    queryFn: () => getInstructorsWithCourses(branch),
    enabled: !!branch,
    staleTime: 10 * 60_000,
  });

  const { data: roomsRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms(),
    staleTime: 10 * 60_000,
  });
  const rooms = useMemo(() => roomsRes?.data ?? [], [roomsRes?.data]);

  React.useEffect(() => {
    if (rooms.length === 0 || setup.room) return;
    const offlineRoom = rooms.find(
      (room) => room.room_name?.trim().toLowerCase() === "offline",
    );
    if (offlineRoom) {
      setSetup((prev) => ({ ...prev, room: offlineRoom.name }));
    }
  }, [rooms, setup.room]);

  // ── Computed ──────────────────────────────────────────────────
  const matchingDates = useMemo(
    () => getMatchingDates(fromDate, toDate, selectedDays),
    [fromDate, toDate, selectedDays],
  );

  // Filter instructors to those with courses at this branch/program
  const filteredInstructors = useMemo(() => {
    if (!allInstructors) return [];
    if (!selectedGroup?.program) return allInstructors;
    return allInstructors.filter((i) =>
      i.instructor_log.some(
        (log) =>
          log.custom_branch === branch &&
          log.program === selectedGroup.program,
      ),
    );
  }, [allInstructors, branch, selectedGroup]);

  // Map subject name → keywords to match against course names
  function subjectKeywords(subject: string): string[] {
    const s = subject.toLowerCase();
    if (s === "physics") return ["physics"];
    if (s === "chemistry") return ["chemistry"];
    if (s === "maths" || s === "mathematics") return ["math"];
    if (s === "phy-chem") return ["physics", "chemistry"];
    if (s === "phy-maths") return ["physics", "math"];
    if (s === "chem-maths") return ["chemistry", "math"];
    return [s];
  }

  // Filter courses by subject then by selected instructor
  const filteredCourses = useMemo(() => {
    const dedup = (list: typeof allCourses) => {
      const seen = new Set<string>();
      return list.filter((c) => {
        if (seen.has(c.course)) return false;
        seen.add(c.course);
        return true;
      });
    };

    let base = allCourses;

    // 1. Subject filter
    if (selectedGroup?.custom_subject) {
      const keywords = subjectKeywords(selectedGroup.custom_subject);
      base = base.filter((c) =>
        keywords.some((kw) => c.course.toLowerCase().includes(kw)),
      );
    }

    // 2. Instructor filter
    if (setup.instructor && allInstructors) {
      const instructor = allInstructors.find((i) => i.name === setup.instructor);
      if (instructor) {
        const assigned = new Set(
          instructor.instructor_log
            .filter((log) => log.custom_branch === branch && log.program === selectedGroup?.program && log.course)
            .map((log) => log.course!),
        );
        if (assigned.size > 0) base = base.filter((c) => assigned.has(c.course));
      }
    }

    return dedup(base);
  }, [setup.instructor, allInstructors, allCourses, branch, selectedGroup]);

  // Auto-select course when exactly one match for the subject
  React.useEffect(() => {
    if (filteredCourses.length === 1 && !setup.course) {
      setField("course", filteredCourses[0].course);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses]);

  // ── Handlers ──────────────────────────────────────────────────
  function setField(field: keyof typeof setup, value: string) {
    setSetup((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
    setErrors((prev) => ({ ...prev, days: "" }));
  }

  function validateBulk(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!fromDate) e.fromDate = "Required";
    if (!toDate) e.toDate = "Required";
    if (fromDate && toDate && fromDate > toDate) e.toDate = "Must be after start date";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start";
    if (selectedDays.size === 0) e.days = "Select at least one day";
    if (matchingDates.length === 0) e.days = "No dates match in this range";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSingle(): boolean {
    const e: Record<string, string> = {};
    if (!setup.student_group) e.student_group = "Required";
    if (!singleDate) e.singleDate = "Required";
    if (setup.from_time >= setup.to_time) e.to_time = "End time must be after start";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function runSchedule(rows: SessionRow[]) {
    setPhase("running");
    setProgress({ done: 0, total: rows.length });

    const out = {
      total: rows.length,
      created: 0,
      failed: [] as { date: string; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await createCourseSchedule({
          student_group: setup.student_group,
          schedule_date: row.date,
          from_time: setup.from_time + ":00",
          to_time: setup.to_time + ":00",
          custom_branch: branch || undefined,
          ...(setup.course ? { course: setup.course } : {}),
          ...(setup.instructor ? { instructor: setup.instructor } : {}),
          ...(setup.room ? { room: setup.room } : {}),
          ...(setup.custom_topic ? { custom_topic: setup.custom_topic } : {}),
        });
        out.created += 1;
      } catch (err: unknown) {
        const resp = (err as { response?: { data?: { exception?: string } } })?.response?.data;
        const msg = resp?.exception ? String(resp.exception) : "Failed";
        out.failed.push({ date: row.date, error: msg.slice(0, 120) });
      }
      setProgress({ done: i + 1, total: rows.length });
    }

    setResult(out);
    setPhase("done");
  }

  function handleBulk() {
    if (!validateBulk()) return;
    runSchedule(matchingDates.map((date) => ({ date, label: "" })));
  }

  function handleSingle() {
    if (!validateSingle()) return;
    runSchedule([{ date: singleDate, label: "" }]);
  }

  function reset() {
    setPhase("setup");
    setResult(null);
    setSetup(INITIAL_SETUP);
    setSelectedDays(new Set());
    setErrors({});
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/course-schedule">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              Subject-Wise Schedule
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Create sessions for subject-wise student groups
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Setup phase ── */}
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Mode tabs */}
            <div className="flex rounded-[10px] bg-surface-secondary p-0.5 border border-border-light w-fit mb-6">
              {(["bulk", "single"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setScheduleMode(m)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-medium transition-all capitalize ${
                    scheduleMode === m
                      ? "bg-surface shadow-sm text-primary"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {m === "bulk" ? <Layers className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                  {m === "bulk" ? "Bulk (Date Range)" : "Single Session"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Group + session info */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    Group & Session Details
                  </h2>

                  {/* Subject Group */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">
                      Subject Group <span className="text-error">*</span>
                    </label>
                    <select
                      className={selectCls}
                      value={setup.student_group}
                      onChange={(e) => {
                        setField("student_group", e.target.value);
                        setField("course", "");
                        setField("instructor", "");
                      }}
                    >
                      <option value="">Select a subject group...</option>
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.student_group_name} {g.custom_subject ? `— ${g.custom_subject}` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedGroup && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="info" className="text-[10px]">{selectedGroup.custom_subject}</Badge>
                        <span className="text-[11px] text-text-tertiary">{selectedGroup.program}</span>
                      </div>
                    )}
                    {errors.student_group && <p className="text-xs text-error">{errors.student_group}</p>}
                  </div>

                  {/* Course */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Course</label>
                    <select
                      className={selectCls}
                      value={setup.course}
                      onChange={(e) => setField("course", e.target.value)}
                      disabled={!selectedGroup}
                    >
                      <option value="">Select course (optional)</option>
                      {filteredCourses.map((c) => (
                        <option key={c.course} value={c.course}>{c.course}</option>
                      ))}
                    </select>
                  </div>

                  {/* Topic */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Topic</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. Chapter 3 – Wave Optics"
                      value={setup.custom_topic}
                      onChange={(e) => setField("custom_topic", e.target.value)}
                    />
                  </div>

                  {/* Instructor */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Instructor</label>
                    <select
                      className={selectCls}
                      value={setup.instructor}
                      onChange={(e) => setField("instructor", e.target.value)}
                      disabled={!selectedGroup}
                    >
                      <option value="">Select instructor (optional)</option>
                      {filteredInstructors.map((i) => (
                        <option key={i.name} value={i.name}>{i.instructor_name ?? i.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Room */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Room</label>
                    <select
                      className={selectCls}
                      value={setup.room}
                      onChange={(e) => setField("room", e.target.value)}
                    >
                      <option value="">Select room (optional)</option>
                      {rooms.map((r) => (
                        <option key={r.name} value={r.name}>{r.room_name ?? r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-text-tertiary" /> From
                      </label>
                      <input
                        type="time"
                        className={inputCls}
                        value={setup.from_time}
                        onChange={(e) => setField("from_time", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-text-tertiary" /> To
                      </label>
                      <input
                        type="time"
                        className={inputCls}
                        value={setup.to_time}
                        onChange={(e) => setField("to_time", e.target.value)}
                      />
                      {errors.to_time && <p className="text-xs text-error">{errors.to_time}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right: Date selection */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h2 className="font-semibold text-text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    {scheduleMode === "bulk" ? "Date Range & Days" : "Session Date"}
                  </h2>

                  {scheduleMode === "single" ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary">Date <span className="text-error">*</span></label>
                      <input
                        type="date"
                        className={inputCls}
                        value={singleDate}
                        onChange={(e) => { setSingleDate(e.target.value); setErrors((p) => ({ ...p, singleDate: "" })); }}
                      />
                      {errors.singleDate && <p className="text-xs text-error">{errors.singleDate}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text-primary">From Date <span className="text-error">*</span></label>
                          <input
                            type="date"
                            className={inputCls}
                            value={fromDate}
                            onChange={(e) => { setFromDate(e.target.value); setErrors((p) => ({ ...p, fromDate: "" })); }}
                          />
                          {errors.fromDate && <p className="text-xs text-error">{errors.fromDate}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text-primary">To Date <span className="text-error">*</span></label>
                          <input
                            type="date"
                            className={inputCls}
                            value={toDate}
                            onChange={(e) => { setToDate(e.target.value); setErrors((p) => ({ ...p, toDate: "" })); }}
                          />
                          {errors.toDate && <p className="text-xs text-error">{errors.toDate}</p>}
                        </div>
                      </div>

                      {/* Day picker */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Days of Week <span className="text-error">*</span></label>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleDay(key)}
                              className={`w-12 h-10 rounded-[8px] text-xs font-medium border transition-all ${
                                selectedDays.has(key)
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-surface border-border-input text-text-secondary hover:border-indigo-400"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {errors.days && <p className="text-xs text-error">{errors.days}</p>}
                      </div>

                      {/* Preview count + date list */}
                      {matchingDates.length > 0 && (
                        <div className="rounded-[10px] bg-indigo-50 border border-indigo-100 p-3 space-y-2">
                          <p className="text-sm font-medium text-indigo-700">
                            {matchingDates.length} session{matchingDates.length !== 1 ? "s" : ""} will be created
                          </p>
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                            {matchingDates.map((d) => {
                              const dt = new Date(d + "T00:00:00");
                              return (
                                <div key={d} className="flex items-center gap-2">
                                  <span className="w-8 text-[11px] font-semibold text-indigo-500 uppercase">
                                    {dt.toLocaleDateString("en-US", { weekday: "short" })}
                                  </span>
                                  <span className="text-xs text-indigo-700">
                                    {dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Submit */}
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={scheduleMode === "bulk" ? handleBulk : handleSingle}
                  >
                    <BookOpen className="h-4 w-4" />
                    {scheduleMode === "bulk"
                      ? (matchingDates.length > 0 ? `Create ${matchingDates.length} Session${matchingDates.length !== 1 ? "s" : ""}` : "Create Sessions")
                      : "Create Session"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Running phase ── */}
        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
              <p className="text-text-primary font-medium">
                Creating sessions… {progress.done} / {progress.total}
              </p>
              <div className="w-64 h-2 bg-surface-secondary rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Done phase ── */}
        {phase === "done" && result && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-8 space-y-6 text-center">
                {result.created > 0 ? (
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
                ) : (
                  <XCircle className="h-12 w-12 text-error mx-auto" />
                )}

                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {result.created} session{result.created !== 1 ? "s" : ""} created
                  </h2>
                  {result.failed.length > 0 && (
                    <p className="text-sm text-error mt-1">{result.failed.length} failed</p>
                  )}
                </div>

                {result.failed.length > 0 && (
                  <div className="text-left rounded-[10px] border border-error/20 bg-error-light p-4 space-y-1 max-h-48 overflow-y-auto">
                    {result.failed.map((f) => (
                      <p key={f.date} className="text-xs text-error">
                        <span className="font-mono">{f.date}</span> — {f.error}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={reset}>
                    Schedule More
                  </Button>
                  <Link href="/dashboard/branch-manager/course-schedule">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      View Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
