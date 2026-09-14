"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Search,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Check,
  X,
  Building,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Filter,
  ShieldCheck,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getBranchChecklists,
  updateBranchChecklist,
  BranchChecklistEntry,
  evaluateSubmissionTimeliness,
} from "@/lib/api/branchChecklists";
import { toast } from "sonner";

interface ChecklistItemDef {
  id: keyof BranchChecklistEntry;
  label: string;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: "staff_attendance_verified", label: "Staff attendance verified" },
  { id: "all_classes_started_on_time", label: "All classes started on time" },
  { id: "timetable_executed_without_issues", label: "Timetable executed without issues" },
  { id: "branch_infrastructure_functional", label: "Branch infrastructure functional" },
  { id: "attendance_updated_all_classes", label: "Attendance updated (All Classes)" },
  { id: "parent_followup_completed", label: "Parent follow-up completed" },
  { id: "portion_tracking_verified", label: "Portion tracking verified" },
  { id: "class_notes_worksheet_shared", label: "Class notes/worksheet shared" },
  { id: "next_day_class_time_updated", label: "Next day class time updated (all classes)" },
  { id: "overview_updation_checked", label: "Overview updation checked" },
  { id: "class_feedback_forum_sent", label: "Class feedback forum sent" },
  { id: "teacher_training_conducted", label: "Teacher training conducted" },
  { id: "teacher_performance_reviewed", label: "Teacher performance reviewed" },
  { id: "smartup_content_shared", label: "Smart up content shared (all classes)" },
];

const DEFAULT_BRANCHES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

