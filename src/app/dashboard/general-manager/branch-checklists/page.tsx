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
  Download,
  FileSpreadsheet,
  Loader2,
  MapPin,
  BarChart3,
  Hourglass,
  Bell,
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
import {
  exportBranchChecklistsExcel,
  exportBranchChecklistsPdf,
} from "@/lib/reports/branch-checklist-export";
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

// Helper to get friendly location for branches
const getBranchLocation = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("edappally")) return "Edappally, Kochi";
  if (lower.includes("vennala")) return "Vennala, Kochi";
  if (lower.includes("kadavanthara")) return "Kadavanthara, Kochi";
  if (lower.includes("fortkochi") || lower.includes("fort kochi")) return "Fort Kochi, Kochi";
  if (lower.includes("eraveli")) return "Eraveli, Kochi";
  if (lower.includes("chullickal")) return "Chullickal, Kochi";
  if (lower.includes("palluruthy")) return "Palluruthy, Kochi";
  if (lower.includes("thopumpadi") || lower.includes("thoppumpady")) return "Thoppumpady, Kochi";
  if (lower.includes("moolamkuzhi")) return "Moolamkuzhi, Kochi";
  return "Kochi, Kerala";
};

// Helper to get branch image banner
const getBranchImage = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("edappally")) return "/images/smartup-edappally.jpg";
  if (lower.includes("vennala")) return "/images/smartup-vennala.jpg";
  if (lower.includes("kadavanthara")) return "/images/smartup-kadavanthara.jpg";
  return "/images/smartup-branch-facade.jpg";
};

