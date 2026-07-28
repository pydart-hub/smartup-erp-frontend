"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award,
  ChevronLeft,
  Save,
  Star,
  User,
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInstructors } from "@/lib/api/employees";
import {
  createEvaluation,
  getEvaluation,
  updateEvaluation,
} from "@/lib/api/trainingEvaluation";

interface ScoreMetrics {
  classroom_presence: number; // Max 10
  lesson_planning: number; // Max 10
  teaching_presentation: number; // Max 15
  voice_modulation: number; // Max 10
  student_engagement: number; // Max 10
  classroom_management: number; // Max 15
  board_work: number; // Max 10
  time_management: number; // Max 5
  parent_communication: number; // Max 5
  overall_demonstration: number; // Max 10
}

function TrainingEvaluationEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { defaultCompany, user } = useAuth();

  const editId = searchParams.get("id") || "";
  const preselectedTeacher = searchParams.get("teacher") || "";

  // Fetch all instructors for selection list
  const { data: instrRes, isLoading: isInstructorsLoading } = useQuery({
    queryKey: ["instructors-all"],
    queryFn: () => getInstructors({ limit_page_length: 500 }),
    staleTime: 5 * 60_000,
  });

  const instructors = instrRes?.data || [];

  // Fetch evaluation if in edit mode
  const { data: existingEval, isLoading: isEditLoading } = useQuery({
    queryKey: ["evaluation", editId],
    queryFn: () => getEvaluation(editId),
    enabled: !!editId,
  });

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [branchName, setBranchName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [programName, setProgramName] = useState(
    "15-Day Professional Development Program"
  );

  const [metrics, setMetrics] = useState<ScoreMetrics>({
    classroom_presence: 0,
    lesson_planning: 0,
    teaching_presentation: 0,
    voice_modulation: 0,
    student_engagement: 0,
    classroom_management: 0,
    board_work: 0,
    time_management: 0,
    parent_communication: 0,
    overall_demonstration: 0,
  });

  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");

  // Set default evaluator / branch company
  useEffect(() => {
    if (defaultCompany) {
      setBranchName(defaultCompany);
    }
    if (user && !editId && !evaluatorName) {
      setEvaluatorName(user.full_name || user.name || "");
    }
  }, [defaultCompany, user, editId]);

  // Load existing values for editing
  useEffect(() => {
    if (existingEval) {
      setSelectedTeacher(existingEval.teacher_name);
      setBranchName(existingEval.branch);
      setSubjectName(existingEval.subject);
      setEvaluatorName(existingEval.evaluator);
      setEvaluationDate(existingEval.evaluation_date);
      setProgramName(existingEval.program_name);
      setMetrics({
        classroom_presence: existingEval.classroom_presence,
        lesson_planning: existingEval.lesson_planning,
        teaching_presentation: existingEval.teaching_presentation,
        voice_modulation: existingEval.voice_modulation,
        student_engagement: existingEval.student_engagement,
        classroom_management: existingEval.classroom_management,
        board_work: existingEval.board_work,
        time_management: existingEval.time_management,
        parent_communication: existingEval.parent_communication,
        overall_demonstration: existingEval.overall_demonstration,
      });
      setStrengths(existingEval.strengths);
      setAreasForImprovement(existingEval.areas_for_improvement);
    }
  }, [existingEval]);

  // Handle preselected teacher
  useEffect(() => {
    if (!editId && preselectedTeacher && instructors.length > 0) {
      const found = instructors.find(
        (i) => i.name === preselectedTeacher || i.instructor_name === preselectedTeacher
      );
      if (found) {
        setSelectedTeacher(found.name);
      }
    }
  }, [preselectedTeacher, instructors, editId]);

  const handleMetricChange = (key: keyof ScoreMetrics, value: number) => {
    setMetrics((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const calculateOverall = () => {
    return Object.values(metrics).reduce((a, b) => a + b, 0);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const teacherInfo = instructors.find((i) => i.name === selectedTeacher);
      const payload = {
        teacher_name: selectedTeacher,
        teacher_display_name: teacherInfo?.instructor_name || selectedTeacher,
        branch: branchName,
        subject: subjectName,
        evaluator: evaluatorName,
        evaluation_date: evaluationDate,
        program_name: programName,
        ...metrics,
        strengths,
        areas_for_improvement: areasForImprovement,
      };

      if (editId) {
        return updateEvaluation(editId, payload);
      } else {
        return createEvaluation(payload);
      }
    },
    onSuccess: () => {
      toast.success(
        editId
          ? "Evaluation Scorecard updated successfully!"
          : "Evaluation Scorecard saved successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      router.push("/dashboard/branch-manager/teachers/training-evaluation");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save evaluation scorecard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    saveMutation.mutate();
  };

  const criteriaList = [
    {
      key: "classroom_presence" as const,
      label: "1. Classroom Presence & Confidence",
      desc: "Confidence, body language, authority, and warmth in the classroom.",
      max: 10,
    },
    {
      key: "lesson_planning" as const,
      label: "2. Lesson Planning & Preparation",
      desc: "Lesson plan structure, readiness, objectives clarity, and resource setup.",
      max: 10,
    },
    {
      key: "teaching_presentation" as const,
      label: "3. Teaching Presentation & Subject Clarity",
      desc: "Clarity of concepts, presentation flow, simplicity of delivery, and explanations.",
      max: 15,
    },
    {
      key: "voice_modulation" as const,
      label: "4. Voice Modulation & Communication",
      desc: "Fluency, loudness modulation, accent, clarity of pronunciation, and pacing.",
      max: 10,
    },
    {
      key: "student_engagement" as const,
      label: "5. Student Engagement & Questioning",
      desc: "Interaction level, encouraging student feedback/questions, and checking understanding.",
      max: 10,
    },
    {
      key: "classroom_management" as const,
      label: "6. Classroom Management & Discipline",
      desc: "Maintaining class control, handling distraction, and establishing decorum.",
      max: 15,
    },
    {
      key: "board_work" as const,
      label: "7. Board Work & Visual Presentation",
      desc: "Handwriting neatness, layout, diagrams clarity, and structuring visual content.",
      max: 10,
    },
    {
      key: "time_management" as const,
      label: "8. Time Management & Lesson Closure",
      desc: "Adherence to session timeline, lesson summarization, and task setting.",
      max: 5,
    },
    {
      key: "parent_communication" as const,
      label: "9. Parent Communication & Professional Behaviour",
      desc: "Mannerisms, dressing standards, approach towards parents and team.",
      max: 5,
    },
    {
      key: "overall_demonstration" as const,
      label: "10. Overall Teaching Demonstration",
      desc: "General effectiveness of the demo session, overall impact.",
      max: 10,
    },
  ];

  const isLoading = isInstructorsLoading || (editId && isEditLoading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl flex items-center gap-1.5"
          onClick={() =>
            router.push("/dashboard/branch-manager/teachers/training-evaluation")
          }
        >
          <ChevronLeft className="h-4 w-4" />
          Back to List
        </Button>
        <BreadcrumbNav />
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-violet-600 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        <div className="relative z-10">
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {programName}
          </span>
          <h1 className="text-3xl font-extrabold mt-3 tracking-tight">
            {editId ? "Edit Scorecard Record" : "New Scorecard Entry"}
          </h1>
          <p className="text-white/80 mt-1 max-w-lg text-sm">
            Evaluate teacher training performance criteria out of 100 total marks.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General details scorecard header */}
        <Card className="border border-border-light shadow-sm overflow-hidden rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-text-primary border-b pb-3 border-border-light flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Scorecard Headers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teacher Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Teacher Name
                </label>
                {isLoading ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                ) : (
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border-light bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                  >
                    <option value="">Choose a teacher...</option>
                    {instructors.map((inst) => (
                      <option key={inst.name} value={inst.name}>
                        {inst.instructor_name} ({inst.name})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Branch
                </label>
                <div className="relative">
                  <Input
                    placeholder="Enter branch / company"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    disabled
                    className="pl-10"
                  />
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Subject
                </label>
                <div className="relative">
                  <Input
                    placeholder="Enter Subject (e.g. Physics, Chemistry)"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
              </div>

              {/* Evaluator */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Evaluator Name
                </label>
                <div className="relative">
                  <Input
                    placeholder="Enter Evaluator Name"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    required
                    disabled
                    className="pl-10"
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
              </div>

              {/* Program Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Program Name
                </label>
                <div className="relative">
                  <Input
                    placeholder="Program details"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
              </div>

              {/* Evaluation Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Evaluation Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Metrics */}
        <Card className="border border-border-light shadow-sm overflow-hidden rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-3 border-border-light flex-wrap gap-2">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Evaluation Criteria Points
              </h2>
              <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold text-sm">
                Total Score: {calculateOverall()}/100 Marks
              </div>
            </div>

            <div className="space-y-6">
              {criteriaList.map(({ key, label, desc, max }) => (
                <div
                  key={key}
                  className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-border-light space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">{label}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-extrabold text-primary font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-sm border border-border-light">
                        {metrics[key]}
                      </span>
                      <span className="text-xs text-text-tertiary">/ {max}</span>
                    </div>
                  </div>

                  {/* Range Slider & Stars */}
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max={max}
                      value={metrics[key]}
                      onChange={(e) => handleMetricChange(key, parseInt(e.target.value))}
                      className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: max }).map((_, i) => (
                        <Star
                          key={i}
                          onClick={() => handleMetricChange(key, i + 1)}
                          className={`h-3.5 w-3.5 cursor-pointer transition-colors ${
                            i < metrics[key]
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="border border-border-light shadow-sm overflow-hidden rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-text-primary border-b pb-3 border-border-light flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Evaluator Remarks
            </h2>

            <div className="grid grid-cols-1 gap-6">
              {/* Strengths */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Strengths
                </label>
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Enter strengths..."
                  rows={3}
                  required
                  className="w-full p-4 rounded-xl border border-border-light bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow resize-none"
                />
              </div>

              {/* Areas for Improvement */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Areas for Improvement
                </label>
                <textarea
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  placeholder="Enter areas for improvement..."
                  rows={3}
                  required
                  className="w-full p-4 rounded-xl border border-border-light bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl px-6"
            onClick={() =>
              router.push("/dashboard/branch-manager/teachers/training-evaluation")
            }
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-xl px-8 bg-primary hover:bg-primary/95 flex items-center gap-2"
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Evaluation"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

export default function TrainingEvaluationPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <TrainingEvaluationEntryPage />
    </Suspense>
  );
}
