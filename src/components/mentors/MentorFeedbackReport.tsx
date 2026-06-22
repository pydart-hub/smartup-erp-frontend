"use client";

import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  AlertCircle,
  Building2,
  ClipboardList,
  ExternalLink,
  PhoneCall,
  Search,
  ChevronRight,
  ArrowLeft,
  User,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { MentorFeedback } from "@/lib/types/mentor";

export function MentorFeedbackReport(props: {
  title: string;
  endpoint: string;
  hideBranchLevel?: boolean;
  lockedBranch?: string;
  backHref?: string;
  studentDetailHref?: (studentId: string) => string;
}) {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <BreadcrumbNav />
        <div className="p-8 text-center text-text-secondary bg-surface rounded-2xl border border-border-light animate-pulse">
          Loading feedback logs...
        </div>
      </div>
    }>
      <MentorFeedbackReportContent {...props} />
    </Suspense>
  );
}

function MentorFeedbackReportContent({
  title,
  endpoint,
  hideBranchLevel = false,
  lockedBranch,
  backHref,
  studentDetailHref,
}: {
  title: string;
  endpoint: string;
  hideBranchLevel?: boolean;
  lockedBranch?: string;
  backHref?: string;
  studentDetailHref?: (studentId: string) => string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"drilldown" | "global">("drilldown");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [studentProgramFilter, setStudentProgramFilter] = useState("all");
  const [studentTypeFilter, setStudentTypeFilter] = useState("all");
  const [studentPlanFilter, setStudentPlanFilter] = useState("all");
  const [studentSort, setStudentSort] = useState<"az" | "attendance" | "score">("az");
  const [studentSortDirection, setStudentSortDirection] = useState<"asc" | "desc">("asc");

  const searchParams = useSearchParams();
  const mentorParam = searchParams.get("mentor");
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const effectiveSelectedBranch = selectedBranch ?? (hideBranchLevel ? lockedBranch || null : null);
  const effectiveSelectedMentor = selectedMentor ?? mentorParam;

  const { data, isLoading, isError, error } = useQuery<MentorFeedback[]>({
    queryKey: ["mentor-feedback-report", endpoint, hideBranchLevel ? lockedBranch : undefined],
    queryFn: async () => {
      const url = new URL(endpoint, window.location.origin);
      if (hideBranchLevel && lockedBranch) {
        url.searchParams.set("branch", lockedBranch);
      }
      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch mentor feedback");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
    enabled: hideBranchLevel ? !!lockedBranch : true,
  });

  // Flat filtering for Global View
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data ?? [];
    return (data ?? []).filter((row) =>
      [
        row.student_name,
        row.student,
        row.mentor_user,
        row.branch,
        row.call_status,
        row.discussion_category,
        row.overall_feedback,
        row.academic_notes,
        row.fee_notes,
        row.contact_notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [data, search]);

  // 1. Group by branch
  const branchGroups = useMemo(() => {
    const rawData = data ?? [];
    const groups: Record<string, {
      branchName: string;
      logsCount: number;
      actionRequiredCount: number;
      mentors: Set<string>;
    }> = {};

    rawData.forEach((row) => {
      const b = row.branch || "Unassigned Branch";
      if (!groups[b]) {
        groups[b] = {
          branchName: b,
          logsCount: 0,
          actionRequiredCount: 0,
          mentors: new Set(),
        };
      }
      groups[b].logsCount++;
      if (row.action_required) {
        groups[b].actionRequiredCount++;
      }
      if (row.mentor_user) {
        groups[b].mentors.add(row.mentor_user);
      }
    });

    return Object.values(groups).sort((a, b) => a.branchName.localeCompare(b.branchName));
  }, [data]);

  // 2. Group by mentor (for selected branch)
  const mentorGroups = useMemo(() => {
    if (!effectiveSelectedBranch) return [];
    const rawData = data ?? [];
    const branchData = rawData.filter((row) => (row.branch || "Unassigned Branch") === effectiveSelectedBranch);

    const groups: Record<string, {
      mentorUser: string;
      mentorName?: string;
      logsCount: number;
      assignedStudentsCount: number;
      students: Set<string>;
    }> = {};

    branchData.forEach((row) => {
      const m = row.mentor_user || "Unassigned Mentor";
      if (!groups[m]) {
        groups[m] = {
          mentorUser: m,
          mentorName: row.mentor_name || row.mentor_profile || undefined,
          logsCount: 0,
          assignedStudentsCount: 0,
          students: new Set(),
        };
      }
      groups[m].logsCount++;
      if (!groups[m].mentorName && (row.mentor_name || row.mentor_profile)) {
        groups[m].mentorName = row.mentor_name || row.mentor_profile;
      }
      if (row.student) {
        groups[m].students.add(row.student);
      }
    });

    Object.values(groups).forEach((group) => {
      group.assignedStudentsCount = group.students.size;
    });

    return Object.values(groups).sort((a, b) => a.mentorUser.localeCompare(b.mentorUser));
  }, [data, effectiveSelectedBranch]);

  // 3. Filtered logs for selected mentor and branch
  const drilldownFilteredLogs = useMemo(() => {
    const rawData = data ?? [];
    return rawData.filter((row) => {
      const b = row.branch || "Unassigned Branch";
      const m = row.mentor_user || "Unassigned Mentor";
      return b === effectiveSelectedBranch && m === effectiveSelectedMentor;
    });
  }, [data, effectiveSelectedBranch, effectiveSelectedMentor]);

  const mentorStudentGroups = useMemo(() => {
    const groups = new Map<string, {
      studentId: string;
      studentName: string;
      studentType?: string;
      program?: string;
      customPlan?: string;
      attendancePct?: number | null;
      averageScore?: number | null;
      logsCount: number;
      latestLogAt?: string;
      actionRequiredCount: number;
    }>();

    for (const row of drilldownFilteredLogs) {
      const studentId = row.student || "Unknown Student";
      const existing = groups.get(studentId);
      if (!existing) {
        groups.set(studentId, {
          studentId,
          studentName: row.student_name || studentId,
          studentType: row.student_type,
          program: row.program,
          customPlan: row.custom_plan,
          attendancePct: row.attendance_pct,
          averageScore: row.average_score,
          logsCount: 1,
          latestLogAt: row.call_datetime,
          actionRequiredCount: row.action_required ? 1 : 0,
        });
        continue;
      }

      existing.logsCount += 1;
      existing.actionRequiredCount += row.action_required ? 1 : 0;
      if (!existing.studentType && row.student_type) existing.studentType = row.student_type;
      if (!existing.program && row.program) existing.program = row.program;
      if (!existing.customPlan && row.custom_plan) existing.customPlan = row.custom_plan;
      if (existing.attendancePct == null && row.attendance_pct != null) existing.attendancePct = row.attendance_pct;
      if (existing.averageScore == null && row.average_score != null) existing.averageScore = row.average_score;
      if (!existing.latestLogAt || (row.call_datetime && row.call_datetime > existing.latestLogAt)) {
        existing.latestLogAt = row.call_datetime;
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [drilldownFilteredLogs]);

  const studentPrograms = useMemo(() => {
    return Array.from(
      new Set(
        mentorStudentGroups
          .map((row) => row.program?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [mentorStudentGroups]);

  const studentTypes = useMemo(() => {
    return Array.from(
      new Set(
        mentorStudentGroups
          .map((row) => row.studentType?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [mentorStudentGroups]);

  const studentPlans = useMemo(() => {
    return Array.from(
      new Set(
        mentorStudentGroups
          .map((row) => row.customPlan?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [mentorStudentGroups]);

  // Searched values for each drilldown level
  const searchedBranchGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branchGroups;
    return branchGroups.filter((g) => g.branchName.toLowerCase().includes(query));
  }, [branchGroups, search]);

  const searchedMentorGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mentorGroups;
    return mentorGroups.filter((g) => g.mentorUser.toLowerCase().includes(query));
  }, [mentorGroups, search]);

  const searchedStudentGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredByControls = mentorStudentGroups.filter((row) => {
      if (studentProgramFilter !== "all" && (row.program || "") !== studentProgramFilter) {
        return false;
      }
      if (studentTypeFilter !== "all" && (row.studentType || "") !== studentTypeFilter) {
        return false;
      }
      if (studentPlanFilter !== "all" && (row.customPlan || "") !== studentPlanFilter) {
        return false;
      }
      return true;
    });

    const searchedRows = !query ? filteredByControls : filteredByControls.filter((row) =>
      [
        row.studentName,
        row.studentId,
        row.studentType,
        row.program,
        row.customPlan,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );

    return [...searchedRows].sort((a, b) => {
      if (studentSort === "attendance") {
        const result = (a.attendancePct ?? -1) - (b.attendancePct ?? -1) || a.studentName.localeCompare(b.studentName);
        return studentSortDirection === "asc" ? result : -result;
      }
      if (studentSort === "score") {
        const result = (a.averageScore ?? -1) - (b.averageScore ?? -1) || a.studentName.localeCompare(b.studentName);
        return studentSortDirection === "asc" ? result : -result;
      }
      const result = a.studentName.localeCompare(b.studentName);
      return studentSortDirection === "asc" ? result : -result;
    });
  }, [mentorStudentGroups, search, studentPlanFilter, studentProgramFilter, studentSort, studentSortDirection, studentTypeFilter]);

  const hasStudentFiltersApplied = useMemo(() => {
    return (
      studentProgramFilter !== "all" ||
      studentTypeFilter !== "all" ||
      studentPlanFilter !== "all" ||
      studentSort !== "az" ||
      studentSortDirection !== "asc"
    );
  }, [studentPlanFilter, studentProgramFilter, studentSort, studentSortDirection, studentTypeFilter]);

  const heroTitle = useMemo(() => {
    if (activeView === "global") {
      return `${title} Global Search`;
    }
    if (effectiveSelectedBranch && effectiveSelectedMentor) {
      return "Mentor Student Drill-down";
    }
    if (effectiveSelectedBranch) {
      return "Branch Mentor Drill-down";
    }
    return title;
  }, [activeView, effectiveSelectedBranch, effectiveSelectedMentor, title]);

  const heroSubtitle = useMemo(() => {
    if (activeView === "global") {
      return "Search across branches, mentors, students, and feedback logs from one unified view.";
    }
    if (effectiveSelectedBranch && effectiveSelectedMentor) {
      return "Review assigned students, their log counts, attendance rate, and academic score before opening full student records.";
    }
    if (effectiveSelectedBranch) {
      return "Choose a mentor inside the selected branch to continue the management drill-down.";
    }
    return hideBranchLevel
      ? "Branch mentor call and follow-up visibility"
      : "Cross-branch mentor call and follow-up visibility";
  }, [activeView, hideBranchLevel, effectiveSelectedBranch, effectiveSelectedMentor]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(130,195,91,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(26,158,143,0.18),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(236,246,250,0.95)_48%,rgba(229,245,238,0.96))] shadow-[0_30px_60px_-28px_rgba(13,61,89,0.34)]">
        <CardContent className="relative p-0">
          <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-[#82C35B]/20 blur-2xl" />
          <div className="absolute right-6 top-0 h-36 w-36 rounded-full bg-[#1A9E8F]/14 blur-3xl" />
          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#1A9E8F,#82C35B)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_32px_-16px_rgba(26,158,143,0.88)]">
                  <ClipboardList className="h-9 w-9" />
                </div>
                <div className="min-w-0 flex-1">
                  {backHref && (
                    <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2">
                      <ArrowLeft className="h-3 w-3" /> Back to Mentors Portal
                    </Link>
                  )}
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">{heroTitle}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    {heroSubtitle}
                  </p>
                  {activeView === "drilldown" && (effectiveSelectedBranch || effectiveSelectedMentor) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {effectiveSelectedBranch ? (
                        <Badge variant="outline" className="border-primary/15 bg-white/75 text-slate-700">
                          Branch: {effectiveSelectedBranch}
                        </Badge>
                      ) : null}
                      {effectiveSelectedMentor ? (
                        <Badge variant="outline" className="border-primary/15 bg-white/75 text-slate-700">
                          Mentor: {effectiveSelectedMentor}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={`grid grid-cols-1 ${hideBranchLevel ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
                <MetricCard label="Total Feedback Logs" value={data?.length ?? 0} tone="default" />
                <MetricCard label="Action Required" value={(data ?? []).filter((row) => row.action_required).length} tone="amber" />
                {!hideBranchLevel && (
                  <MetricCard label="Branches Covered" value={new Set((data ?? []).map((row) => row.branch).filter(Boolean)).size} tone="mint" />
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/74 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_20px_40px_-26px_rgba(13,61,89,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-primary" />
                View Mode
              </div>
              <div className="mt-4 flex gap-2 p-1 rounded-2xl border border-slate-200 bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <button
                  onClick={() => {
                    setActiveView("drilldown");
                    setSearch("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    activeView === "drilldown"
                      ? "bg-[linear-gradient(135deg,#1A9E8F,#82C35B)] text-white shadow-[0_16px_24px_-18px_rgba(26,158,143,0.9)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Drill-down View</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView("global");
                    setSearch("");
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    activeView === "global"
                      ? "bg-[linear-gradient(135deg,#1A9E8F,#82C35B)] text-white shadow-[0_16px_24px_-18px_rgba(26,158,143,0.9)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Global Search</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,248,250,0.95))] shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardContent className="p-4">
          <Input
            placeholder={
              activeView === "global"
                ? "Search student, mentor, branch, category..."
                : !selectedBranch
                ? "Search branches..."
                : !selectedMentor
                ? "Search mentors..."
                : "Search student, category, feedback..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* ── GLOBAL VIEW ── */}
      {activeView === "global" && (
        <Card className="overflow-hidden border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,250,0.95))] shadow-[0_28px_50px_-32px_rgba(15,23,42,0.38)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Mentor Feedback Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-text-secondary animate-pulse">Loading mentor feedback...</p>
            ) : isError ? (
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="h-4 w-4" />
                {(error as Error)?.message || "Failed to load mentor feedback"}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-text-secondary">No mentor feedback found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((row) => (
                  <FeedbackLogCard key={row.name} row={row} studentDetailHref={studentDetailHref} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DRILLDOWN VIEW ── */}
      {activeView === "drilldown" && (
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center text-text-secondary animate-pulse border border-slate-200/70 bg-white/90 shadow-[0_28px_50px_-32px_rgba(15,23,42,0.32)]">Loading feedback structure...</Card>
          ) : isError ? (
            <Card className="p-8 text-center text-error flex items-center justify-center gap-2 border border-slate-200/70 bg-white/90 shadow-[0_28px_50px_-32px_rgba(15,23,42,0.32)]">
              <AlertCircle className="h-5 w-5" />
              {(error as Error)?.message || "Failed to load mentor feedback"}
            </Card>
          ) : (
            <>
              {/* Level 1: Branch List */}
              {!effectiveSelectedBranch && !hideBranchLevel && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-secondary">Select Branch</h3>
                  {searchedBranchGroups.length === 0 ? (
                    <div className="text-center py-12 text-text-secondary bg-surface rounded-2xl border border-border-light">
                      No branches found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchedBranchGroups.map((b) => (
                        <div
                          key={b.branchName}
                          onClick={() => {
                            setSelectedBranch(b.branchName);
                            setSearch("");
                          }}
                          className="cursor-pointer overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(130,195,91,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,250,0.95))] p-5 shadow-[0_20px_34px_-24px_rgba(15,23,42,0.42)] transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_28px_42px_-24px_rgba(26,158,143,0.35)] group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1A9E8F,#82C35B)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_28px_-18px_rgba(26,158,143,0.78)]">
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate text-base font-bold text-slate-900">{b.branchName}</span>
                                  <span className="text-xs font-medium text-slate-500">Cross-branch mentor visibility</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-[20px] border border-white/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Feedback Logs</p>
                                  <p className="mt-2 text-2xl font-bold text-slate-900">{b.logsCount}</p>
                                </div>
                                <div className="rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,rgba(236,249,245,0.95),rgba(229,245,238,0.95))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Mentors</p>
                                  <p className="mt-2 text-2xl font-bold text-primary">{b.mentors.size}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="bg-white/80 text-[11px]">
                                  {b.mentors.size} mentors
                                </Badge>
                                {b.actionRequiredCount > 0 ? (
                                  <Badge variant="warning" className="text-[11px] shadow-sm">
                                    {b.actionRequiredCount} Action Needed
                                  </Badge>
                                ) : (
                                  <Badge variant="success" className="text-[11px] shadow-sm">
                                    No pending action
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                              <ChevronRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-primary" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Level 2: Mentor List in Selected Branch */}
              {effectiveSelectedBranch && !effectiveSelectedMentor && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {!hideBranchLevel ? (
                      <button
                        onClick={() => {
                          setSelectedBranch(null);
                          setSearch("");
                          if (typeof window !== "undefined") {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("mentor");
                            url.searchParams.delete("branch");
                            window.history.replaceState({}, "", url.pathname + url.search);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Branches
                      </button>
                    ) : (
                      <div />
                    )}
                    <div className="text-xs text-text-secondary">
                      Branch: <span className="font-semibold text-text-primary">{effectiveSelectedBranch}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-text-secondary">Select Mentor</h3>
                  {searchedMentorGroups.length === 0 ? (
                    <div className="text-center py-12 text-text-secondary bg-surface rounded-2xl border border-border-light">
                      No mentors found for this branch.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchedMentorGroups.map((m) => (
                        <div
                          key={m.mentorUser}
                          onClick={() => {
                            setSelectedMentor(m.mentorUser);
                            setSearch("");
                          }}
                          className="cursor-pointer overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(26,158,143,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,250,0.95))] p-5 shadow-[0_20px_34px_-24px_rgba(15,23,42,0.42)] transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_28px_42px_-24px_rgba(26,158,143,0.35)] group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1A9E8F,#82C35B)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_28px_-18px_rgba(26,158,143,0.78)]">
                                  <GraduationCap className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate text-base font-bold text-slate-900">{m.mentorUser}</span>
                                  <span className="block truncate text-sm font-semibold text-slate-700">
                                    {m.mentorName || "Mentor profile"}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-[20px] border border-white/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Logs</p>
                                  <p className="mt-2 text-2xl font-bold text-slate-900">{m.logsCount}</p>
                                </div>
                                <div className="rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,rgba(236,249,245,0.95),rgba(229,245,238,0.95))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assigned Students</p>
                                  <p className="mt-2 text-2xl font-bold text-primary">{m.assignedStudentsCount}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                              <ChevronRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-primary" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Level 3: Mentor Students Overview */}
              {effectiveSelectedBranch && effectiveSelectedMentor && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedMentor(null);
                          setSearch("");
                          setStudentProgramFilter("all");
                          setStudentTypeFilter("all");
                          setStudentPlanFilter("all");
                          setStudentSort("az");
                          setStudentSortDirection("asc");
                          if (typeof window !== "undefined") {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("mentor");
                          window.history.replaceState({}, "", url.pathname + url.search);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Mentors
                    </button>
                    <div className="text-xs text-text-secondary flex gap-3 flex-wrap">
                      <span>Branch: <span className="font-semibold text-text-primary">{effectiveSelectedBranch}</span></span>
                      <span>Mentor: <span className="font-semibold text-text-primary">{effectiveSelectedMentor}</span></span>
                    </div>
                  </div>

                    <Card className="overflow-hidden border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,250,0.95))] shadow-[0_28px_50px_-32px_rgba(15,23,42,0.38)]">
                    <CardHeader>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-2">
                            <CardTitle className="flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-primary" />
                              Assigned Students for {effectiveSelectedMentor}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span>{searchedStudentGroups.length} students shown</span>
                              <span className="text-slate-300">|</span>
                              <span>Sort: {studentSort === "az" ? "A - Z" : studentSort === "attendance" ? "Attendance Rate" : "Academic Score"}</span>
                              {hasStudentFiltersApplied ? (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="font-medium text-primary">Custom filters active</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {hasStudentFiltersApplied ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentProgramFilter("all");
                                setStudentTypeFilter("all");
                                setStudentPlanFilter("all");
                                setStudentSort("az");
                                setStudentSortDirection("asc");
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                            >
                              Clear Filters
                            </button>
                          ) : null}
                        </div>
                        <div className="flex gap-3 flex-wrap">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Program Filter</label>
                            <select
                              value={studentProgramFilter}
                              onChange={(e) => setStudentProgramFilter(e.target.value)}
                              className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                            >
                              <option value="all">All Programs</option>
                              {studentPrograms.map((program) => (
                                <option key={program} value={program}>{program}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Student Type</label>
                            <select
                              value={studentTypeFilter}
                              onChange={(e) => setStudentTypeFilter(e.target.value)}
                              className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                            >
                              <option value="all">All Types</option>
                              {studentTypes.map((studentType) => (
                                <option key={studentType} value={studentType}>{studentType}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Plan Filter</label>
                            <select
                              value={studentPlanFilter}
                              onChange={(e) => setStudentPlanFilter(e.target.value)}
                              className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                            >
                              <option value="all">All Plans</option>
                              {studentPlans.map((plan) => (
                                <option key={plan} value={plan}>{plan}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sort By</label>
                            <select
                              value={studentSort}
                              onChange={(e) => setStudentSort(e.target.value as "az" | "attendance" | "score")}
                              className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                            >
                              <option value="az">A - Z</option>
                              <option value="attendance">Attendance Rate</option>
                              <option value="score">Academic Score</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Direction</label>
                            <select
                              value={studentSortDirection}
                              onChange={(e) => setStudentSortDirection(e.target.value as "asc" | "desc")}
                              className="h-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
                            >
                              <option value="asc">
                                {studentSort === "az" ? "A to Z" : "Ascending"}
                              </option>
                              <option value="desc">
                                {studentSort === "az" ? "Z to A" : "Descending"}
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {searchedStudentGroups.length === 0 ? (
                        <p className="text-sm text-text-secondary">No assigned students found matching your filters.</p>
                      ) : (
                        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200/80">
                              <thead className="bg-[linear-gradient(180deg,rgba(244,250,248,0.96),rgba(236,246,250,0.94))]">
                                <tr>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Student</th>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Program</th>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Logs Count</th>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Attendance Rate</th>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Academic Score</th>
                                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest Log</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70 bg-white/80">
                                {searchedStudentGroups.map((row) => {
                                  const href = studentDetailHref ? studentDetailHref(row.studentId) : null;
                                  return (
                                    <tr
                                      key={row.studentId}
                                      onClick={() => {
                                        if (href) router.push(href);
                                      }}
                                      className={`transition-colors ${href ? "cursor-pointer hover:bg-[linear-gradient(90deg,rgba(26,158,143,0.05),rgba(130,195,91,0.04))]" : ""}`}
                                    >
                                      <td className="px-5 py-4 align-top">
                                        <div className="space-y-1">
                                          <div className={`text-sm font-bold ${href ? "text-slate-900 hover:text-primary" : "text-slate-900"}`}>
                                            {row.studentName}
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                            <span className="font-mono">{row.studentId}</span>
                                            {row.studentType ? (
                                              <Badge variant="outline" className="text-[10px]">
                                                {row.studentType}
                                              </Badge>
                                            ) : null}
                                            {row.customPlan ? (
                                              <Badge variant="outline" className="text-[10px]">
                                                {row.customPlan}
                                              </Badge>
                                            ) : null}
                                            {row.actionRequiredCount > 0 ? <Badge variant="warning">{row.actionRequiredCount} action items</Badge> : null}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                                        {row.program || "N/A"}
                                      </td>
                                      <td className="px-5 py-4">
                                        <span className="inline-flex min-w-16 justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                                          {row.logsCount}
                                        </span>
                                      </td>
                                      <td className="px-5 py-4 text-sm font-semibold text-emerald-600">
                                        {row.attendancePct != null ? `${row.attendancePct}%` : "N/A"}
                                      </td>
                                      <td className="px-5 py-4 text-sm font-semibold text-sky-700">
                                        {row.averageScore != null ? `${row.averageScore}%` : "N/A"}
                                      </td>
                                      <td className="px-5 py-4 text-sm text-slate-500">
                                        {row.latestLogAt ? row.latestLogAt.replace("T", " ").slice(0, 16) : "N/A"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackLogCard({
  row,
  studentDetailHref,
}: {
  row: MentorFeedback;
  studentDetailHref?: (studentId: string) => string;
}) {
  const studentHref = studentDetailHref ? studentDetailHref(row.student) : null;

  const getStudentTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "fresher": return "bg-purple-500/10 text-purple-600 border-purple-200/50";
      case "existing": return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
      case "rejoining": return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
      case "demo": return "bg-blue-500/10 text-blue-600 border-blue-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  const getPlanColor = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "advanced": return "bg-indigo-500/10 text-indigo-600 border-indigo-200/50";
      case "intermediate": return "bg-sky-500/10 text-sky-600 border-sky-200/50";
      case "basic": return "bg-teal-500/10 text-teal-600 border-teal-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,250,0.95))] p-5 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.44)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-24px_rgba(26,158,143,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {studentHref ? (
              <Link href={studentHref} className="font-semibold text-text-primary hover:text-primary hover:underline">
                {row.student_name}
              </Link>
            ) : (
              <p className="font-semibold text-text-primary">{row.student_name}</p>
            )}
            {row.student_type && (
              <Badge variant="outline" className={`text-[10px] font-medium border ${getStudentTypeColor(row.student_type)}`}>
                {row.student_type}
              </Badge>
            )}
            {row.custom_plan && (
              <Badge variant="outline" className={`text-[10px] font-medium border ${getPlanColor(row.custom_plan)}`}>
                {row.custom_plan}
              </Badge>
            )}
            {row.program && (
              <Badge variant="outline" className="text-[10px] text-text-secondary bg-surface/50 border border-border-light">
                {row.program}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-text-tertiary bg-surface/50 border border-border-light">{row.discussion_category}</Badge>
            {row.action_required ? <Badge variant="warning">Action Required</Badge> : null}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary mt-1 flex-wrap font-medium">
            <span className="font-mono text-text-tertiary">{row.student}</span>
            <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3 text-text-tertiary" />{row.branch}</span>
            <span className="inline-flex items-center gap-1"><PhoneCall className="h-3 w-3 text-text-tertiary" />{row.call_status}</span>
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3 text-text-tertiary" />{row.mentor_user}</span>
          </div>
        </div>
        {studentHref ? (
          <div className="flex flex-1 justify-center pt-0.5">
            <Link
              href={studentHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-[linear-gradient(135deg,rgba(26,158,143,0.08),rgba(130,195,91,0.12))] px-3.5 py-1.5 text-xs font-bold text-primary shadow-[0_14px_22px_-18px_rgba(26,158,143,0.45)] hover:bg-primary/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Complete Student Page
            </Link>
          </div>
        ) : null}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="text-xs text-text-tertiary font-mono">{row.call_datetime?.replace("T", " ").slice(0, 16)}</p>
        </div>
      </div>
      {(row.academic_notes || row.fee_notes || row.contact_notes || row.overall_feedback) ? (
        <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-3">
          {row.academic_notes && (
            <div className="rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Academic Notes</p>
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.academic_notes}</p>
            </div>
          )}
          {row.fee_notes && (
            <div className="rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Fee Notes</p>
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.fee_notes}</p>
            </div>
          )}
          {row.contact_notes && (
            <div className="rounded-[18px] border border-slate-200/70 bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Contact Notes</p>
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.contact_notes}</p>
            </div>
          )}
          {row.overall_feedback && (
            <div className="rounded-[18px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(236,246,250,0.75))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Overall Feedback</p>
              <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{row.overall_feedback}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "mint";
}) {
  const tones = {
    default: "from-white/95 to-slate-50/92",
    amber: "from-amber-50/95 to-orange-50/92",
    mint: "from-emerald-50/95 to-teal-50/92",
  };

  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${tones[tone]} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_16px_30px_-24px_rgba(15,23,42,0.42)]`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
