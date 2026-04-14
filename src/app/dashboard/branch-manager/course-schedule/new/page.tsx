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
  FileText,
  Lightbulb,
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
  getProgramTopics,
  getCourseSchedules,
} from "@/lib/api/courseSchedule";
import { getInstructorsWithCourses } from "@/lib/api/employees";
import type { InstructorWithLog } from "@/lib/api/employees";

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

function NewCourseSchedulePage() {
  const { defaultCompany, allowedCompanies } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get("date");

  // Branch is locked to the manager's default company
  const branch = defaultCompany || (allowedCompanies.length > 0 ? allowedCompanies[0] : "");

  const [form, setForm] = useState({
    student_group: "",
    course: "",
    instructor: "",
    room: "",
    custom_topic: "",
    schedule_date: prefilledDate || new Date().toISOString().split("T")[0],
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
  const allProgramCourses = programCourses ?? [];

  // Fetch all instructors for this branch WITH their course assignments
  const { data: allInstructors } = useQuery({
    queryKey: ["instructors-with-courses", branch],
    queryFn: () => getInstructorsWithCourses(branch),
    enabled: !!branch,
    staleTime: 10 * 60_000,
  });
  const branchInstructors: InstructorWithLog[] = allInstructors ?? [];

  // ── Bidirectional filtering: instructor ↔ course ──────────────────────────

  // When an instructor is selected → filter courses to only their assigned courses
  // When a course is selected → filter instructors to only those assigned to that course
  const filteredCourses = useMemo(() => {
    if (!form.instructor || !selectedGroupProgram) return allProgramCourses;
    const instructor = branchInstructors.find((i) => i.name === form.instructor);
    if (!instructor) return allProgramCourses;

    // Get the course names from this instructor's log for the current program
    const assignedCourses = new Set(
      instructor.instructor_log
        .filter((log) => log.program === selectedGroupProgram && log.course)
        .map((log) => log.course!)
    );

    // If no log entries have courses (course field was empty), show all program courses
    if (assignedCourses.size === 0) return allProgramCourses;

    return allProgramCourses.filter((c) => assignedCourses.has(c.course));
  }, [form.instructor, selectedGroupProgram, allProgramCourses, branchInstructors]);

  const filteredInstructors = useMemo(() => {
    if (!selectedGroupProgram) return branchInstructors;

    // First filter by program — only show instructors assigned to this program
    const programInstructors = branchInstructors.filter((i) =>
      i.instructor_log.some((log) => log.program === selectedGroupProgram)
    );

    // If a course is also selected, further filter to only instructors assigned to that course
    if (!form.course) return programInstructors;

    const courseInstructors = programInstructors.filter((i) =>
      i.instructor_log.some(
        (log) => log.program === selectedGroupProgram && log.course === form.course
      )
    );

    // If no instructors have explicit course assignments, show all program instructors
    return courseInstructors.length > 0 ? courseInstructors : programInstructors;
  }, [form.course, selectedGroupProgram, branchInstructors]);

  const { data: roomRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
    staleTime: 10 * 60_000,
  });
  const rooms = roomRes?.data ?? [];

  // Fetch topics for the selected (program, course) pair
  const { data: courseTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ["program-topics", selectedGroupProgram, form.course],
    queryFn: () => getProgramTopics(selectedGroupProgram, form.course),
    enabled: !!selectedGroupProgram && !!form.course,
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

  // Auto-select Offline room and lock it
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
        student_group: form.student_group,
        course: form.course,
        instructor: form.instructor,
        schedule_date: form.schedule_date,
        from_time: form.from_time + ":00",
        to_time: form.to_time + ":00",
        room: form.room || undefined,
        custom_branch: branch || undefined,
        custom_topic: form.custom_topic || undefined,
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

  // When student group changes, reset course + instructor (options depend on program)
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, student_group: e.target.value, course: "", instructor: "", custom_topic: "" }));
    setErrors((prev) => ({ ...prev, student_group: undefined, course: undefined, instructor: undefined }));
    setServerError("");
  };

  // When instructor changes, reset course if it's no longer in the filtered list
  const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInstructor = e.target.value;
    setForm((prev) => {
      // Check if current course is still valid for the new instructor
      if (prev.course && newInstructor) {
        const instructor = branchInstructors.find((i) => i.name === newInstructor);
        if (instructor) {
          const assignedCourses = new Set(
            instructor.instructor_log
              .filter((log) => log.program === selectedGroupProgram && log.course)
              .map((log) => log.course!)
          );
          // If instructor has explicit course assignments and current course isn't in them, reset
          if (assignedCourses.size > 0 && !assignedCourses.has(prev.course)) {
            return { ...prev, instructor: newInstructor, course: "" };
          }
        }
      }
      return { ...prev, instructor: newInstructor };
    });
    setErrors((prev) => ({ ...prev, instructor: undefined, course: undefined }));
    setServerError("");
  };

  // When course changes, reset instructor if they don't teach this course
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourse = e.target.value;
    setForm((prev) => {
      // Check if current instructor is still valid for the new course
      if (prev.instructor && newCourse) {
        const instructor = branchInstructors.find((i) => i.name === prev.instructor);
        if (instructor) {
          const teachesThisCourse = instructor.instructor_log.some(
            (log) => log.program === selectedGroupProgram && log.course === newCourse
          );
          if (!teachesThisCourse) {
            return { ...prev, course: newCourse, instructor: "", custom_topic: "" };
          }
        }
      }
      return { ...prev, course: newCourse, custom_topic: "" };
    });
    setErrors((prev) => ({ ...prev, course: undefined, instructor: undefined, custom_topic: undefined }));
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

                {/* Course — filtered by selected group's program + instructor assignment */}
                <Field label="Course / Subject" icon={BookOpen} required error={errors.course}>
                  <select
                    value={form.course}
                    onChange={handleCourseChange}
                    disabled={!form.student_group || coursesLoading}
                    className={`${selectCls} ${errors.course ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">
                      {!form.student_group
                        ? "Select a group first…"
                        : coursesLoading
                          ? "Loading courses…"
                          : filteredCourses.length === 0
                            ? "No courses found for this program"
                            : "Select a course…"}
                    </option>
                    {filteredCourses.map((c) => (
                      <option key={c.course} value={c.course}>{c.course_name}</option>
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

                {/* Instructor — filtered by selected program + course */}
                <Field label="Instructor" icon={GraduationCap} required error={errors.instructor}>
                  <select
                    value={form.instructor}
                    onChange={handleInstructorChange}
                    disabled={!form.student_group}
                    className={`${selectCls} ${errors.instructor ? "border-error focus:ring-error/30" : ""}`}
                  >
                    <option value="">
                      {!form.student_group
                        ? "Select a group first…"
                        : filteredInstructors.length === 0
                          ? "No instructors assigned to this program"
                          : "Select an instructor…"}
                    </option>
                    {filteredInstructors.map((i) => (
                      <option key={i.name} value={i.name}>{i.instructor_name}</option>
                    ))}
                  </select>
                </Field>

                {/* Room */}
                <Field label="Room" icon={MapPin} required error={errors.room}>
                  <select
                    value={form.room}
                    onChange={set("room")}
                    disabled
                    className={`${selectCls} opacity-70 cursor-not-allowed ${errors.room ? "border-error focus:ring-error/30" : ""}`}
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
                    {form.custom_topic && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {form.custom_topic}
                      </p>
                    )}
                    {form.instructor && (
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {branchInstructors.find((i) => i.name === form.instructor)?.instructor_name ?? form.instructor}
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

export default function Page() {
  return (
    <Suspense>
      <NewCourseSchedulePage />
    </Suspense>
  );
}
