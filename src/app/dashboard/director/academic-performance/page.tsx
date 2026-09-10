"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  GraduationCap,
  Users,
  Search,
  School,
  FileCheck2,
  BookOpen,
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
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

// Curated high-contrast palette for distinct class curves
const classColorPalette = [
  { stroke: "#4f46e5", bg: "bg-indigo-600", light: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400" },
  { stroke: "#0284c7", bg: "bg-sky-600", light: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400" },
  { stroke: "#059669", bg: "bg-emerald-600", light: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  { stroke: "#d97706", bg: "bg-amber-600", light: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  { stroke: "#db2777", bg: "bg-pink-600", light: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-600 dark:text-pink-400" },
  { stroke: "#7c3aed", bg: "bg-purple-600", light: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400" },
  { stroke: "#0d9488", bg: "bg-teal-600", light: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400" },
  { stroke: "#ea580c", bg: "bg-orange-600", light: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400" },
];

function AcademicPerformanceDashboard() {
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>("all");
  const [hoveredExam, setHoveredExam] = useState<any | null>(null);
  const [subjectViewMode, setSubjectViewMode] = useState<"chart" | "progress">("chart");
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState<string>("");

  // 1. Fetch master branch list
  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ["director-academic-branches"],
    queryFn: () => getClassPerformance({}),
    staleTime: 5 * 60 * 1000,
  });

  const branches = branchesData?.branches ?? [];

  // Auto-select first branch when branches are loaded
  React.useEffect(() => {
    if (!selectedBranch && branches.length > 0) {
      setSelectedBranch(branches[0].branch);
    }
  }, [branches, selectedBranch]);

  // 2. Fetch performance data for the selected branch (with all classes)
  const { data, isLoading: loadingData } = useQuery<ClassPerformanceResponse>({
    queryKey: ["director-branch-perf", selectedBranch],
    queryFn: () => getClassPerformance({ branch: selectedBranch, program: "all" }),
    enabled: !!selectedBranch,
    staleTime: 60_000,
  });

  const timeline = data?.timeline ?? [];
  const classesList = data?.classes ?? [];
  const classBatches = data?.classBatches ?? {};
  const stats = data?.stats ?? {
    overallAvg: 0,
    totalExams: 0,
    highestScore: 0,
    trend: 0,
    bestExam: "—",
    totalStudents: 0,
  };
  const subjects = data?.subjects ?? [];

  // Reset selected class filter when branch changes
  React.useEffect(() => {
    setSelectedClass("all");
    setSelectedExamGroup("all");
    setHoveredExam(null);
  }, [selectedBranch]);

  // Exam category filters
  const examGroups = useMemo(() => {
    const s = new Set<string>();
    timeline.forEach((t) => {
      if (t.assessment_group) s.add(t.assessment_group);
    });
    return Array.from(s);
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (selectedExamGroup === "all") return timeline;
    return timeline.filter((e) => e.assessment_group === selectedExamGroup);
  }, [timeline, selectedExamGroup]);

  // Color mapping per class
  const classColorMap = useMemo(() => {
    const map = new Map<string, typeof classColorPalette[0]>();
    classesList.forEach((cls, idx) => {
      map.set(cls, classColorPalette[idx % classColorPalette.length]);
    });
    return map;
  }, [classesList]);

  // Class summary statistics calculation for the matrix below graph
  const classSummaries = useMemo(() => {
    const summaries: Array<{
      className: string;
      color: typeof classColorPalette[0];
      avgScore: number;
      examCount: number;
      studentCount: number;
      batchesCount: number;
      bestScore: number;
    }> = [];

    classesList.forEach((cls, idx) => {
      const color = classColorMap.get(cls) || classColorPalette[idx % classColorPalette.length];
      let totalPts = 0;
      let count = 0;
      let maxScore = 0;
      let totalStudentsSet = new Set<string>();

      filteredTimeline.forEach((e) => {
        const cs = e.class_scores ? e.class_scores[cls] : null;
        if (cs && cs.maximum_score > 0) {
          totalPts += cs.percentage;
          count += 1;
          if (cs.percentage > maxScore) maxScore = cs.percentage;
        }
      });

      const avgScore = count > 0 ? Math.round((totalPts / count) * 10) / 10 : 0;
      const bList = classBatches[cls] || [];

      summaries.push({
        className: cls,
        color,
        avgScore,
        examCount: count,
        studentCount: totalStudentsSet.size,
        batchesCount: bList.length,
        bestScore: maxScore,
      });
    });

    return summaries.sort((a, b) => b.avgScore - a.avgScore);
  }, [classesList, filteredTimeline, classColorMap, classBatches]);

  // SVG dimensions & math (neat and non-stretched)
  const numPoints = Math.max(filteredTimeline.length, 1);
  const pointGap = 130;
  const chartPaddingLeft = 60;
  const chartPaddingRight = 60;
  const chartPaddingTop = 40;
  const chartPaddingBottom = 45;
  const chartHeight = 270;
  const minSvgWidth = 760;
  const dynamicSvgWidth = chartPaddingLeft + chartPaddingRight + (numPoints - 1) * pointGap;
  const svgViewWidth = Math.max(minSvgWidth, dynamicSvgWidth);

  // Overall benchmark line points
  const svgPoints = useMemo(() => {
    if (filteredTimeline.length === 0) return [];
    const effectiveWidth = svgViewWidth - chartPaddingLeft - chartPaddingRight;
    const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    const stepX = filteredTimeline.length > 1 ? effectiveWidth / (filteredTimeline.length - 1) : effectiveWidth / 2;

    return filteredTimeline.map((exam, i) => {
      const x = filteredTimeline.length > 1 ? chartPaddingLeft + i * stepX : chartPaddingLeft + effectiveWidth / 2;
      const y = chartHeight - chartPaddingBottom - (exam.percentage / 100) * effectiveHeight;
      return { x, y, exam };
    });
  }, [filteredTimeline, svgViewWidth]);

  // Distinct class trajectory curves (Smooth lines with neat markers, NO overlapping tags)
  const classLines = useMemo(() => {
    if (classesList.length === 0 || filteredTimeline.length === 0) return [];
    const effectiveWidth = svgViewWidth - chartPaddingLeft - chartPaddingRight;
    const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    const stepX = filteredTimeline.length > 1 ? effectiveWidth / (filteredTimeline.length - 1) : effectiveWidth / 2;

    return classesList.map((cls, cIdx) => {
      const color = classColorMap.get(cls) || classColorPalette[cIdx % classColorPalette.length];
      const pts: Array<{ x: number; y: number; pct: number; exam: any }> = [];

      filteredTimeline.forEach((exam, i) => {
        const cScore = exam.class_scores ? exam.class_scores[cls] : null;
        if (cScore && cScore.maximum_score > 0) {
          const x = filteredTimeline.length > 1 ? chartPaddingLeft + i * stepX : chartPaddingLeft + effectiveWidth / 2;
          const y = chartHeight - chartPaddingBottom - (cScore.percentage / 100) * effectiveHeight;
          pts.push({ x, y, pct: cScore.percentage, exam });
        }
      });

      let pathStr = "";
      if (pts.length > 1) {
        pathStr = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
      }

      const isIsolated = selectedClass === cls;
      const isMuted = selectedClass !== "all" && !isIsolated;

      return {
        className: cls,
        color,
        points: pts,
        path: pathStr,
        isIsolated,
        isMuted,
      };
    });
  }, [classesList, selectedClass, filteredTimeline, svgViewWidth, classColorMap]);

  const linePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
  }, [svgPoints]);

  const areaPath = useMemo(() => {
    if (svgPoints.length < 2) return "";
    const bottomY = chartHeight - chartPaddingBottom;
    const firstX = svgPoints[0].x;
    const lastX = svgPoints[svgPoints.length - 1].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [svgPoints, linePath]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const q = branchSearch.toLowerCase();
    return branches.filter((b) => b.branch.toLowerCase().includes(q));
  }, [branches, branchSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header with Search and Branch Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Academic Performance
            </h1>
            <p className="text-xs sm:text-sm text-text-tertiary">
              Director Overview: Instant branch comparison with unified multi-class examination analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search branch..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border-light bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-primary shadow-2xs transition-all"
            />
          </div>
          <Badge variant="outline" className="px-3 py-1.5 font-bold text-text-primary border-border-light bg-surface shrink-0">
            {branches.length} Branches
          </Badge>
        </div>
      </div>

      {/* 2. Top Sleek Branch Switcher Ribbon (1-Click Switch, Zero Clutter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-secondary font-bold px-1">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Select Branch to View:
          </span>
          <span className="text-[11px] text-text-tertiary">
            Active: <strong className="text-primary font-bold">{selectedBranch}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {loadingBranches ? (
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-36 rounded-xl shrink-0" />
              ))}
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isSelected = selectedBranch === b.branch;
              const cleanName = b.branch.replace(/^Smart Up\s*/i, "");

              return (
                <button
                  key={b.branch}
                  type="button"
                  onClick={() => setSelectedBranch(b.branch)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-[1.02]"
                      : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/80 border-border-light text-text-primary"
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-primary"}`} />
                  <span>{cleanName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-app-bg text-text-secondary border border-border-light"
                    }`}
                  >
                    {b.classes.length} Classes
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Main Unified Performance Board for Active Branch */}
      {loadingData ? (
        <div className="space-y-5 bg-surface rounded-2xl border border-border-light p-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Branch Exam Average</span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-primary">{stats.overallAvg}%</span>
                <Badge variant={getGradeBadgeVariant(stats.overallAvg)} className="text-[10px] py-0 px-1.5">
                  Grade
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Active Programs</span>
                <School className="h-3.5 w-3.5 text-secondary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-text-primary">{classesList.length}</span>
                <span className="text-[10px] text-text-tertiary">classes</span>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Exams Conducted</span>
                <FileCheck2 className="h-3.5 w-3.5 text-info" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-text-primary">{stats.totalExams}</span>
                <span className="text-[10px] text-text-tertiary">sessions</span>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Top Exam Result</span>
                <Award className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="truncate">
                <span className="text-xs sm:text-sm font-bold text-text-primary block truncate" title={stats.bestExam}>
                  {stats.bestExam}
                </span>
                <span className="text-[10px] text-text-tertiary">highest score</span>
              </div>
            </div>

            <div className="rounded-xl border border-border-light bg-surface p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span className="text-xs font-medium">Recent Trajectory</span>
                <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-black ${
                    stats.trend > 0 ? "text-success" : stats.trend < 0 ? "text-error" : "text-text-secondary"
                  }`}
                >
                  {stats.trend > 0 ? `+${stats.trend}%` : `${stats.trend}%`}
                </span>
                <span className="text-[10px] text-text-tertiary">progress</span>
              </div>
            </div>
          </div>

          {/* 4. The Clean Unified Graph Card */}
          <Card className="border border-border-light bg-surface overflow-hidden shadow-xs">
            <CardContent className="p-4 sm:p-6">
              {/* Card Header with Title and Category Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-text-primary">
                      {selectedBranch} — All Classes Performance Timeline
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      Clean multi-class trajectory comparison without overlapping labels
                    </p>
                  </div>
                </div>

                {/* Exam Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedExamGroup("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedExamGroup === "all"
                        ? "bg-primary text-white shadow-xs"
                        : "bg-app-bg text-text-secondary hover:bg-border-light border border-border-light"
                    }`}
                  >
                    All Exams ({timeline.length})
                  </button>
                  {examGroups.map((group) => {
                    const count = timeline.filter((e) => e.assessment_group === group).length;
                    const isSelected = selectedExamGroup === group;
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setSelectedExamGroup(group)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-white shadow-xs"
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

              {/* Class Focus / Filter Ribbon */}
              {classesList.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 p-3 bg-app-bg rounded-xl border border-border-light">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-text-secondary mr-1 flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-primary" />
                      Highlight Class:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedClass("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedClass === "all"
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border border-border-light"
                      }`}
                    >
                      All Classes Combined
                    </button>
                    {classesList.map((cls, idx) => {
                      const isSelected = selectedClass === cls;
                      const cInfo = classColorMap.get(cls) || classColorPalette[idx % classColorPalette.length];
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setSelectedClass(isSelected ? "all" : cls)}
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
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                    {selectedClass !== "all" && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/branch-manager/class-performance?branch=${encodeURIComponent(
                              selectedBranch,
                            )}&program=${encodeURIComponent(selectedClass)}`,
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                      >
                        <span>Open {selectedClass} Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 border-t border-dashed border-primary" />
                      Branch Average
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-indigo-500" />
                      Individual Classes
                    </span>
                  </div>
                </div>
              )}

              {/* Clean SVG Graph */}
              {filteredTimeline.length === 0 ? (
                <div className="py-14 border border-dashed border-border-light rounded-xl text-center bg-app-bg/50">
                  <Layers className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-text-secondary">No exam results recorded for this selection</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    Ensure exams are graded and finalized in the Frappe backend.
                  </p>
                </div>
              ) : (
                <div className="relative bg-surface rounded-xl border border-border-light p-4">
                  <div className="w-full overflow-x-auto no-scrollbar">
                    <svg
                      viewBox={`0 0 ${svgViewWidth} ${chartHeight}`}
                      className="w-full h-[270px] select-none"
                    >
                      <defs>
                        <linearGradient id={`grad-unified-${selectedBranch.replace(/\s+/g, "_")}`} x1="0" y1="0" x2="0" y2="1">
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

                      {/* Subtle Area Gradient for Branch Average */}
                      {svgPoints.length > 1 && (
                        <path d={areaPath} fill={`url(#grad-unified-${selectedBranch.replace(/\s+/g, "_")})`} />
                      )}

                      {/* Vertical Date Grid Lines on hover */}
                      {svgPoints.map((pt, idx) => {
                        const isHovered = hoveredExam?.exam_key === pt.exam.exam_key;
                        if (!isHovered) return null;
                        return (
                          <line
                            key={`v-line-${idx}`}
                            x1={pt.x}
                            y1={chartPaddingTop}
                            x2={pt.x}
                            y2={chartHeight - chartPaddingBottom}
                            stroke="#cbd5e1"
                            strokeDasharray="2 2"
                            strokeWidth="1.5"
                          />
                        );
                      })}

                      {/* Individual Colored Trajectory Lines per Class */}
                      {classLines.map((cl) => {
                        return (
                          <g key={`class-line-${cl.className}`} opacity={cl.isMuted ? 0.2 : 1}>
                            {/* The Curve Line */}
                            {cl.points.length > 1 && (
                              <path
                                d={cl.path}
                                fill="none"
                                stroke={cl.color.stroke}
                                strokeWidth={cl.isIsolated ? "4" : "3"}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all"
                              />
                            )}

                            {/* Crisp Clean Data Points (NO clumping text pills) */}
                            {cl.points.map((pt, pIdx) => {
                              const isHovered = hoveredExam?.exam_key === pt.exam.exam_key;
                              return (
                                <circle
                                  key={`c-pt-${cl.className}-${pIdx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? "6" : "4.5"}
                                  fill="#ffffff"
                                  stroke={cl.color.stroke}
                                  strokeWidth={isHovered ? "3" : "2"}
                                  className="transition-all"
                                />
                              );
                            })}
                          </g>
                        );
                      })}

                      {/* Branch Benchmark Dashed Line */}
                      {svgPoints.length > 1 && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={selectedClass !== "all" ? 0.35 : 0.75}
                        />
                      )}

                      {/* Interactive Hover Nodes on X-Axis & Benchmark */}
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
                          >
                            {/* Generous hit area for easy hover */}
                            <rect
                              x={pt.x - pointGap / 2}
                              y={chartPaddingTop}
                              width={pointGap}
                              height={chartHeight - chartPaddingTop - chartPaddingBottom}
                              fill="transparent"
                            />

                            {/* Benchmark average node */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? "7" : "5"}
                              fill="#ffffff"
                              stroke="#4f46e5"
                              strokeWidth={isHovered ? "3.5" : "2"}
                            />

                            {/* Clean Date and Exam Label */}
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

                  {/* 5. Elegant Interactive Hover Inspector Panel */}
                  <div className="mt-3 p-3.5 bg-app-bg rounded-xl border border-border-light text-xs transition-all">
                    {hoveredExam ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-light">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-text-primary text-sm">
                              {hoveredExam.exam_title}
                            </span>
                            <span className="text-text-tertiary">
                              ({formatDate(hoveredExam.schedule_date)} · {hoveredExam.subject_count} Subjects · {hoveredExam.students_appeared} Students)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary">
                              Total Score: <strong>{hoveredExam.total_score}</strong> / {hoveredExam.maximum_score}
                            </span>
                            <Badge variant={getGradeBadgeVariant(hoveredExam.percentage)}>
                              {hoveredExam.percentage}% Branch Average
                            </Badge>
                          </div>
                        </div>

                        {/* Class-by-Class Performance Matrix for this Exam */}
                        {hoveredExam.class_scores && Object.keys(hoveredExam.class_scores).length > 0 && (
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[11px] font-bold text-text-tertiary">Class Scores:</span>
                            {Object.entries(hoveredExam.class_scores).map(([pName, cData]: [string, any]) => {
                              const cInfo = classColorMap.get(pName);
                              return (
                                <div
                                  key={pName}
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border-light shadow-2xs"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: cInfo?.stroke || "#4f46e5" }}
                                  />
                                  <span className="font-bold text-text-primary">{pName}:</span>
                                  <span
                                    className="font-extrabold"
                                    style={{ color: cInfo?.stroke || "#4f46e5" }}
                                  >
                                    {cData.percentage}%
                                  </span>
                                  <span className="text-[10px] text-text-tertiary">
                                    ({cData.students_appeared} students)
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
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>Hover over any exam date on the graph to inspect exact scores and class-by-class comparison</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {classesList.slice(0, 5).map((cls, cIdx) => {
                            const c = classColorMap.get(cls) || classColorPalette[cIdx % classColorPalette.length];
                            return (
                              <div key={cls} className="flex items-center gap-1 text-[11px]">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.stroke }} />
                                <span>{cls}</span>
                              </div>
                            );
                          })}
                          {classesList.length > 5 && (
                            <span className="text-[10px] text-text-tertiary font-bold">
                              +{classesList.length - 5} more
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

          {/* 6. Class Performance Comparison Matrix (Clean Side-by-Side Cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <School className="w-4 h-4 text-primary" />
                Classes in {selectedBranch} ({classesList.length})
              </h3>
              <span className="text-[11px] text-text-tertiary">
                Click any card to isolate that class on the graph above
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {classSummaries.map((cs) => {
                const isSelected = selectedClass === cs.className;
                const isDimmed = selectedClass !== "all" && !isSelected;

                return (
                  <motion.div
                    key={cs.className}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedClass(isSelected ? "all" : cs.className)}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer bg-surface ${
                      isSelected
                        ? "ring-2 ring-primary border-primary shadow-md opacity-100 scale-[1.01]"
                        : isDimmed
                        ? "border-border-light shadow-2xs opacity-40 hover:opacity-80 scale-[0.99]"
                        : "border-border-light hover:border-primary/40 shadow-2xs opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cs.color.stroke }}
                        />
                        <h4 className="font-extrabold text-sm text-text-primary truncate">
                          {cs.className}
                        </h4>
                      </div>
                      <Badge variant={getGradeBadgeVariant(cs.avgScore)} className="text-[10px]">
                        {cs.avgScore}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border-light text-[11px]">
                      <div>
                        <span className="text-text-tertiary block text-[10px]">Exams Given</span>
                        <span className="font-bold text-text-primary">{cs.examCount} Sessions</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary block text-[10px]">Batches</span>
                        <span className="font-bold text-text-primary">{cs.batchesCount} Sections</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border-light flex items-center justify-between text-[10px] font-bold">
                      <span className="text-text-tertiary">Top: {cs.bestScore}%</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/branch-manager/class-performance?branch=${encodeURIComponent(
                                selectedBranch,
                              )}&program=${encodeURIComponent(cs.className)}`,
                            );
                          }}
                          className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center gap-1 font-semibold text-[10px]"
                          title={`Open full ${cs.className} performance page with exam graphs`}
                        >
                          <span>Open Class</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-primary flex items-center gap-1">
                          {isSelected ? "Focused" : "Focus"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 7. Subject-Wise Overview Across Branch */}
          {subjects.length > 0 && (
            <Card className="border border-border-light bg-surface shadow-xs">
              <CardHeader className="pb-3 border-b border-border-light">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-text-primary">
                      Subject-Wise Performance Across {selectedBranch.replace(/^Smart Up\s*/i, "")}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 p-0.5 bg-app-bg rounded-lg border border-border-light">
                    <button
                      type="button"
                      onClick={() => setSubjectViewMode("chart")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        subjectViewMode === "chart"
                          ? "bg-surface text-primary shadow-xs font-bold"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      Columns
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubjectViewMode("progress")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        subjectViewMode === "progress"
                          ? "bg-surface text-primary shadow-xs font-bold"
                          : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      Progress Bars
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {subjectViewMode === "chart" ? (
                  <div className="h-48 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-border-light">
                    {subjects.map((s) => {
                      const isHovered = hoveredSubject === s.course;
                      const heightPct = Math.max(Math.min(s.avg_pct, 100), 5);
                      const barColor =
                        s.avg_pct >= 80 ? "#10b981" : s.avg_pct >= 60 ? "#6366f1" : s.avg_pct >= 40 ? "#f59e0b" : "#ef4444";

                      return (
                        <div
                          key={s.course}
                          className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                          onMouseEnter={() => setHoveredSubject(s.course)}
                          onMouseLeave={() => setHoveredSubject(null)}
                        >
                          <div
                            className={`absolute -top-7 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs transition-transform ${
                              isHovered ? "scale-110" : "scale-100"
                            }`}
                            style={{ backgroundColor: barColor }}
                          >
                            {s.avg_pct}%
                          </div>
                          <div className="w-full max-w-[34px] bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end h-full overflow-hidden">
                            <div
                              className="w-full rounded-t-lg transition-all"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: barColor,
                                opacity: hoveredSubject && !isHovered ? 0.45 : 1,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-center w-full">
                            <span
                              className="text-[11px] font-bold text-text-secondary group-hover:text-primary block truncate"
                              title={s.course}
                            >
                              {s.course}
                            </span>
                            <span className="text-[9px] text-text-tertiary block">
                              {s.pass_rate}% Pass
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((s) => {
                      const barColor =
                        s.avg_pct >= 80 ? "bg-emerald-500" : s.avg_pct >= 60 ? "bg-indigo-500" : s.avg_pct >= 40 ? "bg-amber-500" : "bg-rose-500";
                      return (
                        <div key={s.course} className="p-2.5 rounded-xl bg-app-bg border border-border-light space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-text-primary">{s.course}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-text-tertiary text-[11px]">{s.total_students} students</span>
                              <span className="font-bold text-primary">{s.avg_pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(s.avg_pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function DirectorAcademicPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      }
    >
      <AcademicPerformanceDashboard />
    </Suspense>
  );
}
