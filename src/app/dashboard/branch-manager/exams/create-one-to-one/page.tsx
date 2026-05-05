"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, Hash, BookOpen, Users, FileText, AlertTriangle, UserRound } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { createExam, getAssessmentGroups, getExamsForBatchDate } from "@/lib/api/assessment";
import { getStudentGroups as getCourseStudentGroups, getProgramCourses, getCourseSchedules } from "@/lib/api/courseSchedule";
import type { AssessmentGroup } from "@/lib/types/assessment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function CreateOneToOneExamPage() {
  const router = useRouter();
  const { defaultCompany } = useAuth();

  const [studentGroup, setStudentGroup] = useState("");
  const [course, setCourse] = useState("");
  const [assessmentGroup, setAssessmentGroup] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("12:00");
  const [maxScore, setMaxScore] = useState("100");
  const [topic, setTopic] = useState("");

  // Only One-to-One student groups are loaded here.
  const { data: studentGroups = [], isLoading: sgLoading } = useQuery({
    queryKey: ["o2o-student-groups-for-exam", defaultCompany],
    queryFn: async () => {
      const res = await getCourseStudentGroups({
        branch: defaultCompany || undefined,
        oneToOneOnly: true,
      });
      return res.data ?? [];
    },
    staleTime: 60_000,
    enabled: !!defaultCompany,
  });

  const selectedSG = useMemo(
    () => studentGroups.find((sg) => sg.name === studentGroup),
    [studentGroups, studentGroup],
  );

  const { data: programCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["o2o-program-courses", selectedSG?.program],
    queryFn: () => getProgramCourses(selectedSG!.program!),
    enabled: !!selectedSG?.program,
    staleTime: 120_000,
  });

  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  const { data: daySchedules = [] } = useQuery({
    queryKey: ["o2o-batch-day-schedules", studentGroup, scheduleDate],
    queryFn: async () => {
      const res = await getCourseSchedules({ student_group: studentGroup, date: scheduleDate });
      return res.data ?? [];
    },
    enabled: !!studentGroup && !!scheduleDate,
    staleTime: 30_000,
  });

  const { data: dayExams = [] } = useQuery({
    queryKey: ["o2o-batch-day-exams", studentGroup, scheduleDate],
    queryFn: () => getExamsForBatchDate(studentGroup, scheduleDate),
    enabled: !!studentGroup && !!scheduleDate,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createExam,
    onSuccess: (data) => {
      toast.success("One-to-One exam created successfully");
      router.push(
        `/dashboard/branch-manager/exams/${encodeURIComponent(data.name)}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create One-to-One exam");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentGroup || !course || !assessmentGroup || !scheduleDate || !fromTime || !toTime || !maxScore) {
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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <BreadcrumbNav />

      <motion.div variants={item} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Create One-to-One Exam</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Schedule a new exam for one-to-one students only
          </p>
        </div>
        <Button type="button" variant="outline" size="md" onClick={() => router.push("/dashboard/branch-manager/exams/create")}>
          Regular Exam Scheduler
        </Button>
      </motion.div>

      {!sgLoading && studentGroups.length === 0 && (
        <motion.div variants={item}>
          <Card className="border-warning/30 bg-warning-light/40">
            <CardContent className="py-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">No One-to-One students found</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Create One-to-One student groups first, then schedule exams here.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-text-tertiary" />
                One-to-One Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2 rounded-[10px] bg-brand-wash border border-primary/10 px-3 py-2.5">
                <UserRound className="h-4 w-4 text-primary" />
                <p className="text-xs text-text-secondary">
                  This scheduler lists only One-to-One student groups.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-text-tertiary" />
                  One-to-One Student <span className="text-error">*</span>
                </label>
                {sgLoading ? (
                  <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                  </div>
                ) : (
                  <select
                    value={studentGroup}
                    onChange={(e) => { setStudentGroup(e.target.value); setCourse(""); }}
                    required
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  >
                    <option value="">Select one-to-one student...</option>
                    {studentGroups.map((sg) => (
                      <option key={sg.name} value={sg.name}>
                        {sg.student_group_name} ({sg.program})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-text-tertiary" />
                  Course (Subject) <span className="text-error">*</span>
                </label>
                {!selectedSG ? (
                  <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3 text-sm text-text-tertiary">
                    Select a one-to-one student first
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
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  >
                    <option value="">Select course...</option>
                    {Array.from(new Map(programCourses.map((pc) => [pc.course, pc])).values()).map((pc) => (
                      <option key={pc.course} value={pc.course}>
                        {pc.course_name || pc.course}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                    placeholder="e.g. Laws of Motion"
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-text-tertiary" />
                  Exam Type <span className="text-error">*</span>
                </label>
                <select
                  value={assessmentGroup}
                  onChange={(e) => setAssessmentGroup(e.target.value)}
                  required
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                >
                  <option value="">Select exam type...</option>
                  {groups.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.assessment_group_name}
                    </option>
                  ))}
                </select>
              </div>

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
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
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
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
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
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  />
                </div>
              </div>

              {(daySchedules.length > 0 || dayExams.length > 0) && (
                <div className="flex items-start gap-2 rounded-[10px] bg-warning-light border border-warning/20 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">Occupied time slots on this date:</p>
                    <div className="mt-1 space-y-0.5">
                      {daySchedules.map((s) => (
                        <p key={s.name} className="text-xs text-text-secondary">
                          <span className="text-text-tertiary">[Class]</span> {s.course} - {s.from_time?.slice(0, 5)} to {s.to_time?.slice(0, 5)}
                        </p>
                      ))}
                      {dayExams.map((e) => (
                        <p key={e.name} className="text-xs text-text-secondary">
                          <span className="text-primary">[Exam]</span> {e.assessment_name} - {e.from_time?.slice(0, 5)} to {e.to_time?.slice(0, 5)}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-warning mt-1">Pick a time that does not overlap with these.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 max-w-xs">
                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-text-tertiary" />
                  Maximum Score <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  required
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                />
              </div>

              {studentGroup && course && assessmentGroup && scheduleDate && (
                <div className="bg-brand-wash rounded-[12px] p-4 border border-primary/10">
                  <p className="text-sm font-medium text-primary mb-1">Exam Summary</p>
                  <p className="text-xs text-text-secondary">
                    <strong>{course}</strong> - {assessmentGroup} for <strong>{selectedSG?.student_group_name || studentGroup}</strong> on {" "}
                    {new Date(scheduleDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ({fromTime} - {toTime}) - Max Score: {maxScore}
                  </p>
                </div>
              )}

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
                  disabled={isSubmitting || studentGroups.length === 0}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating..." : "Create One-to-One Exam"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </motion.div>
  );
}
