"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Save,
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  Search,
  Clock,
  Hash,
  AlertCircle,
  Filter,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import {
  getAssessmentPlans,
  getAssessmentGroups,
  getAssessmentPlan,
  getExamResults,
  saveMarks,
} from "@/lib/api/assessment";
import { getStudentGroups, getBranches } from "@/lib/api/enrollment";
import { useAuth } from "@/lib/hooks/useAuth";

const GRADE_THRESHOLDS = [
  { grade: "A+", min: 90, color: "text-success" },
  { grade: "A", min: 80, color: "text-success" },
  { grade: "B+", min: 70, color: "text-primary" },
  { grade: "B", min: 60, color: "text-primary" },
  { grade: "C+", min: 50, color: "text-warning" },
  { grade: "C", min: 40, color: "text-warning" },
  { grade: "D+", min: 30, color: "text-orange-500" },
  { grade: "D", min: 0, color: "text-error" },
];

function getGrade(pct: number): { grade: string; color: string } {
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t;
  }
  return { grade: "D", color: "text-error" };
}

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

import { CheckCircle2, ArrowRight, ClipboardList } from "lucide-react";

export default function CurriculumMarksEntryPage() {
  const router = useRouter();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "pending" | "completed">("dashboard");

  // Fetch all exams across all branches
  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["assessment-plans-curriculum-all"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student_group",
              "assessment_name",
              "course",
              "schedule_date",
              "maximum_assessment_score",
              "custom_branch",
              "assessment_group"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            order_by: "schedule_date desc",
            limit_page_length: "1000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  // Fetch entered plan names by querying assessment results
  const { data: enteredPlans = new Set<string>(), isLoading: enteredLoading } = useQuery({
    queryKey: ["assessment-results-entered-plans"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            group_by: "assessment_plan",
            limit_page_length: "1000"
          }
        })
      }).then(r => r.json());
      return new Set<string>(res.data?.map((r: any) => r.assessment_plan) ?? []);
    },
    staleTime: 30_000,
  });

  const pendingExams = useMemo(() => {
    return allExams.filter((e: any) => !enteredPlans.has(e.name));
  }, [allExams, enteredPlans]);

  const completedExams = useMemo(() => {
    return allExams.filter((e: any) => enteredPlans.has(e.name));
  }, [allExams, enteredPlans]);

  const isLoading = examsLoading || enteredLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />

      <AnimatePresence mode="wait">
        {selectedExamId ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ExamMarksEntryEditor
              examId={selectedExamId}
              onBack={() => setSelectedExamId(null)}
            />
          </motion.div>
        ) : viewMode === "dashboard" ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
                  <ClipboardList className="h-7 w-7 text-primary" />
                  Marks Entry Dashboard
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Track exam progress and enter assessment marks globally across all branches.
                </p>
              </div>
              <Button 
                variant="primary" 
                className="gap-2 shrink-0" 
                onClick={() => router.push("/dashboard/curriculum-dept/marks-entry/create")}
              >
                <FileText className="h-4 w-4" />
                Assign New Exam
              </Button>
            </div>

            {isLoading ? (
              <div className="py-24 flex items-center justify-center">
                <GifLoader size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Card */}
                <Card 
                  hover 
                  className="cursor-pointer border-l-4 border-l-orange-500 overflow-hidden relative group"
                  onClick={() => setViewMode("pending")}
                >
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <span className="text-xs font-black tracking-widest text-orange-600 dark:text-orange-400 uppercase">
                          Action Required
                        </span>
                        <h2 className="text-2xl font-bold text-text-primary group-hover:text-orange-500 transition-colors">
                          Pending Marks Entry
                        </h2>
                        <p className="text-sm text-text-secondary">
                          Exams that have been scheduled but do not have marks entered yet.
                        </p>
                      </div>
                      <div className="p-3.5 bg-orange-50 dark:bg-orange-950/30 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                      <span className="text-4xl font-extrabold text-text-primary">
                        {pendingExams.length}
                      </span>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        Go to Pending <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Completed Card */}
                <Card 
                  hover 
                  className="cursor-pointer border-l-4 border-l-success overflow-hidden relative group"
                  onClick={() => setViewMode("completed")}
                >
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <span className="text-xs font-black tracking-widest text-success uppercase">
                          Completed
                        </span>
                        <h2 className="text-2xl font-bold text-text-primary group-hover:text-success transition-colors">
                          Marks Entered Exams
                        </h2>
                        <p className="text-sm text-text-secondary">
                          Exams with successfully recorded student assessment marks.
                        </p>
                      </div>
                      <div className="p-3.5 bg-green-50 dark:bg-green-950/30 rounded-2xl text-success group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                      <span className="text-4xl font-extrabold text-text-primary">
                        {completedExams.length}
                      </span>
                      <span className="text-xs font-bold text-success flex items-center gap-1">
                        View List <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <ExamSelector 
              onSelect={setSelectedExamId}
              viewMode={viewMode}
              onBack={() => setViewMode("dashboard")}
              allExams={viewMode === "pending" ? pendingExams : completedExams}
              enteredPlans={enteredPlans}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------
