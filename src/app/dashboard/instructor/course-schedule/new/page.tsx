"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  Users,
  MapPin,
  Clock,
  Save,
  ArrowLeft,
  RefreshCw,
  FileText,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import {
  getCourses,
  getRooms,
  createCourseSchedule,
  getProgramTopics,
  getCourseSchedules,
} from "@/lib/api/courseSchedule";

// ── Field wrapper ────────────────────────────────────────────────────────────

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

// Color options matching Frappe's class_schedule_color Select field
const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", cls: "bg-blue-400" },
  { value: "green", label: "Green", cls: "bg-green-400" },
  { value: "red", label: "Red", cls: "bg-red-400" },
  { value: "orange", label: "Orange", cls: "bg-orange-400" },
  { value: "yellow", label: "Yellow", cls: "bg-yellow-400" },
  { value: "teal", label: "Teal", cls: "bg-teal-400" },
  { value: "violet", label: "Violet", cls: "bg-violet-400" },
  { value: "cyan", label: "Cyan", cls: "bg-cyan-400" },
  { value: "amber", label: "Amber", cls: "bg-amber-400" },
  { value: "pink", label: "Pink", cls: "bg-pink-400" },
  { value: "purple", label: "Purple", cls: "bg-purple-400" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewInstructorSchedulePage() {
  const { instructorName, defaultCompany } = useAuth();
  const { activeBatches, isLoading: batchesLoading } = useInstructorBatches();
  const router = useRouter();

  const [form, setForm] = useState({
    student_group: "",
    course: "",
    custom_topic: "",
    schedule_date: new Date().toISOString().split("T")[0],
    from_time: "09:00",
    to_time: "10:30",
    room: "",
    class_schedule_color: "blue",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState("");

  // ── Lookup queries ─────────────────────────────────────────────────────────

  const { data: courseRes } = useQuery({
    queryKey: ["courses"],
    queryFn: getCourses,
    staleTime: 10 * 60_000,
  });

  const { data: roomRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
    staleTime: 10 * 60_000,
  });

  const courses = courseRes?.data ?? [];
  const rooms = roomRes?.data ?? [];

  // Selected batch → derive program for display
  const selectedBatch = activeBatches.find((b) => b.name === form.student_group);
  const selectedProgram = selectedBatch?.program ?? "";

  // Fetch topics for the selected (program, course) pair
  const { data: courseTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ["program-topics", selectedProgram, form.course],
    queryFn: () => getProgramTopics(selectedProgram, form.course),
    enabled: !!selectedProgram && !!form.course,
    staleTime: 10 * 60_000,
  });
  const topics = courseTopics ?? [];

  // ── Smart suggested topic ──────────────────────────────────────────────────
  const { data: existingSchedules } = useQuery({
    queryKey: ["smart-start-schedules", form.student_group, form.course],
    queryFn: () => getCourseSchedules({
      student_group: form.student_group,
      limit_page_length: 500,
    }),
    enabled: !!form.student_group && !!form.course && topics.length > 0,
    staleTime: 60_000,
  });

  const suggestedTopic = useMemo(() => {
    if (!existingSchedules?.data || !form.course || topics.length === 0) return null;
    const coveredTopics = new Set(
      existingSchedules.data
        .filter(s => s.course === form.course && s.custom_topic && s.custom_topic_covered === 1)
        .map(s => s.custom_topic!)
    );
    if (coveredTopics.size === 0) return topics[0] ?? null;
    const next = topics.find(t => !coveredTopics.has(t.topic));
    return next ?? null;
  }, [existingSchedules?.data, form.course, topics]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      createCourseSchedule({
        student_group: form.student_group,
        course: form.course,
        instructor: instructorName || "",
        schedule_date: form.schedule_date,
        from_time: form.from_time + ":00",
        to_time: form.to_time + ":00",
        room: form.room || undefined,
        custom_branch: selectedBatch?.custom_branch || defaultCompany || undefined,
        class_schedule_color: form.class_schedule_color || undefined,
        custom_topic: form.custom_topic || undefined,
      }),
    onSuccess: () => {
      router.push("/dashboard/instructor/course-schedule");
    },
    onError: (err: unknown) => {
      const axErr = err as {
        response?: { data?: { exc_type?: string; exception?: string; _server_messages?: string } };
      };
      // Try to parse Frappe's _server_messages JSON for a user-readable message
      let msg = "Failed to create schedule. Please try again.";
      try {
        const raw = axErr?.response?.data?._server_messages;
        if (raw) {
          const parsed = JSON.parse(raw);
          const inner = JSON.parse(parsed[0]);
          if (inner.message) msg = inner.message;
        }
      } catch {
        msg = axErr?.response?.data?.exception || msg;
      }
      setServerError(msg);
    },
  });

  const validate = (): boolean => {
    const e: Partial<typeof form> = {};
    if (!form.student_group) e.student_group = "Required";
    if (!form.course) e.course = "Required";
    if (!form.schedule_date) e.schedule_date = "Required";
    if (!form.from_time) e.from_time = "Required";
    if (!form.to_time) e.to_time = "Required";
    if (!form.room) e.room = "Required";
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/instructor/course-schedule">
          <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            New Course Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Schedule a class for your batch
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main fields */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Session Details
                </h2>

                {/* Student Group (from instructor's batches) */}
                <Field label="Batch / Student Group" icon={Users} required error={errors.student_group}>
                  <select
                    value={form.student_group}
                    onChange={set("student_group")}
                    disabled={batchesLoading}
                    className={`${selectCls} ${errors.student_group ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">
                      {batchesLoading ? "Loading batches…" : "Select a batch…"}
                    </option>
                    {activeBatches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.student_group_name}
                        {b.program ? ` — ${b.program}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Course / Subject */}
                <Field label="Course / Subject" icon={BookOpen} required error={errors.course}>
                  <select
                    value={form.course}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, course: e.target.value, custom_topic: "" }));
                      setErrors((prev) => ({ ...prev, course: undefined }));
                      setServerError("");
                    }}
                    className={`${selectCls} ${errors.course ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">Select a course…</option>
                    {courses.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.course_name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Topic (optional — from Course.topics child table) */}
                {form.course && topics.length > 0 && (
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
                        <option key={t.topic} value={t.topic}>{t.topic_name || t.topic}</option>
                      ))}
                    </select>
                    {suggestedTopic && !form.custom_topic && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, custom_topic: suggestedTopic.topic }))}
                        className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Lightbulb className="h-3 w-3" />
                        <span>
                          Suggested: <span className="font-medium">{suggestedTopic.topic_name || suggestedTopic.topic}</span>
                          {" "}(next uncovered)
                        </span>
                      </button>
                    )}
                  </Field>
                )}

                {/* Color */}
                <Field label="Schedule Color" icon={BookOpen}>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, class_schedule_color: c.value }))}
                        className={`w-8 h-8 rounded-full ${c.cls} transition-all ${
                          form.class_schedule_color === c.value
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </Field>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Date &amp; Time
                </h2>

                <Field label="Schedule Date" icon={CalendarDays} required error={errors.schedule_date}>
                  <input
                    type="date"
                    value={form.schedule_date}
                    onChange={set("schedule_date")}
                    className={`${inputCls} ${errors.schedule_date ? "border-error" : ""}`}
                  />
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

          {/* Side panel */}
          <div className="space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                  Location
                </h2>

                {/* Room */}
                <Field label="Room" icon={MapPin} required error={errors.room}>
                  <select value={form.room} onChange={set("room")} className={`${selectCls} ${errors.room ? "border-error focus:ring-error/30" : ""}`}>
                    <option value="">No room selected</option>
                    {rooms.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Read-only info */}
                {selectedBatch && (
                  <div className="text-xs space-y-1 text-text-secondary">
                    {selectedBatch.program && (
                      <p>
                        <span className="font-medium text-text-primary">Program:</span>{" "}
                        {selectedBatch.program}
                      </p>
                    )}
                    {selectedBatch.custom_branch && (
                      <p>
                        <span className="font-medium text-text-primary">Branch:</span>{" "}
                        {selectedBatch.custom_branch}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            {(form.course || form.student_group || form.schedule_date) && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Preview
                  </h2>
                  <div className="rounded-[10px] border-l-4 border-l-primary bg-primary/5 p-3 space-y-1.5">
                    {form.course && (
                      <p className="font-semibold text-sm text-text-primary">{form.course}</p>
                    )}
                    {form.custom_topic && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {form.custom_topic}
                      </p>
                    )}
                    {form.schedule_date && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(form.schedule_date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
                        {selectedBatch?.student_group_name ?? form.student_group}
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
                {isPending ? "Saving…" : "Save Schedule"}
              </Button>
              <Link href="/dashboard/instructor/course-schedule" className="block">
                <Button variant="outline" className="w-full" disabled={isPending}>
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