export default function GeneralManagerBranchChecklistsPage() {
  const { user, allowedCompanies } = useAuth();
  const queryClient = useQueryClient();

  // Navigation / View State: null = Branch Directory, string = Date-wise view for selected branch
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // Filters
  const [branchSearch, setBranchSearch] = useState("");
  const [branchFilterPill, setBranchFilterPill] = useState<"ALL" | "LOGGED_TODAY" | "PENDING_REVIEW" | "HAS_LATE">("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(""); // "", "Submitted", "Verified", "Late"

  // Expanded checklist & remarks
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});

  // Query all checklists for GM
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["branch-checklists-gm"],
    queryFn: () => getBranchChecklists(),
  });

  // Unique branches from user permissions + default list + database records
  const allBranches = useMemo(() => {
    const list = allowedCompanies && allowedCompanies.length > 0 ? allowedCompanies : DEFAULT_BRANCHES;
    const fromData = checklists.map((c) => c.branch).filter(Boolean);
    return Array.from(new Set([...list, ...fromData]));
  }, [allowedCompanies, checklists]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Compute branch-level statistics
  const branchSummaries = useMemo(() => {
    return allBranches.map((branch) => {
      const branchItems = checklists.filter((c) => c.branch === branch);
      const todayItem = branchItems.find((c) => c.date === todayStr);
      const pendingCount = branchItems.filter((c) => c.status === "Submitted").length;
      const verifiedCount = branchItems.filter((c) => c.status === "Verified").length;
      const criticalCount = branchItems.filter((c) => c.critical_issues === "Yes").length;

      let lateCount = 0;
      branchItems.forEach((c) => {
        const timeliness = evaluateSubmissionTimeliness(c.date, c.creation);
        if (timeliness.isLate) lateCount += 1;
      });

      // Latest report date submitted
      const sortedByDate = [...branchItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestDate = sortedByDate[0]?.date || null;

      return {
        name: branch,
        total: branchItems.length,
        todayItem,
        hasLoggedToday: !!todayItem,
        todayStatus: todayItem ? todayItem.status : "Not Logged",
        pendingCount,
        verifiedCount,
        criticalCount,
        lateCount,
        latestDate,
      };
    });
  }, [allBranches, checklists, todayStr]);

  // Overall GM Metrics
  const totalChecklistsCount = checklists.length;
  const totalPendingCount = checklists.filter((c) => c.status === "Submitted").length;
  const totalVerifiedCount = checklists.filter((c) => c.status === "Verified").length;
  const totalLateCount = useMemo(() => {
    return checklists.reduce((acc, c) => {
      const t = evaluateSubmissionTimeliness(c.date, c.creation);
      return acc + (t.isLate ? 1 : 0);
    }, 0);
  }, [checklists]);
  const branchesLoggedTodayCount = branchSummaries.filter((b) => b.hasLoggedToday).length;

  // Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      updateBranchChecklist(id, {
        status: "Verified",
        remarks: remarks || "",
        verified_by: user?.full_name || user?.name || "General Manager",
        verification_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      toast.success("Branch checklist verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["branch-checklists-gm"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to verify checklist.");
    },
  });

  const handleVerify = (id: string) => {
    verifyMutation.mutate({ id, remarks: reviewRemarks[id] });
  };

  // Filtered branches for Directory View
  const filteredBranches = useMemo(() => {
    return branchSummaries.filter((b) => {
      if (branchSearch && !b.name.toLowerCase().includes(branchSearch.toLowerCase())) {
        return false;
      }
      if (branchFilterPill === "LOGGED_TODAY" && !b.hasLoggedToday) return false;
      if (branchFilterPill === "PENDING_REVIEW" && b.pendingCount === 0) return false;
      if (branchFilterPill === "HAS_LATE" && b.lateCount === 0) return false;
      return true;
    });
  }, [branchSummaries, branchSearch, branchFilterPill]);

  // Filtered date-wise checklists when a branch is selected
  const selectedBranchChecklists = useMemo(() => {
    if (!selectedBranch) return [];
    let items = checklists.filter((c) => c.branch === selectedBranch);

    if (filterDate) {
      items = items.filter((c) => c.date === filterDate);
    }

    if (filterStatus === "Late") {
      items = items.filter((c) => evaluateSubmissionTimeliness(c.date, c.creation).isLate);
    } else if (filterStatus) {
      items = items.filter((c) => c.status === filterStatus);
    }

    // Sort latest date first
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [checklists, selectedBranch, filterDate, filterStatus]);

  const selectedBranchSummary = useMemo(() => {
    if (!selectedBranch) return null;
    return branchSummaries.find((b) => b.name === selectedBranch);
  }, [branchSummaries, selectedBranch]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Verified":
        return "success";
      case "Submitted":
        return "info";
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & GM Role Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedBranch ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBranch(null);
                setFilterDate("");
                setFilterStatus("");
              }}
              className="rounded-xl border-border hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Branches
            </Button>
          ) : null}
          <BreadcrumbNav />
        </div>
        <div>
          <Badge
            variant="outline"
            className="px-3.5 py-1.5 bg-white/70 dark:bg-dark-card/70 backdrop-blur-md flex items-center gap-1.5 border-primary/20 shadow-sm"
          >
            <Building className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">
              Role: <strong className="text-primary">General Manager</strong>
            </span>
          </Badge>
        </div>
      </div>

      {/* Top High-Level Metrics (Always visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border-blue-100/80 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Checklists</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-1">{totalChecklistsCount}</h3>
              <p className="text-[11px] text-text-tertiary mt-0.5">{allBranches.length} Total Branches</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
              <ClipboardCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border-emerald-100/80 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Logged Today</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                {branchesLoggedTodayCount}{" "}
                <span className="text-sm font-medium text-emerald-700/60">/ {allBranches.length}</span>
              </h3>
              <p className="text-[11px] text-emerald-700/70 mt-0.5">
                {allBranches.length - branchesLoggedTodayCount > 0
                  ? `${allBranches.length - branchesLoggedTodayCount} branches pending today`
                  : "All branches logged today!"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-orange-100/80 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending Review</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{totalPendingCount}</h3>
              <p className="text-[11px] text-amber-700/70 mt-0.5">{totalVerifiedCount} already verified</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50/80 to-red-50/80 border-rose-100/80 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600/90 uppercase tracking-wider">Late Submissions</p>
              <h3 className="text-3xl font-bold text-rose-600 mt-1">{totalLateCount}</h3>
              <p className="text-[11px] text-rose-600/70 mt-0.5">Submitted after report date</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* LEVEL 1: BRANCH DIRECTORY VIEW (When no branch selected) */}
      {/* ======================================================== */}
      {!selectedBranch ? (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <Card className="border-border bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search branch name..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="pl-10 rounded-xl bg-background text-sm"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                  variant={branchFilterPill === "ALL" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setBranchFilterPill("ALL")}
                  className="rounded-xl text-xs h-9"
                >
                  All ({branchSummaries.length})
                </Button>
                <Button
                  variant={branchFilterPill === "LOGGED_TODAY" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setBranchFilterPill("LOGGED_TODAY")}
                  className="rounded-xl text-xs h-9 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Logged Today ({branchesLoggedTodayCount})
                </Button>
                <Button
                  variant={branchFilterPill === "PENDING_REVIEW" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setBranchFilterPill("PENDING_REVIEW")}
                  className="rounded-xl text-xs h-9 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Pending Review ({branchSummaries.filter((b) => b.pendingCount > 0).length})
                </Button>
                <Button
                  variant={branchFilterPill === "HAS_LATE" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setBranchFilterPill("HAS_LATE")}
                  className="rounded-xl text-xs h-9 flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Late Submissions ({branchSummaries.filter((b) => b.lateCount > 0).length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Branch Directory Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Select a Branch to View Date-Wise Checklists
              </h2>
              <span className="text-xs text-text-secondary font-medium">
                Showing {filteredBranches.length} of {branchSummaries.length} branches
              </span>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-text-secondary flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Loading branch checklist records...</p>
              </div>
            ) : filteredBranches.length === 0 ? (
              <Card className="border-dashed p-10 text-center text-text-secondary rounded-2xl">
                <Building className="h-10 w-10 text-text-tertiary mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">No branches match your filter</p>
                <p className="text-xs mt-1">Try clearing your search query or switching tabs.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBranches.map((branch) => {
                  return (
                    <motion.div
                      key={branch.name}
                      whileHover={{ y: -3, scale: 1.01 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Card
                        onClick={() => setSelectedBranch(branch.name)}
                        className="cursor-pointer border-border hover:border-primary/40 hover:shadow-lg transition-all rounded-2xl overflow-hidden bg-white/90 dark:bg-dark-card/90 group"
                      >
                        <CardContent className="p-5 space-y-4">
                          {/* Header with Icon & Today Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                                <Building className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                                  {branch.name}
                                </h3>
                                <p className="text-xs text-text-secondary mt-0.5">
                                  {branch.latestDate ? (
                                    <span>
                                      Latest:{" "}
                                      <strong>
                                        {new Date(branch.latestDate).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                        })}
                                      </strong>
                                    </span>
                                  ) : (
                                    <span className="italic text-text-tertiary">No checklists yet</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Today status indicator */}
                            {branch.hasLoggedToday ? (
                              <Badge
                                variant={branch.todayStatus === "Verified" ? "success" : "info"}
                                className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider shrink-0"
                              >
                                Today {branch.todayStatus}
                              </Badge>
                            ) : (
                              <Badge
                                variant="warning"
                                className="text-[10px] px-2 py-0.5 font-semibold bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                              >
                                Today Pending
                              </Badge>
                            )}
                          </div>

                          {/* Quick Counters Row */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                              <p className="text-[10px] font-semibold text-text-secondary uppercase">Total</p>
                              <p className="text-base font-bold text-text-primary mt-0.5">{branch.total}</p>
                            </div>
                            <div
                              className={`p-2 rounded-xl ${
                                branch.pendingCount > 0
                                  ? "bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                                  : "bg-slate-50 dark:bg-slate-800/50 text-text-secondary"
                              }`}
                            >
                              <p className="text-[10px] font-semibold uppercase">Review</p>
                              <p className="text-base font-bold mt-0.5">{branch.pendingCount}</p>
                            </div>
                            <div
                              className={`p-2 rounded-xl ${
                                branch.lateCount > 0
                                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                                  : "bg-slate-50 dark:bg-slate-800/50 text-text-secondary"
                              }`}
                            >
                              <p className="text-[10px] font-semibold uppercase">Late</p>
                              <p className="text-base font-bold mt-0.5">{branch.lateCount}</p>
                            </div>
                          </div>

                          {/* Critical Issues / Alert Banner inside card */}
                          {branch.criticalCount > 0 ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                              <span>{branch.criticalCount} Critical Issue(s) Escalated</span>
                            </div>
                          ) : null}

                          {/* Action Button Link */}
                          <div className="pt-2 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                            <span>Open Date-Wise Checklists</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =============================================================== */
        /* LEVEL 2: DATE-WISE CHECKLIST VIEW FOR SELECTED BRANCH          */
        /* =============================================================== */
        <div className="space-y-5">
          {/* Branch Detailed Header Banner */}
          <Card className="border-border bg-gradient-to-r from-indigo-50/70 via-white/80 to-blue-50/70 dark:from-slate-900 dark:to-slate-800 backdrop-blur-md rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBranch(null);
                        setFilterDate("");
                        setFilterStatus("");
                      }}
                      className="rounded-xl h-8 px-2.5 border-border hover:bg-white flex items-center gap-1 text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </Button>
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      {selectedBranch}
                    </h2>
                  </div>
                  <p className="text-xs text-text-secondary pl-1">
                    Date-wise daily checklists, opening & closing audit logs, and timeliness status.
                  </p>
                </div>

                {/* Branch Quick Pills */}
                {selectedBranchSummary && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-white/80 dark:bg-dark-card px-2.5 py-1 text-xs">
                      Total: <strong>{selectedBranchSummary.total}</strong>
                    </Badge>
                    <Badge variant="outline" className="bg-white/80 dark:bg-dark-card px-2.5 py-1 text-xs text-amber-700">
                      Pending GM: <strong>{selectedBranchSummary.pendingCount}</strong>
                    </Badge>
                    <Badge variant="outline" className="bg-white/80 dark:bg-dark-card px-2.5 py-1 text-xs text-emerald-700">
                      Verified: <strong>{selectedBranchSummary.verifiedCount}</strong>
                    </Badge>
                    {selectedBranchSummary.lateCount > 0 && (
                      <Badge variant="warning" className="bg-rose-100 text-rose-800 border-rose-200 px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedBranchSummary.lateCount} Late
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Date & Status Filters */}
          <Card className="border-border bg-white/70 dark:bg-dark-card/70 backdrop-blur-md rounded-2xl shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-64 relative">
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full rounded-xl pl-9 text-sm"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              </div>

              <div className="w-full md:w-56 relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="Submitted">Submitted (Pending GM)</option>
                  <option value="Verified">Verified</option>
                  <option value="Late">⚠️ Late Submissions Only</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {(filterDate || filterStatus) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterDate("");
                    setFilterStatus("");
                  }}
                  className="text-text-secondary text-xs shrink-0"
                >
                  Clear Filters
                </Button>
              )}

              <div className="ml-auto text-xs text-text-secondary font-medium">
                Found {selectedBranchChecklists.length} checklist log(s)
              </div>
            </CardContent>
          </Card>

          {/* Date-Wise Checklist Cards List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-text-secondary flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading branch logs...
              </div>
            ) : selectedBranchChecklists.length === 0 ? (
              <Card className="border-dashed p-10 text-center text-text-secondary rounded-2xl">
                <CalendarDays className="h-10 w-10 text-text-tertiary mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">No checklists found for {selectedBranch}</p>
                <p className="text-xs mt-1">
                  {filterDate || filterStatus
                    ? "Try adjusting your date or status filters."
                    : "The branch manager has not submitted any checklists yet."}
                </p>
              </Card>
            ) : (
              selectedBranchChecklists.map((c) => {
                const checklistId = c.name || "";
                const isExpanded = expandedChecklist === checklistId;
                const checkedCount = CHECKLIST_ITEMS.reduce((acc, item) => acc + (c[item.id] ? 1 : 0), 0);
                const timeliness = evaluateSubmissionTimeliness(c.date, c.creation);

                const reportDateFormatted = new Date(c.date).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <Card
                    key={checklistId}
                    className={`overflow-hidden border transition-all duration-200 rounded-2xl shadow-sm ${
                      isExpanded
                        ? "border-primary/30 shadow-md bg-white dark:bg-dark-card"
                        : "border-border hover:border-text-tertiary bg-white/90 dark:bg-dark-card/90"
                    }`}
                  >
                    {/* Collapsed Row */}
                    <div
                      onClick={() => setExpandedChecklist(isExpanded ? null : checklistId)}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      {/* Left: Date & Submitter info */}
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-primary flex flex-col items-center justify-center shrink-0 border border-primary/10">
                          <span className="text-[10px] uppercase font-bold text-primary/70">
                            {new Date(c.date).toLocaleDateString("en-IN", { month: "short" })}
                          </span>
                          <span className="text-base font-black leading-none text-primary">
                            {new Date(c.date).getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-text-primary">{reportDateFormatted}</h4>

                            {/* LATE SUBMISSION BADGE */}
                            {timeliness.isLate ? (
                              <Badge
                                variant="warning"
                                className="bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 text-[11px] font-bold px-2.5 py-0.5 flex items-center gap-1 rounded-full shadow-sm"
                              >
                                <Clock className="h-3 w-3 text-rose-600" />
                                Late Submission ({timeliness.badgeLabel})
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 text-[10px] font-semibold px-2 py-0.2 rounded-full"
                              >
                                ✓ On Time
                              </Badge>
                            )}

                            {c.critical_issues === "Yes" && (
                              <Badge variant="error" className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Critical Issue
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-text-secondary">
                            <span>
                              Opened by: <strong>{c.opened_by}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Closed by: <strong>{c.closed_by || c.opened_by}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-text-tertiary" />
                              {c.opening_starting_time?.substring(0, 5)} - {c.closing_time?.substring(0, 5)}
                            </span>
                          </div>

                          {/* Submission timestamp hint */}
                          {timeliness.formattedSubmittedAt && (
                            <p className="text-[11px] text-text-tertiary mt-1">
                              Submitted into portal: {timeliness.formattedSubmittedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Tasks score, Status & Accordion Arrow */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-text-secondary">Tasks Met</p>
                          <p className="text-sm font-bold text-primary mt-0.5 whitespace-nowrap">
                            {checkedCount} / {CHECKLIST_ITEMS.length} Checked
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadgeVariant(c.status)} className="px-3 py-1 font-semibold text-xs">
                            {c.status}
                          </Badge>
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-tertiary">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Accordion Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-slate-50/60 dark:bg-dark-card/20 border-t border-border"
                        >
                          <div className="p-6 space-y-6">
                            {/* Late Submission Warning Banner if applicable */}
                            {timeliness.isLate && (
                              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                                    Marked as Late Submission
                                  </h5>
                                  <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">
                                    This checklist was recorded for report date{" "}
                                    <strong>{c.date}</strong>, but was submitted into the system on{" "}
                                    <strong>{timeliness.formattedSubmittedAt}</strong> ({timeliness.badgeLabel}).
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 14 Checkpoints Grid */}
                            <div>
                              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                                Operational Checklist Audit (14 Points)
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {CHECKLIST_ITEMS.map((item) => {
                                  const isChecked = c[item.id];
                                  return (
                                    <div
                                      key={item.id}
                                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-white dark:bg-dark-card shadow-xs ${
                                        isChecked
                                          ? "border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02]"
                                          : "border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.02]"
                                      }`}
                                    >
                                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                                      <div className="shrink-0">
                                        {isChecked ? (
                                          <div className="w-5.5 h-5.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-5.5 h-5.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                                            <X className="h-3 w-3 stroke-[3]" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Critical Issue Status */}
                            {c.critical_issues === "Yes" && (
                              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-950/40 p-4 rounded-xl space-y-1.5">
                                <h5 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                                  <AlertTriangle className="h-4 w-4" />
                                  Critical Issue Escalated by Branch Manager
                                </h5>
                                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium whitespace-pre-wrap pl-5">
                                  {c.escalation_details || "No escalation details specified."}
                                </p>
                              </div>
                            )}

                            {/* Remarks & GM Verification Action */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                              {/* Branch Manager Remarks */}
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    Branch Manager Remarks
                                  </p>
                                  <p className="text-sm text-text-primary bg-white dark:bg-dark-card border border-border p-3.5 rounded-xl mt-1.5 min-h-[60px] italic whitespace-pre-wrap">
                                    {c.remarks || "No remarks provided."}
                                  </p>
                                </div>
                                {c.status === "Verified" && (
                                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/40 p-3.5 rounded-xl space-y-1">
                                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                      Verified by {c.verified_by || "General Manager"}
                                    </p>
                                    <p className="text-xs text-text-secondary pl-5">
                                      Reviewed on{" "}
                                      {c.verification_date ? new Date(c.verification_date).toLocaleDateString("en-IN") : "-"}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* GM Verification input & approval button */}
                              {c.status === "Submitted" ? (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                      General Manager Verification Notes / Remarks
                                    </label>
                                    <textarea
                                      value={reviewRemarks[checklistId] || ""}
                                      onChange={(e) =>
                                        setReviewRemarks((prev) => ({ ...prev, [checklistId]: e.target.value }))
                                      }
                                      placeholder="Add verification feedback or instructions for branch manager..."
                                      className="w-full min-h-[85px] p-3.5 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                  </div>
                                  <div className="flex items-center justify-end">
                                    <Button
                                      onClick={() => handleVerify(checklistId)}
                                      disabled={verifyMutation.isPending}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md px-6 flex items-center gap-2"
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve & Verify Checklist
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center p-6 border border-dashed rounded-xl text-center text-xs text-text-secondary">
                                  <span>This checklist has already been verified. No further action needed.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