// EXAM SELECTOR COMPONENT
// ----------------------------------------------------------------------
function ExamSelector({ 
  onSelect,
  viewMode,
  onBack,
  allExams,
  enteredPlans
}: { 
  onSelect: (id: string) => void;
  viewMode: "pending" | "completed";
  onBack: () => void;
  allExams: any[];
  enteredPlans: Set<string>;
}) {
  const { defaultCompany } = useAuth();
  
  const [branchFilter, setBranchFilter] = useState(defaultCompany || "");
  const [groupFilter, setGroupFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  const { data: groups = [] } = useQuery({
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
      return (res.data ?? []).filter((g: any) => 
        g.name !== "All Assessment Groups" && 
        g.assessment_group_name !== "All Assessment Groups"
      );
    },
    staleTime: 120_000,
  });

  const { data: studentGroups = [] } = useQuery({
    queryKey: ["student-groups", branchFilter],
    queryFn: async () => {
      if (!branchFilter) return [];
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Student Group",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
            filters: JSON.stringify([["custom_branch", "=", branchFilter]]),
            limit_page_length: "200"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Filter exams locally
  const filteredExams = useMemo(() => {
    return allExams.filter((exam: any) => {
      if (branchFilter && exam.custom_branch !== branchFilter) return false;
      if (groupFilter && exam.assessment_group !== groupFilter) return false;
      if (batchFilter && exam.student_group !== batchFilter) return false;
      return true;
    });
  }, [allExams, branchFilter, groupFilter, batchFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {viewMode === "pending" ? "Pending Marks Entry" : "Marks Entered Exams"}
            </h1>
            <p className="text-xs text-text-secondary">
              Viewing filtered exam records below.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase">Examination Name</label>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Exams</option>
                {groups.map((g: any) => (
                  <option key={g.name} value={g.name}>{g.assessment_group_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase">Class / Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Classes</option>
                {studentGroups.map((sg: any) => (
                  <option key={sg.name} value={sg.name}>{sg.student_group_name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredExams.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Filter className="mx-auto h-12 w-12 text-text-tertiary/50 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">No assessments found</h3>
          <p className="text-sm text-text-secondary mt-1">Try adjusting your filters to find scheduled exams.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <Card key={exam.name} hover onClick={() => onSelect(exam.name)} className="cursor-pointer border-slate-200/90 shadow-sm transition-all group">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
                    {exam.course}
                  </Badge>
                  <span className="text-xs text-text-tertiary font-mono">{exam.name}</span>
                </div>
                <CardTitle className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                  {exam.assessment_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> <span>{exam.student_group}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> <span>{formatDate(exam.schedule_date)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// EXAM MARKS ENTRY EDITOR
// ----------------------------------------------------------------------
function ExamMarksEntryEditor({ examId, onBack }: { examId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [marks, setMarks] = useState<{ student: string; student_name: string; score: string }[]>([]);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["assessment-plan", examId],
    queryFn: () => getAssessmentPlan(examId),
    staleTime: 60_000,
  });

  const { data: sgData, isLoading: sgLoading } = useQuery({
    queryKey: ["student-group-detail", plan?.student_group],
    queryFn: async () => {
      const { getStudentGroup } = await import("@/lib/api/enrollment");
      const res = await getStudentGroup(plan!.student_group);
      return res.data;
    },
    enabled: !!plan?.student_group,
    staleTime: 60_000,
  });

  const { data: existingResults } = useQuery({
    queryKey: ["exam-results", examId],
    queryFn: () => getExamResults(examId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!sgData?.students) return;
    const activeStudents = sgData.students.filter((s: any) => s.active !== 0);
    const existingMap = new Map<string, number>();
    if (existingResults?.data) {
      for (const r of existingResults.data) existingMap.set(r.student, r.total_score);
    }
    setMarks(
      activeStudents.map((s: any) => ({
        student: s.student,
        student_name: s.student_name ?? s.student,
        score: existingMap.has(s.student) ? String(existingMap.get(s.student)) : "",
      }))
    );
  }, [sgData, existingResults]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveMarks(data),
    onSuccess: (result) => {
      if (result.created > 0) toast.success(`Marks saved for ${result.created} students`);
      if (result.errors?.length) for (const err of result.errors) toast.error(err);
      queryClient.invalidateQueries({ queryKey: ["exam-results", examId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save marks"),
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
    const validMarks: any[] = [];
    const errors: string[] = [];

    for (const m of marks) {
      if (!m.score) continue;
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

    if (errors.length) return toast.error(errors.join(", "));
    if (validMarks.length === 0) return toast.error("Enter at least one score.");
    
    saveMutation.mutate({ assessment_plan: examId, marks: validMarks });
  }

  if (planLoading || sgLoading) return <GifLoader />;
  if (!plan) return <p>Exam not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to selection
          </button>
          <h1 className="text-2xl font-bold text-text-primary">{plan.course} Mark Entry</h1>
          <p className="text-sm text-text-secondary mt-0.5">{plan.assessment_group} | {plan.student_group}</p>
        </div>
        <Button variant="primary" size="md" onClick={handleSave} disabled={saveMutation.isPending || marks.length === 0}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveMutation.isPending ? "Saving..." : "Save Marks"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(plan.schedule_date)}</span>
            <span className="flex items-center gap-1.5"><Hash className="h-4 w-4" />Subject Total: {plan.maximum_assessment_score}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{marks.length} students</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Students List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-text-secondary">
                  <th className="px-3 py-3 font-medium w-12">#</th>
                  <th className="px-3 py-3 font-medium">Student Name</th>
                  <th className="px-3 py-3 font-medium w-36">Marks Obtained (/{plan.maximum_assessment_score})</th>
                  <th className="px-3 py-3 font-medium w-24">Percentage</th>
                  <th className="px-3 py-3 font-medium w-24">Grade</th>
                  <th className="px-3 py-3 font-medium w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m, idx) => {
                  const maxScore = plan.maximum_assessment_score;
                  const numScore = m.score !== "" ? Number(m.score) : null;
                  const pct = numScore !== null && maxScore > 0 ? Math.round((numScore / maxScore) * 100 * 10) / 10 : null;
                  const gradeInfo = pct !== null ? getGrade(pct) : null;
                  const isPass = pct !== null && pct >= 30; // Below 30 is Fail per PDF
                  const overMax = numScore !== null && numScore > maxScore;

                  return (
                    <tr key={m.student} className="border-b border-border-light last:border-0 hover:bg-app-bg/50">
                      <td className="px-3 py-3 text-text-tertiary">{idx + 1}</td>
                      <td className="px-3 py-3 font-medium text-text-primary">{m.student_name}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={maxScore}
                          step="0.5"
                          value={m.score}
                          onChange={(e) => handleScoreChange(idx, e.target.value)}
                          placeholder="-"
                          className={`w-28 h-9 rounded-[8px] border px-3 text-sm text-center ${overMax ? "border-error bg-error-light" : "border-border-input bg-surface focus:border-primary"}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-text-secondary">
                        {pct !== null ? `${pct}%` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        {gradeInfo ? <span className={`font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span> : "-"}
                      </td>
                      <td className="px-3 py-3">
                        {pct !== null ? (
                          isPass ? <Badge variant="success">Pass</Badge> : <Badge variant="error">Fail</Badge>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
