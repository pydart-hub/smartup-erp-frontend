"use client";

import React, { useState, useMemo, useRef, Suspense } from "react";
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
  ArrowLeft,
  FileCheck2,
  BookOpen,
  Sparkles,
  ChevronRight,
  School,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getClassPerformance,
  type ClassPerformanceResponse,
} from "@/lib/api/analytics";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

function calculateGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  return "F";
}

// Batch color palette (matches the branch-manager class-performance page)
const batchColorPalette = [
  { stroke: "#3b82f6", bg: "bg-blue-500",   text: "text-blue-600",   light: "#dbeafe",  label: "bg-blue-100 text-blue-700 border-blue-200" },
  { stroke: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600", light: "#d1fae5", label: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { stroke: "#f59e0b", bg: "bg-amber-500",   text: "text-amber-600",  light: "#fef3c7",  label: "bg-amber-100 text-amber-700 border-amber-200" },
  { stroke: "#ec4899", bg: "bg-pink-500",    text: "text-pink-600",   light: "#fce7f3",  label: "bg-pink-100 text-pink-700 border-pink-200" },
  { stroke: "#8b5cf6", bg: "bg-purple-500",  text: "text-purple-600", light: "#ede9fe",  label: "bg-purple-100 text-purple-700 border-purple-200" },
  { stroke: "#0d9488", bg: "bg-teal-500",    text: "text-teal-600",   light: "#ccfbf1",  label: "bg-teal-100 text-teal-700 border-teal-200" },
];

// ── Main Content ──────────────────────────────────────────────────────────────

function DirectorClassContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const branch  = searchParams.get("branch")  || "";
  const program = searchParams.get("program") || "";
  const urlBatch = searchParams.get("batch")  || "";

  // ── State ──
  const [selectedBatch, setSelectedBatch]           = useState<string>(urlBatch);
  const [selectedExamGroup, setSelectedExamGroup]   = useState<string>("all");
  const [hoveredExam, setHoveredExam]               = useState<any | null>(null);
  const [selectedSubject, setSelectedSubject]       = useState<string>("all");
  const [subjectViewMode, setSubjectViewMode]       = useState<"chart" | "progress" | "list">("chart");
  const [chartType, setChartType]                   = useState<"line" | "bar">("bar");
  const subjectSectionRef = useRef<HTMLDivElement>(null);

  // ── Data fetch ──
  const { data, isLoading } = useQuery<ClassPerformanceResponse>({
    queryKey: ["director-class-detail", branch, program, selectedBatch],
    queryFn: () =>
      getClassPerformance({ branch, program, batch: selectedBatch || undefined }),
    enabled: !!branch && !!program,
    staleTime: 60_000,
  });

  const timeline   = data?.timeline   ?? [];
  const stats      = data?.stats      ?? { overallAvg: 0, totalExams: 0, highestScore: 0, trend: 0, bestExam: "—", totalStudents: 0 };
  const batches    = data?.batches    ?? [];
  const allBatches = data?.allBatches ?? [];
  const subjects   = data?.subjects   ?? [];

  // ── Exam group filter ──
  const examGroups = useMemo(() => {
    const s = new Set<string>();
    timeline.forEach((t) => { if (t.assessment_group) s.add(t.assessment_group); });
    return Array.from(s);
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (selectedExamGroup === "all") return timeline;
    return timeline.filter((t) => t.assessment_group === selectedExamGroup);
  }, [timeline, selectedExamGroup]);

  // ── Batch color map ──
  const batchColorMap = useMemo(() => {
    const map = new Map<string, typeof batchColorPalette[0]>();
    allBatches.forEach((b, idx) => {
      map.set(b.name, batchColorPalette[idx % batchColorPalette.length]);
    });
    return map;
  }, [allBatches]);

  // ── SVG dimensions ──
  const chartHeight        = 280;
  const chartPaddingTop    = 32;
  const chartPaddingBottom = 48;
  const chartPaddingLeft   = 56;
  const chartPaddingRight  = 56;
  const svgViewWidth       = 860;

  function getPointX(idx: number, count: number) {
    if (count === 1) return svgViewWidth / 2;
    const lm = chartPaddingLeft + 40;
    const rm = svgViewWidth - chartPaddingRight - 40;
    return lm + (idx / (count - 1)) * (rm - lm);
  }

  // Overall average line
  const svgPoints = useMemo(() => {
    if (filteredTimeline.length === 0) return [];
    const effH = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;
    return filteredTimeline.map((exam, idx) => {
      const x = getPointX(idx, count);
      const y = chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, exam.percentage)) / 100) * effH;
      return { x, y, exam };
    });
  }, [filteredTimeline]);

  // Per-batch lines
  const batchLines = useMemo(() => {
    if (allBatches.length <= 1 || filteredTimeline.length === 0) return [];
    const effH = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;

    return allBatches.map((b, bIdx) => {
      const color = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
      const pts: Array<{ x: number; y: number; pct: number; exam: any }> = [];

      filteredTimeline.forEach((exam, idx) => {
        const x = getPointX(idx, count);
        const bScore = exam.batch_scores ? exam.batch_scores[b.name] : null;
        if (bScore && bScore.students_appeared > 0) {
          const y = chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, bScore.percentage)) / 100) * effH;
          pts.push({ x, y, pct: bScore.percentage, exam });
        }
      });

      let path = "";
      if (pts.length > 1) {
        path = pts.reduce((acc, pt, idx) => {
          if (idx === 0) return `M ${pt.x} ${pt.y}`;
          const prev = pts[idx - 1];
          const cx1 = prev.x + (pt.x - prev.x) / 2;
          const cy1 = prev.y;
          const cx2 = prev.x + (pt.x - prev.x) / 2;
          const cy2 = pt.y;
          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
        }, "");
      } else if (pts.length === 1) {
        path = `M ${pts[0].x} ${pts[0].y}`;
      }

      const isSelected = selectedBatch === b.name;
      const isMuted    = !!selectedBatch && !isSelected;

      return { batch: b, color, points: pts, path, isSelected, isMuted };
    }).filter((bl) => bl.points.length > 0);
  }, [allBatches, filteredTimeline, batchColorMap, selectedBatch]);

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
    return `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${bottomY} L ${svgPoints[0].x} ${bottomY} Z`;
  }, [linePath, svgPoints]);

  // ── Subject data based on selected batch ──
  const activeSubjects = useMemo(() => {
    return subjects;
  }, [subjects]);

  // Unique subjects list for filter pills
  const subjectList = useMemo(() => {
    return activeSubjects.map((s) => s.course).sort();
  }, [activeSubjects]);

  // Subject filtered display
  const displaySubjects = useMemo(() => {
    if (selectedSubject === "all") return activeSubjects;
    return activeSubjects.filter((s) => s.course === selectedSubject);
  }, [activeSubjects, selectedSubject]);

  // Student rankings filtered to selected batch
  const students = data?.students ?? [];
  const filteredStudents = useMemo(() => {
    if (!selectedBatch) return students;
    return students.filter((s) => s.batch === selectedBatch);
  }, [students, selectedBatch]);

  // ── Batch double-click handler ──
  function handleBatchDoubleClick(batchName: string) {
    setSelectedBatch((prev) => (prev === batchName ? "" : batchName));
    setSelectedSubject("all");
    // Smooth scroll to subject section
    setTimeout(() => {
      subjectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function handleBatchSelect(bName: string) {
    setSelectedBatch((prev) => (prev === bName ? "" : bName));
    setSelectedSubject("all");
  }

  const selectedBatchObj = allBatches.find((b) => b.name === selectedBatch);

  // ── Loading ──
  if (!branch || !program) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <School className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Missing branch or program in URL.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary text-sm hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-16">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
        <button
          onClick={() => router.push("/dashboard/director/academic-performance")}
          className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Performance
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="text-text-secondary font-semibold">{branch}</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="text-primary font-bold">{program}</span>
        {selectedBatchObj && (
          <>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-primary font-bold">Batch {selectedBatchObj.batch_code}</span>
          </>
        )}
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xs">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              {program}
            </h1>
            <p className="text-xs text-text-tertiary">
              {branch} — Batch-wise performance drill-down
              {selectedBatch && (
                <span className="ml-1 font-semibold text-primary">
                  · Batch {selectedBatchObj?.batch_code || selectedBatch} selected
                </span>
              )}
            </p>
          </div>
        </div>

        {selectedBatch && (
          <button
            onClick={() => { setSelectedBatch(""); setSelectedSubject("all"); }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border-light bg-surface hover:bg-app-bg text-text-secondary transition-all"
          >
            Clear Batch Filter
          </button>
        )}
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-surface rounded-xl animate-pulse border border-border-light" />
            ))}
          </div>
          <div className="h-72 bg-surface rounded-xl animate-pulse border border-border-light" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">{selectedBatch ? "Batch Avg" : "Class Avg"}</span>
                <Award className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${stats.overallAvg >= 75 ? "text-success" : stats.overallAvg >= 50 ? "text-primary" : "text-error"}`}>
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
              <div>
                <span className="text-sm font-bold text-text-primary block truncate" title={stats.bestExam}>
                  {stats.bestExam}
                </span>
                <span className="text-[10px] text-text-tertiary">highest scoring exam</span>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Trend</span>
                <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${stats.trend > 0 ? "text-success" : stats.trend < 0 ? "text-error" : "text-text-secondary"}`}>
                  {stats.trend > 0 ? `+${stats.trend}%` : `${stats.trend}%`}
                </span>
                <span className="text-[10px] text-text-tertiary">recent trajectory</span>
              </div>
            </div>
          </div>

          {/* ── Graph Card ── */}
          <Card className="border border-border-light bg-surface shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5">

              {/* Card header: title + exam group filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold text-text-primary text-sm sm:text-base">
                      {selectedBatch
                        ? `Batch ${selectedBatchObj?.batch_code || ""} — Exam Timeline`
                        : `${program} — All Batches Timeline`}
                    </h3>
                    <p className="text-[11px] text-text-tertiary">
                      {allBatches.length > 1
                        ? "Double-click a batch line to drill into its subject performance"
                        : "Exam trajectory over time"}
                    </p>
                  </div>
                </div>

                {/* Exam group filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
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
                    const isSel = selectedExamGroup === group;
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setSelectedExamGroup(group)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          isSel
                            ? "bg-primary text-white shadow-sm"
                            : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                        }`}
                      >
                        <span>{group}</span>
                        <span className={`text-[10px] px-1.5 rounded-full ${isSel ? "bg-white/20 text-white" : "bg-surface text-text-tertiary"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch selection pill ribbon */}
              {allBatches.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 p-3 bg-app-bg rounded-xl border border-border-light">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-text-secondary mr-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Batch:
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedBatch(""); setSelectedSubject("all"); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !selectedBatch
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border border-border-light"
                      }`}
                    >
                      All Batches Combined
                    </button>
                    {allBatches.map((b, bIdx) => {
                      const isSel = selectedBatch === b.name;
                      const cInfo = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
                      return (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => handleBatchSelect(b.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isSel
                              ? "text-white shadow-xs"
                              : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border-light text-text-primary"
                          }`}
                          style={isSel ? { backgroundColor: cInfo.stroke, borderColor: cInfo.stroke } : {}}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: isSel ? "#ffffff" : cInfo.stroke }}
                          />
                          Batch {b.batch_code}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                    {!selectedBatch && allBatches.length > 1 && (
                      <>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-0.5 border-t border-dashed border-primary" />
                          Class Avg
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-0.5 bg-blue-500" />
                          Individual Batches
                        </span>
                      </>
                    )}
                    {allBatches.length > 1 && (
                      <span className="text-primary/80 font-semibold hidden sm:inline">
                        {selectedBatch
                          ? "⤢ Double-click the graph to open subject view"
                          : "⤢ Double-click a batch line to drill in"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* SVG Graph */}
              {filteredTimeline.length === 0 ? (
                <div className="py-14 border border-dashed border-border-light rounded-xl text-center bg-app-bg/50">
                  <Layers className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-text-secondary">No exam results for this selection</p>
                </div>
              ) : (
                <div className="relative bg-surface rounded-xl border border-border-light p-4">
                  {/* Chart Type Switcher — top-right corner */}
                  <div className="absolute top-3 right-3 z-10 flex items-center p-0.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-border-light shadow-sm">
                    <button
                      type="button"
                      onClick={() => setChartType("line")}
                      title="Line Graph"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        chartType === "line" ? "bg-primary text-white shadow-xs" : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      title="Bar Chart"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        chartType === "bar" ? "bg-primary text-white shadow-xs" : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Bar
                    </button>
                  </div>

                  <div className="w-full overflow-x-auto no-scrollbar">
                    <svg
                      viewBox={`0 0 ${svgViewWidth} ${chartHeight}`}
                      className={`w-full h-[260px] sm:h-[290px] select-none ${selectedBatch ? "cursor-pointer" : "cursor-crosshair"}`}
                      onDoubleClick={() => {
                        if (selectedBatch) {
                          router.push(
                            `/dashboard/director/academic-performance/batch?branch=${encodeURIComponent(
                              branch,
                            )}&program=${encodeURIComponent(program)}&batch=${encodeURIComponent(selectedBatch)}`,
                          );
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id={`classGrad-dir-${program.replace(/\s+/g, "_")}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* Y-axis guidelines */}
                      {[100, 75, 50, 25, 0].map((val) => {
                        const effH = chartHeight - chartPaddingTop - chartPaddingBottom;
                        const y = chartHeight - chartPaddingBottom - (val / 100) * effH;
                        return (
                          <g key={val}>
                            <line
                              x1={chartPaddingLeft} y1={y}
                              x2={svgViewWidth - chartPaddingRight} y2={y}
                              stroke="#e2e8f0"
                              strokeDasharray={val === 0 ? undefined : "3 3"}
                              strokeWidth="1"
                              className="dark:stroke-slate-800"
                            />
                            <text x={chartPaddingLeft - 8} y={y + 3} fontSize="9" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                              {val}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Area for overall average */}
                      {svgPoints.length > 1 && !selectedBatch && (
                        <path d={areaPath} fill={`url(#classGrad-dir-${program.replace(/\s+/g, "_")})`} />
                      )}

                      {/* Vertical hover guide */}
                      {svgPoints.map((pt, idx) => {
                        const isHov = hoveredExam?.exam_key === pt.exam.exam_key;
                        if (!isHov) return null;
                        return (
                          <line
                            key={`vg-${idx}`}
                            x1={pt.x} y1={chartPaddingTop}
                            x2={pt.x} y2={chartHeight - chartPaddingBottom}
                            stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1.5"
                          />
                        );
                      })}

                      {/* ── Batch lines (colored, double-clickable) — LINE view only ── */}
                      {chartType === "line" && !selectedBatch && batchLines.map((bl) => {
                        const midIdx = Math.floor(bl.points.length / 2);
                        return (
                          <g
                            key={`bl-${bl.batch.name}`}
                            opacity={bl.isMuted ? 0.2 : 1}
                            onDoubleClick={() => handleBatchDoubleClick(bl.batch.name)}
                            style={{ cursor: "pointer" }}
                          >
                            <title>{`Double-click to drill into Batch ${bl.batch.batch_code} subject performance`}</title>
                            {bl.points.length > 1 && (
                              <path d={bl.path} fill="none" stroke="transparent" strokeWidth="18" />
                            )}
                            {bl.points.length > 1 && (
                              <path
                                d={bl.path} fill="none"
                                stroke={bl.color.stroke}
                                strokeWidth={bl.isSelected ? "4.5" : "3"}
                                strokeLinecap="round" strokeLinejoin="round"
                                className="transition-all"
                              />
                            )}
                            {bl.isSelected && bl.points.length > 0 && (
                              <text
                                x={bl.points[midIdx].x} y={bl.points[midIdx].y - 14}
                                fontSize="9" fontWeight="700" textAnchor="middle"
                                fill={bl.color.stroke} opacity="0.85"
                                style={{ pointerEvents: "none" }}
                              >
                                ⤢ Double-click to drill in
                              </text>
                            )}
                            {bl.points.map((pt, pIdx) => (
                              <g key={`bp-${bl.batch.name}-${pIdx}`}>
                                <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke={bl.color.stroke} strokeWidth="2.5" />
                                <rect x={pt.x - 15} y={pt.y - 20} width="30" height="13" rx="6.5" fill={bl.color.stroke} />
                                <text x={pt.x} y={pt.y - 10} fontSize="8" fontWeight="800" textAnchor="middle" fill="#ffffff">
                                  {bl.batch.batch_code} {pt.pct}%
                                </text>
                              </g>
                            ))}
                          </g>
                        );
                      })}

                      {/* ── BAR CHART VIEW for batches ── */}
                      {chartType === "bar" && (() => {
                        const batchesToRender = !selectedBatch
                          ? allBatches
                          : allBatches.filter((b) => b.name === selectedBatch);
                        const numExams   = filteredTimeline.length;
                        const numBatches = batchesToRender.length || 1;
                        const effW       = svgViewWidth - chartPaddingLeft - chartPaddingRight;
                        const effH       = chartHeight - chartPaddingTop - chartPaddingBottom;
                        const groupW     = effW / numExams;
                        const usableW    = groupW * 0.72;
                        const barW       = Math.max(4, usableW / numBatches - 2);
                        const bottomY    = chartHeight - chartPaddingBottom;

                        return (
                          <>
                            {filteredTimeline.map((exam, examIdx) => {
                              const gCenterX  = chartPaddingLeft + examIdx * groupW + groupW / 2;
                              const gStartX   = gCenterX - (numBatches / 2) * (barW + 2) + 1;
                              const isHovGrp  = hoveredExam?.exam_key === exam.exam_key;

                              return (
                                <g
                                  key={`bbar-${examIdx}`}
                                  onMouseEnter={() => setHoveredExam(exam)}
                                  onMouseLeave={() => setHoveredExam(null)}
                                  className="cursor-pointer"
                                >
                                  {isHovGrp && (
                                    <rect
                                      x={chartPaddingLeft + examIdx * groupW} y={chartPaddingTop}
                                      width={groupW} height={effH}
                                      fill="#f1f5f9" rx="4"
                                      className="dark:fill-slate-800/50"
                                      style={{ pointerEvents: "none" }}
                                    />
                                  )}
                                  <rect
                                    x={chartPaddingLeft + examIdx * groupW} y={chartPaddingTop}
                                    width={groupW} height={effH + chartPaddingBottom - 2}
                                    fill="transparent"
                                  />

                                  {batchesToRender.map((b, bIdx) => {
                                    const cInfo  = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
                                    const bScore = exam.batch_scores ? exam.batch_scores[b.name] : null;
                                    const pct    = bScore?.percentage ?? 0;
                                    const barH   = Math.max(2, (pct / 100) * effH);
                                    const barX   = gStartX + bIdx * (barW + 2);
                                    const barY   = bottomY - barH;
                                    const isMuted = selectedBatch !== "" && selectedBatch !== b.name;

                                    return (
                                      <g key={`bbar-${examIdx}-${b.name}`} opacity={isMuted ? 0.15 : 1} className="transition-all">
                                        <rect x={barX} y={barY} width={barW} height={barH} rx="3" ry="3" fill={cInfo.stroke} opacity="0.85" />
                                        {pct > 0 && (
                                          <>
                                            <rect x={barX + barW/2 - 14} y={barY - 17} width="28" height="14" rx="7" fill={cInfo.stroke} opacity="0.9" />
                                            <text x={barX + barW/2} y={barY - 7} fontSize="8" fontWeight="800" textAnchor="middle" fill="#ffffff" style={{ pointerEvents: "none" }}>
                                              {pct}%
                                            </text>
                                          </>
                                        )}
                                      </g>
                                    );
                                  })}

                                  <text x={gCenterX} y={chartHeight - 18} fontSize="9.5" fontWeight="700" textAnchor="middle"
                                    fill={isHovGrp ? "#1e293b" : "#475569"} className="dark:fill-slate-300"
                                    style={{ pointerEvents: "none" }}
                                  >
                                    {exam.exam_title.length > 14 ? `${exam.exam_title.slice(0, 12)}…` : exam.exam_title}
                                  </text>
                                  <text x={gCenterX} y={chartHeight - 5} fontSize="8.5" fontWeight="500" textAnchor="middle" fill="#94a3b8" style={{ pointerEvents: "none" }}>
                                    {formatDate(exam.schedule_date)}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}

                      {/* Overall average line & points — LINE view only */}
                      {chartType === "line" && (
                        <>
                          {svgPoints.length > 1 && (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#4f46e5"
                              strokeWidth={!selectedBatch && batchLines.length > 0 ? "2" : "3.5"}
                              strokeDasharray={!selectedBatch && batchLines.length > 0 ? "5 4" : undefined}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={!selectedBatch && batchLines.length > 0 ? 0.6 : 1}
                            />
                          )}

                          {/* Main exam data points (overall avg) */}
                          {svgPoints.map((pt, idx) => {
                            const isHov = hoveredExam?.exam_key === pt.exam.exam_key;
                            const color =
                              pt.exam.percentage >= 80 ? "#10b981"
                              : pt.exam.percentage >= 50 ? "#4f46e5"
                              : "#ef4444";
                            return (
                              <g
                                key={idx}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredExam(pt.exam)}
                                onMouseLeave={() => setHoveredExam(null)}
                              >
                                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                                {isHov && (
                                  <circle
                                    cx={pt.x} cy={pt.y} r="12"
                                    fill={color} opacity="0.15"
                                    className="animate-ping"
                                  />
                                )}

                                <circle
                                  cx={pt.x} cy={pt.y}
                                  r={isHov ? "7" : "5"}
                                  fill="#ffffff"
                                  stroke={color}
                                  strokeWidth={isHov ? "3.5" : "2.5"}
                                  className="transition-all"
                                />

                                {/* Score pill */}
                                <rect
                                  x={pt.x - 30} y={pt.y - 32}
                                  width="60" height="16"
                                  rx="8"
                                  fill="#ffffff" stroke={color}
                                  strokeWidth="1.5"
                                  className="dark:fill-slate-900"
                                />
                                <text
                                  x={pt.x} y={pt.y - 21}
                                  fontSize="9" fontWeight="700"
                                  textAnchor="middle" fill={color}
                                >
                                  Avg {pt.exam.percentage}%
                                </text>

                                {/* Exam title */}
                                <text
                                  x={pt.x} y={chartHeight - 18}
                                  fontSize="10" fontWeight="700"
                                  textAnchor="middle"
                                  fill="#1e293b"
                                  className="dark:fill-slate-100"
                                >
                                  {pt.exam.exam_title.length > 16
                                    ? `${pt.exam.exam_title.slice(0, 14)}…`
                                    : pt.exam.exam_title}
                                </text>
                                <text
                                  x={pt.x} y={chartHeight - 5}
                                  fontSize="8.5" fontWeight="500"
                                  textAnchor="middle" fill="#94a3b8"
                                >
                                  {formatDate(pt.exam.schedule_date)}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Hover inspector */}
                  <div className="mt-3 p-3 bg-app-bg rounded-xl border border-border-light text-xs transition-all">
                    {hoveredExam ? (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div>
                            <span className="font-bold text-text-primary mr-2 text-sm">{hoveredExam.exam_title}</span>
                            <span className="text-text-tertiary">
                              {formatDate(hoveredExam.schedule_date)} · {hoveredExam.subject_count} Subject(s) · {hoveredExam.students_appeared} Students
                            </span>
                          </div>
                          <Badge variant={getGradeBadgeVariant(hoveredExam.percentage)}>
                            {hoveredExam.percentage}% Class Avg
                          </Badge>
                        </div>

                        {hoveredExam.batch_scores && Object.keys(hoveredExam.batch_scores).length > 0 && (
                          <div className="pt-2 border-t border-border-light flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-text-tertiary">Batch Breakdown:</span>
                            {Object.entries(hoveredExam.batch_scores).map(([bGroup, bData]: [string, any]) => {
                              const cInfo = batchColorMap.get(bGroup);
                              return (
                                <div key={bGroup} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-light shadow-2xs">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cInfo?.stroke || "#6366f1" }} />
                                  <span className="font-bold text-text-primary">Batch {bData.batch_code}:</span>
                                  <span className="font-bold" style={{ color: cInfo?.stroke || "#6366f1" }}>{bData.percentage}%</span>
                                  <span className="text-[10px] text-text-tertiary">({bData.students_appeared} students)</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px]">
                            Hover any exam point for details.
                            {allBatches.length > 1 && " Double-click a batch line (A/B/C) to drill into its subject performance."}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {allBatches.map((b, bIdx) => {
                            const cInfo = batchColorMap.get(b.name) || batchColorPalette[bIdx % batchColorPalette.length];
                            return (
                              <span key={b.name} className="inline-flex items-center gap-1 text-[11px] font-semibold">
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

          {/* ── Batch Comparison Cards ── */}
          {batches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Batches in {program} ({batches.length})
                </h3>
                <span className="text-[11px] text-text-tertiary">
                  Double-click a batch line above — or click a card to filter
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {batches.map((b, idx) => {
                  const isSel  = selectedBatch === b.student_group;
                  const cInfo  = batchColorMap.get(b.student_group) || batchColorPalette[idx % batchColorPalette.length];
                  return (
                    <motion.div
                      key={b.student_group}
                      whileHover={{ y: -2 }}
                      onClick={() => handleBatchSelect(b.student_group)}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer bg-surface ${
                        isSel
                          ? "ring-2 ring-primary border-primary shadow-md"
                          : "border-border-light hover:border-primary/30 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cInfo.stroke }} />
                          <h4 className="font-extrabold text-sm text-text-primary truncate">
                            Batch {b.student_group_name.split("-").pop()?.trim() || b.student_group_name}
                          </h4>
                        </div>
                        <Badge variant={getGradeBadgeVariant(b.avg_pct)} className="text-[10px]">
                          {b.avg_pct}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border-light text-[11px]">
                        <div>
                          <span className="text-text-tertiary block text-[10px]">Students</span>
                          <span className="font-bold text-text-primary">{b.student_count}</span>
                        </div>
                        <div>
                          <span className="text-text-tertiary block text-[10px]">Exams</span>
                          <span className="font-bold text-text-primary">{b.exam_count}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border-light flex items-center justify-between text-[10px]">
                        <span className="text-text-tertiary">Click to {isSel ? "deselect" : "filter graph"}</span>
                        {isSel && (
                          <span className="text-primary font-bold flex items-center gap-1">
                            Active
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Subject-Wise Performance (with filter pills) ── */}
          <div ref={subjectSectionRef} id="subjects-section" className="space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                Subject-Wise Performance
                {selectedBatch && selectedBatchObj && (
                  <span className="ml-2 text-primary normal-case font-bold">— Batch {selectedBatchObj.batch_code}</span>
                )}
              </h3>
            </div>

            {/* ── Subject filter pills ── */}
            {subjectList.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-app-bg rounded-xl border border-border-light">
                <span className="text-xs font-bold text-text-secondary mr-1">Subject:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubject("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedSubject === "all"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border border-border-light"
                  }`}
                >
                  All Subjects ({subjectList.length})
                </button>
                {subjectList.map((subj) => {
                  const isSel = selectedSubject === subj;
                  const subData = activeSubjects.find((s) => s.course === subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(isSel ? "all" : subj)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        isSel
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border-light text-text-primary"
                      }`}
                    >
                      <span>{subj}</span>
                      {subData && (
                        <span className={`text-[10px] px-1 rounded-full font-semibold ${
                          isSel ? "bg-white/20 text-white" : "bg-app-bg text-text-tertiary"
                        }`}>
                          {subData.avg_pct}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* View mode toggle */}
            <Card className="border border-border-light bg-surface">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-tertiary">
                    {selectedSubject === "all"
                      ? `Showing all ${activeSubjects.length} subjects`
                      : `Showing: ${selectedSubject}`}
                    {selectedBatch && ` · Batch ${selectedBatchObj?.batch_code} only`}
                  </div>
                  <div className="flex items-center p-0.5 bg-app-bg rounded-lg border border-border-light text-[11px] font-semibold">
                    {(["chart", "progress", "list"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSubjectViewMode(mode)}
                        className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                          subjectViewMode === mode
                            ? "bg-surface text-primary shadow-2xs font-bold"
                            : "text-text-tertiary hover:text-text-primary"
                        }`}
                      >
                        {mode === "chart" ? <BarChart3 className="w-3 h-3" /> : mode === "progress" ? <TrendingUp className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {displaySubjects.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-6">No subject data available</p>
                ) : subjectViewMode === "chart" ? (
                  /* Bar Chart view */
                  <div className="space-y-2">
                    {displaySubjects.map((sub) => (
                      <div key={sub.course} className="flex items-center gap-3 group">
                        <div className="w-28 shrink-0 text-[11px] font-semibold text-text-primary truncate text-right" title={sub.course}>
                          {sub.course}
                        </div>
                        <div className="flex-1 bg-app-bg rounded-full h-6 overflow-hidden border border-border-light">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, sub.avg_pct)}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white ${
                              sub.avg_pct >= 75 ? "bg-success" : sub.avg_pct >= 50 ? "bg-primary" : "bg-error"
                            }`}
                          >
                            {sub.avg_pct >= 20 && `${sub.avg_pct}%`}
                          </motion.div>
                        </div>
                        <div className="w-12 text-right text-[11px] font-bold text-text-secondary shrink-0">
                          {sub.avg_pct}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : subjectViewMode === "progress" ? (
                  /* Progress bars */
                  <div className="space-y-3">
                    {displaySubjects.map((sub) => (
                      <div key={sub.course}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-text-primary truncate">{sub.course}</span>
                          <span className={`text-xs font-bold ${sub.avg_pct >= 75 ? "text-success" : sub.avg_pct >= 50 ? "text-primary" : "text-error"}`}>
                            {sub.avg_pct}%
                          </span>
                        </div>
                        <div className="relative h-3 bg-app-bg rounded-full border border-border-light overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sub.avg_pct}%` }}
                            transition={{ duration: 0.5 }}
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              sub.avg_pct >= 75 ? "bg-success" : sub.avg_pct >= 50 ? "bg-primary" : "bg-error"
                            }`}
                          />
                          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400/40 z-10" title="50% Benchmark" />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
                          <span>{sub.pass_count} passed</span>
                          <span>Pass rate: {sub.pass_rate}%</span>
                        </div>
                      </div>
                    ))}
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
                  /* List view */
                  <div className="space-y-2">
                    {displaySubjects.map((sub) => (
                      <div key={sub.course} className="p-2.5 bg-app-bg rounded-xl border border-border-light flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-xs text-text-primary">{sub.course}</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">
                            {sub.total_students} entries · Pass rate: {sub.pass_rate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${sub.avg_pct >= 75 ? "text-success" : sub.avg_pct >= 50 ? "text-primary" : "text-error"}`}>
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

          {/* ── Student Rankings ── */}
          {students.length > 0 && (
            <Card className="border border-border-light bg-surface shadow-xs">
              <CardHeader className="pb-2.5 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <div>
                      <CardTitle className="text-sm font-bold">Student Rankings</CardTitle>
                      <p className="text-[11px] text-text-tertiary">
                        {selectedBatch
                          ? `Batch ${selectedBatchObj?.batch_code} — ${filteredStudents.length} students`
                          : `All batches — ${students.length} students`}
                      </p>
                    </div>
                  </div>
                  {selectedBatch && (
                    <button
                      onClick={() => setSelectedBatch("")}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Show all batches
                    </button>
                  )}
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
                        <th className="px-4 py-2 text-right">Score</th>
                        <th className="px-4 py-2 text-center">Grade</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {filteredStudents.slice(0, 30).map((st) => (
                        <tr key={st.student} className="hover:bg-app-bg/40 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-primary">#{st.rank}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-text-primary">{st.student_name}</div>
                            <div className="text-[10px] text-text-tertiary font-mono">{st.student}</div>
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary">
                            {st.batch.split("-").pop()?.trim() || st.batch}
                          </td>
                          <td className="px-4 py-2.5 text-center text-text-secondary">{st.exams_appeared}</td>
                          <td className="px-4 py-2.5 text-right font-bold">
                            <span className={st.percentage >= 80 ? "text-success" : st.percentage >= 50 ? "text-primary" : "text-error"}>
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
                              href={`/dashboard/director/students/${encodeURIComponent(st.student)}`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredStudents.length > 30 && (
                    <p className="text-center text-[11px] text-text-tertiary py-3 border-t border-border-light">
                      Showing top 30 of {filteredStudents.length} students
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Page export with Suspense ─────────────────────────────────────────────────

export default function DirectorClassPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-surface rounded animate-pulse" />
          <div className="h-72 bg-surface rounded-2xl animate-pulse" />
        </div>
      }
    >
      <DirectorClassContent />
    </Suspense>
  );
}
