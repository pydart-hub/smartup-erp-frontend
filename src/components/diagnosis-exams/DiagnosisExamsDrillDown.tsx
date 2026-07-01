"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  GraduationCap,
  User,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  ArrowLeft,
  BookOpen,
  Award,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpenCheck,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { calculateDiagnosedLevel } from "@/lib/public-exam/grading";
import {
  type AttemptWithPublishing,
  getOrdinalSuffix,
  getAttemptLevelBreakdown,
} from "@/lib/public-exam/diagnostics";

interface DiagnosisExamsDrillDownProps {
  attempts: AttemptWithPublishing[];
  detailUrlPrefix: string;
  title: string;
}

export function DiagnosisExamsDrillDown({
  attempts,
  detailUrlPrefix,
  title,
}: DiagnosisExamsDrillDownProps) {
  const router = useRouter();
  const [localAttempts, setLocalAttempts] = useState<AttemptWithPublishing[]>(attempts);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalAttempts(attempts);
  }, [attempts]);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm("Are you sure you want to delete this in-progress exam attempt? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(attemptId);
    try {
      const res = await fetch(`/api/public-exam/attempt/${attemptId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete attempt");
      }

      // Update local state immediately
      setLocalAttempts((prev) => prev.filter((a) => a.id !== attemptId));

      // Refresh server components
      router.refresh();
    } catch (err) {
      console.error("Error deleting attempt:", err);
      alert(err instanceof Error ? err.message : "Failed to delete the attempt.");
    } finally {
      setIsDeleting(null);
    }
  };

  const renderScoreBadge = (attempt: AttemptWithPublishing) => {
    if (!attempt) return <span className="text-text-tertiary">—</span>;
    const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";

    let score = attempt.scoreObtained;
    let percentage = attempt.percentage;

    if (!isSubmitted) {
      // In-progress live score calculation
      try {
        const questions: any[] = typeof attempt.paperSnapshotJson === "string"
          ? JSON.parse(attempt.paperSnapshotJson)
          : attempt.paperSnapshotJson;
        const answers = attempt.answers || [];
        const answerMap = new Map(answers.map((a: any) => [a.questionId, a.selectedOption]));

        let liveScore = 0;
        questions.forEach((q: any) => {
          const ans = answerMap.get(q.id);
          if (ans && ans === q.correctOption) {
            liveScore += q.marks || 1;
          }
        });
        score = liveScore;
        percentage = attempt.totalMarks > 0 ? Math.round((liveScore / attempt.totalMarks) * 100) : 0;
      } catch (e) {
        console.error("Error calculating live score for badge:", e);
      }
    }

    // Class styles based on percentage thresholds using semantic tokens from globals.css
    let colorClass = "bg-error-light text-error border border-error/15";
    if (percentage >= 80) {
      colorClass = "bg-success-light text-success border border-success/15";
    } else if (percentage >= 50) {
      colorClass = "bg-warning-light text-warning border border-warning/15";
    }

    return (
      <span
        className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap inline-block ${colorClass}`}
        title={isSubmitted ? "Final Score" : "Live Score (In Progress)"}
      >
        {score} / {attempt.totalMarks} ({percentage}%)
      </span>
    );
  };

  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState<{
    key: string;
    studentName: string;
    studentPhone: string | null;
    studentBranch: string | null;
    classLevel: string;
    attempts: AttemptWithPublishing[];
  } | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [expandedStudentKeys, setExpandedStudentKeys] = useState<Record<string, boolean>>({});

  const toggleStudentExpand = (key: string) => {
    setExpandedStudentKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper: Format Dates
  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 1. Calculate General statistics
  const totalAttemptsCount = localAttempts.length;
  const completedAttempts = localAttempts.filter(
    (a) => a.status === "submitted" || a.status === "auto_submitted"
  );
  const completedCount = completedAttempts.length;
  const inProgressCount = totalAttemptsCount - completedCount;

  const overallAvgScore =
    completedCount > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedCount)
      : 0;

  const passRate =
    completedCount > 0
      ? Math.round(
          (completedAttempts.filter((a) => a.percentage >= 50).length / completedCount) * 100
        )
      : 0;

  // 2. Filter attempts based on current drill-down selection
  const filteredAttempts = localAttempts.filter((attempt) => {
    const branchMatch = !selectedBranch || attempt.studentBranch === selectedBranch;
    const classMatch = !selectedClass || attempt.classLevel === selectedClass;
    return branchMatch && classMatch;
  });

  // Group attempts by student
  const studentGroups = React.useMemo(() => {
    const groups: Record<
      string,
      {
        key: string;
        studentName: string;
        studentPhone: string | null;
        studentBranch: string | null;
        classLevel: string;
        attempts: AttemptWithPublishing[];
      }
    > = {};

    filteredAttempts.forEach((attempt) => {
      const normalizedPhone = attempt.studentPhone ? attempt.studentPhone.replace(/\D/g, "") : "";
      const groupKey = normalizedPhone || attempt.studentName.toLowerCase().trim();

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          studentName: attempt.studentName,
          studentPhone: attempt.studentPhone,
          studentBranch: attempt.studentBranch,
          classLevel: attempt.classLevel,
          attempts: [],
        };
      } else {
        // Keep the longer name (which is usually more complete)
        if (attempt.studentName.length > groups[groupKey].studentName.length) {
          groups[groupKey].studentName = attempt.studentName;
        }
      }

      groups[groupKey].attempts.push(attempt);
    });

    // Sort attempts inside each group by startedAt descending
    Object.values(groups).forEach((g) => {
      g.attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    });

    // Sort groups by student name
    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredAttempts]);

  // Level 1: Branch summaries
  const getBranchSummaries = () => {
    const branchMap = new Map<string, AttemptWithPublishing[]>();
    localAttempts.forEach((a) => {
      const branchKey = a.studentBranch || "Unknown Branch";
      const list = branchMap.get(branchKey) || [];
      list.push(a);
      branchMap.set(branchKey, list);
    });

    return Array.from(branchMap.entries()).map(([branchName, list]) => {
      const branchCompleted = list.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
      const branchCompletedCount = branchCompleted.length;
      const avgPercentage =
        branchCompletedCount > 0
          ? Math.round(branchCompleted.reduce((sum, a) => sum + a.percentage, 0) / branchCompletedCount)
          : 0;
      const branchPassRate =
        branchCompletedCount > 0
          ? Math.round(
              (branchCompleted.filter((a) => a.percentage >= 50).length / branchCompletedCount) * 100
            )
          : 0;

      return {
        name: branchName,
        total: list.length,
        completed: branchCompletedCount,
        avgPercentage,
        passRate: branchPassRate,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Level 2: Class summaries for a selected branch
  const getClassSummaries = (branch: string) => {
    const classMap = new Map<string, AttemptWithPublishing[]>();
    localAttempts
      .filter((a) => (a.studentBranch || "Unknown Branch") === branch)
      .forEach((a) => {
        const classKey = a.classLevel;
        const list = classMap.get(classKey) || [];
        list.push(a);
        classMap.set(classKey, list);
      });

    return Array.from(classMap.entries()).map(([classLevel, list]) => {
      const classCompleted = list.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
      const classCompletedCount = classCompleted.length;
      const avgPercentage =
        classCompletedCount > 0
          ? Math.round(classCompleted.reduce((sum, a) => sum + a.percentage, 0) / classCompletedCount)
          : 0;
      const classPassRate =
        classCompletedCount > 0
          ? Math.round(
              (classCompleted.filter((a) => a.percentage >= 50).length / classCompletedCount) * 100
            )
          : 0;

      return {
        levelCode: classLevel,
        total: list.length,
        completed: classCompletedCount,
        avgPercentage,
        passRate: classPassRate,
      };
    }).sort((a, b) => a.levelCode.localeCompare(b.levelCode));
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Postgres Sync</p>
          <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight">{title}</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Real-time analytics and student attempts from the standalone exam database. Grouped by branch and class.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Attempts",
            value: totalAttemptsCount,
            note: `${inProgressCount} in progress`,
            icon: Activity,
            colorClass: "text-[#5f2ea8] bg-[#5f2ea8]/10",
          },
          {
            label: "Completed",
            value: completedCount,
            note: "Submitted attempts",
            icon: BookOpenCheck,
            colorClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
          },
          {
            label: "Average Percentage",
            value: `${overallAvgScore}%`,
            note: "Across completed papers",
            icon: Award,
            colorClass: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
          },
          {
            label: "Pass Rate",
            value: `${passRate}%`,
            note: "Scored 50% or above",
            icon: CheckCircle2,
            colorClass: "text-success bg-success/10",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-white/80 bg-white/70 dark:bg-[#0E1526]/85 p-5 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                {item.label}
              </span>
              <div className={`rounded-2xl p-2.5 ${item.colorClass}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-black text-text-primary tracking-tight">
              {item.value}
            </div>
            <p className="mt-1 text-xs text-text-secondary font-medium">{item.note}</p>
          </div>
        ))}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center flex-wrap gap-2 text-sm font-semibold text-text-secondary bg-white/60 dark:bg-[#0E1526]/60 border border-slate-200/50 rounded-2xl px-4 py-3 w-fit shadow-sm backdrop-blur">
        <button
          onClick={() => {
            setSelectedBranch(null);
            setSelectedClass(null);
          }}
          className={`hover:text-primary transition-colors ${!selectedBranch ? "text-primary font-bold" : ""}`}
        >
          All Branches
        </button>

        {selectedBranch && (
          <>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
            <button
              onClick={() => {
                setSelectedClass(null);
              }}
              className={`hover:text-primary transition-colors ${!selectedClass ? "text-primary font-bold" : ""}`}
            >
              {selectedBranch}
            </button>
          </>
        )}

        {selectedBranch && selectedClass && (
          <>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
            <span className="text-primary font-bold">Class {selectedClass}</span>
          </>
        )}
      </div>

      {/* Level 1: Branch-wise Drill-down */}
      {!selectedBranch && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Branch Performance</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getBranchSummaries().map((branch) => (
              <Card
                key={branch.name}
                hover
                onClick={() => setSelectedBranch(branch.name)}
                className="cursor-pointer border-border-light/80"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-[#5f2ea8]/10 p-3 text-[#5f2ea8]">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {branch.total} attempts
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg font-bold text-text-primary">
                    {branch.name}
                  </CardTitle>
                  <CardDescription>
                    {branch.completed} completed, {branch.total - branch.completed} in progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-surface/50 rounded-2xl p-3 text-center">
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Avg Score</p>
                      <p className="mt-1 text-lg font-black text-primary">{branch.avgPercentage}%</p>
                    </div>
                    <div className="bg-surface/50 rounded-2xl p-3 text-center">
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Pass Rate</p>
                      <p className="mt-1 text-lg font-black text-success">{branch.passRate}%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-bold text-primary gap-1">
                    <span>Inspect branch classes</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Level 2: Class-wise Drill-down */}
      {selectedBranch && !selectedClass && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBranch(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Back</span>
            </Button>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              Classes in {selectedBranch}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getClassSummaries(selectedBranch).map((cls) => (
              <Card
                key={cls.levelCode}
                hover
                onClick={() => setSelectedClass(cls.levelCode)}
                className="cursor-pointer border-border-light/80"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 p-3 text-blue-600">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {cls.total} attempts
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg font-bold text-text-primary">
                    Class {cls.levelCode}
                  </CardTitle>
                  <CardDescription>
                    {cls.completed} completed, {cls.total - cls.completed} in progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-surface/50 rounded-2xl p-3 text-center">
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Avg Score</p>
                      <p className="mt-1 text-lg font-black text-primary">{cls.avgPercentage}%</p>
                    </div>
                    <div className="bg-surface/50 rounded-2xl p-3 text-center">
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Pass Rate</p>
                      <p className="mt-1 text-lg font-black text-success">{cls.passRate}%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-bold text-primary gap-1">
                    <span>Inspect student list</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Level 3: Student attempts detailed list */}
      {selectedBranch && selectedClass && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedClass(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Back</span>
            </Button>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              {selectedBranch} — Class {selectedClass} Attempts
            </h2>
          </div>

          <div className="bg-white dark:bg-[#0E1526]/85 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
            {studentGroups.length === 0 ? (
              <div className="p-10 text-center text-text-secondary text-sm">
                No student attempts found for Class {selectedClass} in {selectedBranch}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-text-tertiary font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 w-10"></th>
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6">Phone</th>
                      <th className="py-4 px-6 text-center">Attempts</th>
                      <th className="py-4 px-6">Subjects</th>
                      <th className="py-4 px-6 text-center">Latest Score</th>
                      <th className="py-4 px-6">Last Attempt</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-text-secondary font-medium">
                    {studentGroups.map((student) => {
                      const isExpanded = !!expandedStudentKeys[student.key];
                      const attemptCount = student.attempts.length;
                      const subjectsList = Array.from(
                        new Set(student.attempts.map((a) => a.publishing.subject.name))
                      ).join(", ");
                      const latestAttempt = student.attempts[0];

                      return (
                        <React.Fragment key={student.key}>
                          <tr
                            onClick={() => toggleStudentExpand(student.key)}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors duration-150 cursor-pointer"
                          >
                            <td className="py-4 px-6 text-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-text-tertiary" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-text-tertiary" />
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                                  <User className="w-4 h-4 text-text-secondary" />
                                </div>
                                <span className="font-bold text-text-primary">
                                  {student.studentName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {student.studentPhone ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                                  <span>{student.studentPhone}</span>
                                </div>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <Badge variant="outline" className="font-black">
                                {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-[#5f2ea8]" />
                                <span className="max-w-[200px] truncate" title={subjectsList}>
                                  {subjectsList}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              {renderScoreBadge(latestAttempt)}
                            </td>
                            <td className="py-4 px-6 text-xs text-text-tertiary">
                              {latestAttempt ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDate(latestAttempt.startedAt)}</span>
                                </div>
                              ) : (
                                <span>—</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStudentExpand(student.key);
                                  }}
                                  className="w-28 justify-center inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-[#5f2ea8] bg-[#5f2ea8]/5 border border-[#5f2ea8]/10 hover:bg-[#5f2ea8]/10 rounded-xl transition-all cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                      <span>Hide History</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      <span>View History</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentForSummary(student);
                                  }}
                                  className="w-28 justify-center inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#5f2ea8] hover:bg-[#4d238c] border border-[#5f2ea8]/15 rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>Summary</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Attempt History Details */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40 dark:bg-slate-900/10">
                              <td colSpan={8} className="py-4 px-8 border-t border-b border-slate-100 dark:border-slate-800">
                                <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-950/30 p-4 space-y-3 shadow-inner">
                                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-[#5f2ea8]" />
                                    <span>Attempt History ({attemptCount})</span>
                                  </p>
                                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0E1526]/50">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-text-tertiary font-bold uppercase tracking-wider">
                                          <th className="py-2.5 px-4">Subject Exam Paper</th>
                                          <th className="py-2.5 px-4 text-center">Status</th>
                                          <th className="py-2.5 px-4 text-center">Score / Grade</th>
                                          <th className="py-2.5 px-4 text-center">Diagnosed Level</th>
                                          <th className="py-2.5 px-4">Date</th>
                                          <th className="py-2.5 px-4 text-center">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-text-secondary font-medium">
                                        {student.attempts.map((attempt) => {
                                          const isSubmitted =
                                            attempt.status === "submitted" ||
                                            attempt.status === "auto_submitted";
                                          const diagnosedLevel = isSubmitted ? (
                                            (attempt.resultSnapshotJson && (typeof attempt.resultSnapshotJson === "object" ? (attempt.resultSnapshotJson as any).diagnosedLevel : JSON.parse(attempt.resultSnapshotJson).diagnosedLevel)) ||
                                            calculateDiagnosedLevel(attempt.classLevel, attempt.paperSnapshotJson, attempt.resultSnapshotJson)
                                          ) : null;

                                          return (
                                            <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                              <td className="py-3 px-4 font-bold text-text-primary">
                                                {attempt.publishing.subject.name}
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                <span
                                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isSubmitted
                                                      ? "bg-emerald-500/10 text-emerald-600"
                                                      : "bg-amber-500/10 text-amber-600"
                                                  }`}
                                                >
                                                  {attempt.status === "in_progress" ? (
                                                    <>
                                                      <Clock className="w-3 h-3" />
                                                      <span>In Progress</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <CheckCircle2 className="w-3 h-3" />
                                                      <span>Submitted</span>
                                                    </>
                                                  )}
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-center font-bold text-text-primary">
                                                {renderScoreBadge(attempt)}
                                              </td>
                                              <td className="py-3 px-4 text-center font-bold text-text-primary">
                                                {isSubmitted ? (
                                                  <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 text-[#5f2ea8] px-2 py-0.5 rounded-lg text-[11px] font-black">
                                                    {diagnosedLevel || "N/A"}
                                                  </span>
                                                ) : (
                                                  <span className="text-text-tertiary">—</span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 text-text-tertiary">
                                                {formatDate(attempt.startedAt)}
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                {isSubmitted ? (
                                                  <Link
                                                    href={`${detailUrlPrefix}/${attempt.id}`}
                                                    className="inline-flex items-center gap-1 font-bold text-[#5f2ea8] hover:text-[#4d238c] hover:underline cursor-pointer"
                                                  >
                                                    <ExternalLink className="w-3 h-3" />
                                                    <span>View Report</span>
                                                  </Link>
                                                ) : (
                                                  <button
                                                    onClick={() => handleDeleteAttempt(attempt.id)}
                                                    disabled={isDeleting === attempt.id}
                                                    className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 hover:underline cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                    <span>{isDeleting === attempt.id ? "Deleting..." : "Delete"}</span>
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Overall Summary Modal */}
      {selectedStudentForSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1526] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5f2ea8] bg-[#5f2ea8]/10 px-2.5 py-1 rounded-full">
                  Diagnostic Assessment Profile
                </span>
                <h3 className="text-xl font-black text-text-primary mt-1.5">
                  {selectedStudentForSummary.studentName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForSummary(null)}
                className="rounded-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 text-text-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Profile Overview Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 text-xs font-semibold text-text-secondary">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Phone Number</span>
                  <span className="text-text-primary text-sm font-bold">
                    {selectedStudentForSummary.studentPhone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Current Class</span>
                  <span className="text-text-primary text-sm font-bold">
                    Class {selectedStudentForSummary.classLevel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Total Exams</span>
                  <span className="text-text-primary text-sm font-bold">
                    {selectedStudentForSummary.attempts.length} attempts
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block mb-1">Current Branch</span>
                  <span className="text-text-primary text-sm font-bold">
                    {selectedStudentForSummary.studentBranch || "—"}
                  </span>
                </div>
              </div>

              {/* Assessment Breakdown List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#5f2ea8]" />
                  <span>Subject Performance & Diagnostics</span>
                </h4>

                <div className="space-y-4">
                  {selectedStudentForSummary.attempts.map((attempt) => {
                    const { breakdown, diagnosedLevel } = getAttemptLevelBreakdown(attempt);
                    const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";

                    return (
                      <div
                        key={attempt.id}
                        className="bg-white dark:bg-[#0E1526]/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
                      >
                        {/* Attempt Top Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-50 dark:border-slate-900 pb-3">
                          <div className="space-y-1">
                            <h5 className="font-bold text-text-primary flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-[#5f2ea8]" />
                              <span>{attempt.publishing.subject.name}</span>
                            </h5>
                            <p className="text-[10px] text-text-tertiary">
                              Assessed: {formatDate(attempt.startedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderScoreBadge(attempt)}
                            {isSubmitted && diagnosedLevel && (
                              <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 text-[#5f2ea8] px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-[#5f2ea8]/10">
                                Level: {diagnosedLevel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level Breakdown Grid */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                            Level-wise MCQ Analysis:
                          </p>
                          {breakdown.length === 0 ? (
                            <p className="text-xs text-text-tertiary italic">
                              Questions snapshot not found. Diagnostics unavailable.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {breakdown.map((item) => {
                                let badgeColorClass = "bg-slate-50 text-slate-500 border border-slate-200/50";
                                let suffix = "";

                                if (item.isPassed) {
                                  badgeColorClass = "bg-success-light text-success border border-success/15";
                                  suffix = " (Passed) ✅";
                                } else if (item.isDiagnosedLevel) {
                                  badgeColorClass = "bg-violet-50 dark:bg-violet-500/10 text-[#5f2ea8] border border-[#5f2ea8]/20 font-black shadow-sm shadow-[#5f2ea8]/5 ring-1 ring-[#5f2ea8]/20";
                                  suffix = " (Diagnosed Level) 🎯";
                                } else {
                                  badgeColorClass = "bg-error-light text-error border border-error/15";
                                  suffix = " (Failed) ❌";
                                }

                                return (
                                  <div
                                    key={item.level}
                                    className={`p-2.5 rounded-xl text-center flex flex-col justify-center items-center gap-1 text-xs font-semibold ${badgeColorClass}`}
                                  >
                                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">
                                      Class {item.level} Questions
                                    </span>
                                    <span className="text-sm font-black">
                                      {item.correctCount} / {item.totalCount}
                                    </span>
                                    <span className="text-[8px] font-black opacity-80 uppercase tracking-widest leading-none">
                                      {suffix}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentForSummary(null)}
                className="rounded-xl font-bold"
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