export default function GeneralManagerBranchChecklistsPage() {
  const { user, allowedCompanies } = useAuth();
  const queryClient = useQueryClient();

  // Navigation / View State: null = Branch Directory, string = Date-wise view for selected branch
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // Filters
  const [branchSearch, setBranchSearch] = useState("");
  const [branchFilterPill, setBranchFilterPill] = useState<"ALL" | "LOGGED_TODAY" | "LOGGER_PENDING" | "PENDING_REVIEW" | "HAS_LATE">("ALL");
  const [sortBy, setSortBy] = useState<"LATEST" | "NAME" | "PENDING" | "LATE">("LATEST");
  const [directoryFromDate, setDirectoryFromDate] = useState("");
  const [directoryToDate, setDirectoryToDate] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(""); // "", "Submitted", "Verified", "Late"

  // Expanded checklist & remarks
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});

  // Report Modal & Export State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTimeframe, setReportTimeframe] = useState<"THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM">("THIS_MONTH");
  const [reportBranch, setReportBranch] = useState<string>("ALL");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("");
  const [reportCustomFrom, setReportCustomFrom] = useState<string>("");
  const [reportCustomTo, setReportCustomTo] = useState<string>("");
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

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
      let branchItems = checklists.filter((c) => c.branch === branch);
      
      // Filter by date range if selected
      if (directoryFromDate) {
        branchItems = branchItems.filter((c) => c.date >= directoryFromDate);
      }
      if (directoryToDate) {
        branchItems = branchItems.filter((c) => c.date <= directoryToDate);
      }

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
  }, [allBranches, checklists, todayStr, directoryFromDate, directoryToDate]);

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
  const branchesPendingTodayCount = branchSummaries.filter((b) => !b.hasLoggedToday).length;

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

  // Filtered and sorted branches for Directory View
  const filteredBranches = useMemo(() => {
    let result = branchSummaries.filter((b) => {
      if (branchSearch && !b.name.toLowerCase().includes(branchSearch.toLowerCase())) {
        return false;
      }
      if (branchFilterPill === "LOGGED_TODAY" && !b.hasLoggedToday) return false;
      if (branchFilterPill === "LOGGER_PENDING" && b.hasLoggedToday) return false;
      if (branchFilterPill === "PENDING_REVIEW" && b.pendingCount === 0) return false;
      if (branchFilterPill === "HAS_LATE" && b.lateCount === 0) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "NAME") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "PENDING") {
        return b.pendingCount - a.pendingCount;
      }
      if (sortBy === "LATE") {
        return b.lateCount - a.lateCount;
      }
      // "LATEST": sort by latestDate descending, then name
      const dateA = a.latestDate ? new Date(a.latestDate).getTime() : 0;
      const dateB = b.latestDate ? new Date(b.latestDate).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.name.localeCompare(b.name);
    });
  }, [branchSummaries, branchSearch, branchFilterPill, sortBy]);

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

  // Compute Active Dates for Report Range
  const resolvedReportDateRange = useMemo(() => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];

    if (reportTimeframe === "THIS_WEEK") {
      // Current week starting from Monday (or past 7 days)
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        from: monday.toISOString().split("T")[0],
        to: todayISO,
        label: "This Week",
      };
    }

    if (reportTimeframe === "THIS_MONTH") {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
      return {
        from: firstDay,
        to: todayISO,
        label: `${now.toLocaleDateString("en-IN", { month: "long" })} ${year}`,
      };
    }

    if (reportTimeframe === "LAST_MONTH") {
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];
      const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long" });
      return {
        from: firstDay,
        to: lastDay,
        label: `${monthName} ${year}`,
      };
    }

    return {
      from: reportCustomFrom || todayISO,
      to: reportCustomTo || todayISO,
      label: "Custom Date Range",
    };
  }, [reportTimeframe, reportCustomFrom, reportCustomTo]);

  // Handle Export Trigger
  const handleExport = async (format: "excel" | "pdf") => {
    try {
      setIsExporting(format);

      // Fetch or filter relevant data
      let exportItems: BranchChecklistEntry[] = [];

      // Query complete range from backend to ensure all branches & dates in timeframe are included
      exportItems = await getBranchChecklists({
        branch: reportBranch === "ALL" ? undefined : reportBranch,
        from_date: resolvedReportDateRange.from,
        to_date: resolvedReportDateRange.to,
        limit: 1000,
      });

      // Status filter
      if (reportStatusFilter === "Late") {
        exportItems = exportItems.filter((c) => evaluateSubmissionTimeliness(c.date, c.creation).isLate);
      } else if (reportStatusFilter) {
        exportItems = exportItems.filter((c) => c.status === reportStatusFilter);
      }

      if (exportItems.length === 0) {
        toast.error("No checklist logs found for the selected branch and date range.");
        return;
      }

      const options = {
        branch: reportBranch,
        allBranches,
        fromDate: resolvedReportDateRange.from,
        toDate: resolvedReportDateRange.to,
        statusFilter: reportStatusFilter,
      };

      if (format === "excel") {
        await exportBranchChecklistsExcel(exportItems, options);
        toast.success("Excel report downloaded successfully!");
      } else {
        await exportBranchChecklistsPdf(exportItems, options);
        toast.success("PDF report downloaded successfully!");
      }

      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report.");
    } finally {
      setIsExporting(null);
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Pre-select active branch if user is currently inside a branch
              if (selectedBranch) {
                setReportBranch(selectedBranch);
              }
              setIsReportModalOpen(true);
            }}
            className="rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Download Report</span>
          </Button>

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

      {/* Hero Header Section (Compact) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-blue-50/50 dark:from-slate-900/90 dark:via-purple-950/20 dark:to-slate-900/90 border border-purple-100/60 dark:border-purple-900/30 px-5 py-4 md:px-6 md:py-4 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left Title & Subtitle */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Branch Checklists
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Track and manage branch checklist status in one place
            </p>
          </div>

          {/* Right Motivational Quote & 3D Illustration Graphic */}
          <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto">
            <div className="hidden md:block text-right">
              <p className="italic text-xs sm:text-sm font-semibold text-purple-700/90 dark:text-purple-300 font-serif leading-snug">
                &ldquo;Consistent branches<br />create brighter futures&rdquo;
              </p>
            </div>

            {/* Compact Decorative Floating Badge */}
            <div className="relative flex items-center gap-2.5 bg-white/85 dark:bg-slate-800/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-purple-100 dark:border-purple-800/40 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {allBranches.length}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Branches</span>
                </div>
                <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 leading-tight">
                  All on track for a better tomorrow.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Soft atmospheric background glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-10 w-32 h-32 bg-blue-200/20 dark:bg-blue-900/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Top High-Level Metrics (4 Clean Modern 3D/Glass Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Checklists */}
        <div className="relative overflow-hidden bg-white/95 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Checklists</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalChecklistsCount}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {allBranches.length} Total Branches
            </p>
          </div>
          {/* Subtle Mini Bar Chart Graphic on right */}
          <div className="relative flex items-end gap-1.5 h-16 w-16 justify-end pr-1 opacity-80">
            <div className="w-2.5 h-7 rounded-full bg-blue-300 dark:bg-blue-700/60" />
            <div className="w-2.5 h-11 rounded-full bg-blue-400 dark:bg-blue-600/70" />
            <div className="w-2.5 h-14 rounded-full bg-gradient-to-t from-blue-500 to-indigo-500" />
          </div>
        </div>

        {/* Card 2: Logged Today */}
        <div className="relative overflow-hidden bg-white/95 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Logged Today</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {branchesLoggedTodayCount}{" "}
              <span className="text-lg font-medium text-slate-400">/ {allBranches.length}</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {branchesPendingTodayCount} branches pending
            </p>
          </div>
          {/* Subtle Calendar Graphic on right */}
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/30 flex flex-col items-center justify-center shadow-xs">
            <div className="w-8 h-2 bg-purple-500 rounded-full mb-1" />
            <CalendarDays className="h-6 w-6 text-purple-500 dark:text-purple-400" />
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="relative overflow-hidden bg-white/95 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <Hourglass className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Pending Review</p>
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {totalPendingCount}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {totalVerifiedCount} already verified
            </p>
          </div>
          {/* Subtle 3D-styled Hourglass icon on right */}
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 flex items-center justify-center shadow-xs">
            <Hourglass className="h-7 w-7 text-amber-500 dark:text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Card 4: Late Submissions */}
        <div className="relative overflow-hidden bg-white/95 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Late Submissions</p>
            <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {totalLateCount}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Submitted after report date
            </p>
          </div>
          {/* Subtle Notification Bell icon on right */}
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/30 flex items-center justify-center shadow-xs">
            <Bell className="h-7 w-7 text-rose-500 dark:text-rose-400" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEVEL 1: BRANCH DIRECTORY VIEW (When no branch selected) */}
      {/* ======================================================== */}
      {!selectedBranch ? (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-1">
              <div className="relative flex-1 sm:w-80 sm:flex-none">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search branch name..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="pl-11 rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm h-11 shadow-xs focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs">
                <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Range:</span>
                <input
                  type="date"
                  value={directoryFromDate}
                  onChange={(e) => setDirectoryFromDate(e.target.value)}
                  className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
                  placeholder="From"
                  title="From Date"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={directoryToDate}
                  onChange={(e) => setDirectoryToDate(e.target.value)}
                  className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none w-28"
                  placeholder="To"
                  title="To Date"
                />
                {(directoryFromDate || directoryToDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirectoryFromDate("");
                      setDirectoryToDate("");
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Clear date range"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills with Exact Styling from Design */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBranchFilterPill("ALL")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  branchFilterPill === "ALL"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                }`}
              >
                All ({branchSummaries.length})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilterPill("LOGGED_TODAY")}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  branchFilterPill === "LOGGED_TODAY"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                Logged Today ({branchesLoggedTodayCount})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilterPill("LOGGER_PENDING")}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  branchFilterPill === "LOGGER_PENDING"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 hover:bg-amber-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Logger Pending ({branchesPendingTodayCount})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilterPill("PENDING_REVIEW")}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  branchFilterPill === "PENDING_REVIEW"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Pending Review ({branchSummaries.filter((b) => b.pendingCount > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilterPill("HAS_LATE")}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  branchFilterPill === "HAS_LATE"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Late Submissions ({branchSummaries.filter((b) => b.lateCount > 0).length})
              </button>
            </div>
          </div>

          {/* Section Header: Branch Overview + Sort Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Branch Overview
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Select a branch to view date-wise checklists
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredBranches.length}</strong> of {branchSummaries.length} branches
              </span>

              {/* Sort by Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="LATEST">Sort by Latest</option>
                  <option value="NAME">Sort by Name</option>
                  <option value="PENDING">Sort by Pending Review</option>
                  <option value="LATE">Sort by Late Submissions</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Branch Directory Grid */}
          <div>
            {isLoading ? (
              <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold">Loading branch records...</p>
              </div>
            ) : filteredBranches.length === 0 ? (
              <Card className="border-dashed p-12 text-center text-slate-500 rounded-3xl">
                <Building className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No branches match your filter</p>
                <p className="text-xs mt-1 text-slate-400">Try clearing your search query or switching tabs.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBranches.map((branch) => {
                  const branchImg = getBranchImage(branch.name);
                  const locationText = getBranchLocation(branch.name);

                  return (
                    <motion.div
                      key={branch.name}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        onClick={() => setSelectedBranch(branch.name)}
                        className="cursor-pointer group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-700 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
                      >
                        {/* Header with Icon, Name, Location & Today Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200 shadow-xs">
                              <Building className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {branch.name}
                              </h3>
                              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{locationText}</span>
                              </div>
                            </div>
                          </div>

                          {/* Today Status Badge */}
                          <div className="shrink-0">
                            {branch.hasLoggedToday ? (
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                                  branch.todayStatus === "Verified"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                                    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
                                }`}
                              >
                                Today {branch.todayStatus}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40 shadow-xs">
                                Today Pending
                              </span>
                            )}
                          </div>
                        </div>

                          {/* Clean 3-Metric Block */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100/80 dark:border-slate-800/50 text-center">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                                {branch.total}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Review</p>
                              <p
                                className={`text-lg font-extrabold mt-0.5 ${
                                  branch.pendingCount > 0 ? "text-amber-600" : "text-slate-800 dark:text-slate-200"
                                }`}
                              >
                                {branch.pendingCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late</p>
                              <p
                                className={`text-lg font-extrabold mt-0.5 ${
                                  branch.lateCount > 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-200"
                                }`}
                              >
                                {branch.lateCount}
                              </p>
                            </div>
                          </div>

                          {/* Critical Issues Banner if applicable */}
                          {branch.criticalCount > 0 ? (
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                <span>{branch.criticalCount} Critical Issue(s) Escalated</span>
                              </div>
                              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-rose-500" />
                            </div>
                          ) : null}

                          {/* Footer: Open Link with Arrow */}
                          <div className="pt-2 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 border-t border-slate-100 dark:border-slate-800/80">
                            <span>Open Date-Wise Checklists</span>
                            <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                              <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                      </div>
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
      {/* ======================================================== */}
      {/* REPORT DOWNLOAD CONFIGURATION MODAL                     */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-dark-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-primary text-white flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                      <Download className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold">Download Checklists Report</h3>
                  </div>
                  <p className="text-xs text-indigo-100/80">
                    Export date-wise branch operational logs with submission & verification timeliness.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* 1. Branch Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    Branch Scope
                  </label>
                  <select
                    value={reportBranch}
                    onChange={(e) => setReportBranch(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                  >
                    <option value="ALL">All Branches ({allBranches.length} branches)</option>
                    {allBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-text-tertiary">
                    Select "All Branches" to aggregate all branches in a single date-wise report.
                  </p>
                </div>

                {/* 2. Timeframe Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Reporting Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportTimeframe("THIS_WEEK")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-start gap-0.5 ${
                        reportTimeframe === "THIS_WEEK"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-text-secondary"
                      }`}
                    >
                      <span>This Week</span>
                      <span className="text-[10px] font-normal text-text-tertiary">Weekly date breakdown</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportTimeframe("THIS_MONTH")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-start gap-0.5 ${
                        reportTimeframe === "THIS_MONTH"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-text-secondary"
                      }`}
                    >
                      <span>This Month</span>
                      <span className="text-[10px] font-normal text-text-tertiary">Current month to date</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportTimeframe("LAST_MONTH")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-start gap-0.5 ${
                        reportTimeframe === "LAST_MONTH"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-text-secondary"
                      }`}
                    >
                      <span>Last Month</span>
                      <span className="text-[10px] font-normal text-text-tertiary">Full previous calendar month</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportTimeframe("CUSTOM")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-start gap-0.5 ${
                        reportTimeframe === "CUSTOM"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-text-secondary"
                      }`}
                    >
                      <span>Custom Range</span>
                      <span className="text-[10px] font-normal text-text-tertiary">Specify start & end dates</span>
                    </button>
                  </div>

                  {/* Custom Date Inputs */}
                  {reportTimeframe === "CUSTOM" && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-medium text-text-tertiary mb-1 block">From Date</label>
                        <Input
                          type="date"
                          value={reportCustomFrom}
                          onChange={(e) => setReportCustomFrom(e.target.value)}
                          className="rounded-xl text-xs h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-text-tertiary mb-1 block">To Date</label>
                        <Input
                          type="date"
                          value={reportCustomTo}
                          onChange={(e) => setReportCustomTo(e.target.value)}
                          className="rounded-xl text-xs h-9"
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Selected Range Preview */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border/80 flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Active Date Range:</span>
                    <span className="font-bold text-primary">
                      {resolvedReportDateRange.from} → {resolvedReportDateRange.to} ({resolvedReportDateRange.label})
                    </span>
                  </div>
                </div>

                {/* 3. Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    Status Filter
                  </label>
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                  >
                    <option value="">All Statuses (Submitted, Verified & Late)</option>
                    <option value="Submitted">Submitted Only (Pending Review)</option>
                    <option value="Verified">Verified Only</option>
                    <option value="Late">Late Submissions Only</option>
                  </select>
                </div>

                {/* Information Callout */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    What will be included in the report?
                  </p>
                  <p className="text-[11px] leading-relaxed text-indigo-800/80 dark:text-indigo-300">
                    • All dates chronologically for each branch.<br />
                    • Exact status: <strong>Submitted</strong>, <strong>Verified</strong>, or <strong>Late Submission</strong> (with days late and submission time).<br />
                    • Checkpoints compliance score (14/14) and escalated critical issues.
                  </p>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-border flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting !== null}
                    onClick={() => handleExport("pdf")}
                    className="rounded-xl text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 flex items-center gap-1.5"
                  >
                    {isExporting === "pdf" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span>Download PDF</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isExporting !== null}
                    onClick={() => handleExport("excel")}
                    className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    {isExporting === "excel" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    )}
                    <span>Download Excel (.xlsx)</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
