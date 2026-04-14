"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  Users,
  GraduationCap,
  MapPin,
  Clock,
  Save,
  ArrowLeft,
  RefreshCw,
  FileText,
  PartyPopper,
  Type,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getCourseSchedule,
  updateCourseSchedule,
  getStudentGroups,
  getProgramCourses,
  getRooms,
  getProgramTopics,
  type CourseSchedule,
} from "@/lib/api/courseSchedule";
import { getInstructors } from "@/lib/api/employees";

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  "Revision Class",
  "Induction Program",
  "Parent Meeting",
  "Special Class",
  "Other",
] as const;

// ── Field wrapper ─────────────────────────────────────────────────────────────

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

const selectCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50";

const inputCls =
  "w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EditSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const scheduleName = decodeURIComponent(params.name as string);
  const branch =
    defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  // ── Load existing schedule ─────────────────────────────────────────────────
  const {
    data: scheduleRes,
    isLoading: loadingSchedule,
    isError,
  } = useQuery({
    queryKey: ["schedule-detail", scheduleName],
    queryFn: () => getCourseSchedule(scheduleName),
    enabled: !!scheduleName,
    staleTime: 30_000,
  });
  const schedule = scheduleRes?.data as CourseSchedule | undefined;
  const isEvent = !!schedule?.custom_event_type;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    student_group: "",
    course: "",
    instructor: "",
    room: "",
    custom_topic: "",
    schedule_date: "",
    from_time: "",
    to_time: "",
    custom_event_type: "",
    custom_event_title: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Populate form when schedule loads
  useEffect(() => {
    if (schedule && !initialized) {
      setForm({
        student_group: schedule.student_group || "",
        course: schedule.course || "",
        instructor: schedule.instructor || "",
        room: schedule.room || "",
        custom_topic: schedule.custom_topic || "",
        schedule_date: schedule.schedule_date || "",
        from_time: (schedule.from_time || "").slice(0, 5), // "09:00:00" → "09:00"
        to_time: (schedule.to_time || "").slice(0, 5),
        custom_event_type: schedule.custom_event_type || "",
        custom_event_title: schedule.custom_event_title || "",
      });
      setInitialized(true);
    }
  }, [schedule, initialized]);

  // ── Lookup queries ─────────────────────────────────────────────────────────

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

  // Topics for course schedules
  const { data: courseTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ["program-topics", selectedGroupProgram, form.course],
    queryFn: () => getProgramTopics(selectedGroupProgram, form.course),
    enabled: !!selectedGroupProgram && !!form.course && !isEvent,
    staleTime: 10 * 60_000,
  });
  const topics = courseTopics ?? [];

  // ── Submit ─────────────────────────────────────────────────────────────────

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      updateCourseSchedule(scheduleName, {
        student_group: form.student_group || undefined,
        course: form.course || undefined,
        instructor: form.instructor || undefined,
        schedule_date: form.schedule_date,
        from_time: form.from_time.length === 5 ? form.from_time + ":00" : form.from_time,
        to_time: form.to_time.length === 5 ? form.to_time + ":00" : form.to_time,
        room: form.room || undefined,
        custom_topic: form.custom_topic || undefined,
        custom_event_type: form.custom_event_type || undefined,
        custom_event_title: form.custom_event_title || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bm-schedules"] });
      router.push("/dashboard/branch-manager/course-schedule");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { exception?: string } } })?.response
          ?.data?.exception || "Failed to update schedule. Please try again.";
      setServerError(msg);
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (isEvent) {
      if (!form.custom_event_type) e.custom_event_type = "Required";
      if (!form.custom_event_title) e.custom_event_title = "Required";
    } else {
      if (!form.student_group) e.student_group = "Required";
      if (!form.course) e.course = "Required";
      if (!form.instructor) e.instructor = "Required";
    }
    if (!form.schedule_date) e.schedule_date = "Required";
    if (!form.from_time) e.from_time = "Required";
    if (!form.to_time) e.to_time = "Required";
    if (form.from_time && form.to_time && form.from_time >= form.to_time) {
      e.to_time = "End time must be after start time";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (validate()) submit();
  };

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setServerError("");
    };

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loadingSchedule) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
    );
  }

  if (isError || !schedule) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <BreadcrumbNav />
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-text-secondary">Schedule not found.</p>
            <Link href="/dashboard/branch-manager/course-schedule">
              <Button variant="outline">Back to Schedule</Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
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
            {isEvent ? (
              <PartyPopper className="h-6 w-6 text-amber-600" />
            ) : (
              <CalendarDays className="h-6 w-6 text-primary" />
            )}
            Edit {isEvent ? "Event" : "Schedule"}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isEvent
              ? schedule.custom_event_title || schedule.custom_event_type
              : schedule.course}{" "}
            — {schedule.schedule_date}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Event-specific fields */}
            {isEvent && (
              <Card>
                <CardContent className="p-5 space-y-5">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Event Details
                  </h2>

                  <Field
                    label="Event Type"
                    icon={PartyPopper}
                    required
                    error={errors.custom_event_type}
                  >
                    <select
                      value={form.custom_event_type}
                      onChange={set("custom_event_type")}
                      className={`${selectCls} ${errors.custom_event_type ? "border-error focus:ring-error/30" : ""}`}
                    >
                      <option value="">Select event type…</option>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Event Title"
                    icon={Type}
                    required
                    error={errors.custom_event_title}
                  >
                    <input
                      type="text"
                      placeholder="e.g. 10th CBSE Physics Revision…"
                      value={form.custom_event_title}
                      onChange={set("custom_event_title")}
                      className={`${inputCls} ${errors.custom_event_title ? "border-error" : ""}`}
                    />
                  </Field>
                </CardContent>
              </Card>
            )}

            {/* Session details */}
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  {isEvent ? "Optional Details" : "Session Details"}
                </h2>

                {/* Student Group */}
                <Field
                  label="Student Group"
                  icon={Users}
                  required={!isEvent}
                  error={errors.student_group}
                >
                  <select
                    value={form.student_group}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        student_group: e.target.value,
                        course: isEvent ? prev.course : "",
                        custom_topic: "",
                      }));
                    }}
                    className={`${selectCls} ${errors.student_group ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">
                      {isEvent ? "All students (branch-wide)" : "Select a group…"}
                    </option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` — ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Course */}
                {(form.student_group || !isEvent) && (
                  <Field
                    label="Course / Subject"
                    icon={BookOpen}
                    required={!isEvent}
                    error={errors.course}
                  >
                    <select
                      value={form.course}
                      onChange={set("course")}
                      disabled={!form.student_group || coursesLoading}
                      className={`${selectCls} ${errors.course ? "border-error focus:ring-error/30" : ""}`}
                    >
                      <option value="">
                        {!form.student_group
                          ? "Select a group first…"
                          : coursesLoading
                            ? "Loading courses…"
                            : isEvent
                              ? "No specific course (optional)"
                              : "Select a course…"}
                      </option>
                      {courses.map((c) => (
                        <option key={c.course} value={c.course}>
                          {c.course_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* Topic (class schedules only) */}
                {!isEvent && form.course && topics.length > 0 && (
                  <Field label="Topic" icon={FileText}>
                    <select
                      value={form.custom_topic}
                      onChange={set("custom_topic")}
                      disabled={topicsLoading}
                      className={selectCls}
                    >
                      <option value="">
                        {topicsLoading ? "Loading topics…" : "No topic (optional)"}
                      </option>
                      {topics.map((t) => (
                        <option key={t.topic} value={t.topic}>
                          {t.topic_name || t.topic}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* Instructor */}
                <Field
                  label={isEvent ? "Instructor / Host" : "Instructor"}
                  icon={GraduationCap}
                  required={!isEvent}
                  error={errors.instructor}
                >
                  <select
                    value={form.instructor}
                    onChange={set("instructor")}
                    className={`${selectCls} ${errors.instructor ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">
                      {isEvent
                        ? "No specific host (optional)"
                        : "Select an instructor…"}
                    </option>
                    {instructors.map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.instructor_name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Room */}
                <Field label="Room / Venue" icon={MapPin} error={errors.room}>
                  <select
                    value={form.room}
                    onChange={set("room")}
                    className={selectCls}
                  >
                    <option value="">No room</option>
                    {rooms.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Date &amp; Time
                </h2>

                <Field
                  label="Date"
                  icon={CalendarDays}
                  required
                  error={errors.schedule_date}
                >
                  <input
                    type="date"
                    value={form.schedule_date}
                    onChange={set("schedule_date")}
                    className={`${inputCls} ${errors.schedule_date ? "border-error" : ""}`}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="From Time"
                    icon={Clock}
                    required
                    error={errors.from_time}
                  >
                    <input
                      type="time"
                      value={form.from_time}
                      onChange={set("from_time")}
                      className={`${inputCls} ${errors.from_time ? "border-error" : ""}`}
                    />
                  </Field>
                  <Field
                    label="To Time"
                    icon={Clock}
                    required
                    error={errors.to_time}
                  >
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

          {/* Side panel */}
          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-2">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Preview
                </h2>
                <div
                  className={`rounded-[10px] border-l-4 ${isEvent ? "border-l-amber-400 bg-amber-50" : "border-l-primary bg-primary/5"} p-3 space-y-1.5`}
                >
                  {isEvent && form.custom_event_type && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      {form.custom_event_type}
                    </span>
                  )}
                  <p className="font-semibold text-sm text-text-primary">
                    {isEvent
                      ? form.custom_event_title || form.custom_event_type || "Event"
                      : form.course || "Course"}
                  </p>
                  {!isEvent && form.custom_topic && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {form.custom_topic}
                    </p>
                  )}
                  {isEvent && form.course && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {form.course}
                    </p>
                  )}
                  {form.instructor && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {instructors.find((i) => i.name === form.instructor)
                        ?.instructor_name ?? form.instructor}
                    </p>
                  )}
                  {form.schedule_date && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(form.schedule_date + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
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
                      {groups.find((g) => g.name === form.student_group)
                        ?.student_group_name ?? form.student_group}
                    </p>
                  )}
                  {form.room && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rooms.find((r) => r.name === form.room)?.room_name ??
                        form.room}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              {serverError && (
                <div className="rounded-[10px] bg-error/10 border border-error/20 px-4 py-3 text-xs text-error">
                  {serverError}
                </div>
              )}
              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2"
                disabled={isPending}
              >
                {isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isPending ? "Saving…" : "Update Schedule"}
              </Button>
              <Link
                href="/dashboard/branch-manager/course-schedule"
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
