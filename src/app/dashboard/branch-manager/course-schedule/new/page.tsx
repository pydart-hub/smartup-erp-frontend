"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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

// ── Page ─────────────────────────────────────────────────────────────────────────────

export default function NewCourseSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const router = useRouter();

  // Branch is locked to the manager's default company
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const [form, setForm] = useState({
    student_group: "",
    course: "",
    instructor: "",
    room: "",
    schedule_date: new Date().toISOString().split("T")[0],
    from_time: "09:00",
    to_time: "10:30",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState("");

  // ── Lookup queries ─────────────────────────────────────────────────────────

  // Student groups filtered by manager's branch
  const { data: groupRes } = useQuery({
    queryKey: ["student-groups", branch],
    queryFn: () => getStudentGroups({ branch: branch || undefined }),
    staleTime: 5 * 60_000,
  });
  const groups = groupRes?.data ?? [];

  // Derive the program from the selected student group
  const selectedGroupProgram = useMemo(() => {
    if (!form.student_group) return "";
    const g = groups.find((g) => g.name === form.student_group);
    return g?.program ?? "";
  }, [form.student_group, groups]);

  // Fetch courses for the selected group's program
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

  // ── Submit ─────────────────────────────────────────────────────────────────

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      createCourseSchedule({
        student_group: form.student_group,
        course: form.course,
        instructor: form.instructor,
        schedule_date: form.schedule_date,
        from_time: form.from_time + ":00",
        to_time: form.to_time + ":00",
        room: form.room || undefined,
        custom_branch: branch || undefined,
      }),
    onSuccess: () => {
      router.push("/dashboard/branch-manager/course-schedule");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { exception?: string; _server_messages?: string } } })
          ?.response?.data?.exception ||
        "Failed to create schedule. Please try again.";
      setServerError(msg);
    },
  });

  const validate = (): boolean => {
    const e: Partial<typeof form> = {};
    if (!form.student_group) e.student_group = "Required";
    if (!form.course)        e.course = "Required";
    if (!form.instructor)    e.instructor = "Required";
    if (!form.room)           e.room = "Required";
    if (!form.schedule_date) e.schedule_date = "Required";
    if (!form.from_time)     e.from_time = "Required";
    if (!form.to_time)       e.to_time = "Required";
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

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError("");
  };

  // When student group changes, reset course (the options will change)
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, student_group: e.target.value, course: "" }));
    setErrors((prev) => ({ ...prev, student_group: undefined, course: undefined }));
    setServerError("");
  };

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
            <CalendarDays className="h-6 w-6 text-primary" />
            New Course Schedule
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Schedule a class session for {branch || "your branch"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main fields */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide text-text-tertiary">
                  Session Details
                </h2>

                {/* Student Group */}
                <Field label="Student Group" icon={Users} required error={errors.student_group}>
                  <select
                    value={form.student_group}
                    onChange={handleGroupChange}
                    className={`${selectCls} ${errors.student_group ? "border-error focus:ring-error/30" : ""}`}
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

                {/* Course — filtered by selected group's program */}
                <Field label="Course / Subject" icon={BookOpen} required error={errors.course}>
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
                          : courses.length === 0
                            ? "No courses found for this program"
                            : "Select a course…"}
                    </option>
                    {courses.map((c) => (
                      <option key={c.course} value={c.course}>{c.course_name}</option>
                    ))}
                  </select>
                </Field>

                {/* Instructor */}
                <Field label="Instructor" icon={GraduationCap} required error={errors.instructor}>
                  <select
                    value={form.instructor}
                    onChange={set("instructor")}
                    className={`${selectCls} ${errors.instructor ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">Select an instructor…</option>
                    {instructors.map((i) => (
                      <option key={i.name} value={i.name}>{i.instructor_name}</option>
                    ))}
                  </select>
                </Field>

                {/* Room */}
                <Field label="Room" icon={MapPin} required error={errors.room}>
                  <select
                    value={form.room}
                    onChange={set("room")}
                    className={`${selectCls} ${errors.room ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">Select a room…</option>
                    {rooms.map((r) => (
                      <option key={r.name} value={r.name}>{r.room_name}</option>
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

                {/* Date */}
                <Field label="Schedule Date" icon={CalendarDays} required error={errors.schedule_date}>
                  <input
                    type="date"
                    value={form.schedule_date}
                    onChange={set("schedule_date")}
                    className={`${inputCls} ${errors.schedule_date ? "border-error" : ""}`}
                  />
                </Field>

                {/* From / To time */}
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

          {/* Side panel — preview + actions only (location card removed) */}
          <div className="space-y-5">
            {/* Summary preview */}
            {(form.course || form.instructor || form.schedule_date) && (
              <Card>
                <CardContent className="p-5 space-y-2">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-text-tertiary">
                    Preview
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
                    {form.schedule_date && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(form.schedule_date).toLocaleDateString("en-IN", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric",
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
                        {groups.find((g) => g.name === form.student_group)?.student_group_name ?? form.student_group}
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
              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={isPending}>
                {isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isPending ? "Saving…" : "Save Schedule"}
              </Button>
              <Link href="/dashboard/branch-manager/course-schedule" className="block">
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
