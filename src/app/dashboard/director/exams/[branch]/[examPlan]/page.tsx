"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, Loader2, BarChart3, Users, Trophy,
  Calendar, Clock, Hash, Star, Flame, Zap,
  TrendingDown, ShieldAlert, ChevronDown,
  CheckCircle2, XCircle,
} from "lucide-react";
import { getExamPlanResults } from "@/lib/api/assessment";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import type { ExamPlanResult } from "@/lib/api/assessment";

// ── Classification config ────────────────────────────────────────
const CLASSIFICATIONS = [
  {
    key: "star",
    label: "Star Performers",
    range: "≥90%",
    min: 90,
    max: 101,
    icon: Star,
    iconColor: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    leftBorder: "border-l-[3px] border-yellow-400",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    pctClass: "text-yellow-600 dark:text-yellow-400",
  },
  {
    key: "performers",
    label: "Good Performers",
    range: "75–89%",
    min: 75,
    max: 90,
    icon: Flame,
    iconColor: "text-success",
    bg: "bg-success/5",
    leftBorder: "border-l-[3px] border-success",
    badge: "bg-success/10 text-success",
    pctClass: "text-success",
  },
  {
    key: "average",
    label: "Average",
    range: "50–74%",
    min: 50,
    max: 75,
    icon: Zap,
    iconColor: "text-info",
    bg: "bg-info/5",
    leftBorder: "border-l-[3px] border-info",
    badge: "bg-info/10 text-info",
    pctClass: "text-info",
  },
  {
    key: "improvement",
    label: "Need Improvement",
    range: "33–49%",
    min: 33,
    max: 50,
    icon: TrendingDown,
    iconColor: "text-warning",
    bg: "bg-warning/5",
    leftBorder: "border-l-[3px] border-warning",
    badge: "bg-warning/10 text-warning",
    pctClass: "text-warning",
  },
  {
    key: "atrisk",
    label: "At Risk",
    range: "<33%",
    min: 0,
    max: 33,
    icon: ShieldAlert,
    iconColor: "text-error",
    bg: "bg-error/5",
    leftBorder: "border-l-[3px] border-error",
    badge: "bg-error/10 text-error",
    pctClass: "text-error",
  },
] as const;

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime12h(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300"
    : rank === 2 ? "bg-gray-100 text-gray-600 ring-1 ring-gray-300"
    : rank === 3 ? "bg-orange-100 text-orange-600 ring-1 ring-orange-300"
    : "bg-surface text-text-secondary";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${cls}`}>
      {rank}
    </span>
  );
}

function ClassificationGroup({
  cls,
  students,
  maxScore,
}: {
  cls: typeof CLASSIFICATIONS[number];
  students: ExamPlanResult[];
  maxScore: number;
}) {
  const [open, setOpen] = useState(false);
  const Icon = cls.icon;

  return (
    <div className={`rounded-[12px] border border-border-light overflow-hidden ${cls.bg}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cls.leftBorder} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Icon className={`w-4 h-4 ${cls.iconColor}`} />
          <span className={`text-sm font-semibold ${cls.iconColor}`}>{cls.label}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${cls.badge}`}>
            {students.length} student{students.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-text-tertiary">{cls.range}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border-light/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg/60 border-b border-border-light">
                <th className="text-center px-3 py-2 font-medium text-text-secondary w-12">#</th>
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Student</th>
                <th className="text-center px-3 py-2 font-medium text-text-secondary">Score</th>
                <th className="text-center px-3 py-2 font-medium text-text-secondary">%</th>
                <th className="text-center px-3 py-2 font-medium text-text-secondary">Grade</th>
                <th className="text-center px-3 py-2 font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student} className="border-b border-border-light last:border-0 hover:bg-app-bg/30 transition-colors">
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={s.rank} />
                  </td>
                  <td className="px-3 py-2.5">
                    <p className={`font-semibold text-sm ${cls.iconColor}`}>{s.student_name}</p>
                    <p className="text-[11px] text-text-tertiary">{s.student}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center font-medium text-text-secondary">
                    {s.score}/{maxScore}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-bold text-sm ${cls.pctClass}`}>{s.percentage}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls.badge}`}>
                      {s.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {s.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/10 text-error text-[11px] font-bold">
                        <XCircle className="w-3 h-3" /> Fail
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ExamPlanDetailPage() {
  const params = useParams();
  const branch = decodeURIComponent(params.branch as string);
  const planName = decodeURIComponent(params.examPlan as string);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exam-plan-results", planName],
    queryFn: () => getExamPlanResults(planName),
    staleTime: 60_000,
  });

  const plan = data?.plan;
  const results = data?.data ?? [];
  const summary = data?.summary;

  const classified = CLASSIFICATIONS.map((cls) => ({
    ...cls,
    students: results.filter((r) => r.percentage >= cls.min && r.percentage < cls.max),
  })).filter((cls) => cls.students.length > 0);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-4xl mx-auto">
      <BreadcrumbNav />

      {/* Back button */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/director/exams/${encodeURIComponent(branch)}`}>
          <button className="p-2 rounded-[8px] hover:bg-app-bg transition-colors border border-border-light">
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">
            {plan?.course ?? "Exam Details"}
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            {plan?.student_group} · {plan?.assessment_group}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="bg-error/5 border border-error/20 rounded-[12px] p-6 text-center">
          <p className="text-sm text-error font-medium">Failed to load exam results.</p>
        </div>
      )}

      {!isLoading && plan && (
        <>
          {/* Exam meta card */}
          <div className="bg-surface rounded-[12px] border border-border-light p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{formatDate(plan.schedule_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{formatTime12h(plan.from_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-text-tertiary" />
              <span>Max: {plan.maximum_assessment_score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{plan.student_group}</span>
            </div>
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="bg-surface rounded-[10px] p-2.5 text-center border border-border-light">
                <p className="text-lg font-bold text-text-primary">{summary.total_students}</p>
                <p className="text-[10px] text-text-secondary">Students</p>
              </div>
              <div className="bg-success/5 rounded-[10px] p-2.5 text-center border border-success/20">
                <p className="text-lg font-bold text-success">{summary.pass_count}</p>
                <p className="text-[10px] text-success">Passed</p>
              </div>
              <div className="bg-error/5 rounded-[10px] p-2.5 text-center border border-error/20">
                <p className="text-lg font-bold text-error">{summary.fail_count}</p>
                <p className="text-[10px] text-error">Failed</p>
              </div>
              <div className="bg-brand-wash rounded-[10px] p-2.5 text-center border border-primary/10">
                <p className="text-lg font-bold text-primary">{summary.pass_rate}%</p>
                <p className="text-[10px] text-primary">Pass Rate</p>
              </div>
              <div className="bg-surface rounded-[10px] p-2.5 text-center border border-border-light">
                <p className="text-lg font-bold text-text-primary">{summary.average_percentage}%</p>
                <p className="text-[10px] text-text-secondary">Average</p>
              </div>
              <div className="bg-surface rounded-[10px] p-2.5 text-center border border-border-light">
                <p className="text-lg font-bold text-text-primary">{summary.highest_percentage}%</p>
                <p className="text-[10px] text-text-secondary">Highest</p>
              </div>
            </div>
          )}

          {results.length === 0 && (
            <div className="bg-surface rounded-[12px] border border-border-light p-10 text-center">
              <BarChart3 className="w-10 h-10 mx-auto text-text-tertiary mb-2" />
              <p className="text-sm font-medium text-text-primary mb-0.5">No Results Yet</p>
              <p className="text-xs text-text-secondary">No marks have been submitted for this exam.</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Classification pills */}
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> Student Classifications
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CLASSIFICATIONS.map((cls) => {
                    const count = results.filter((r) => r.percentage >= cls.min && r.percentage < cls.max).length;
                    if (count === 0) return null;
                    const Icon = cls.icon;
                    return (
                      <span key={cls.key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cls.badge}`}>
                        <Icon className="w-3 h-3" />
                        {count} {cls.label}
                      </span>
                    );
                  })}
                </div>

                {/* Collapsible classification groups */}
                <div className="space-y-2">
                  {classified.map((cls) => (
                    <ClassificationGroup
                      key={cls.key}
                      cls={cls}
                      students={cls.students}
                      maxScore={plan.maximum_assessment_score}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
