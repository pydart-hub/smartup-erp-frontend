"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, Hash, BookOpen, Users, FileText, AlertTriangle, Building2 } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { createExam, getAssessmentGroups, getExamsForBatchDate } from "@/lib/api/assessment";
import { getStudentGroups, getBranches } from "@/lib/api/enrollment";
import { getProgramCourses, getCourseSchedules } from "@/lib/api/courseSchedule";
import type { AssessmentGroup } from "@/lib/types/assessment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function CurriculumCreateExamPage() {
  const router = useRouter();

  // Form state
  const [branch, setBranch] = useState("");
  const [studentGroup, setStudentGroup] = useState("");
  const [course, setCourse] = useState("");
  const [assessmentGroup, setAssessmentGroup] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("12:00");
  const [maxScore, setMaxScore] = useState("100");
  const [topic, setTopic] = useState("");

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  // Fetch student groups for selected branch
  const { data: studentGroups = [], isLoading: sgLoading, error: sgError } = useQuery({
    queryKey: ["student-groups-for-exam", branch],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch", "custom_subject"]),
            filters: JSON.stringify([["custom_branch", "=", branch]]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      return (res.data ?? []).filter((sg: any) => !sg.custom_subject);
    },
    staleTime: 60_000,
    enabled: !!branch,
  });

  useEffect(() => {
    if (sgError) {
      toast.error(`Failed to load classes: ${sgError.message}`);
    }
  }, [sgError]);

  // Derived: selected student group
  const selectedSG = useMemo(
    () => studentGroups.find((sg: any) => sg.name === studentGroup),
    [studentGroups, studentGroup],
  );

  // Fetch courses for the selected batch's program
  const { data: programCourses = [], isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ["program-courses", selectedSG?.program],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `resource/Program/${encodeURIComponent(selectedSG!.program)}`,
          method: "GET"
        })
      }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      return res.data?.courses ?? [];
    },
    enabled: !!selectedSG?.program,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (coursesError) {
      toast.error(`Failed to load subjects: ${coursesError.message}`);
    }
  }, [coursesError]);

  // Fetch exam types (assessment groups)
  const { data: groups = [], error: groupsError } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups-curriculum"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "assessment_group_name", "parent_assessment_group"]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      return (res.data ?? []).filter((g: any) => 
        g.name !== "All Assessment Groups" && 
        g.assessment_group_name !== "All Assessment Groups"
      );
    },
    staleTime: 120_000,
  });

  useEffect(() => {
    if (groupsError) {
      toast.error(`Failed to load exam names: ${groupsError.message}`);
    }
  }, [groupsError]);

  // Fetch existing classes for this batch + date (to show occupied time slots)
  const { data: daySchedules = [] } = useQuery({
    queryKey: ["batch-day-schedules", studentGroup, scheduleDate],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Course Schedule",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "course", "from_time", "to_time"]),
            filters: JSON.stringify([["student_group", "=", studentGroup], ["schedule_date", "=", scheduleDate]]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    enabled: !!studentGroup && !!scheduleDate,
    staleTime: 30_000,
  });

  // Fetch existing exams for this batch + date
  const { data: dayExams = [] } = useQuery({
    queryKey: ["batch-day-exams", studentGroup, scheduleDate],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "assessment_name", "from_time", "to_time"]),
            filters: JSON.stringify([["student_group", "=", studentGroup], ["schedule_date", "=", scheduleDate]]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    enabled: !!studentGroup && !!scheduleDate,
    staleTime: 30_000,
  });

  // Create exam mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/exams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Exam created successfully!");
      // Send them back to the Marks Entry page so they can enter marks
      router.push("/dashboard/curriculum-dept/marks-entry");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create exam");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branch || !studentGroup || !course || !assessmentGroup || !scheduleDate || !fromTime || !toTime || !maxScore) {
      toast.error("Please fill all required fields");
      return;
    }
    createMutation.mutate({
      student_group: studentGroup,
      course,
      assessment_group: assessmentGroup,
      schedule_date: scheduleDate,
      from_time: fromTime,
      to_time: toTime,
      maximum_assessment_score: Number(maxScore),
      custom_topic: topic || undefined,
    });
  }

  const isSubmitting = createMutation.isPending;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />

      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Assign New Exam</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Schedule a new exam for any branch and class globally
        </p>
      </motion.div>

      <motion.div variants={item}>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-text-tertiary" />
                Exam Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Branch */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-text-tertiary" />
                    Branch <span className="text-error">*</span>
                  </label>
                  {branchesLoading ? (
                    <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3">
                      <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                    </div>
                  ) : (
                    <select
                      value={branch}
                      onChange={(e) => { setBranch(e.target.value); setStudentGroup(""); setCourse(""); }}
                      required
                      className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Select branch...</option>
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Batch (Student Group) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-text-tertiary" />
                    Class / Batch <span className="text-error">*</span>
                  </label>
                  {!branch ? (
                    <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3 text-sm text-text-tertiary">
                      Select a branch first
                    </div>
                  ) : sgLoading ? (
                    <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3">
                      <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                    </div>
                  ) : (
                    <select
                      value={studentGroup}
                      onChange={(e) => { setStudentGroup(e.target.value); setCourse(""); }}
                      required
                      className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Select class...</option>
                      {studentGroups.map((sg: any) => (
                        <option key={sg.name} value={sg.name}>
                          {sg.student_group_name} ({sg.program})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Course */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-text-tertiary" />
                  Subject (Course) <span className="text-error">*</span>
                </label>
                {!selectedSG ? (
                  <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3 text-sm text-text-tertiary">
                    Select a class first
                  </div>
                ) : coursesLoading ? (
                  <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                  </div>
                ) : (
                  <select
                    value={course}
                    onChange={(e) => { setCourse(e.target.value); setTopic(""); }}
                    required
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select subject...</option>
                    {Array.from(new Map(programCourses.map((pc: any) => [pc.course, pc])).values()).map((pc: any) => (
                      <option key={pc.course} value={pc.course}>
                        {pc.course_name || pc.course}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Topic */}
              {course && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-text-tertiary" />
                    Topic <span className="text-text-tertiary text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Quadratic Equations"
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Exam Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-text-tertiary" />
                  Exam Name <span className="text-error">*</span>
                </label>
                <select
                  value={assessmentGroup}
                  onChange={(e) => setAssessmentGroup(e.target.value)}
                  required
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select exam name...</option>
                  {groups.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.assessment_group_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date + Time row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-text-tertiary" />
                    From Time <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    required
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-text-tertiary" />
                    To Time <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    required
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Occupied time slots warning */}
              {(daySchedules.length > 0 || dayExams.length > 0) && (
                <div className="flex items-start gap-2 rounded-[10px] bg-warning-light border border-warning/20 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">Occupied time slots on this date:</p>
                    <div className="mt-1 space-y-0.5">
                      {daySchedules.map((s: any) => (
                        <p key={s.name} className="text-xs text-text-secondary">
                          <span className="text-text-tertiary">[Class]</span> {s.course} — {s.from_time?.slice(0, 5)} to {s.to_time?.slice(0, 5)}
                        </p>
                      ))}
                      {dayExams.map((e: any) => (
                        <p key={e.name} className="text-xs text-text-secondary">
                          <span className="text-primary">[Exam]</span> {e.assessment_name} — {e.from_time?.slice(0, 5)} to {e.to_time?.slice(0, 5)}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-warning mt-1">Pick a time that doesn&apos;t overlap with these.</p>
                  </div>
                </div>
              )}

              {/* Max Score */}
              <div className="flex flex-col gap-1.5 max-w-xs">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-text-tertiary" />
                  Subject Total Score <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  required
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Selected summary */}
              {studentGroup && course && assessmentGroup && scheduleDate && (
                <div className="bg-brand-wash rounded-[12px] p-4 border border-primary/10">
                  <p className="text-sm font-medium text-primary mb-1">Assignment Summary</p>
                  <p className="text-xs text-text-secondary">
                    <strong>{course}</strong> – {assessmentGroup} for{" "}
                    <strong>{selectedSG?.student_group_name || studentGroup}</strong> ({branch}) on{" "}
                    {new Date(scheduleDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ({fromTime} – {toTime}) • Subject Total: {maxScore}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Assigning..." : "Assign Exam"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </motion.div>
  );
}
