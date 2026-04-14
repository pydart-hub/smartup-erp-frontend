"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
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
  PartyPopper,
  Type,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getStudentGroups,
  getProgramCourses,
  getRooms,
  createCourseSchedule,
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

function EventPlannerPage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get("date");
  const branch =
    defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const [form, setForm] = useState({
    custom_event_type: "" as string,
    custom_event_title: "",
    student_group: "",
    course: "",
    instructor: "",
    room: "",
    schedule_date: prefilledDate || new Date().toISOString().split("T")[0],
    from_time: "09:00",
    to_time: "10:30",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState("");

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

  // Auto-select Offline room
  useEffect(() => {
    if (rooms.length > 0 && !form.room) {
      const offlineRoom = rooms.find((r) => r.room_name.toLowerCase() === "offline");
      if (offlineRoom) setForm((f) => ({ ...f, room: offlineRoom.name }));
    }
  }, [rooms]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      createCourseSchedule({
        student_group: form.student_group || undefined,
        course: form.course || undefined,
        instructor: form.instructor || undefined,
        schedule_date: form.schedule_date,
        from_time: form.from_time + ":00",
        to_time: form.to_time + ":00",
        room: form.room || undefined,
        custom_branch: branch || undefined,
        custom_event_type: form.custom_event_type,
        custom_event_title: form.custom_event_title || undefined,
      }),
    onSuccess: () => {
      router.push("/dashboard/branch-manager/course-schedule");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { exception?: string } } })?.response
          ?.data?.exception || "Failed to create event. Please try again.";
      setServerError(msg);
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.custom_event_type) e.custom_event_type = "Required";
    if (!form.custom_event_title) e.custom_event_title = "Required";
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
            <PartyPopper className="h-6 w-6 text-primary" />
            Event Planner
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Schedule a special event for {branch || "your branch"}
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
                  Event Details
                </h2>

                {/* Event Type */}
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

                {/* Event Title */}
                <Field
                  label="Event Title"
                  icon={Type}
                  required
                  error={errors.custom_event_title}
                >
                  <input
                    type="text"
                    placeholder="e.g. 10th CBSE Physics Revision, Orientation Day…"
                    value={form.custom_event_title}
                    onChange={set("custom_event_title")}
                    className={`${inputCls} ${errors.custom_event_title ? "border-error" : ""}`}
                  />
                </Field>

                {/* Student Group (optional) */}
                <Field label="Student Group" icon={Users}>
                  <select
                    value={form.student_group}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        student_group: e.target.value,
                        course: "",
                      }));
                    }}
                    className={selectCls}
                  >
                    <option value="">All students (branch-wide)</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.student_group_name}
                        {g.program ? ` — ${g.program}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Course (optional — only if group is selected) */}
                {form.student_group && (
                  <Field label="Course / Subject" icon={BookOpen}>
                    <select
                      value={form.course}
                      onChange={set("course")}
                      disabled={coursesLoading}
                      className={selectCls}
                    >
                      <option value="">
                        {coursesLoading
                          ? "Loading courses…"
                          : "No specific course (optional)"}
                      </option>
                      {courses.map((c) => (
                        <option key={c.course} value={c.course}>
                          {c.course_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* Instructor / Host (optional) */}
                <Field label="Instructor / Host" icon={GraduationCap}>
                  <select
                    value={form.instructor}
                    onChange={set("instructor")}
                    className={selectCls}
                  >
                    <option value="">No specific host (optional)</option>
                    {instructors.map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.instructor_name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Room */}
                <Field label="Room / Venue" icon={MapPin}>
                  <select
                    value={form.room}
                    onChange={set("room")}
                    className={selectCls}
                  >
                    <option value="">No room (optional)</option>
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
                  label="Event Date"
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

          {/* Side panel — preview + actions */}
          <div className="space-y-5">
            {(form.custom_event_type || form.custom_event_title) && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Preview
                  </h2>
                  <div className="rounded-[10px] border-l-4 border-l-amber-400 bg-amber-50 p-3 space-y-1.5">
                    {form.custom_event_type && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                        {form.custom_event_type}
                      </span>
                    )}
                    {form.custom_event_title && (
                      <p className="font-semibold text-sm text-text-primary">
                        {form.custom_event_title}
                      </p>
                    )}
                    {form.course && (
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
                        {new Date(form.schedule_date).toLocaleDateString(
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
                {isPending ? "Saving…" : "Save Event"}
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

export default function Page() {
  return (
    <Suspense>
      <EventPlannerPage />
    </Suspense>
  );
}
