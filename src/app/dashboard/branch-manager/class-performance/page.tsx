"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  GraduationCap,
  Users,
  Search,
  School,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Calendar,
  BookOpen,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getClassPerformance,
  type ClassPerformanceResponse,
} from "@/lib/api/analytics";

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

interface ClassAccordionItemProps {
  cls: string;
  isExpanded: boolean;
  isDimmed?: boolean;
  onToggle: () => void;
  branch: string;
  initialBatch?: string;
  batchesPreview?: Array<{ name: string; student_group_name: string; batch_code: string }>;
  onSelectBatch?: (batchName: string) => void;
}

function ClassAccordionItem({
  cls,
  isExpanded,
  isDimmed = false,
  onToggle,
  branch,
  initialBatch = "",
  batchesPreview = [],
  onSelectBatch,
}: ClassAccordionItemProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatch);
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>("all");
  const [selectedSubjectExam, setSelectedSubjectExam] = useState<string>("all");
  const [hoveredExam, setHoveredExam] = useState<any | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [subjectViewMode, setSubjectViewMode] = useState<"chart" | "progress" | "list">("chart");
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);

  // Sync initialBatch prop change (e.g. from URL or sidebar)
  React.useEffect(() => {
    setSelectedBatch(initialBatch);
  }, [initialBatch]);

  const { data, isLoading } = useQuery<ClassPerformanceResponse>({
    queryKey: ["class-perf-detail", branch, cls, selectedBatch],
    queryFn: () => getClassPerformance({ branch, program: cls, batch: selectedBatch || undefined }),
    enabled: isExpanded && !!branch,
    staleTime: 60_000,
  });

  const timeline = data?.timeline ?? [];
  const stats = data?.stats ?? {
    overallAvg: 0,
    totalExams: 0,
    highestScore: 0,
    trend: 0,
    bestExam: "—",
    totalStudents: 0,
  };
  const batches = data?.batches ?? [];
  const allBatches = data?.allBatches ?? batchesPreview;
  const subjects = data?.subjects ?? [];
  const students = data?.students ?? [];

  const handleBatchChange = (bName: string) => {
    setSelectedBatch(bName);
    if (onSelectBatch) {
      onSelectBatch(bName);
    }
  };

  // Filter exam groups
  const examGroups = useMemo(() => {
    const s = new Set<string>();
    timeline.forEach((t) => {
      if (t.assessment_group) s.add(t.assessment_group);
    });
    return Array.from(s);
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (selectedExamGroup === "all") return timeline;
    return timeline.filter((t) => t.assessment_group === selectedExamGroup);
  }, [timeline, selectedExamGroup]);

  // Compute active subjects for Subject-Wise Performance based on selectedSubjectExam
  const activeSubjects = useMemo(() => {
    if (selectedSubjectExam === "all") {
      return subjects;
    }
    const matchingExam = timeline.find(
      (t) => t.exam_key === selectedSubjectExam || t.assessment_group === selectedSubjectExam || t.exam_title === selectedSubjectExam,
    );
    if (!matchingExam || !matchingExam.subjects || matchingExam.subjects.length === 0) {
      return subjects;
    }
    return matchingExam.subjects.map((s) => ({
      course: s.course,
      total_students: matchingExam.students_appeared || 0,
      avg_score: s.total_score,
      max_score: s.total_score,
      maximum_possible: s.maximum_score,
      avg_pct: s.percentage,
      pass_count: s.percentage >= 33 ? (matchingExam.students_appeared || 1) : 0,
      pass_rate: s.percentage >= 33 ? 100 : 0,
    }));
  }, [selectedSubjectExam, timeline, subjects]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.student.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  // SVG Chart Dimensions & Calculations
  const chartHeight = 280;
  const chartPaddingTop = 32;
  const chartPaddingBottom = 48;
  const chartPaddingLeft = 56;
  const chartPaddingRight = 56;
  const svgViewWidth = 800;

  // Palette for different batches
  const batchColorPalette = [
    { stroke: "#3b82f6", bg: "bg-blue-500", text: "text-blue-500", light: "#dbeafe" }, // Blue (Batch A)
    { stroke: "#10b981", bg: "bg-emerald-500", text: "text-emerald-500", light: "#d1fae5" }, // Emerald (Batch B)
    { stroke: "#f59e0b", bg: "bg-amber-500", text: "text-amber-500", light: "#fef3c7" }, // Amber (Batch C)
    { stroke: "#ec4899", bg: "bg-pink-500", text: "text-pink-500", light: "#fce7f3" }, // Pink (Batch D)
    { stroke: "#8b5cf6", bg: "bg-purple-500", text: "text-purple-500", light: "#ede9fe" }, // Purple (Batch E)
  ];

  const batchColorMap = useMemo(() => {
    const map = new Map<string, { stroke: string; bg: string; text: string; light: string }>();
    allBatches.forEach((b, idx) => {
      map.set(b.name, batchColorPalette[idx % batchColorPalette.length]);
    });
    return map;
  }, [allBatches]);

  const getPointX = (idx: number, count: number) => {
    if (count === 1) {
      return svgViewWidth / 2;
    }
    const leftMargin = chartPaddingLeft + 40;
    const rightMargin = svgViewWidth - chartPaddingRight - 40;
    const usableWidth = rightMargin - leftMargin;
    return leftMargin + (idx / (count - 1)) * usableWidth;
  };

  const svgPoints = useMemo(() => {
    if (filteredTimeline.length === 0) return [];
    const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;

    return filteredTimeline.map((exam, idx) => {
      const x = getPointX(idx, count);
      const y =
        chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, exam.percentage)) / 100) * effectiveHeight;
      return { x, y, exam };
    });
  }, [filteredTimeline]);

  // Separate line and dots for each batch (Batch A, Batch B, Batch C)
  const batchLines = useMemo(() => {
    if (allBatches.length <= 1) return [];
    const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;
    if (count === 0) return [];

    return allBatches.map((b, bIdx) => {
      const color = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
      const pts: Array<{ x: number; y: number; pct: number; exam: any }> = [];

      filteredTimeline.forEach((exam, idx) => {
        const x = getPointX(idx, count);
        const bScore = exam.batch_scores ? exam.batch_scores[b.name] : null;
        if (bScore && bScore.students_appeared > 0) {
          const y =
            chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, bScore.percentage)) / 100) * effectiveHeight;
          pts.push({ x, y, pct: bScore.percentage, exam });
        }
      });

      let path = "";
      if (pts.length > 0) {
        path = pts.reduce((acc, pt, idx) => {
          if (idx === 0) return `M ${pt.x} ${pt.y}`;
          const prev = pts[idx - 1];
          const cx1 = prev.x + (pt.x - prev.x) / 2;
          const cy1 = prev.y;
          const cx2 = prev.x + (pt.x - prev.x) / 2;
          const cy2 = pt.y;
          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
        }, "");
      }

      return {
        batch: b,
        color,
        points: pts,
        path,
      };
    }).filter((bl) => bl.points.length > 0);
  }, [allBatches, filteredTimeline, batchColorMap]);

  const linePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = svgPoints[idx - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, "");
  }, [svgPoints]);

  const areaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const bottomY = chartHeight - chartPaddingBottom;
    const firstX = svgPoints[0].x;
    const lastX = svgPoints[svgPoints.length - 1].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, svgPoints]);

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 ${
        isExpanded
          ? "border-primary/40 shadow-md ring-1 ring-primary/20 opacity-100"
          : isDimmed
          ? "border-border-light shadow-2xs opacity-40 hover:opacity-80 scale-[0.99]"
          : "border-border-light shadow-sm opacity-100"
      }`}
    >
      {/* Header Row (Clickable dropdown toggle) */}
      <div
        onClick={onToggle}
        className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors select-none ${
          isExpanded
            ? "bg-slate-50/80 dark:bg-slate-800/60 border-b border-border-light"
            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base transition-transform ${
              isExpanded
                ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                : "bg-primary/10 text-primary"
            }`}
          >
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">{cls}</h3>
              <Badge variant="outline" className="text-[11px] font-medium text-primary border-primary/20 bg-primary/5">
                Active Class
              </Badge>
              {/* Batch badges preview */}
              {allBatches.length > 0 && (
                <div className="flex items-center gap-1">
                  {allBatches.map((b) => (
                    <span
                      key={b.name}
                      className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-semibold text-[10px] border border-purple-200 dark:border-purple-800"
                    >
                      Batch {b.batch_code}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">
              Click to {isExpanded ? "collapse" : "view"} exam timeline graph, batch comparison & students
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-primary hidden sm:inline-block">
            {isExpanded ? "Hide Graph" : "Show Graph"}
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isExpanded ? "bg-primary/10 text-primary rotate-180" : "bg-app-bg text-text-tertiary"
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 space-y-6 bg-app-bg/30">
              {isLoading ? (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-surface rounded-xl animate-pulse border border-border-light" />
                    ))}
                  </div>
                  <div className="h-64 bg-surface rounded-xl animate-pulse border border-border-light" />
                </div>
              ) : (
                <>
                  {/* Batch Selector Bar */}
                  {allBatches.length > 0 && (
                    <div className="p-3 bg-surface rounded-xl border border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-text-primary">Filter by Batch:</span>
                        <span className="text-[11px] text-text-tertiary">
                          {selectedBatch ? "Viewing single batch graph" : "Showing all batches combined"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        <button
                          onClick={() => handleBatchChange("")}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                            !selectedBatch
                              ? "bg-primary text-white shadow-sm"
                              : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                          }`}
                        >
                          All Batches ({allBatches.length})
                        </button>

                        {allBatches.map((b) => {
                          const isSelected = selectedBatch === b.name;
                          return (
                            <button
                              key={b.name}
                              onClick={() => handleBatchChange(b.name)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                              }`}
                            >
                              <span>Batch {b.batch_code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* KPI Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-text-tertiary mb-1">
                        <span className="text-xs font-medium">
                          {selectedBatch ? "Batch Average" : "Class Average"}
                        </span>
                        <Award className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-2xl font-bold ${
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

                    <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-text-tertiary mb-1">
                        <span className="text-xs font-medium">Exams Conducted</span>
                        <FileCheck2 className="h-3.5 w-3.5 text-info" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-text-primary">{stats.totalExams}</span>
                        <span className="text-[10px] text-text-tertiary">sessions</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-text-tertiary mb-1">
                        <span className="text-xs font-medium">Top Performance</span>
                        <Award className="h-3.5 w-3.5 text-success" />
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-bold text-text-primary block truncate" title={stats.bestExam}>
                          {stats.bestExam}
                        </span>
                        <span className="text-[10px] text-text-tertiary">highest score</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-text-tertiary mb-1">
                        <span className="text-xs font-medium">Performance Trend</span>
                        <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-2xl font-bold ${
                            stats.trend > 0 ? "text-success" : stats.trend < 0 ? "text-error" : "text-text-secondary"
                          }`}
                        >
                          {stats.trend > 0 ? `+${stats.trend}%` : `${stats.trend}%`}
                        </span>
                        <span className="text-[10px] text-text-tertiary">recent trajectory</span>
                      </div>
                    </div>
                  </div>

                  {/* Graph Card */}
                  <Card className="border border-border-light overflow-hidden bg-surface">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <h4 className="font-bold text-text-primary text-sm sm:text-base">
                            {selectedBatch
                              ? `Batch ${
                                  allBatches.find((b) => b.name === selectedBatch)?.batch_code || selectedBatch
                                } Performance Timeline & Trends`
                              : "Exam Performance Timeline & Trends"}
                          </h4>
                          {selectedBatch && (
                            <button
                              onClick={() => handleBatchChange("")}
                              className="text-[11px] text-primary hover:underline font-semibold ml-1"
                            >
                              (Reset to All)
                            </button>
                          )}
                        </div>

                        {/* Exam group filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          <button
                            onClick={() => setSelectedExamGroup("all")}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                              selectedExamGroup === "all"
                                ? "bg-primary text-white shadow-sm"
                                : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                            }`}
                          >
                            All ({timeline.length})
                          </button>

                          {examGroups.map((group) => {
                            const count = timeline.filter((e) => e.assessment_group === group).length;
                            const isSelected = selectedExamGroup === group;
                            return (
                              <button
                                key={group}
                                onClick={() => setSelectedExamGroup(group)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                                }`}
                              >
                                <span>{group}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isSelected ? "bg-white/20 text-white" : "bg-surface text-text-tertiary"
                                  }`}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Filter Pills Bar: Easily switch between All / Batch A / Batch B / Batch C */}
                      {allBatches.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 p-3 bg-app-bg rounded-xl border border-border-light">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-text-secondary mr-1 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-primary" />
                              View:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleBatchChange("")}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                !selectedBatch
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border border-border-light"
                              }`}
                            >
                              Combined (All Batches)
                            </button>
                            {allBatches.map((b, bIdx) => {
                              const isSelected = selectedBatch === b.name;
                              const cInfo = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
                              return (
                                <button
                                  key={b.name}
                                  type="button"
                                  onClick={() => handleBatchChange(isSelected ? "" : b.name)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                    isSelected
                                      ? "text-white shadow-xs"
                                      : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border-light text-text-primary"
                                  }`}
                                  style={
                                    isSelected
                                      ? { backgroundColor: cInfo.stroke, borderColor: cInfo.stroke }
                                      : {}
                                  }
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: isSelected ? "#ffffff" : cInfo.stroke }}
                                  />
                                  <span>Batch {b.batch_code}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                            {!selectedBatch && (
                              <>
                                <span className="flex items-center gap-1">
                                  <span className="w-4 h-0.5 bg-primary border-t border-dashed border-primary" />
                                  Class Average
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-4 h-0.5 bg-blue-500" />
                                  Individual Batches
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SVG Timeline */}
                      {filteredTimeline.length === 0 ? (
                        <div className="py-12 border border-dashed border-border-light rounded-xl text-center bg-app-bg/50">
                          <Layers className="h-7 w-7 text-text-tertiary mx-auto mb-1.5 opacity-50" />
                          <p className="text-xs font-medium text-text-secondary">No exam results recorded</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">
                            No submitted assessment marks found for this exam category.
                          </p>
                        </div>
                      ) : (
                        <div className="relative bg-surface rounded-xl border border-border-light p-4">
                          <div className="w-full overflow-x-auto no-scrollbar">
                            <svg
                              viewBox={`0 0 ${svgViewWidth} ${chartHeight}`}
                              className="w-full h-[260px] sm:h-[290px] select-none"
                            >
                              <defs>
                                <linearGradient id={`classGrad-${cls.replace(/\s+/g, "_")}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.08" />
                                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
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
                                      x2={svgViewWidth - chartPaddingRight}
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

                              {/* Area Gradient for overall trajectory */}
                              {svgPoints.length > 1 && (
                                <path d={areaPath} fill={`url(#classGrad-${cls.replace(/\s+/g, "_")})`} />
                              )}

                              {/* Separate Line and Dots for each Batch */}
                              {!selectedBatch &&
                                batchLines.map((bl) => {
                                  return (
                                    <g key={`batch-line-${bl.batch.name}`}>
                                      {/* Batch Line (only if >= 2 points) */}
                                      {bl.points.length > 1 && (
                                        <path
                                          d={bl.path}
                                          fill="none"
                                          stroke={bl.color.stroke}
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      )}

                                      {/* Batch Data Point Markers */}
                                      {bl.points.map((pt, pIdx) => (
                                        <g key={`b-pt-${bl.batch.name}-${pIdx}`}>
                                          <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="5"
                                            fill="#ffffff"
                                            stroke={bl.color.stroke}
                                            strokeWidth="2.5"
                                          />
                                          {/* Batch code tag next to point */}
                                          <rect
                                            x={pt.x - 14}
                                            y={pt.y - 18}
                                            width="28"
                                            height="13"
                                            rx="6.5"
                                            fill={bl.color.stroke}
                                          />
                                          <text
                                            x={pt.x}
                                            y={pt.y - 8.5}
                                            fontSize="8"
                                            fontWeight="800"
                                            textAnchor="middle"
                                            fill="#ffffff"
                                          >
                                            {bl.batch.batch_code} {pt.pct}%
                                          </text>
                                        </g>
                                      ))}
                                    </g>
                                  );
                                })}

                              {/* Overall Average Line */}
                              {svgPoints.length > 1 && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#4f46e5"
                                  strokeWidth={!selectedBatch && batchLines.length > 0 ? "2" : "3.5"}
                                  strokeDasharray={!selectedBatch && batchLines.length > 0 ? "5 4" : undefined}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity={!selectedBatch && batchLines.length > 0 ? 0.7 : 1}
                                />
                              )}

                              {/* Main Class Points */}
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
                                    onClick={() => setSelectedSubjectExam(pt.exam.exam_key)}
                                  >
                                    <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                                    {isHovered && (
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="12"
                                        fill={color}
                                        opacity="0.2"
                                        className="animate-ping"
                                      />
                                    )}

                                    <circle
                                      cx={pt.x}
                                      cy={pt.y}
                                      r={isHovered ? "7" : "5"}
                                      fill="#ffffff"
                                      stroke={color}
                                      strokeWidth={isHovered ? "3.5" : "2.5"}
                                      className="transition-all"
                                    />

                                    {/* Score pill tag above point (showing Class Avg when multiple batches) */}
                                    <rect
                                      x={pt.x - 30}
                                      y={pt.y - 32}
                                      width="60"
                                      height="16"
                                      rx="8"
                                      fill="#ffffff"
                                      stroke={color}
                                      strokeWidth="1.5"
                                      className="shadow-sm dark:fill-slate-900"
                                    />
                                    <text
                                      x={pt.x}
                                      y={pt.y - 21}
                                      fontSize="9"
                                      fontWeight="700"
                                      textAnchor="middle"
                                      fill={color}
                                    >
                                      Avg {pt.exam.percentage}%
                                    </text>

                                    {/* Exam Title */}
                                    <text
                                      x={pt.x}
                                      y={chartHeight - 18}
                                      fontSize="10"
                                      fontWeight="700"
                                      textAnchor="middle"
                                      fill="#1e293b"
                                      className="dark:fill-slate-100"
                                    >
                                      {pt.exam.exam_title.length > 18
                                        ? `${pt.exam.exam_title.slice(0, 16)}…`
                                        : pt.exam.exam_title}
                                    </text>

                                    {/* Exam Date */}
                                    <text
                                      x={pt.x}
                                      y={chartHeight - 5}
                                      fontSize="8.5"
                                      fontWeight="500"
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

                          {/* Quick Clear Batch Breakdown Bar below chart */}
                          <div className="mt-3 p-3 bg-app-bg rounded-xl border border-border-light space-y-2 text-xs">
                            {hoveredExam ? (
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div>
                                    <span className="font-bold text-text-primary mr-2 text-sm">
                                      {hoveredExam.exam_title}
                                    </span>
                                    <span className="text-text-tertiary">
                                      {formatDate(hoveredExam.schedule_date)} · {hoveredExam.subject_count} Subject(s) · {hoveredExam.students_appeared} Students
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-secondary">
                                      Total: <strong>{hoveredExam.total_score}</strong> / {hoveredExam.maximum_score}
                                    </span>
                                    <Badge variant={getGradeBadgeVariant(hoveredExam.percentage)}>
                                      {hoveredExam.percentage}% Class Avg
                                    </Badge>
                                  </div>
                                </div>

                                {hoveredExam.batch_scores && Object.keys(hoveredExam.batch_scores).length > 0 && (
                                  <div className="pt-2 border-t border-border-light flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold text-text-tertiary">Batch Breakdown:</span>
                                    {Object.entries(hoveredExam.batch_scores).map(([bGroup, bData]: [string, any]) => {
                                      const cInfo = batchColorMap.get(bGroup);
                                      return (
                                        <div
                                          key={bGroup}
                                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-light shadow-2xs"
                                        >
                                          <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: cInfo?.stroke || "#6366f1" }}
                                          />
                                          <span className="font-bold text-text-primary">
                                            Batch {bData.batch_code}:
                                          </span>
                                          <span
                                            className="font-bold"
                                            style={{ color: cInfo?.stroke || "#6366f1" }}
                                          >
                                            {bData.percentage}%
                                          </span>
                                          <span className="text-[10px] text-text-tertiary">
                                            ({bData.students_appeared} students)
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 text-text-secondary">
                                <div className="flex items-center gap-2">
                                  <Info className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-[11px]">
                                    Hover over any exam point for detailed student counts and subject marks, or click a batch button above to isolate its trajectory.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {allBatches.map((b, bIdx) => {
                                    const cInfo = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
                                    return (
                                      <span
                                        key={b.name}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold"
                                      >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cInfo.stroke }} />
                                        Batch {b.batch_code}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Batch Comparison & Subject Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Batches */}
                    <Card className="border border-border-light bg-surface">
                      <CardHeader className="pb-2.5 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <CardTitle className="text-sm font-bold">Batch Comparison</CardTitle>
                          </div>
                          <Badge variant="outline" className="text-[11px]">{batches.length} Batches</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {batches.length === 0 ? (
                          <p className="text-xs text-text-tertiary text-center py-4">No batches recorded</p>
                        ) : (
                          batches.map((b) => {
                            const isSelected = selectedBatch === b.student_group;
                            return (
                              <div
                                key={b.student_group}
                                onClick={() => handleBatchChange(isSelected ? "" : b.student_group)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                                    : "bg-app-bg hover:bg-slate-100/60 dark:hover:bg-slate-800/40 border-border-light"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-xs text-text-primary">{b.student_group_name}</p>
                                    {isSelected && (
                                      <span className="text-[10px] bg-primary text-white px-1.5 py-0.2 rounded font-medium">
                                        Active Graph
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-text-tertiary mt-0.5">
                                    {b.student_count} Students · {b.exam_count} Exams · Click to {isSelected ? "reset" : "isolate graph"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`text-sm font-bold ${
                                      b.avg_pct >= 75
                                        ? "text-success"
                                        : b.avg_pct >= 50
                                        ? "text-primary"
                                        : "text-error"
                                    }`}
                                  >
                                    {b.avg_pct}%
                                  </span>
                                  <span className="text-[10px] text-text-tertiary block">Batch Avg</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>

                    {/* Subjects with Chart Graph, Progress Bars, and List View */}
                    <Card className="border border-border-light bg-surface">
                      <CardHeader className="pb-2.5 pt-4 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <div>
                              <CardTitle className="text-sm font-bold">Subject-Wise Performance</CardTitle>
                              <p className="text-[11px] text-text-tertiary">
                                {selectedSubjectExam === "all"
                                  ? "Aggregated across all exams"
                                  : `Showing marks for ${
                                      timeline.find(
                                        (t) =>
                                          t.exam_key === selectedSubjectExam ||
                                          t.assessment_group === selectedSubjectExam ||
                                          t.exam_title === selectedSubjectExam,
                                      )?.exam_title || selectedSubjectExam
                                    }`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Exam Selector Dropdown to immediately identify CWC, Onam, Weekly, Unit Test */}
                            {timeline.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-text-tertiary">Exam:</span>
                                <select
                                  value={selectedSubjectExam}
                                  onChange={(e) => setSelectedSubjectExam(e.target.value)}
                                  className="px-2.5 py-1 text-xs font-bold bg-app-bg border border-border-light rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer max-w-[200px] truncate"
                                >
                                  <option value="all">All Exams Combined</option>
                                  {timeline.map((t) => (
                                    <option key={t.exam_key} value={t.exam_key}>
                                      {t.exam_title} ({t.assessment_group})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Toggle between Chart Graph, Progress, and List */}
                            <div className="flex items-center p-0.5 bg-app-bg rounded-lg border border-border-light text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setSubjectViewMode("chart")}
                                className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                  subjectViewMode === "chart"
                                    ? "bg-surface text-primary shadow-2xs font-bold"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                <BarChart3 className="w-3 h-3" />
                                Chart
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubjectViewMode("progress")}
                                className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                  subjectViewMode === "progress"
                                    ? "bg-surface text-primary shadow-2xs font-bold"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                <TrendingUp className="w-3 h-3" />
                                Progress
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubjectViewMode("list")}
                                className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                  subjectViewMode === "list"
                                    ? "bg-surface text-primary shadow-2xs font-bold"
                                    : "text-text-tertiary hover:text-text-primary"
                                }`}
                              >
                                <Layers className="w-3 h-3" />
                                List
                              </button>
                            </div>
                            <Badge variant="outline" className="text-[11px] hidden sm:inline-flex">{activeSubjects.length} Subjects</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {/* Current Exam Identification Banner */}
                        <div className="mb-3 px-3 py-1.5 rounded-lg bg-app-bg border border-border-light flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-text-tertiary">Selected Exam:</span>
                            <span className="font-bold text-text-primary">
                              {selectedSubjectExam === "all"
                                ? "All Exams Combined"
                                : timeline.find(
                                    (t) =>
                                      t.exam_key === selectedSubjectExam ||
                                      t.assessment_group === selectedSubjectExam ||
                                      t.exam_title === selectedSubjectExam,
                                  )?.exam_title || selectedSubjectExam}
                            </span>
                            {selectedSubjectExam !== "all" && (
                              <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                                {timeline.find(
                                  (t) =>
                                    t.exam_key === selectedSubjectExam ||
                                    t.assessment_group === selectedSubjectExam ||
                                    t.exam_title === selectedSubjectExam,
                                )?.assessment_group || "Exam"}
                              </span>
                            )}
                          </div>
                          {selectedSubjectExam !== "all" && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubjectExam("all")}
                              className="text-[11px] text-primary hover:underline font-semibold"
                            >
                              Reset to All
                            </button>
                          )}
                        </div>

                        {activeSubjects.length === 0 ? (
                          <p className="text-xs text-text-tertiary text-center py-6">No subject records for this exam</p>
                        ) : subjectViewMode === "chart" ? (
                          /* Vertical Column Chart Graph View */
                          <div className="space-y-3 pt-1">
                            <div className="w-full overflow-x-auto no-scrollbar">
                              {(() => {
                                const chartW = Math.max(540, activeSubjects.length * 68 + 60);
                                const chartH = 260;
                                const padLeft = 44;
                                const padRight = 24;
                                const padTop = 32;
                                const padBottom = 75;
                                const effH = chartH - padTop - padBottom;
                                const effW = chartW - padLeft - padRight;
                                const slotW = effW / activeSubjects.length;
                                const colWidth = Math.min(38, slotW * 0.62);

                                return (
                                  <svg
                                    viewBox={`0 0 ${chartW} ${chartH}`}
                                    className="w-full h-[270px] select-none overflow-visible"
                                  >
                                    <defs>
                                      <linearGradient id="subjBarGrad-green" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                      </linearGradient>
                                      <linearGradient id="subjBarGrad-primary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#4f46e5" />
                                      </linearGradient>
                                      <linearGradient id="subjBarGrad-red" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" />
                                        <stop offset="100%" stopColor="#e11d48" />
                                      </linearGradient>
                                    </defs>

                                    {/* Y-axis guidelines */}
                                    {[100, 75, 50, 25, 0].map((val) => {
                                      const y = chartH - padBottom - (val / 100) * effH;
                                      const isBench = val === 50;
                                      return (
                                        <g key={val}>
                                          <line
                                            x1={padLeft}
                                            y1={y}
                                            x2={chartW - padRight}
                                            y2={y}
                                            stroke={isBench ? "#6366f1" : "#e2e8f0"}
                                            strokeDasharray={val === 0 ? undefined : isBench ? "4 3" : "2 2"}
                                            strokeWidth={isBench ? "1.5" : "1"}
                                            opacity={isBench ? 0.65 : 1}
                                            className="dark:stroke-slate-800"
                                          />
                                          <text
                                            x={padLeft - 8}
                                            y={y + 3.5}
                                            fontSize="9.5"
                                            textAnchor="end"
                                            fill={isBench ? "#6366f1" : "#94a3b8"}
                                            fontWeight={isBench ? "700" : "500"}
                                            fontFamily="monospace"
                                          >
                                            {val}%
                                          </text>
                                        </g>
                                      );
                                    })}

                                    {/* Baseline */}
                                    <line
                                      x1={padLeft}
                                      y1={chartH - padBottom}
                                      x2={chartW - padRight}
                                      y2={chartH - padBottom}
                                      stroke="#cbd5e1"
                                      strokeWidth="1.5"
                                      className="dark:stroke-slate-700"
                                    />

                                    {/* Subject Columns */}
                                    {activeSubjects.map((sub, idx) => {
                                      const cx = padLeft + idx * slotW + slotW / 2;
                                      const x = cx - colWidth / 2;
                                      const pct = Math.min(100, Math.max(0, sub.avg_pct));
                                      const barH = (pct / 100) * effH;
                                      const y = chartH - padBottom - barH;
                                      const gradId =
                                        sub.avg_pct >= 75
                                          ? "url(#subjBarGrad-green)"
                                          : sub.avg_pct >= 50
                                          ? "url(#subjBarGrad-primary)"
                                          : "url(#subjBarGrad-red)";
                                      const fillTextColor =
                                        sub.avg_pct >= 75
                                          ? "#059669"
                                          : sub.avg_pct >= 50
                                          ? "#4f46e5"
                                          : "#e11d48";
                                      const isHovered = hoveredSubject === sub.course;
                                      const cleanName = sub.course.replace(/^(10th|11th|12th|9th|8th)\s*/i, "");

                                      return (
                                        <g
                                          key={sub.course}
                                          className="cursor-pointer transition-all"
                                          onMouseEnter={() => setHoveredSubject(sub.course)}
                                          onMouseLeave={() => setHoveredSubject(null)}
                                        >
                                          {/* Hitbox */}
                                          <rect
                                            x={cx - slotW / 2}
                                            y={padTop}
                                            width={slotW}
                                            height={effH + padBottom}
                                            fill="transparent"
                                          />

                                          {/* Bar background track */}
                                          <rect
                                            x={x}
                                            y={padTop}
                                            width={colWidth}
                                            height={effH}
                                            rx="6"
                                            fill="#f1f5f9"
                                            className="dark:fill-slate-800/60"
                                          />

                                          {/* Filled Bar */}
                                          <rect
                                            x={x}
                                            y={y}
                                            width={colWidth}
                                            height={barH}
                                            rx="6"
                                            fill={gradId}
                                            className="transition-all duration-300"
                                            opacity={isHovered ? 1 : 0.9}
                                          />

                                          {/* Score Tag with white pill background */}
                                          <rect
                                            x={cx - 19}
                                            y={y - 18}
                                            width="38"
                                            height="14"
                                            rx="7"
                                            fill="#ffffff"
                                            stroke={fillTextColor}
                                            strokeWidth="1"
                                            className="shadow-2xs dark:fill-slate-900"
                                          />
                                          <text
                                            x={cx}
                                            y={y - 8}
                                            fontSize="9"
                                            fontWeight="800"
                                            textAnchor="middle"
                                            fill={fillTextColor}
                                          >
                                            {sub.avg_pct}%
                                          </text>

                                          {/* Subject Label below X axis angled cleanly */}
                                          <g transform={`translate(${cx}, ${chartH - padBottom + 14}) rotate(-32)`}>
                                            <text
                                              x="0"
                                              y="0"
                                              fontSize="9.5"
                                              fontWeight="600"
                                              textAnchor="end"
                                              fill={isHovered ? "#4f46e5" : "#334155"}
                                              className="dark:fill-slate-200 transition-colors"
                                            >
                                              {cleanName}
                                            </text>
                                            <text
                                              x="0"
                                              y="10.5"
                                              fontSize="7.5"
                                              textAnchor="end"
                                              fill="#94a3b8"
                                            >
                                              {sub.pass_rate}% Pass
                                            </text>
                                          </g>
                                        </g>
                                      );
                                    })}
                                  </svg>
                                );
                              })()}
                            </div>

                            {/* Benchmark Legend */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-tertiary px-1 border-t border-border-light pt-2.5">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;= 75% High
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-primary" /> 50-74% Passing
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt; 50% Attention Needed
                                </span>
                              </div>
                              <span className="text-[10px] text-text-tertiary italic">
                                Dashed line = 50% Passing Benchmark
                              </span>
                            </div>
                          </div>
                        ) : subjectViewMode === "progress" ? (
                          /* Horizontal Progress Bars View */
                          <div className="space-y-3 pt-1">
                            {activeSubjects.map((sub) => {
                              const barColor =
                                sub.avg_pct >= 75
                                  ? "bg-emerald-500"
                                  : sub.avg_pct >= 50
                                  ? "bg-primary"
                                  : "bg-rose-500";
                              const textColor =
                                sub.avg_pct >= 75
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : sub.avg_pct >= 50
                                  ? "text-primary"
                                  : "text-rose-600 dark:text-rose-400";

                              return (
                                <div key={sub.course} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-text-primary truncate max-w-[180px] sm:max-w-[240px]" title={sub.course}>
                                      {sub.course}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[11px] text-text-tertiary hidden sm:inline-block">
                                        Pass: {sub.pass_rate}%
                                      </span>
                                      <span className={`font-bold ${textColor}`}>
                                        {sub.avg_pct}%
                                      </span>
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="w-full h-2.5 bg-app-bg rounded-full overflow-hidden border border-border-light relative">
                                    <div
                                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                      style={{ width: `${Math.min(100, Math.max(0, sub.avg_pct))}%` }}
                                    />
                                    {/* 50% passing guideline marker */}
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400/40 z-10"
                                      style={{ left: "50%" }}
                                      title="50% Benchmark"
                                    />
                                  </div>
                                </div>
                              );
                            })}

                            <div className="flex items-center justify-between pt-2 text-[10px] text-text-tertiary border-t border-border-light mt-3">
                              <span>0%</span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60" />
                                50% Benchmark
                              </span>
                              <span>100%</span>
                            </div>
                          </div>
                        ) : (
                          /* Subject List View */
                          <div className="space-y-2">
                            {activeSubjects.map((sub) => (
                              <div
                                key={sub.course}
                                className="p-2.5 bg-app-bg rounded-xl border border-border-light flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-semibold text-xs text-text-primary">{sub.course}</p>
                                  <p className="text-[11px] text-text-tertiary mt-0.5">
                                    {sub.total_students} entries · Pass Rate: {sub.pass_rate}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`text-sm font-bold ${
                                      sub.avg_pct >= 75
                                        ? "text-success"
                                        : sub.avg_pct >= 50
                                        ? "text-primary"
                                        : "text-error"
                                    }`}
                                  >
                                    {sub.avg_pct}%
                                  </span>
                                  <span className="text-[10px] text-text-tertiary block">Avg Score</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Student Leaderboard */}
                  <Card className="border border-border-light bg-surface">
                    <CardHeader className="pb-2.5 pt-4 px-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm font-bold">{cls} Student Rankings</CardTitle>
                        </div>

                        <div className="relative min-w-[200px]">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                          <input
                            type="text"
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-app-bg rounded-lg border border-border-input text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-app-bg/60 border-y border-border-light text-text-secondary font-semibold">
                            <tr>
                              <th className="px-4 py-2 w-12">Rank</th>
                              <th className="px-4 py-2">Student</th>
                              <th className="px-4 py-2">Batch</th>
                              <th className="px-4 py-2 text-center">Exams</th>
                              <th className="px-4 py-2 text-right">Percentage</th>
                              <th className="px-4 py-2 text-center">Grade</th>
                              <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-light">
                            {filteredStudents.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-text-tertiary">
                                  No students found
                                </td>
                              </tr>
                            ) : (
                              filteredStudents.map((st) => (
                                <tr key={st.student} className="hover:bg-app-bg/40 transition-colors">
                                  <td className="px-4 py-2.5 font-bold text-primary">#{st.rank}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="font-semibold text-text-primary">{st.student_name}</div>
                                    <div className="text-[10px] text-text-tertiary font-mono">{st.student}</div>
                                  </td>
                                  <td className="px-4 py-2.5 text-text-secondary">{st.batch}</td>
                                  <td className="px-4 py-2.5 text-center text-text-secondary">{st.exams_appeared}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-text-primary">
                                    <span
                                      className={
                                        st.percentage >= 80
                                          ? "text-success"
                                          : st.percentage >= 50
                                          ? "text-primary"
                                          : "text-error"
                                      }
                                    >
                                      {st.percentage}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <Badge variant={getGradeBadgeVariant(st.percentage)} className="text-[10px] px-2 py-0.5">
                                      {st.grade}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <Link
                                      href={`/dashboard/branch-manager/students/${encodeURIComponent(st.student)}`}
                                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-semibold"
                                    >
                                      <span>Inspect</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ClassPerformanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { defaultCompany } = useAuth();

  const urlProgram = searchParams.get("program") || "";
  const urlBatch = searchParams.get("batch") || "";
  const urlBranch = searchParams.get("branch") || "";
  const activeBranch = urlBranch || defaultCompany || "";
  const [expandedClass, setExpandedClass] = useState<string>(urlProgram);
  const [activeBatch, setActiveBatch] = useState<string>(urlBatch);
  const [classSearch, setClassSearch] = useState("");

  const { data: classListData, isLoading } = useQuery<{
    classes: string[];
    classBatches?: Record<string, Array<{ name: string; student_group_name: string; batch_code: string }>>;
  }>({
    queryKey: ["branch-classes-list", activeBranch],
    queryFn: async () => {
      if (!activeBranch) return { classes: [] };
      const res = await fetch(`/api/analytics/class-performance?branch=${encodeURIComponent(activeBranch)}`);
      if (!res.ok) return { classes: [] };
      return res.json();
    },
    enabled: !!activeBranch,
    staleTime: 5 * 60 * 1000,
  });

  const classes = classListData?.classes ?? [];
  const classBatches = classListData?.classBatches ?? {};

  // If url query updates (e.g. from sidebar click), expand that class & set batch
  React.useEffect(() => {
    if (urlProgram) {
      setExpandedClass(urlProgram);
    }
    setActiveBatch(urlBatch);
  }, [urlProgram, urlBatch]);

  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classes;
    return classes.filter((c) => c.toLowerCase().includes(classSearch.toLowerCase()));
  }, [classes, classSearch]);

  function updateUrl(cls: string, bName: string) {
    const params = new URLSearchParams();
    if (urlBranch) params.set("branch", urlBranch);
    if (cls) params.set("program", cls);
    if (bName) params.set("batch", bName);
    const queryString = params.toString();
    const newUrl = queryString
      ? `/dashboard/branch-manager/class-performance?${queryString}`
      : "/dashboard/branch-manager/class-performance";
    window.history.replaceState(null, "", newUrl);
  }

  function handleToggle(cls: string) {
    if (expandedClass === cls) {
      setExpandedClass("");
      setActiveBatch("");
      updateUrl("", "");
    } else {
      setExpandedClass(cls);
      setActiveBatch("");
      updateUrl(cls, "");
    }
  }

  function handleBatchSelect(cls: string, bName: string) {
    setActiveBatch(bName);
    updateUrl(cls, bName);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Class Performance & Graphs</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            List of active classes — click any class to expand its timeline graph, batch breakdown & student rankings
            {activeBranch && <span className="ml-1 text-text-tertiary">— {activeBranch}</span>}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search class (e.g. 10th State)..."
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface rounded-xl border border-border-input text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse border border-border-light" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredClasses.length === 0 && (
        <div className="py-16 text-center bg-surface border border-dashed border-border-light rounded-2xl">
          <School className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
          <p className="text-base font-semibold text-text-primary">No active classes found</p>
          <p className="text-xs text-text-tertiary mt-1">
            {classSearch ? "No classes match your search query." : "No classes currently configured for this branch."}
          </p>
        </div>
      )}

      {/* Class List (Accordion View) */}
      {!isLoading && filteredClasses.length > 0 && (
        <div className="space-y-3.5">
          {filteredClasses.map((cls) => {
            const isSelected = expandedClass === cls;
            const isDimmed = !!expandedClass && !isSelected;
            return (
              <ClassAccordionItem
                key={cls}
                cls={cls}
                isExpanded={isSelected}
                isDimmed={isDimmed}
                onToggle={() => handleToggle(cls)}
                branch={activeBranch}
                initialBatch={isSelected ? activeBatch : ""}
                batchesPreview={classBatches[cls] || []}
                onSelectBatch={(bName) => handleBatchSelect(cls, bName)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClassPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface rounded animate-pulse" />
          <div className="h-64 bg-surface rounded-2xl animate-pulse" />
        </div>
      }
    >
      <ClassPerformanceContent />
    </Suspense>
  );
}
