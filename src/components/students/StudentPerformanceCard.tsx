"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export interface SubjectMarkDetail {
  course: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  grade?: string;
}

export interface StudentExamAggregate {
  exam_key: string;
  exam_title: string;
  assessment_group: string;
  schedule_date: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  grade?: string;
  subject_count: number;
  subjects: SubjectMarkDetail[];
}

interface StudentPerformanceCardProps {
  studentId: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function getGradeBadgeVariant(pct: number): "success" | "info" | "warning" | "error" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "info";
  if (pct >= 40) return "warning";
  return "error";
}

export function StudentPerformanceCard({ studentId }: StudentPerformanceCardProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [hoveredExam, setHoveredExam] = useState<StudentExamAggregate | null>(null);
  const [showAllExams, setShowAllExams] = useState<boolean>(false);
  const [expandedExamKey, setExpandedExamKey] = useState<string | null>(null);

  const { data: exams = [], isLoading } = useQuery<StudentExamAggregate[]>({
    queryKey: ["student-performance-aggregated", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${encodeURIComponent(studentId)}/performance`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load performance data");
      }
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
    enabled: !!studentId,
  });

  // Distinct groups (e.g. Weekly Exam, Onam Exam, Unit Test, CWC Exam)
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    exams.forEach((e) => {
      if (e.assessment_group) groups.add(e.assessment_group);
    });
    return Array.from(groups);
  }, [exams]);

  // Filtered exams according to selected group
  const filteredExams = useMemo(() => {
    if (selectedGroup === "all") return exams;
    return exams.filter((e) => e.assessment_group === selectedGroup);
  }, [exams, selectedGroup]);

  // Overall calculations across all exams
  const stats = useMemo(() => {
    if (exams.length === 0) {
      return { overallAvg: 0, highestScore: 0, totalCount: 0, trend: 0, bestExam: "—" };
    }
    const totalCount = exams.length;
    const totalEarned = exams.reduce((acc, curr) => acc + curr.total_score, 0);
    const totalMax = exams.reduce((acc, curr) => acc + curr.maximum_score, 0);
    const overallAvg = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100 * 10) / 10 : 0;
    const highestScore = Math.max(...exams.map((e) => e.percentage));

    // Best overall exam
    let bestExamTitle = "—";
    let maxPct = -1;
    exams.forEach((e) => {
      if (e.percentage > maxPct) {
        maxPct = e.percentage;
        bestExamTitle = `${e.exam_title} (${e.percentage}%)`;
      }
    });

    // Trend calculation: Compare recent exams vs older exams
    let trend = 0;
    if (exams.length >= 2) {
      const half = Math.floor(exams.length / 2);
      const recent = exams.slice(-Math.min(3, half));
      const older = exams.slice(0, Math.min(3, half));
      const recentAvg = recent.reduce((s, e) => s + e.percentage, 0) / recent.length;
      const olderAvg = older.reduce((s, e) => s + e.percentage, 0) / older.length;
      trend = Math.round((recentAvg - olderAvg) * 10) / 10;
    }

    return { overallAvg, highestScore, totalCount, trend, bestExam: bestExamTitle };
  }, [exams]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Chart coordinate geometry - stretched edge to edge
  const chartHeight = 220;
  const chartPaddingTop = 28;
  const chartPaddingBottom = 38;
  const chartPaddingLeft = 42;
  const chartPaddingRight = 24;
  const totalWidth = 1000;

  const pointsCount = filteredExams.length;

  const svgPoints = filteredExams.map((exam, index) => {
    const usableWidth = totalWidth - chartPaddingLeft - chartPaddingRight;
    const x =
      pointsCount <= 1
        ? chartPaddingLeft + usableWidth / 2
        : chartPaddingLeft + (index / (pointsCount - 1)) * usableWidth;
    const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    const y = chartHeight - chartPaddingBottom - (exam.percentage / 100) * effectiveHeight;
    return { x, y, exam };
  });

  const linePath =
    svgPoints.length > 0
      ? svgPoints.reduce((acc, curr, idx) => {
          return `${acc} ${idx === 0 ? "M" : "L"} ${curr.x} ${curr.y}`;
        }, "")
      : "";

  const areaPath =
    svgPoints.length > 0
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight - chartPaddingBottom} L ${svgPoints[0].x} ${chartHeight - chartPaddingBottom} Z`
      : "";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-base">
                Exam Performance Timeline
              </h3>
              <p className="text-xs text-text-tertiary">
                Overall aggregate marks across all subjects for each exam (Weekly, Onam, CWC, Unit Tests)
              </p>
            </div>
          </div>
        </div>

        {/* Top KPI ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="rounded-[10px] border border-border-light bg-app-bg p-3">
            <div className="flex items-center justify-between text-text-tertiary mb-1">
              <span className="text-[11px] font-medium">Overall Average</span>
              <Award className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold ${
                  stats.overallAvg >= 75
                    ? "text-success"
                    : stats.overallAvg >= 50
                    ? "text-primary"
                    : "text-error"
                }`}
              >
                {stats.overallAvg}%
              </span>
              <span className="text-[10px] text-text-tertiary">across all exams</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-border-light bg-app-bg p-3">
            <div className="flex items-center justify-between text-text-tertiary mb-1">
              <span className="text-[11px] font-medium">Exams Appeared</span>
              <FileCheck2 className="h-3.5 w-3.5 text-info" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-text-primary">{stats.totalCount}</span>
              <span className="text-[10px] text-text-tertiary">examinations</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-border-light bg-app-bg p-3">
            <div className="flex items-center justify-between text-text-tertiary mb-1">
              <span className="text-[11px] font-medium">Top Performance</span>
              <Award className="h-3.5 w-3.5 text-success" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-text-primary block truncate" title={stats.bestExam}>
                {stats.bestExam}
              </span>
              <span className="text-[10px] text-text-tertiary">highest score</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-border-light bg-app-bg p-3">
            <div className="flex items-center justify-between text-text-tertiary mb-1">
              <span className="text-[11px] font-medium">Performance Trend</span>
              <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold ${
                  stats.trend > 0 ? "text-success" : stats.trend < 0 ? "text-error" : "text-text-secondary"
                }`}
              >
                {stats.trend > 0 ? `+${stats.trend}%` : `${stats.trend}%`}
              </span>
              <span className="text-[10px] text-text-tertiary">recent trajectory</span>
            </div>
          </div>
        </div>

        {/* Exam Group Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4 no-scrollbar">
          <button
            onClick={() => setSelectedGroup("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedGroup === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:bg-border-light/60 border border-border-light"
            }`}
          >
            All Exams ({exams.length})
          </button>

          {availableGroups.map((group) => {
            const count = exams.filter((e) => e.assessment_group === group).length;
            const isSelected = selectedGroup === group;
            return (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface text-text-secondary hover:bg-border-light/60 border border-border-light"
                }`}
              >
                <span>{group}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-app-bg text-text-tertiary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Overall Exam Graph */}
        {filteredExams.length === 0 ? (
          <div className="py-12 border border-dashed border-border-light rounded-xl text-center bg-app-bg/50">
            <Layers className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-text-secondary">No exam results recorded</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {exams.length === 0
                ? "This student does not have any submitted assessment results yet."
                : "No exams match the selected filter category."}
            </p>
          </div>
        ) : (
          <div className="relative bg-surface rounded-xl border border-border-light p-4 mb-4">
            <div className="w-full">
              <svg
                viewBox={`0 0 ${totalWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                className="w-full h-[240px] overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="overallChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Y-axis guidelines */}
                {[100, 75, 50, 25, 0].map((val) => {
                  const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
                  const y = chartHeight - chartPaddingBottom - (val / 100) * effectiveHeight;
                  return (
                    <g key={val}>
                      <line
                        x1={chartPaddingLeft}
                        y1={y}
                        x2={totalWidth - chartPaddingRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={val === 0 ? undefined : "3 3"}
                        strokeWidth="1"
                        className="dark:stroke-slate-800"
                      />
                      <text
                        x={chartPaddingLeft - 8}
                        y={y + 3}
                        fontSize="9"
                        textAnchor="end"
                        fill="#94a3b8"
                        fontFamily="monospace"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                {svgPoints.length > 1 && (
                  <path d={areaPath} fill="url(#overallChartGrad)" />
                )}

                {/* Main Trend Line */}
                {svgPoints.length > 1 && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Exam Data Points */}
                {svgPoints.map((pt, idx) => {
                  const isHovered = hoveredExam?.exam_key === pt.exam.exam_key;
                  const color =
                    pt.exam.percentage >= 80
                      ? "#10b981"
                      : pt.exam.percentage >= 50
                      ? "#4f46e5"
                      : "#ef4444";

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredExam(pt.exam)}
                      onMouseLeave={() => setHoveredExam(null)}
                      onClick={() =>
                        setExpandedExamKey(
                          expandedExamKey === pt.exam.exam_key ? null : pt.exam.exam_key
                        )
                      }
                    >
                      {/* Hit target */}
                      <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />

                      {/* Ping pulse on hover */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="10"
                          fill={color}
                          opacity="0.25"
                          className="animate-ping"
                        />
                      )}

                      {/* Point marker */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "7" : "5"}
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth={isHovered ? "3.5" : "2.5"}
                        className="transition-all"
                      />

                      {/* Score Percentage Label above node */}
                      <text
                        x={pt.x}
                        y={pt.y - 11}
                        fontSize="9.5"
                        fontWeight="700"
                        textAnchor="middle"
                        fill={color}
                      >
                        {pt.exam.percentage}%
                      </text>

                      {/* Exam Title & Date beneath X-axis */}
                      <text
                        x={pt.x}
                        y={chartHeight - 20}
                        fontSize="8.5"
                        fontWeight="600"
                        textAnchor="middle"
                        fill="#334155"
                        className="dark:fill-slate-300 truncate"
                      >
                        {pt.exam.exam_title.length > 14
                          ? `${pt.exam.exam_title.slice(0, 12)}…`
                          : pt.exam.exam_title}
                      </text>
                      <text
                        x={pt.x}
                        y={chartHeight - 8}
                        fontSize="7.5"
                        textAnchor="middle"
                        fill="#94a3b8"
                      >
                        {formatDate(pt.exam.schedule_date)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Card showing overall exam result + subjects included */}
            {hoveredExam && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-primary/10">
                  <div className="flex items-center gap-2">
                    <Badge variant={getGradeBadgeVariant(hoveredExam.percentage)}>
                      Grade {hoveredExam.grade}
                    </Badge>
                    <span className="font-bold text-text-primary text-sm">
                      {hoveredExam.exam_title}
                    </span>
                    <span className="text-text-tertiary">({hoveredExam.assessment_group})</span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-text-secondary">
                    <span>
                      Total Score:{" "}
                      <strong className="text-text-primary">
                        {hoveredExam.total_score} / {hoveredExam.maximum_score}
                      </strong>
                    </span>
                    <span className="text-primary text-sm font-bold">
                      {hoveredExam.percentage}%
                    </span>
                  </div>
                </div>

                {/* Quick Subject Pills in Tooltip */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-tertiary text-[11px] font-medium">
                    Subjects ({hoveredExam.subject_count}):
                  </span>
                  {hoveredExam.subjects.map((sub) => (
                    <span
                      key={sub.course}
                      className="px-2 py-0.5 rounded bg-surface border border-border-light text-[11px] text-text-primary flex items-center gap-1.5"
                    >
                      <span>{sub.course}:</span>
                      <strong
                        className={
                          sub.percentage >= 75
                            ? "text-success"
                            : sub.percentage >= 50
                            ? "text-primary"
                            : "text-error"
                        }
                      >
                        {sub.total_score}/{sub.maximum_score} ({sub.percentage}%)
                      </strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Breakdown Per Exam Session */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Exam Performance History & Subject Breakdown
            </h4>
            {filteredExams.length > 3 && (
              <button
                onClick={() => setShowAllExams((prev) => !prev)}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <span>{showAllExams ? "Show less" : `View all (${filteredExams.length})`}</span>
                {showAllExams ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(showAllExams ? filteredExams.slice().reverse() : filteredExams.slice(-3).reverse()).map(
              (exam) => {
                const isExpanded = expandedExamKey === exam.exam_key;
                return (
                  <div
                    key={exam.exam_key}
                    className="rounded-xl border border-border-light bg-app-bg overflow-hidden transition-all"
                  >
                    {/* Exam row header */}
                    <div
                      onClick={() =>
                        setExpandedExamKey(isExpanded ? null : exam.exam_key)
                      }
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-surface/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${
                            exam.percentage >= 75
                              ? "bg-success/10 text-success"
                              : exam.percentage >= 50
                              ? "bg-primary/10 text-primary"
                              : "bg-error/10 text-error"
                          }`}
                        >
                          {exam.percentage}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-text-primary">
                              {exam.exam_title}
                            </p>
                            <Badge variant={getGradeBadgeVariant(exam.percentage)}>
                              {exam.grade}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-text-tertiary">
                            {exam.assessment_group} · {exam.subject_count} Subject{exam.subject_count > 1 ? "s" : ""} · {formatDate(exam.schedule_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-text-primary">
                            {exam.total_score} / {exam.maximum_score}
                          </p>
                          <p className="text-[10px] text-text-tertiary">Overall Total</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-text-tertiary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-tertiary" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Subject-level scores */}
                    {isExpanded && (
                      <div className="border-t border-border-light bg-surface p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                          Subject Marks in {exam.exam_title}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exam.subjects.map((sub) => (
                            <div
                              key={sub.course}
                              className="rounded-lg border border-border-light bg-app-bg p-2.5 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-text-primary">
                                  {sub.course}
                                </span>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <span className="text-xs text-text-secondary">
                                  {sub.total_score} / {sub.maximum_score}
                                </span>
                                <span
                                  className={`text-xs font-bold ${
                                    sub.percentage >= 75
                                      ? "text-success"
                                      : sub.percentage >= 50
                                      ? "text-primary"
                                      : "text-error"
                                  }`}
                                >
                                  {sub.percentage}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
