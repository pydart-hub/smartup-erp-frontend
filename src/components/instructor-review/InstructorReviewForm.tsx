"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Send,
  User,
  School,
  BookOpen,
  Plus,
  X,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParentData } from "@/app/dashboard/parent/page";

const BRANCH_OPTIONS = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

export interface InstructorReviewItem {
  id: string; // internal local key
  instructorId: string;
  course: string;
  rating: number;
  hoverRating: number | null;
  strengths: string[];
  strengthInput: string;
  weaknesses: string[];
  weaknessInput: string;
  detailedFeedback: string;
  suggestions: string;
}

interface Props {
  initialBranch?: string;
  initialStudentName?: string;
  initialStudentPhone?: string;
  onSuccess?: () => void;
}

export function InstructorReviewForm({
  initialBranch,
  initialStudentName = "",
  initialStudentPhone = "",
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const { data: parentData } = useParentData(user?.email);
  const children = parentData?.children ?? [];

  // Scope branches strictly to student's branch if available
  const studentBranches = Array.from(
    new Set(children.map((c) => c.custom_branch).filter(Boolean) as string[])
  );
  const allowedBranches = studentBranches.length > 0 ? studentBranches : (initialBranch ? [initialBranch] : BRANCH_OPTIONS);

  // Student background context
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [branch, setBranch] = useState(
    initialBranch || (studentBranches.length > 0 ? studentBranches[0] : BRANCH_OPTIONS[0])
  );
  const [studentName, setStudentName] = useState(initialStudentName);
  const [studentPhone, setStudentPhone] = useState(initialStudentPhone);

  // Multi-instructor review state: array of instructor reviews
  const [reviewList, setReviewList] = useState<InstructorReviewItem[]>([
    {
      id: "rev-1",
      instructorId: "",
      course: "",
      rating: 5,
      hoverRating: null,
      strengths: [],
      strengthInput: "",
      weaknesses: [],
      weaknessInput: "",
      detailedFeedback: "",
      suggestions: "",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fill student data from logged-in parent
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      const first = children[0];
      setSelectedChildId(first.name);
      setStudentName(first.student_name);
      if (first.custom_branch) {
        setBranch(first.custom_branch);
      }
      if (first.student_mobile_number) {
        setStudentPhone(first.student_mobile_number);
      }
    }
  }, [children, selectedChildId]);

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    const child = children.find((c) => c.name === childId);
    if (child) {
      setStudentName(child.student_name);
      if (child.custom_branch) {
        setBranch(child.custom_branch);
      }
      if (child.student_mobile_number) {
        setStudentPhone(child.student_mobile_number);
      }
    }
  };

  // Check which instructors this student has already reviewed this month
  const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const currentMonthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const { data: monthlyCheckData, isLoading: checkingMonthly, refetch: refetchMonthlyReviews } = useQuery({
    queryKey: ["monthly-review-check", selectedChildId, studentName],
    queryFn: async () => {
      const q = selectedChildId
        ? `student=${encodeURIComponent(selectedChildId)}`
        : `branch=${encodeURIComponent(branch)}`;
      const res = await fetch(`/api/instructor-reviews?${q}`);
      if (!res.ok) return { reviewedInstructorIds: [], reviewedInstructorNames: [] };
      const json = await res.json();
      const reviews = json.data || [];
      const thisMonthReviews = reviews.filter((r: any) => {
        const dateStr = r.review_date || r.creation;
        const matchesDate = dateStr && String(dateStr).startsWith(currentMonthPrefix);
        const matchesStudent = selectedChildId
          ? r.student === selectedChildId
          : r.student_name === studentName;
        return matchesDate && matchesStudent;
      });

      const reviewedInstructorIds = Array.from(new Set(thisMonthReviews.map((r: any) => r.instructor).filter(Boolean))) as string[];
      const reviewedInstructorNames = Array.from(new Set(thisMonthReviews.map((r: any) => r.instructor_name || r.instructor).filter(Boolean))) as string[];

      return {
        reviewedInstructorIds,
        reviewedInstructorNames,
        totalThisMonth: thisMonthReviews.length,
      };
    },
    enabled: !!(selectedChildId || studentName),
  });

  const reviewedInstructorIds = monthlyCheckData?.reviewedInstructorIds || [];
  const reviewedInstructorNames = monthlyCheckData?.reviewedInstructorNames || [];

  // Fetch instructors for the branch
  const { data: instructorsData, isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors-for-review", branch],
    queryFn: async () => {
      const res = await fetch(
        `/api/instructor-reviews/instructors?branch=${encodeURIComponent(branch)}`
      );
      if (!res.ok) throw new Error("Failed to fetch instructors");
      const json = await res.json();
      return json.data as Array<{ id: string; name: string; department?: string }>;
    },
    enabled: !!branch,
  });

  // Calculate available (unreviewed) instructors
  const allBranchInstructors = instructorsData || [];
  const availableInstructors = allBranchInstructors.filter(
    (inst) => !reviewedInstructorIds.includes(inst.id)
  );
  const allInstructorsReviewedThisMonth = allBranchInstructors.length > 0 && availableInstructors.length === 0;

  // Mutate an instructor review item in state
  const updateReviewItem = (id: string, updates: Partial<InstructorReviewItem>) => {
    setReviewList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const addAnotherInstructor = () => {
    setReviewList((prev) => [
      ...prev,
      {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        instructorId: "",
        course: "",
        rating: 5,
        hoverRating: null,
        strengths: [],
        strengthInput: "",
        weaknesses: [],
        weaknessInput: "",
        detailedFeedback: "",
        suggestions: "",
      },
    ]);
  };

  const removeInstructor = (id: string) => {
    if (reviewList.length <= 1) return;
    setReviewList((prev) => prev.filter((item) => item.id !== id));
  };

  const addStrengthToItem = (id: string) => {
    const item = reviewList.find((r) => r.id === id);
    if (!item) return;
    const val = item.strengthInput.trim();
    if (val && !item.strengths.includes(val)) {
      updateReviewItem(id, {
        strengths: [...item.strengths, val],
        strengthInput: "",
      });
    }
  };

  const removeStrengthFromItem = (id: string, tag: string) => {
    const item = reviewList.find((r) => r.id === id);
    if (!item) return;
    updateReviewItem(id, {
      strengths: item.strengths.filter((s) => s !== tag),
    });
  };

  const addWeaknessToItem = (id: string) => {
    const item = reviewList.find((r) => r.id === id);
    if (!item) return;
    const val = item.weaknessInput.trim();
    if (val && !item.weaknesses.includes(val)) {
      updateReviewItem(id, {
        weaknesses: [...item.weaknesses, val],
        weaknessInput: "",
      });
    }
  };

  const removeWeaknessFromItem = (id: string, tag: string) => {
    const item = reviewList.find((r) => r.id === id);
    if (!item) return;
    updateReviewItem(id, {
      weaknesses: item.weaknesses.filter((w) => w !== tag),
    });
  };

  const getRatingInfo = (score: number) => {
    if (score >= 5) return { label: "Exceptional / Outstanding", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (score === 4) return { label: "Very Good & Effective", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (score === 3) return { label: "Good / Satisfactory", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" };
    if (score === 2) return { label: "Needs Improvement", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" };
    return { label: "Urgent Improvement Needed", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate that each review item has an instructor selected
    for (let i = 0; i < reviewList.length; i++) {
      const item = reviewList[i];
      if (!item.instructorId) {
        setErrorMessage(`Please select Instructor #${i + 1}.`);
        return;
      }
    }

    const payloadReviews = reviewList.map((item) => {
      const matchedInstructor = instructorsData?.find((i) => i.id === item.instructorId);
      return {
        instructor: item.instructorId,
        instructor_name: matchedInstructor?.name || item.instructorId,
        branch,
        course: item.course.trim() || undefined,
        student: selectedChildId || undefined,
        student_name: studentName.trim() || "Student",
        student_phone: studentPhone.trim() || undefined,
        rating: item.rating,
        strengths: item.strengths,
        weaknesses: item.weaknesses,
        detailed_feedback: item.detailedFeedback.trim() || undefined,
        suggestions: item.suggestions.trim() || undefined,
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch("/api/instructor-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: payloadReviews }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Submission failed");
      }

      setSubmitSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto"
      >
        <Card className="border border-emerald-500/30 bg-gradient-to-b from-emerald-50/80 to-surface dark:from-emerald-950/20 dark:to-surface p-8 sm:p-10 text-center shadow-lg rounded-2xl">
          <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-primary tracking-tight mb-2">
            {reviewList.length > 1
              ? `${reviewList.length} Reviews Submitted!`
              : "Review Submitted!"}
          </h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed max-w-md mx-auto">
            Thank you for rating your instructors. Your feedback has been securely recorded and directly helps our faculty elevate teaching standards.
          </p>
          <Button
            onClick={() => {
              setSubmitSuccess(false);
              setReviewList([
                {
                  id: "rev-1",
                  instructorId: "",
                  course: "",
                  rating: 5,
                  hoverRating: null,
                  strengths: [],
                  strengthInput: "",
                  weaknesses: [],
                  weaknessInput: "",
                  detailedFeedback: "",
                  suggestions: "",
                },
              ]);
            }}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-transform active:scale-95"
          >
            Submit Another Feedback
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border border-slate-200/70 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-primary/10 via-brand-secondary/5 to-transparent p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Multi-Teacher Evaluation
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Rate & Review Your Instructors
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                Review one or multiple instructors at once. Rate each teacher out of 5, type their specific strengths, and note areas for improvement.
              </p>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700 items-center justify-center text-amber-500">
              <Star className="w-6 h-6 fill-current" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Child Picker (Only displayed if parent has multiple children) */}
          {children.length > 1 && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3 h-3 text-brand-primary" /> Select Child
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {children.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleChildSelect(c.name)}
                    className={`p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                      selectedChildId === c.name
                        ? "bg-brand-primary/10 border-brand-primary/40 text-primary font-bold shadow-2xs"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{c.student_name}</div>
                      <div className="text-[10px] text-slate-400">{c.custom_branch || "Branch student"}</div>
                    </div>
                    {selectedChildId === c.name && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branch Display (Locked to student's branch) */}
          <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <School className="w-3.5 h-3.5 text-slate-400" /> Center / Branch:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">{branch}</span>
              <Badge variant="outline" className="text-[10px] px-2 py-0 border-slate-200 dark:border-slate-700 text-brand-primary bg-brand-primary/5">
                Student Branch
              </Badge>
            </div>
          </div>

          {/* Monthly Review Limit Info / Banner */}
          {allInstructorsReviewedThisMonth ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sm">
                  All Instructors Reviewed for {currentMonthName}
                </p>
                <p className="leading-relaxed opacity-90">
                  {studentName || "You"} have already submitted evaluations for all instructors at this branch for {currentMonthName}.
                  Each teacher can only be evaluated once per calendar month.
                </p>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 pt-0.5">
                  You can submit your next evaluations at the start of next month. You can view all ratings in the <strong>Branch Feedback</strong> tab above.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-purple-500/5 border border-purple-500/15 text-purple-900 dark:text-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-medium flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                Monthly Policy: <strong>1 review per teacher per month</strong> ({currentMonthName})
              </span>
              {reviewedInstructorNames.length > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Reviewed: <strong className="text-emerald-600 dark:text-emerald-400">{reviewedInstructorNames.join(", ")}</strong> · Available: <strong className="text-brand-primary">{availableInstructors.length} teacher(s)</strong>
                </span>
              )}
            </div>
          )}

          {/* List of Modern Streamlined Instructor Review Cards */}
          <div className="space-y-4">
            {reviewList.map((item, index) => {
              const activeRating = item.hoverRating ?? item.rating;
              const ratingInfo = getRatingInfo(activeRating);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow space-y-3.5"
                >
                  {/* Top Bar: Instructor # badge + Instructor Select dropdown + Delete button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                        Instructor {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                      <select
                        value={item.instructorId}
                        onChange={(e) =>
                          updateReviewItem(item.id, { instructorId: e.target.value })
                        }
                        required
                        disabled={loadingInstructors || allInstructorsReviewedThisMonth}
                        className="w-full text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-1.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all cursor-pointer disabled:opacity-50"
                      >
                        <option value="">
                          {loadingInstructors ? "Loading instructors..." : "Select an Unreviewed Instructor *"}
                        </option>
                        {(instructorsData || []).map((inst) => {
                          const isAlreadyReviewed = reviewedInstructorIds.includes(inst.id);
                          return (
                            <option
                              key={inst.id}
                              value={inst.id}
                              disabled={isAlreadyReviewed}
                            >
                              {inst.name} {inst.department ? `(${inst.department})` : ""} {isAlreadyReviewed ? "✓ (Reviewed this month)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      {reviewList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstructor(item.id)}
                          title="Remove instructor"
                          className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1.5 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 shrink-0 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rating Selector - Clean minimal layout */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Score:
                      </span>
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${ratingInfo.bg} ${ratingInfo.color}`}
                      >
                        <span>{activeRating}/5</span>
                        <span className="text-[10px] font-normal opacity-85 hidden md:inline">
                          · {ratingInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* 1-5 selector: sleek modern pills */}
                    <div className="grid grid-cols-5 gap-1.5 flex-1 sm:max-w-xs">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = item.rating === num;
                        const isHovered = item.hoverRating !== null && item.hoverRating >= num;

                        let activeClass = "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:border-brand-primary/40 hover:text-brand-primary";
                        if (isSelected) {
                          if (num >= 4) activeClass = "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs scale-105";
                          else if (num === 3) activeClass = "bg-amber-500 text-white border-amber-500 font-bold shadow-xs scale-105";
                          else activeClass = "bg-rose-500 text-white border-rose-500 font-bold shadow-xs scale-105";
                        } else if (isHovered) {
                          activeClass = "bg-brand-primary/10 text-brand-primary border-brand-primary/30";
                        }

                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => updateReviewItem(item.id, { rating: num })}
                            onMouseEnter={() => updateReviewItem(item.id, { hoverRating: num })}
                            onMouseLeave={() => updateReviewItem(item.id, { hoverRating: null })}
                            className={`h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center border cursor-pointer ${activeClass}`}
                          >
                            <span>{num} ★</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Strengths & Weaknesses Compact 2-Column Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Strengths */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/15 p-2.5 sm:p-3 rounded-xl space-y-2 border border-emerald-100/60 dark:border-emerald-900/30">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Strengths
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">type & press add</span>
                      </div>

                      <div className="flex gap-1.5">
                        <Input
                          type="text"
                          placeholder="e.g. Explains concepts clearly"
                          value={item.strengthInput}
                          onChange={(e) =>
                            updateReviewItem(item.id, { strengthInput: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addStrengthToItem(item.id);
                            }
                          }}
                          className="text-xs h-7 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 px-2.5 py-1 focus:ring-1 focus:ring-emerald-500/40"
                        />
                        <Button
                          type="button"
                          onClick={() => addStrengthToItem(item.id)}
                          disabled={!item.strengthInput.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 h-7 shrink-0 flex items-center gap-1 text-[11px] font-medium shadow-2xs"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>

                      {item.strengths.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.strengths.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs"
                            >
                              ✓ {tag}
                              <button
                                type="button"
                                onClick={() => removeStrengthFromItem(item.id, tag)}
                                className="hover:opacity-80 focus:outline-none ml-1 text-emerald-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Areas for Improvement */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/15 p-2.5 sm:p-3 rounded-xl space-y-2 border border-amber-100/60 dark:border-amber-900/30">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <ThumbsDown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Areas for Improvement
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">type & press add</span>
                      </div>

                      <div className="flex gap-1.5">
                        <Input
                          type="text"
                          placeholder="e.g. Needs more problem solving"
                          value={item.weaknessInput}
                          onChange={(e) =>
                            updateReviewItem(item.id, { weaknessInput: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addWeaknessToItem(item.id);
                            }
                          }}
                          className="text-xs h-7 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 px-2.5 py-1 focus:ring-1 focus:ring-amber-500/40"
                        />
                        <Button
                          type="button"
                          onClick={() => addWeaknessToItem(item.id)}
                          disabled={!item.weaknessInput.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-2.5 h-7 shrink-0 flex items-center gap-1 text-[11px] font-medium shadow-2xs"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>

                      {item.weaknesses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.weaknesses.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-2xs"
                            >
                              △ {tag}
                              <button
                                type="button"
                                onClick={() => removeWeaknessFromItem(item.id, tag)}
                                className="hover:opacity-80 focus:outline-none ml-1 text-amber-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact 1-line Comments */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                      Notes:
                    </span>
                    <input
                      type="text"
                      placeholder="Brief note or suggestion (optional)..."
                      value={item.detailedFeedback}
                      onChange={(e) =>
                        updateReviewItem(item.id, { detailedFeedback: e.target.value })
                      }
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-1.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-primary/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Instructor Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={addAnotherInstructor}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-brand-primary/50 text-brand-primary font-bold text-xs hover:bg-brand-primary/10 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Instructor
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Submit Action Bar */}
          <div className="pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting || allInstructorsReviewedThisMonth}
              className={`w-full font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm ${
                allInstructorsReviewedThisMonth
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-purple-500/25 active:scale-[0.99] cursor-pointer"
              }`}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting Feedback...</span>
                </div>
              ) : allInstructorsReviewedThisMonth ? (
                <span>All Faculty Evaluated for {currentMonthName}</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {reviewList.length > 1
                      ? `Submit All ${reviewList.length} Instructor Reviews`
                      : "Submit Instructor Feedback"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
