"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Save,
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  Clock,
  Hash,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAssessmentPlan, getExamResults, saveMarks } from "@/lib/api/assessment";
import { getStudentGroup } from "@/lib/api/enrollment";
import type { AssessmentPlan } from "@/lib/types/assessment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime12h(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Grade thresholds matching SmartUp Grading Scale
const GRADE_THRESHOLDS = [
  { grade: "A+", min: 90, color: "text-success" },
  { grade: "A", min: 80, color: "text-success" },
  { grade: "B+", min: 70, color: "text-primary" },
  { grade: "B", min: 60, color: "text-primary" },
  { grade: "C+", min: 50, color: "text-warning" },
  { grade: "C", min: 40, color: "text-warning" },
  { grade: "D", min: 33, color: "text-orange-500" },
  { grade: "F", min: 0, color: "text-error" },
];

function getGrade(pct: number): { grade: string; color: string } {
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t;
  }
  return { grade: "F", color: "text-error" };
}

interface StudentMark {
  student: string;
  student_name: string;
  score: string; // string for input, converted to number on save
}

export default function ExamMarkEntryPage() {
  const params = useParams();
  const router = useRouter();
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const examId = decodeURIComponent(params.id as string);

  const [marks, setMarks] = useState<StudentMark[]>([]);

  // Fetch the assessment plan
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["assessment-plan", examId],
    queryFn: () => getAssessmentPlan(examId),
    staleTime: 60_000,
  });

  // Fetch student group to get student list
  const { data: sgData, isLoading: sgLoading } = useQuery({
    queryKey: ["student-group-detail", plan?.student_group],
    queryFn: async () => {
      const res = await getStudentGroup(plan!.student_group);
      return res.data;
    },
    enabled: !!plan?.student_group,
    staleTime: 60_000,
  });

  // Fetch existing results for this exam
  const { data: existingResults } = useQuery({
    queryKey: ["exam-results", examId],
    queryFn: () => getExamResults(examId),
    staleTime: 30_000,
  });

  // Initialize marks from students + existing results
  useEffect(() => {
    if (!sgData?.students) return;

    const activeStudents = sgData.students.filter(
      (s) => s.active !== 0,
    );

    const existingMap = new Map<string, number>();
    if (existingResults?.data) {
      for (const r of existingResults.data) {
        existingMap.set(r.student, r.total_score);
      }
    }

    setMarks(
      activeStudents.map((s) => ({
        student: s.student,
        student_name: s.student_name ?? s.student,
        score: existingMap.has(s.student)
          ? String(existingMap.get(s.student))
          : "",
      })),
    );
  }, [sgData, existingResults]);

  // Save marks mutation
  const saveMutation = useMutation({
    mutationFn: (data: { assessment_plan: string; marks: { student: string; score: number }[] }) =>
      saveMarks(data),
    onSuccess: (result) => {
      if (result.created > 0) {
        toast.success(`Marks saved for ${result.created} students`);
      }
      if (result.errors?.length) {
        for (const err of result.errors) {
          toast.error(err);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["exam-results", examId] });
      queryClient.invalidateQueries({ queryKey: ["assessment-plans"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save marks");
    },
  });

  function handleScoreChange(idx: number, value: string) {
    setMarks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], score: value };
      return next;
    });
  }

  function handleSave() {
    const maxScore = plan?.maximum_assessment_score || 100;
    const validMarks: { student: string; score: number }[] = [];
    const errors: string[] = [];

    for (const m of marks) {
      if (m.score === "" || m.score === null || m.score === undefined) continue;
      const num = Number(m.score);
      if (isNaN(num) || num < 0) {
        errors.push(`${m.student_name}: invalid score`);
        continue;
      }
      if (num > maxScore) {
        errors.push(`${m.student_name}: score exceeds max (${maxScore})`);
        continue;
      }
      validMarks.push({ student: m.student, score: num });
    }

    if (errors.length) {
      toast.error(errors.join(", "));
      return;
    }

    if (validMarks.length === 0) {
      toast.error("No marks to save. Enter at least one score.");
      return;
    }

    saveMutation.mutate({
      assessment_plan: examId,
      marks: validMarks,
    });
  }

  // Stats
  const stats = useMemo(() => {
    const maxScore = plan?.maximum_assessment_score || 100;
    const filled = marks.filter((m) => m.score !== "" && !isNaN(Number(m.score)));
    const scores = filled.map((m) => Number(m.score));
    const passed = scores.filter((s) => (s / maxScore) * 100 >= 33);
    return {
      total: marks.length,
      filled: filled.length,
      passed: passed.length,
      failed: filled.length - passed.length,
      avg: scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
    };
  }, [marks, plan]);


  const isLoading = planLoading || sgLoading;
  const isSaving = saveMutation.isPending;
  const hasExistingResults = !!existingResults?.data?.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav />
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-text-tertiary mb-3" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">Exam not found</h3>
            <p className="text-sm text-text-secondary">
              The exam &quot;{examId}&quot; could not be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to exams
          </button>
          <h1 className="text-2xl font-bold text-text-primary">{plan.course}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {plan.assessment_group} • {plan.student_group}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={isSaving || marks.length === 0}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : hasExistingResults ? "Update Marks" : "Save Marks"}
        </Button>
      </motion.div>

      {/* Exam info */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-text-tertiary" />
                {formatDate(plan.schedule_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-text-tertiary" />
                {formatTime12h(plan.from_time)} – {formatTime12h(plan.to_time)}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-text-tertiary" />
                Max Score: {plan.maximum_assessment_score}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-text-tertiary" />
                {marks.length} students
              </span>
              {plan.examiner_name && (
                <span>Examiner: {plan.examiner_name}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live stats */}
      {stats.filled > 0 && (
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
            <p className="text-xl font-bold text-text-primary">{stats.filled}/{stats.total}</p>
            <p className="text-xs text-text-secondary mt-0.5">Entered</p>
          </div>
          <div className="bg-success-light rounded-[12px] p-3 text-center border border-success/10">
            <p className="text-xl font-bold text-success">{stats.passed}</p>
            <p className="text-xs text-success mt-0.5">Passed</p>
          </div>
          <div className="bg-error-light rounded-[12px] p-3 text-center border border-error/10">
            <p className="text-xl font-bold text-error">{stats.failed}</p>
            <p className="text-xs text-error mt-0.5">Failed</p>
          </div>
          <div className="bg-brand-wash rounded-[12px] p-3 text-center border border-primary/10">
            <p className="text-xl font-bold text-primary">{stats.avg}</p>
            <p className="text-xs text-primary mt-0.5">Average</p>
          </div>
          <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
            <p className="text-xl font-bold text-text-primary">{stats.highest}</p>
            <p className="text-xs text-text-secondary mt-0.5">Highest</p>
          </div>
        </motion.div>
      )}

      {/* Mark entry table */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-text-tertiary" />
                Mark Entry
              </CardTitle>
              {hasExistingResults && (
                <Badge variant="warning">Editing existing marks</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {marks.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                No students found in this batch.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left px-3 py-3 font-medium text-text-secondary w-12">#</th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary">Student</th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary">ID</th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary w-32">
                        Score (/{plan.maximum_assessment_score})
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary w-20">%</th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary w-20">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((m, idx) => {
                      const maxScore = plan.maximum_assessment_score;
                      const numScore = m.score !== "" ? Number(m.score) : null;
                      const pct =
                        numScore !== null && maxScore > 0
                          ? Math.round((numScore / maxScore) * 100 * 10) / 10
                          : null;
                      const gradeInfo = pct !== null ? getGrade(pct) : null;
                      const overMax = numScore !== null && numScore > maxScore;

                      return (
                        <motion.tr
                          key={m.student}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-border-light last:border-0 hover:bg-app-bg/50"
                        >
                          <td className="px-3 py-3 text-text-tertiary">{idx + 1}</td>
                          <td className="px-3 py-3 font-medium text-text-primary">
                            {m.student_name}
                          </td>
                          <td className="px-3 py-3 text-text-secondary text-xs">
                            {m.student}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              step="0.5"
                              value={m.score}
                              onChange={(e) => handleScoreChange(idx, e.target.value)}
                              placeholder="—"
                              className={`w-24 h-9 rounded-[8px] border px-3 text-sm text-center ${
                                overMax
                                  ? "border-error bg-error-light"
                                  : "border-border-input bg-surface"
                              }`}
                            />
                          </td>
                          <td className="px-3 py-3 text-text-secondary">
                            {pct !== null ? `${pct}%` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            {gradeInfo ? (
                              <span className={`text-xs font-bold ${gradeInfo.color}`}>
                                {gradeInfo.grade}
                              </span>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
