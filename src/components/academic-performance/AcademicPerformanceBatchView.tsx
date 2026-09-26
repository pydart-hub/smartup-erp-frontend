"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  getClassPerformance,
  type ClassPerformanceResponse,
} from "@/lib/api/analytics";

// ── Helpers ────────────────────────────────────────────────────────────────

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

// Subject color palette — vibrant, distinct
const subjectColorPalette = [
  { stroke: "#4f46e5", label: "Indigo" },
  { stroke: "#10b981", label: "Emerald" },
  { stroke: "#f59e0b", label: "Amber" },
  { stroke: "#ec4899", label: "Pink" },
  { stroke: "#8b5cf6", label: "Purple" },
  { stroke: "#0d9488", label: "Teal" },
  { stroke: "#ef4444", label: "Red" },
  { stroke: "#0ea5e9", label: "Sky" },
  { stroke: "#84cc16", label: "Lime" },
  { stroke: "#f97316", label: "Orange" },
];

export interface AcademicPerformanceBatchViewProps {
  basePath?: string;
  rolePrefix?: string;
}

export function AcademicPerformanceBatchView({
  basePath = "/dashboard/director/academic-performance",
  rolePrefix = "/dashboard/director",
}: AcademicPerformanceBatchViewProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const branch  = searchParams.get("branch")  || "";
  const program = searchParams.get("program") || "";
  const batch   = searchParams.get("batch")   || "";

  // ── State ──
  const [selectedSubject, setSelectedSubject]     = useState<string>("all");
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>("all");
  const [hoveredExam, setHoveredExam]             = useState<any | null>(null);
  const [subjectViewMode, setSubjectViewMode]     = useState<"chart" | "progress" | "list">("chart");
  const [chartType, setChartType]                 = useState<"line" | "bar">("bar");

  // ── Fetch ──
  const { data, isLoading } = useQuery<ClassPerformanceResponse>({
    queryKey: ["batch-subject", basePath, branch, program, batch],
    queryFn: () => getClassPerformance({ branch, program, batch: batch || undefined }),
    enabled:  !!branch && !!program,
    staleTime: 60_000,
  });

  const timeline = data?.timeline   ?? [];
  const subjects = data?.subjects   ?? [];
  const stats    = data?.stats      ?? { overallAvg: 0, totalExams: 0, highestScore: 0, trend: 0, bestExam: "—", totalStudents: 0 };
  const students = data?.students   ?? [];

  // Readable batch label (extract letter like "A", "B", "C")
  const batchLabel = useMemo(() => {
    const m = batch.match(/-([A-Z0-9]{1,2})$/i);
    return m ? m[1].toUpperCase() : batch.split("-").pop()?.trim() || batch;
  }, [batch]);

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

  // ── All unique subjects across timeline ──
  const allSubjectNames = useMemo(() => {
    const names = new Set<string>();
    timeline.forEach((exam) => {
      exam.subjects?.forEach((s) => names.add(s.course));
    });
    return Array.from(names).sort();
  }, [timeline]);

  // Subject → color map
  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allSubjectNames.forEach((name, idx) => {
      map.set(name, subjectColorPalette[idx % subjectColorPalette.length].stroke);
    });
    return map;
  }, [allSubjectNames]);

  // ── SVG dimensions ──
  const chartHeight        = 300;
  const chartPaddingTop    = 36;
  const chartPaddingBottom = 50;
  const chartPaddingLeft   = 56;
  const chartPaddingRight  = 60;
  const svgViewWidth       = 900;

  function getPointX(idx: number, count: number) {
    if (count === 1) return svgViewWidth / 2;
    const lm = chartPaddingLeft + 40;
    const rm = svgViewWidth - chartPaddingRight - 40;
    return lm + (idx / (count - 1)) * (rm - lm);
  }

  // ── Build per-subject lines ──
  const subjectLines = useMemo(() => {
    const effH  = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;
    if (count === 0) return [];

    // Only render the selected subject's line, or all if "all"
    const subjectsToRender = selectedSubject === "all" ? allSubjectNames : [selectedSubject];

    return subjectsToRender.map((subjectName) => {
      const color = subjectColorMap.get(subjectName) || "#4f46e5";
      const pts: Array<{ x: number; y: number; pct: number; exam: any }> = [];

      filteredTimeline.forEach((exam, idx) => {
        const subj = exam.subjects?.find((s) => s.course === subjectName);
        if (subj && subj.maximum_score > 0) {
          const x = getPointX(idx, count);
          const y = chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, subj.percentage)) / 100) * effH;
          pts.push({ x, y, pct: subj.percentage, exam });
        }
      });

      let path = "";
      if (pts.length > 1) {
        path = pts.reduce((acc, pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y}`;
          const prev = pts[i - 1];
          const cx1 = prev.x + (pt.x - prev.x) / 2;
          const cy1 = prev.y;
          const cx2 = prev.x + (pt.x - prev.x) / 2;
          const cy2 = pt.y;
          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
        }, "");
      }

      return { name: subjectName, color, points: pts, path };
    }).filter((sl) => sl.points.length > 0);
  }, [filteredTimeline, allSubjectNames, selectedSubject, subjectColorMap]);

  // Overall average line (all subjects combined per exam)
  const overallPoints = useMemo(() => {
    const effH  = chartHeight - chartPaddingTop - chartPaddingBottom;
    const count = filteredTimeline.length;
    if (count === 0) return [];
    return filteredTimeline.map((exam, idx) => {
      const x = getPointX(idx, count);
      const y = chartHeight - chartPaddingBottom - (Math.min(100, Math.max(0, exam.percentage)) / 100) * effH;
      return { x, y, exam };
    });
  }, [filteredTimeline]);

  const overallLinePath = useMemo(() => {
    if (overallPoints.length === 0) return "";
    return overallPoints.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = overallPoints[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      return `${acc} C ${cx1} ${prev.y}, ${cx1} ${pt.y}, ${pt.x} ${pt.y}`;
    }, "");
  }, [overallPoints]);

  // ── Subject display data ──
  const displaySubjects = useMemo(() => {
    if (selectedSubject === "all") return subjects;
    return subjects.filter((s) => s.course === selectedSubject);
  }, [subjects, selectedSubject]);

  if (!branch || !program) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Missing parameters in URL.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary text-sm hover:underline">← Go back</button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-16">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
        <button
          onClick={() => router.push(basePath)}
          className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Performance
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <button
          onClick={() => router.push(`${basePath}/class?branch=${encodeURIComponent(branch)}&program=${encodeURIComponent(program)}`)}
          className="hover:text-primary transition-colors font-semibold"
        >
          {program}
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="text-primary font-bold">Batch {batchLabel} — Subject View</span>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xs">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Batch {batchLabel} — Subject Exam Graph
            </h1>
            <p className="text-xs text-text-tertiary">
              {branch} · {program} · Subject-wise performance across all exams
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`${basePath}/class?branch=${encodeURIComponent(branch)}&program=${encodeURIComponent(program)}&batch=${encodeURIComponent(batch)}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border-light bg-surface hover:bg-app-bg text-text-secondary transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Batch View
        </button>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-surface rounded-xl animate-pulse border border-border-light" />
            ))}
          </div>
          <div className="h-80 bg-surface rounded-xl animate-pulse border border-border-light" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Batch Average</span>
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
                <span className="text-xs font-medium">Subjects</span>
                <BookOpen className="h-3.5 w-3.5 text-info" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-text-primary">{allSubjectNames.length}</span>
                <span className="text-[10px] text-text-tertiary">in this batch</span>
              </div>
            </div>
            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Exams Conducted</span>
                <FileCheck2 className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-text-primary">{stats.totalExams}</span>
                <span className="text-[10px] text-text-tertiary">sessions</span>
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

          {/* ── Subject Graph Card ── */}
          <Card className="border border-border-light bg-surface shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5">

              {/* Card header + exam group filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold text-text-primary text-sm sm:text-base">
                      {selectedSubject === "all"
                        ? `Batch ${batchLabel} — All Subjects Timeline`
                        : `${selectedSubject} — Exam Timeline`}
                    </h3>
                    <p className="text-[11px] text-text-tertiary">
                      {selectedSubject === "all"
                        ? "Each colored line = one subject · Click a subject pill below to isolate"
                        : `Showing only ${selectedSubject} · Click "All Subjects" to see all`}
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

              {/* ── Subject Filter Pills ── */}
              {allSubjectNames.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-app-bg rounded-xl border border-border-light">
                  <span className="text-xs font-bold text-text-secondary mr-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Subject:
                  </span>
                  {/* All button */}
                  <button
                    type="button"
                    onClick={() => setSelectedSubject("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedSubject === "all"
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border border-border-light"
                    }`}
                  >
                    All Subjects ({allSubjectNames.length})
                  </button>

                  {/* Per-subject pills */}
                  {allSubjectNames.map((name) => {
                    const color  = subjectColorMap.get(name) || "#4f46e5";
                    const isSel  = selectedSubject === name;
                    const subData = subjects.find((s) => s.course === name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedSubject(isSel ? "all" : name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSel
                            ? "text-white shadow-xs"
                            : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border-light text-text-primary"
                        }`}
                        style={isSel ? { backgroundColor: color, borderColor: color } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSel ? "#ffffff" : color }}
                        />
                        <span className="truncate max-w-[120px]">{name}</span>
                        {subData && (
                          <span
                            className={`text-[10px] px-1 rounded-full font-semibold shrink-0 ${
                              isSel ? "bg-white/20 text-white" : "bg-app-bg text-text-tertiary"
                            }`}
                          >
                            {subData.avg_pct}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── SVG Graph ── */}
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
                      className="w-full h-[280px] sm:h-[310px] select-none"
                    >
                      <defs>
                        <linearGradient id="batchSubjectGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.07" />
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

                      {/* Vertical hover guide */}
                      {overallPoints.map((pt, idx) => {
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

                      {/* ══ Per-subject colored lines — LINE view only ══ */}
                      {chartType === "line" && subjectLines.map((sl) => (
                        <g key={`subj-line-${sl.name}`}>
                          {/* Invisible wide hit area */}
                          {sl.points.length > 1 && (
                            <path d={sl.path} fill="none" stroke="transparent" strokeWidth="12" />
                          )}

                          {/* Visible subject line */}
                          {sl.points.length > 1 && (
                            <path
                              d={sl.path}
                              fill="none"
                              stroke={sl.color}
                              strokeWidth={selectedSubject === sl.name ? "3.5" : "2.5"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={selectedSubject !== "all" && selectedSubject !== sl.name ? 0.2 : 1}
                              className="transition-all"
                            />
                          )}

                          {/* Subject data points */}
                          {sl.points.map((pt, pIdx) => {
                            const isHov = hoveredExam?.exam_key === pt.exam.exam_key;
                            return (
                              <g key={`sp-${sl.name}-${pIdx}`}>
                                <circle
                                  cx={pt.x} cy={pt.y}
                                  r={isHov ? "5.5" : "4"}
                                  fill="#ffffff"
                                  stroke={sl.color}
                                  strokeWidth={isHov ? "3" : "2"}
                                  className="transition-all"
                                />
                                {/* Score chip — only show if subject is isolated or on hover */}
                                {(selectedSubject === sl.name || (selectedSubject === "all" && isHov)) && (
                                  <>
                                    <rect
                                      x={pt.x - 18} y={pt.y - 22}
                                      width="36" height="14"
                                      rx="7"
                                      fill={sl.color}
                                    />
                                    <text
                                      x={pt.x} y={pt.y - 12}
                                      fontSize="8" fontWeight="800"
                                      textAnchor="middle" fill="#ffffff"
                                    >
                                      {pt.pct}%
                                    </text>
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      ))}

                      {/* Overall dashed average (shown only in all-subjects line view) */}
                      {chartType === "line" && selectedSubject === "all" && overallPoints.length > 1 && (
                        <path
                          d={overallLinePath}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          opacity="0.5"
                          strokeLinecap="round"
                        />
                      )}

                      {/* ══ BAR CHART VIEW for subjects ══ */}
                      {chartType === "bar" && (() => {
                        const subjectsToRender = selectedSubject === "all"
                          ? allSubjectNames
                          : [selectedSubject];
                        const numExams = filteredTimeline.length;
                        const numSubjs = subjectsToRender.length || 1;
                        const effW = svgViewWidth - chartPaddingLeft - chartPaddingRight;
                        const effH = chartHeight - chartPaddingTop - chartPaddingBottom;
                        const groupW = effW / numExams;
                        const usableW = groupW * 0.75;
                        const barW = Math.max(3, usableW / numSubjs - 1.5);
                        const bottomY = chartHeight - chartPaddingBottom;

                        return (
                          <>
                            {filteredTimeline.map((exam, examIdx) => {
                              const gCenterX = chartPaddingLeft + examIdx * groupW + groupW / 2;
                              const gStartX = gCenterX - (numSubjs / 2) * (barW + 1.5) + 0.75;
                              const isHovGrp = hoveredExam?.exam_key === exam.exam_key;

                              return (
                                <g
                                  key={`sbar-${examIdx}`}
                                  onMouseEnter={() => setHoveredExam(exam)}
                                  onMouseLeave={() => setHoveredExam(null)}
                                  className="cursor-pointer"
                                >
                                  {/* Soft background highlight for hovered group */}
                                  {isHovGrp && (
                                    <rect
                                      x={chartPaddingLeft + examIdx * groupW + 2}
                                      y={chartPaddingTop - 5}
                                      width={groupW - 4}
                                      height={effH + 10}
                                      rx="6"
                                      fill="#f1f5f9"
                                      className="dark:fill-slate-800/50"
                                    />
                                  )}

                                  {subjectsToRender.map((subjName, sIdx) => {
                                    const subjObj = exam.subjects?.find((s) => s.course === subjName);
                                    const pct = subjObj ? subjObj.percentage : 0;
                                    const barH = (pct / 100) * effH;
                                    const barX = gStartX + sIdx * (barW + 1.5);
                                    const barY = bottomY - barH;
                                    const color = subjectColorMap.get(subjName) || "#4f46e5";
                                    const isMuted = selectedSubject !== "all" && selectedSubject !== subjName;

                                    return (
                                      <g key={`bar-${subjName}-${examIdx}`} opacity={isMuted ? 0.15 : 1} className="transition-opacity">
                                        <rect
                                          x={barX}
                                          y={barY}
                                          width={barW}
                                          height={Math.max(2, barH)}
                                          rx="3"
                                          fill={color}
                                        />
                                        {/* Percentage label on top of bar */}
                                        {(!isMuted || isHovGrp) && numSubjs <= 5 && barH > 15 && (
                                          <text
                                            x={barX + barW / 2}
                                            y={barY - 3}
                                            fontSize="7.5"
                                            fontWeight="800"
                                            textAnchor="middle"
                                            fill={color}
                                          >
                                            {pct}%
                                          </text>
                                        )}
                                      </g>
                                    );
                                  })}
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}

                      {/* Hover interaction layer (transparent rects for each exam column) */}
                      {overallPoints.map((pt, idx) => {
                        const isHov = hoveredExam?.exam_key === pt.exam.exam_key;
                        const gapX = overallPoints.length > 1
                          ? (overallPoints[1].x - overallPoints[0].x)
                          : svgViewWidth / 2;
                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredExam(pt.exam)}
                            onMouseLeave={() => setHoveredExam(null)}
                          >
                            <rect
                              x={pt.x - gapX / 2}
                              y={chartPaddingTop}
                              width={gapX}
                              height={chartHeight - chartPaddingTop - chartPaddingBottom}
                              fill="transparent"
                            />
                            {/* Exam title bottom label */}
                            <text
                              x={pt.x} y={chartHeight - 20}
                              fontSize="10" fontWeight="700"
                              textAnchor="middle"
                              fill={isHov ? "#1e293b" : "#475569"}
                              className="dark:fill-slate-300"
                            >
                              {pt.exam.exam_title.length > 14
                                ? `${pt.exam.exam_title.slice(0, 12)}…`
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
                    </svg>
                  </div>

                  {/* ── Hover Inspector ── */}
                  <div className="mt-3 p-3 bg-app-bg rounded-xl border border-border-light text-xs">
                    {hoveredExam ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-text-primary text-sm mr-2">{hoveredExam.exam_title}</span>
                            <span className="text-text-tertiary">
                              {formatDate(hoveredExam.schedule_date)} · {hoveredExam.students_appeared} Students
                            </span>
                          </div>
                          <Badge variant={getGradeBadgeVariant(hoveredExam.percentage)}>
                            {hoveredExam.percentage}% Batch Avg
                          </Badge>
                        </div>

                        {hoveredExam.subjects && hoveredExam.subjects.length > 0 && (
                          <div className="pt-2 border-t border-border-light flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-text-tertiary">Subject Scores:</span>
                            {(hoveredExam.subjects as Array<{ course: string; percentage: number }>)
                              .filter((s) => selectedSubject === "all" || s.course === selectedSubject)
                              .map((s) => {
                                const color = subjectColorMap.get(s.course) || "#4f46e5";
                                return (
                                  <div
                                    key={s.course}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-light"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-semibold text-text-secondary truncate max-w-[80px]">{s.course}:</span>
                                    <span className="font-extrabold" style={{ color }}>{s.percentage}%</span>
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
                            Hover any exam to see subject-wise scores for that exam.
                            {selectedSubject === "all" ? " Click a subject pill to isolate its line." : ` Showing ${selectedSubject} only.`}
                          </span>
                        </div>
                        {/* Subject color legend */}
                        <div className="flex flex-wrap items-center gap-2">
                          {(selectedSubject === "all" ? allSubjectNames.slice(0, 6) : [selectedSubject]).map((name) => {
                            const color = subjectColorMap.get(name) || "#4f46e5";
                            return (
                              <span key={name} className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                <span className="truncate max-w-[80px]">{name}</span>
                              </span>
                            );
                          })}
                          {selectedSubject === "all" && allSubjectNames.length > 6 && (
                            <span className="text-[10px] text-text-tertiary font-bold">
                              +{allSubjectNames.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Subject Summary Cards ── */}
          {displaySubjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {selectedSubject === "all" ? `All Subjects (${subjects.length})` : selectedSubject}
                </h3>
                {selectedSubject !== "all" && (
                  <button
                    onClick={() => setSelectedSubject("all")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Show all subjects
                  </button>
                )}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 bg-app-bg rounded-lg border border-border-light text-[11px] font-semibold">
                  {(["chart", "progress", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSubjectViewMode(mode)}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
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

              <Card className="border border-border-light bg-surface">
                <CardContent className="px-4 py-4">
                  {subjectViewMode === "chart" ? (
                    <div className="space-y-2.5">
                      {displaySubjects.map((sub) => {
                        const color = subjectColorMap.get(sub.course) || "#4f46e5";
                        return (
                          <div key={sub.course} className="flex items-center gap-3">
                            <div className="w-28 shrink-0 flex items-center gap-1.5 justify-end">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-[11px] font-semibold text-text-primary truncate text-right" title={sub.course}>
                                {sub.course}
                              </span>
                            </div>
                            <div className="flex-1 bg-app-bg rounded-full h-7 overflow-hidden border border-border-light">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, sub.avg_pct)}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {sub.avg_pct >= 18 && `${sub.avg_pct}%`}
                              </motion.div>
                            </div>
                            <div className="w-10 text-right text-xs font-bold shrink-0" style={{ color }}>
                              {sub.avg_pct}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : subjectViewMode === "progress" ? (
                    <div className="space-y-3">
                      {displaySubjects.map((sub) => {
                        const color = subjectColorMap.get(sub.course) || "#4f46e5";
                        return (
                          <div key={sub.course}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-xs font-semibold text-text-primary">{sub.course}</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color }}>{sub.avg_pct}%</span>
                            </div>
                            <div className="relative h-3 bg-app-bg rounded-full border border-border-light overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${sub.avg_pct}%` }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400/40 z-10" />
                            </div>
                            <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
                              <span>{sub.pass_count} passed</span>
                              <span>Pass rate: {sub.pass_rate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displaySubjects.map((sub) => {
                        const color = subjectColorMap.get(sub.course) || "#4f46e5";
                        return (
                          <div key={sub.course} className="p-2.5 bg-app-bg rounded-xl border border-border-light flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              <div>
                                <p className="font-semibold text-xs text-text-primary">{sub.course}</p>
                                <p className="text-[11px] text-text-tertiary mt-0.5">
                                  {sub.total_students} entries · Pass rate: {sub.pass_rate}%
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold" style={{ color }}>{sub.avg_pct}%</span>
                              <span className="text-[10px] text-text-tertiary block">Avg Score</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Student Rankings ── */}
          {students.length > 0 && (
            <Card className="border border-border-light bg-surface shadow-xs">
              <CardHeader className="pb-2.5 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-bold">Student Rankings</CardTitle>
                    <p className="text-[11px] text-text-tertiary">Batch {batchLabel} · {students.length} students</p>
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
                        <th className="px-4 py-2 text-center">Exams</th>
                        <th className="px-4 py-2 text-right">Score</th>
                        <th className="px-4 py-2 text-center">Grade</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {students.slice(0, 25).map((st) => (
                        <tr key={st.student} className="hover:bg-app-bg/40 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-primary">#{st.rank}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-text-primary">{st.student_name}</div>
                            <div className="text-[10px] text-text-tertiary font-mono">{st.student}</div>
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
                              href={`${rolePrefix}/students/${encodeURIComponent(st.student)}`}
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
                  {students.length > 25 && (
                    <p className="text-center text-[11px] text-text-tertiary py-3 border-t border-border-light">
                      Showing top 25 of {students.length} students
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
