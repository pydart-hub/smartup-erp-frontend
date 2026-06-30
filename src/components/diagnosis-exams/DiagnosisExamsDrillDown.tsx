"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  User,
  Calendar,
  ChevronRight,
  Phone,
  ArrowLeft,
  BookOpen,
  Award,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpenCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface AttemptWithPublishing {
  id: string;
  studentName: string;
  studentBranch: string | null;
  studentPhone: string | null;
  classLevel: string;
  status: string;
  startedAt: Date | string;
  submittedAt: Date | string | null;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  publishing: {
    title: string;
    subject: {
      name: string;
    };
  };
}

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
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

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
  const totalAttemptsCount = attempts.length;
  const completedAttempts = attempts.filter(
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
  const filteredAttempts = attempts.filter((attempt) => {
    const branchMatch = !selectedBranch || attempt.studentBranch === selectedBranch;
    const classMatch = !selectedClass || attempt.classLevel === selectedClass;
    return branchMatch && classMatch;
  });

  // Level 1: Branch summaries
  const getBranchSummaries = () => {
    const branchMap = new Map<string, AttemptWithPublishing[]>();
    attempts.forEach((a) => {
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
    attempts
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
            {filteredAttempts.length === 0 ? (
              <div className="p-10 text-center text-text-secondary text-sm">
                No student attempts found for Class {selectedClass} in {selectedBranch}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-text-tertiary font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6">Phone</th>
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Score / Grade</th>
                      <th className="py-4 px-6">Started At</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-text-secondary font-medium">
                    {filteredAttempts.map((item) => {
                      const isSubmitted = item.status === "submitted" || item.status === "auto_submitted";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors duration-150">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                                <User className="w-4 h-4 text-text-secondary" />
                              </div>
                              <span className="font-bold text-text-primary">{item.studentName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {item.studentPhone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                                <span>{item.studentPhone}</span>
                              </div>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#5f2ea8]" />
                              <span className="max-w-[180px] truncate" title={item.publishing.title}>
                                {item.publishing.subject.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                isSubmitted
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              {item.status === "in_progress" ? (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>In Progress</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Submitted</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-text-primary">
                            {isSubmitted ? (
                              <span
                                className={`rounded-xl px-2 py-1 text-xs ${
                                  item.percentage >= 80
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                                    : item.percentage >= 50
                                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-600"
                                }`}
                              >
                                {item.scoreObtained} / {item.totalMarks} ({item.percentage}%)
                              </span>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-text-tertiary">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(item.startedAt)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isSubmitted ? (
                              <Link
                                href={`${detailUrlPrefix}/${item.id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#5f2ea8] hover:text-[#4d238c] hover:underline cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </Link>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
