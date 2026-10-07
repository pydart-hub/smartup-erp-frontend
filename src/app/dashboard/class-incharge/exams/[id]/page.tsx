"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo, useEffect, useRef } from "react";
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
  CheckCircle2,
  Sparkles,
  School,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAssessmentPlan, getExamResults, saveMarks } from "@/lib/api/assessment";
import { getStudentGroup } from "@/lib/api/enrollment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.02 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function formatDate(d?: string) {
  if (!d) return "—";
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

const GRADE_THRESHOLDS = [
  { grade: "A+", min: 90, color: "text-success", bg: "bg-success/10 border-success/20" },
  { grade: "A", min: 80, color: "text-success", bg: "bg-success/10 border-success/20" },
  { grade: "B+", min: 70, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  { grade: "B", min: 60, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  { grade: "C+", min: 50, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  { grade: "C", min: 40, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  { grade: "D", min: 30, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  { grade: "F", min: 0, color: "text-error", bg: "bg-error/10 border-error/20" },
];

function getGradeInfo(pct: number) {
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t;
  }
  return { grade: "F", color: "text-error", bg: "bg-error/10 border-error/20" };
}

interface StudentMark {
  student: string;
  student_name: string;
  score: string;
  diagnosed_level?: string;
}

export default function ClassInchargeExamMarkEntryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { defaultCompany } = useAuth();
  const examId = decodeURIComponent(params.id as string);

  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  // 1. Fetch Exam Plan
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["assessment-plan", examId],
    queryFn: () => getAssessmentPlan(examId),
    staleTime: 60_000,
  });

  const isDiagnosisExam = plan?.assessment_group?.toLowerCase().includes("diagnos");

  // 2. Fetch Students from the Exam's Student Group
  const { data: sgData, isLoading: sgLoading } = useQuery({
    queryKey: ["student-group-detail", plan?.student_group],
    queryFn: async () => {
      const res = await getStudentGroup(plan!.student_group);
      return res.data;
    },
    enabled: !!plan?.student_group,
    staleTime: 60_000,
  });

  // 3. Fetch Existing Assessment Results
  const { data: existingResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["exam-results", examId],
    queryFn: () => getExamResults(examId),
    staleTime: 30_000,
  });

  const initializedRef = useRef(false);
  const dirtyStudentsRef = useRef<Set<string>>(new Set());

  // Initialize marks from Student Group & Existing Results
  useEffect(() => {
    if (!sgData?.students) return;
    const active = sgData.students.filter((s) => s.active !== 0);
    const existingMap = new Map<string, { score: number; diagnosed_level?: string }>();

    if (existingResults?.data) {
      for (const r of existingResults.data) {
        existingMap.set(r.student, {
          score: r.total_score,
          diagnosed_level: (r as any).custom_diagnosed_level,
        });
      }
    }

    setMarks((prev) => {
      // First load initialization
      if (!initializedRef.current || prev.length === 0) {
        initializedRef.current = true;
        return active.map((s) => {
          const ex = existingMap.get(s.student);
          return {
            student: s.student,
            student_name: s.student_name ?? s.student,
            score: ex !== undefined ? String(ex.score) : "",
            diagnosed_level: ex?.diagnosed_level || "",
          };
        });
      }

      // Subsequent background refetches: preserve modified rows
      const currentScores = new Map(
        prev.map((m) => [m.student, { score: m.score, dl: m.diagnosed_level }])
      );
      return active.map((s) => {
        const isDirty = dirtyStudentsRef.current.has(s.student);
        const current = currentScores.get(s.student);
        const ex = existingMap.get(s.student);
        const score =
          isDirty && current?.score !== undefined
            ? current.score
            : ex !== undefined
            ? String(ex.score)
            : current?.score ?? "";
        const diagnosed_level =
          isDirty && current?.dl !== undefined
            ? current.dl
            : ex?.diagnosed_level || current?.dl || "";

        return {
          student: s.student,
          student_name: s.student_name ?? s.student,
          score,
          diagnosed_level,
        };
      });
    });
  }, [sgData, existingResults]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (data: {
      assessment_plan: string;
      marks: { student: string; score: number; diagnosed_level?: string }[];
    }) => saveMarks(data),
    onSuccess: (result: { created: number; errors?: string[]; hasErrors?: boolean }) => {
      dirtyStudentsRef.current.clear();
      if (result.errors?.length) {
        toast.warning(
          `Saved marks for ${result.created} students, but ${result.errors.length} failed.`,
          { duration: 8000 }
        );
        for (const err of result.errors) toast.error(err, { duration: 6000 });
      } else if (result.created > 0) {
        toast.success(`Marks saved successfully for ${result.created} students`);
      }

      queryClient.setQueryData(
        ["submitted-assessment-plan-names"],
        (prev: Set<string> | undefined) => {
          const next = new Set<string>(prev ? Array.from(prev) : []);
          next.add(examId);
          return next;
        }
      );

      queryClient.invalidateQueries({ queryKey: ["exam-results", examId] });
      queryClient.invalidateQueries({ queryKey: ["submitted-assessment-plan-names"] });
      queryClient.invalidateQueries({ queryKey: ["ci-assessment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-plans"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save marks");
    },
  });

  function handleScoreChange(studentId: string, value: string) {
    setMarks((prev) =>
      prev.map((m) => {
        if (m.student === studentId) {
          dirtyStudentsRef.current.add(studentId);
          return { ...m, score: value };
        }
        return m;
      })
    );
  }

  function handleDiagnosedLevelChange(studentId: string, value: string) {
    setMarks((prev) =>
      prev.map((m) => {
        if (m.student === studentId) {
          dirtyStudentsRef.current.add(studentId);
          return { ...m, diagnosed_level: value };
        }
        return m;
      })
    );
  }

  function handleSave() {
    const maxScore = plan?.maximum_assessment_score || 100;
    const hasExisting = (existingResults?.data?.length ?? 0) > 0;
    const validMarks: { student: string; score: number; diagnosed_level?: string }[] = [];
    const errors: string[] = [];

    for (const m of marks) {
      if (hasExisting && !dirtyStudentsRef.current.has(m.student)) continue;
      if (m.score === "" || m.score === null || m.score === undefined) continue;

      const num = Number(m.score);
      if (isNaN(num) || num < 0) {
        errors.push(`${m.student_name}: invalid score (${m.score})`);
        continue;
      }
      if (num > maxScore) {
        errors.push(`${m.student_name}: score ${num} exceeds max (${maxScore})`);
        continue;
      }

      validMarks.push({
        student: m.student,
        score: num,
        diagnosed_level: m.diagnosed_level || undefined,
      });
    }

    if (errors.length > 0) {
      toast.error(`Please correct score errors:\n${errors.slice(0, 3).join("\n")}`);
      return;
    }

    if (validMarks.length === 0) {
      toast.info("No modified student marks to save");
      return;
    }

    saveMutation.mutate({
      assessment_plan: examId,
      marks: validMarks,
    });
  }

  const filteredMarks = useMemo(() => {
    if (!studentSearch.trim()) return marks;
    const q = studentSearch.toLowerCase();
    return marks.filter(
      (m) =>
        m.student_name.toLowerCase().includes(q) ||
        m.student.toLowerCase().includes(q)
    );
  }, [marks, studentSearch]);

  const maxScore = plan?.maximum_assessment_score || 100;
  const scoredCount = marks.filter((m) => m.score !== "").length;
  const totalStudents = marks.length;

  const averageScore = useMemo(() => {
    const valid = marks.filter((m) => m.score !== "").map((m) => Number(m.score));
    if (valid.length === 0) return 0;
    const sum = valid.reduce((a, b) => a + b, 0);
    return Math.round(sum / valid.length);
  }, [marks]);

  const isLoading = planLoading || sgLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="py-24 text-center text-text-tertiary flex flex-col items-center gap-3">
        <GifLoader size="lg" />
        <p className="text-sm font-semibold animate-pulse">Loading examination mark sheet...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 pb-20">
      <BreadcrumbNav />

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-light pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/class-incharge/exams")}
            className="rounded-xl gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Exams
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                {plan?.assessment_name || "Exam Mark Entry"}
              </h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                {plan?.course || "General Paper"}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Batch: <strong className="text-text-primary">{plan?.student_group}</strong> · Max Marks:{" "}
              <strong className="text-text-primary">{maxScore}</strong>
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white rounded-xl gap-2 font-bold shadow-md shadow-primary/20 px-6 self-start sm:self-auto"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving Marks...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Mark Sheet
            </>
          )}
        </Button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-surface border-border-light p-3.5 rounded-xl shadow-2xs">
          <p className="text-xs text-text-tertiary font-semibold uppercase">Total Students</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalStudents}</p>
        </Card>

        <Card className="bg-surface border-border-light p-3.5 rounded-xl shadow-2xs">
          <p className="text-xs text-text-tertiary font-semibold uppercase">Marks Entered</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-success">{scoredCount}</span>
            <span className="text-xs text-text-tertiary">/ {totalStudents}</span>
          </div>
        </Card>

        <Card className="bg-surface border-border-light p-3.5 rounded-xl shadow-2xs">
          <p className="text-xs text-text-tertiary font-semibold uppercase">Batch Average</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-primary">{averageScore}</span>
            <span className="text-xs text-text-tertiary">/ {maxScore}</span>
          </div>
        </Card>

        <Card className="bg-surface border-border-light p-3.5 rounded-xl shadow-2xs">
          <p className="text-xs text-text-tertiary font-semibold uppercase">Scheduled Date</p>
          <p className="text-sm font-bold text-text-primary mt-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-text-tertiary" />
            {formatDate(plan?.schedule_date)}
          </p>
        </Card>
      </div>

      {/* Marksheet Card */}
      <Card className="border border-border-light bg-surface shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border-light bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold text-text-primary">
                Student Score Roster
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-surface font-semibold text-text-secondary">
                {filteredMarks.length} Students
              </Badge>
            </div>

            <div className="relative min-w-[240px]">
              <input
                type="text"
                placeholder="Search student by name or ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3.5 py-1.5 text-xs bg-surface border border-border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-border-light text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">#</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3 text-center w-36">Score (Max: {maxScore})</th>
                  <th className="px-5 py-3 text-center w-28">Percentage</th>
                  <th className="px-5 py-3 text-center w-24">Grade</th>
                  {isDiagnosisExam && (
                    <th className="px-5 py-3 text-center w-40">Diagnosed Level</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredMarks.length === 0 ? (
                  <tr>
                    <td colSpan={isDiagnosisExam ? 7 : 6} className="p-8 text-center text-text-tertiary">
                      No matching students found in this roster.
                    </td>
                  </tr>
                ) : (
                  filteredMarks.map((m, idx) => {
                    const numScore = m.score !== "" ? Number(m.score) : NaN;
                    const pct = !isNaN(numScore) && maxScore > 0 ? (numScore / maxScore) * 100 : NaN;
                    const gradeInfo = !isNaN(pct) ? getGradeInfo(pct) : null;
                    const isExceeding = !isNaN(numScore) && numScore > maxScore;

                    return (
                      <tr
                        key={m.student}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-5 py-3 text-center font-mono text-text-tertiary">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-3 font-semibold text-text-primary">
                          {m.student_name}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-text-tertiary">
                          {m.student}
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={maxScore}
                              step="any"
                              placeholder="—"
                              value={m.score}
                              onChange={(e) => handleScoreChange(m.student, e.target.value)}
                              className={`w-24 text-center py-1.5 px-2 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 ${
                                isExceeding
                                  ? "border-error text-error bg-error/5 focus:ring-error/20"
                                  : m.score !== ""
                                  ? "border-primary/40 bg-surface font-extrabold text-primary focus:ring-primary/20"
                                  : "border-border-input bg-slate-50/50 dark:bg-slate-900/50 text-text-secondary focus:ring-primary/20"
                              }`}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center font-bold">
                          {!isNaN(pct) ? (
                            <span className={gradeInfo?.color}>{pct.toFixed(1)}%</span>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {gradeInfo ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-extrabold text-[11px] border ${gradeInfo.bg} ${gradeInfo.color}`}
                            >
                              {gradeInfo.grade}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">—</span>
                          )}
                        </td>
                        {isDiagnosisExam && (
                          <td className="px-5 py-2.5 text-center">
                            <select
                              value={m.diagnosed_level || ""}
                              onChange={(e) =>
                                handleDiagnosedLevelChange(m.student, e.target.value)
                              }
                              className="px-2.5 py-1.5 text-xs bg-surface border border-border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
                            >
                              <option value="">Select Level</option>
                              <option value="Level 1">Level 1</option>
                              <option value="Level 2">Level 2</option>
                              <option value="Level 3">Level 3</option>
                              <option value="Level 4">Level 4</option>
                              <option value="Level 5">Level 5</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
