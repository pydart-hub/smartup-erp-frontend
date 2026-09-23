"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  User,
  Calendar,
  BookOpen,
  School,
  Sparkles,
  MessageSquare,
  Filter,
  Search,
  Users,
  Award,
  Layers,
  BarChart3,
  Building2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { InstructorFeedbackRecord } from "@/lib/types/instructorFeedback";

interface Props {
  instructorId?: string; // If viewing for a specific instructor
  branch?: string;
  title?: string;
  showAnalytics?: boolean;
}

export function InstructorReviewList({
  instructorId,
  branch,
  title = "Student Reviews & Feedback",
  showAnalytics = true,
}: Props) {
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeView, setActiveView] = useState<"branch" | "faculty" | "feed">("branch");
  const [drilldownBranch, setDrilldownBranch] = useState<string | null>(null);
  const [drilldownInstructor, setDrilldownInstructor] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const queryParams = new URLSearchParams();
  if (instructorId) queryParams.set("instructor", instructorId);
  if (branch && branch !== "All") queryParams.set("branch", branch);

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-reviews", instructorId, branch],
    queryFn: async () => {
      const res = await fetch(`/api/instructor-reviews?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return (await res.json()) as {
        data: InstructorFeedbackRecord[];
        metrics: {
          totalReviews: number;
          avgRating: number;
          strengthCount: Record<string, number>;
          weaknessCount: Record<string, number>;
        };
      };
    },
    staleTime: 60_000,
  });

  const reviews: InstructorFeedbackRecord[] = data?.data ?? [];
  const metrics = data?.metrics;

  // Extract all available months (sorted latest first)
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>(); // "2026-09" -> "September 2026"
    reviews.forEach((r) => {
      const rawDate = r.review_date || r.creation;
      if (rawDate && rawDate.length >= 7) {
        const yyyymm = rawDate.slice(0, 7);
        if (!monthMap.has(yyyymm)) {
          const [year, month] = yyyymm.split("-");
          const dateObj = new Date(Number(year), Number(month) - 1, 1);
          const label = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleString("default", { month: "short", year: "numeric" })
            : yyyymm;
          monthMap.set(yyyymm, label);
        }
      }
    });

    return Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [reviews]);

  // Filter reviews by rating, search keyword, month, and drilldown selections
  const filteredReviews = reviews.filter((r: InstructorFeedbackRecord) => {
    // Drilldown Branch Filter
    if (drilldownBranch && (r.branch || "General / Head Office") !== drilldownBranch) {
      return false;
    }

    // Drilldown Instructor Filter
    if (drilldownInstructor && (r.instructor_name !== drilldownInstructor && r.instructor !== drilldownInstructor)) {
      return false;
    }

    // Month Filter
    if (selectedMonth !== "all") {
      const reviewDate = r.review_date || r.creation || "";
      if (!reviewDate.startsWith(selectedMonth)) {
        return false;
      }
    }

    // Rating Filter
    if (ratingFilter === "5") {
      if (r.rating < 5) return false;
    } else if (ratingFilter === "4") {
      if (r.rating !== 4) return false;
    } else if (ratingFilter === "3") {
      if (r.rating !== 3) return false;
    } else if (ratingFilter === "low") {
      if (r.rating >= 3) return false;
    }

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTeacher = r.instructor_name?.toLowerCase().includes(query);
      const matchBranch = r.branch?.toLowerCase().includes(query);
      const matchCourse = r.course?.toLowerCase().includes(query);
      const matchStrengths = r.strengths?.toLowerCase().includes(query);
      const matchWeakness = r.weaknesses?.toLowerCase().includes(query);
      const matchNotes = r.detailed_feedback?.toLowerCase().includes(query);
      if (
        !matchTeacher &&
        !matchBranch &&
        !matchCourse &&
        !matchStrengths &&
        !matchWeakness &&
        !matchNotes
      ) {
        return false;
      }
    }

    return true;
  });

  // Group reviews by Branch
  const branchSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        branch: string;
        reviewCount: number;
        totalRating: number;
        instructors: Set<string>;
        topStrengths: Record<string, number>;
        topWeaknesses: Record<string, number>;
      }
    >();

    reviews.forEach((r: InstructorFeedbackRecord) => {
      const bName = r.branch || "General / Head Office";
      if (!map.has(bName)) {
        map.set(bName, {
          branch: bName,
          reviewCount: 0,
          totalRating: 0,
          instructors: new Set<string>(),
          topStrengths: {},
          topWeaknesses: {},
        });
      }
      const entry = map.get(bName)!;
      entry.reviewCount += 1;
      entry.totalRating += Math.min(5, Number(r.rating) || 0);
      if (r.instructor_name || r.instructor) {
        entry.instructors.add(r.instructor_name || r.instructor!);
      }

      if (r.strengths) {
        r.strengths
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .forEach((s: string) => {
            entry.topStrengths[s] = (entry.topStrengths[s] || 0) + 1;
          });
      }

      if (r.weaknesses) {
        r.weaknesses
          .split(",")
          .map((w: string) => w.trim())
          .filter(Boolean)
          .forEach((w: string) => {
            entry.topWeaknesses[w] = (entry.topWeaknesses[w] || 0) + 1;
          });
      }
    });

    return Array.from(map.values())
      .map((b) => ({
        ...b,
        instructorCount: b.instructors.size,
        avgRating: b.reviewCount > 0 ? (b.totalRating / b.reviewCount).toFixed(1) : "0",
      }))
      .sort((a, b) => Number(b.avgRating) - Number(a.avgRating));
  }, [reviews]);

  // Calculate Faculty Grouping (optionally scoped to drilldownBranch)
  const facultySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        instructorId: string;
        name: string;
        branch: string;
        reviewCount: number;
        totalRating: number;
        strengths: Record<string, number>;
        weaknesses: Record<string, number>;
      }
    >();

    const targetReviews = drilldownBranch
      ? reviews.filter((r) => (r.branch || "General / Head Office") === drilldownBranch)
      : reviews;

    targetReviews.forEach((r: InstructorFeedbackRecord) => {
      const id = r.instructor || r.instructor_name || "Unknown";
      if (!map.has(id)) {
        map.set(id, {
          instructorId: id,
          name: r.instructor_name || id,
          branch: r.branch || "",
          reviewCount: 0,
          totalRating: 0,
          strengths: {},
          weaknesses: {},
        });
      }
      const entry = map.get(id)!;
      entry.reviewCount += 1;
      // Cap rating at 5 for score display safety
      entry.totalRating += Math.min(5, Number(r.rating) || 0);

      if (r.strengths) {
        r.strengths
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .forEach((s: string) => {
            entry.strengths[s] = (entry.strengths[s] || 0) + 1;
          });
      }

      if (r.weaknesses) {
        r.weaknesses
          .split(",")
          .map((w: string) => w.trim())
          .filter(Boolean)
          .forEach((w: string) => {
            entry.weaknesses[w] = (entry.weaknesses[w] || 0) + 1;
          });
      }
    });

    return Array.from(map.values())
      .map((f) => ({
        ...f,
        avgRating: f.reviewCount > 0 ? (f.totalRating / f.reviewCount).toFixed(1) : "0",
      }))
      .sort((a, b) => Number(b.avgRating) - Number(a.avgRating));
  }, [reviews, drilldownBranch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-800" />
          <div className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-800" />
          <div className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-800" />
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const topStrengths: [string, number][] = Object.entries(metrics?.strengthCount || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 8) as [string, number][];

  const topWeaknesses: [string, number][] = Object.entries(metrics?.weaknessCount || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 8) as [string, number][];

  // Score distribution counts
  const count5 = reviews.filter((r: InstructorFeedbackRecord) => r.rating >= 5).length;
  const count4 = reviews.filter((r: InstructorFeedbackRecord) => r.rating === 4).length;
  const count3 = reviews.filter((r: InstructorFeedbackRecord) => r.rating === 3).length;
  const countLow = reviews.filter((r: InstructorFeedbackRecord) => r.rating < 3).length;

  return (
    <div className="space-y-5">
      {/* Analytics Summary Cards (Shown for Director/Management/Instructors) */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Rating Score & Quick Bar Breakdown */}
          <Card className="border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex flex-col items-center justify-center shrink-0">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {metrics?.avgRating ? Math.min(5, metrics.avgRating).toFixed(1) : "0"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Based on <strong>{metrics?.totalReviews || 0}</strong> verified student reviews
                </p>
              </div>
            </div>

            {/* Micro rating distribution pills */}
            <div className="grid grid-cols-4 gap-1.5 pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 py-1 px-1.5 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">5 ★</div>
                <div className="text-xs font-black text-emerald-800 dark:text-emerald-200">{count5}</div>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/10 py-1 px-1.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/30">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">4 ★</div>
                <div className="text-xs font-black text-emerald-700 dark:text-emerald-200">{count4}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 py-1 px-1.5 rounded-lg border border-amber-100/60 dark:border-amber-900/40">
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">3 ★</div>
                <div className="text-xs font-black text-amber-800 dark:text-amber-200">{count3}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 py-1 px-1.5 rounded-lg border border-rose-100/60 dark:border-rose-900/40">
                <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">&lt; 3 ★</div>
                <div className="text-xs font-black text-rose-800 dark:text-rose-200">{countLow}</div>
              </div>
            </div>
          </Card>

          {/* Top Strengths */}
          <Card className="border border-emerald-500/20 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{topStrengths.length} categories</span>
              </div>
              {topStrengths.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topStrengths.map(([item, count]) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSearchQuery(item)}
                      title={`Filter by ${item}`}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100/70 transition-colors flex items-center gap-1"
                    >
                      <span>✓ {item}</span>
                      <span className="text-[10px] bg-emerald-600 text-white rounded-full px-1.5 py-0">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No strengths recorded yet</p>
              )}
            </div>
          </Card>

          {/* Top Areas for Growth */}
          <Card className="border border-amber-500/20 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  <ThumbsDown className="w-3.5 h-3.5 text-amber-600" /> Areas for Growth
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{topWeaknesses.length} flagged</span>
              </div>
              {topWeaknesses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topWeaknesses.map(([item, count]) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSearchQuery(item)}
                      title={`Filter by ${item}`}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/70 transition-colors flex items-center gap-1"
                    >
                      <span>△ {item}</span>
                      <span className="text-[10px] bg-amber-600 text-white rounded-full px-1.5 py-0">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No growth areas recorded yet</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main Review Section with Search, Tabs, and Accessible Filters */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-primary" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </CardTitle>
              <Badge variant="outline" className="text-xs px-2 py-0 border-slate-200 text-slate-600">
                {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"}
              </Badge>
            </div>

            {/* View Switcher: Branch Hierarchy vs Faculty vs All Reviews */}
            {showAnalytics && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("branch");
                    setDrilldownBranch(null);
                    setDrilldownInstructor(null);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeView === "branch"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Branch-Wise ({branchSummary.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("faculty");
                    setDrilldownInstructor(null);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeView === "faculty"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> All Instructors ({facultySummary.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("feed");
                    setDrilldownBranch(null);
                    setDrilldownInstructor(null);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeView === "feed"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> All Reviews
                </button>
              </div>
            )}
          </div>

          {/* Drilldown Navigation Breadcrumb / Active scope indicator */}
          {(drilldownBranch || drilldownInstructor) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-primary/5 border border-brand-primary/20 text-xs font-semibold text-brand-primary">
              <span className="text-slate-400 font-normal">Active Scope:</span>
              <button
                type="button"
                onClick={() => {
                  setDrilldownBranch(null);
                  setDrilldownInstructor(null);
                  setActiveView("branch");
                }}
                className="hover:underline flex items-center gap-1"
              >
                <Building2 className="w-3 h-3" /> All Branches
              </button>
              {drilldownBranch && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-900 dark:text-slate-100 font-bold">{drilldownBranch}</span>
                </>
              )}
              {drilldownInstructor && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="text-brand-primary font-bold">{drilldownInstructor}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setDrilldownBranch(null);
                  setDrilldownInstructor(null);
                  setActiveView("branch");
                }}
                className="ml-auto text-[11px] px-2 py-0.5 rounded bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold transition-colors"
              >
                Reset Scope
              </button>
            </div>
          )}

          {/* Quick Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search instructor, branch, or keywords..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 pl-9 pr-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters: Month Selector & Score Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Month Selector */}
              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Month:
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="all">All Months ({reviews.length})</option>
                    {availableMonths.map(([val, label]) => {
                      const countForMonth = reviews.filter((r) =>
                        (r.review_date || r.creation || "").startsWith(val)
                      ).length;
                      return (
                        <option key={val} value={val}>
                          {label} ({countForMonth})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Rating Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1 mr-0.5">
                  <Filter className="w-3 h-3" /> Score:
                </span>
                {[
                  { label: "All", value: "all" },
                  { label: "5 ★", value: "5" },
                  { label: "4 ★", value: "4" },
                  { label: "3 ★", value: "3" },
                  { label: "< 3 ★", value: "low" },
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setRatingFilter(pill.value)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                      ratingFilter === pill.value
                        ? "bg-brand-primary text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {/* BRANCH-WISE HIERARCHY VIEW: Branches first -> Click into branch instructors */}
          {activeView === "branch" && showAnalytics ? (
            <div className="space-y-4">
              {branchSummary.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No branch review records found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branchSummary.map((b) => {
                    const branchRating = Number(b.avgRating);
                    const badgeColor =
                      branchRating >= 4.5
                        ? "bg-emerald-600 text-white"
                        : branchRating >= 4.0
                        ? "bg-emerald-500 text-white"
                        : branchRating >= 3.0
                        ? "bg-amber-500 text-white"
                        : "bg-rose-500 text-white";

                    // Instructors belonging to this branch
                    const branchInstructors = facultySummary.filter(
                      (f) => (f.branch || "General / Head Office") === b.branch
                    );

                    return (
                      <div
                        key={b.branch}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-brand-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
                      >
                        {/* Branch Title & Quick Stats */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
                                <School className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                  {b.branch}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span>{b.instructorCount} {b.instructorCount === 1 ? "instructor" : "instructors"}</span>
                                  <span>•</span>
                                  <span>{b.reviewCount} {b.reviewCount === 1 ? "review" : "reviews"}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs shrink-0 ${badgeColor}`}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" /> {b.avgRating} / 5
                            </span>
                          </div>

                          {/* Quick List of Instructors in this Branch */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Branch Instructors ({branchInstructors.length})
                            </div>
                            {branchInstructors.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {branchInstructors.map((inst) => {
                                  const instRating = Number(inst.avgRating);
                                  return (
                                    <button
                                      key={inst.instructorId}
                                      type="button"
                                      onClick={() => {
                                        setDrilldownBranch(b.branch);
                                        setDrilldownInstructor(inst.name);
                                        setActiveView("feed");
                                      }}
                                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all text-left group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-1">
                                        <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-brand-primary">
                                          <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="truncate">
                                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary truncate">
                                            {inst.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400">
                                            {inst.reviewCount} {inst.reviewCount === 1 ? "review" : "reviews"}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-0.5 shrink-0">
                                        <Star className="w-2.5 h-2.5 fill-current" /> {inst.avgRating}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">
                                No instructor records assigned yet
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Action button to view all data for this branch */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setDrilldownBranch(b.branch);
                              setActiveView("faculty");
                            }}
                            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                          >
                            Explore all instructors in {b.branch} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDrilldownBranch(b.branch);
                              setActiveView("feed");
                            }}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            View raw feedback ({b.reviewCount})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeView === "faculty" && showAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {facultySummary.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-400 text-xs">
                  No instructors found for the selected branch.
                </div>
              ) : (
                facultySummary.map((fac) => {
                  const ratingNum = Number(fac.avgRating);
                  const badgeColor =
                    ratingNum >= 4.5
                      ? "bg-emerald-600 text-white"
                      : ratingNum >= 4.0
                      ? "bg-emerald-500 text-white"
                      : ratingNum >= 3.0
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white";

                  const strengthEntries = Object.entries(fac.strengths).slice(0, 3);
                  const weaknessEntries = Object.entries(fac.weaknesses).slice(0, 3);

                  return (
                    <div
                      key={fac.instructorId}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3 hover:border-brand-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-brand-primary" /> {fac.name}
                          </h4>
                          {fac.branch && (
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <School className="w-3 h-3" /> {fac.branch}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-xs ${badgeColor}`}
                          >
                            <Star className="w-3 h-3 fill-current" /> {fac.avgRating} / 5
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {fac.reviewCount} {fac.reviewCount === 1 ? "review" : "reviews"}
                          </p>
                        </div>
                      </div>

                      {/* Top tags for this teacher */}
                      <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {strengthEntries.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Pros:</span>
                            {strengthEntries.map(([s, count]) => (
                              <span
                                key={s}
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                              >
                                {s} ({count})
                              </span>
                            ))}
                          </div>
                        )}
                        {weaknessEntries.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-amber-600 uppercase">Growth:</span>
                            {weaknessEntries.map(([w, count]) => (
                              <span
                                key={w}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                              >
                                {w} ({count})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (fac.branch) setDrilldownBranch(fac.branch);
                          setDrilldownInstructor(fac.name);
                          setActiveView("feed");
                        }}
                        className="w-full text-center text-xs font-semibold text-brand-primary hover:underline pt-1 flex items-center justify-center gap-1"
                      >
                        View all {fac.reviewCount} reviews for {fac.name} →
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ALL REVIEWS FEED VIEW */
            <div className="space-y-4">
              {/* Selected Instructor Profile & Monthly Breakdown Bar */}
              {drilldownInstructor && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        {drilldownInstructor.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {drilldownInstructor}
                          </h3>
                          <Badge variant="outline" className="text-[10px] px-2 py-0 border-slate-200 text-slate-500 font-medium">
                            Instructor Profile
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          {drilldownBranch && (
                            <span className="flex items-center gap-1">
                              <School className="w-3.5 h-3.5" /> {drilldownBranch}
                            </span>
                          )}
                          <span>•</span>
                          <span>{reviews.filter((r) => r.instructor_name === drilldownInstructor || r.instructor === drilldownInstructor).length} total submissions</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDrilldownInstructor(null);
                        setActiveView("faculty");
                      }}
                      className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Instructors
                    </button>
                  </div>

                  {/* Monthly Wise Filter Bar for Selected Instructor */}
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-primary" /> Filter by Month:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMonth("all")}
                      className={`text-xs px-3 py-1 rounded-xl font-bold transition-all ${
                        selectedMonth === "all"
                          ? "bg-brand-primary text-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      All Months (
                      {reviews.filter((r) => r.instructor_name === drilldownInstructor || r.instructor === drilldownInstructor).length}
                      )
                    </button>
                    {availableMonths.map(([mVal, mLabel]) => {
                      const countThisMonth = reviews.filter((r) => {
                        const isThisInst = r.instructor_name === drilldownInstructor || r.instructor === drilldownInstructor;
                        const dateStr = r.review_date || r.creation || "";
                        return isThisInst && dateStr.startsWith(mVal);
                      }).length;

                      if (countThisMonth === 0) return null;

                      return (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => setSelectedMonth(mVal)}
                          className={`text-xs px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                            selectedMonth === mVal
                              ? "bg-brand-primary text-white shadow-2xs"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span>{mLabel}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              selectedMonth === mVal
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {countThisMonth}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReviews.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm space-y-1">
                    <Sparkles className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No matching reviews found
                    </p>
                    <p className="text-xs">
                      {selectedMonth !== "all"
                        ? `No feedback submitted for the selected month.`
                        : searchQuery
                        ? `No reviews matched "${searchQuery}". Try clearing search.`
                        : "No feedback recorded under this filter."}
                    </p>
                    {(searchQuery || selectedMonth !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedMonth("all");
                        }}
                        className="mt-2 text-xs font-bold text-brand-primary hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredReviews.map((rev: InstructorFeedbackRecord) => {
                  const strengthArr = rev.strengths
                    ? rev.strengths
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : [];
                  const weaknessArr = rev.weaknesses
                    ? rev.weaknesses
                        .split(",")
                        .map((w: string) => w.trim())
                        .filter(Boolean)
                    : [];

                  const ratingColor =
                    rev.rating >= 4
                      ? "bg-emerald-600 text-white"
                      : rev.rating === 3
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white";

                  return (
                    <div key={rev.name} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          {/* Main Title: Instructor Name */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-primary shrink-0" />
                            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                              {rev.instructor_name || "Faculty Member"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0 border-slate-200 dark:border-slate-700 text-slate-500 font-medium"
                            >
                              Anonymous Student Feedback
                            </Badge>
                          </div>

                          {/* Meta Information */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                            {rev.branch && (
                              <span className="flex items-center gap-1">
                                <School className="w-3.5 h-3.5 text-slate-400" /> {rev.branch}
                              </span>
                            )}
                            {rev.course && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {rev.course}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />{" "}
                              {rev.review_date || rev.creation?.slice(0, 10)}
                            </span>
                            {/* Review Month Tag */}
                            {(rev.review_date || rev.creation) && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {(() => {
                                  const dStr = rev.review_date || rev.creation || "";
                                  if (dStr.length >= 7) {
                                    const [y, m] = dStr.slice(0, 7).split("-");
                                    const d = new Date(Number(y), Number(m) - 1, 1);
                                    return !isNaN(d.getTime())
                                      ? d.toLocaleString("default", { month: "long", year: "numeric" })
                                      : dStr.slice(0, 7);
                                  }
                                  return "";
                                })()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating Pill */}
                        <div
                          className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 ${ratingColor}`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{rev.rating} / 5</span>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses chips */}
                      {(strengthArr.length > 0 || weaknessArr.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {strengthArr.map((str: string) => (
                            <span
                              key={str}
                              className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                            >
                              ✓ {str}
                            </span>
                          ))}
                          {weaknessArr.map((wk: string) => (
                            <span
                              key={wk}
                              className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20"
                            >
                              △ {wk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Clean Notes / Feedback */}
                      {rev.detailed_feedback && rev.detailed_feedback.trim().length > 0 && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1.5">
                            Note:
                          </span>
                          <span>{rev.detailed_feedback.trim()}</span>
                        </div>
                      )}

                      {rev.suggestions && (
                        <div className="text-xs text-slate-400 flex items-baseline gap-1 font-medium">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            Suggestion:
                          </span>
                          <span>{rev.suggestions}</span>
                        </div>
                      )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
