"use client";

import React, { useState } from "react";
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
  Download,
  FileSpreadsheet,
  Loader2,
  Filter,
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

export default function DirectorBranchChecklistsPage() {
  const { user, allowedCompanies } = useAuth();
  const queryClient = useQueryClient();

  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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

  const branchesList = allowedCompanies && allowedCompanies.length > 0 ? allowedCompanies : DEFAULT_BRANCHES;

  // Query branch manager checklists
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["branch-checklists-director", filterBranch, filterDate, filterStatus],
    queryFn: () =>
      getBranchChecklists({
        branch: filterBranch === "ALL" ? undefined : filterBranch,
        date: filterDate || undefined,
        status: filterStatus || undefined,
      }),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      updateBranchChecklist(id, {
        status: "Verified",
        remarks: remarks || "",
        verified_by: user?.full_name || user?.name || "Director",
        verification_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      toast.success("Branch checklist verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["branch-checklists-director"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to verify checklist.");
    },
  });

  const handleVerify = (id: string) => {
    verifyMutation.mutate({ id, remarks: reviewRemarks[id] });
  };

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

  const pendingCount = checklists.filter((c) => c.status === "Submitted").length;
  const verifiedCount = checklists.filter((c) => c.status === "Verified").length;

  // Compute Active Dates for Report Range
  const resolvedReportDateRange = React.useMemo(() => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];

    if (reportTimeframe === "THIS_WEEK") {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
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

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      setIsExporting(format);
      let exportItems = await getBranchChecklists({
        branch: reportBranch === "ALL" ? undefined : reportBranch,
        from_date: resolvedReportDateRange.from,
        to_date: resolvedReportDateRange.to,
        limit: 1000,
      });

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
        allBranches: branchesList,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadcrumbNav />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filterBranch && filterBranch !== "ALL") {
                setReportBranch(filterBranch);
              }
              setIsReportModalOpen(true);
            }}
            className="rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Download Report</span>
          </Button>

          <Badge variant="outline" className="px-3 py-1.5 bg-white/50 backdrop-blur-sm flex items-center gap-1.5 border-primary/10">
            <Building className="h-3.5 w-3.5 text-primary" />
            <span>Role: <strong>Director</strong></span>
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Checklists</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-1">{checklists.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pending Review</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 dark:from-slate-900 dark:to-slate-800 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Verified Checklists</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">{verifiedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-white/70 dark:bg-dark-card/70 backdrop-blur-md rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:flex-1 relative">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full h-[40px] px-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none font-medium"
            >
              <option value="ALL">All Branches</option>
              {branchesList.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          <div className="w-full md:w-56 relative">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full rounded-xl pl-9"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          </div>

          <div className="w-full md:w-48 relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-[40px] px-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Verified">Verified</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          {(filterBranch !== "ALL" || filterDate || filterStatus) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilterBranch("ALL");
                setFilterDate("");
                setFilterStatus("");
              }}
              className="text-text-secondary text-sm shrink-0"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Checklist Log */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-text-secondary flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading checklists...
          </div>
        ) : checklists.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-text-secondary">
            <FileText className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
            <p className="font-semibold text-sm">No branch daily checklists found</p>
            <p className="text-xs mt-1">Try matching other filter criteria or check back later.</p>
          </Card>
        ) : (
          checklists.map((c) => {
            const checklistId = c.name || "";
            const isExpanded = expandedChecklist === checklistId;
            const checkedCount = CHECKLIST_ITEMS.reduce((acc, item) => acc + (c[item.id] ? 1 : 0), 0);

            return (
              <Card
                key={checklistId}
                className={`overflow-hidden border transition-all duration-200 rounded-2xl shadow-sm ${
                  isExpanded ? "border-primary/20 shadow-md bg-white/90" : "border-border hover:border-text-tertiary"
                }`}
              >
                <div
                  onClick={() => setExpandedChecklist(isExpanded ? null : checklistId)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-text-primary flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                        {c.branch}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                        <span>Opened by: <strong>{c.opened_by}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.opening_starting_time?.substring(0, 5)} - {c.closing_time?.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-semibold text-text-secondary">Report Date</p>
                      <p className="text-sm font-semibold text-text-primary mt-0.5">
                        {new Date(c.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-text-secondary hidden md:block">Tasks Met</p>
                      <p className="text-sm font-bold text-primary mt-0.5 whitespace-nowrap">
                        {c.critical_issues === "Yes" ? (
                          <Badge variant="error" className="mr-2 text-[9px] px-1 py-0 rounded">Critical Issue</Badge>
                        ) : null}
                        {checkedCount} / {CHECKLIST_ITEMS.length} Checked
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadgeVariant(c.status)}>{c.status}</Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-slate-50/50 dark:bg-dark-card/5 border-t border-border"
                    >
                      <div className="p-6 space-y-6">
                        {/* Checkpoints grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {CHECKLIST_ITEMS.map((item) => {
                            const isChecked = c[item.id];
                            return (
                              <div
                                key={item.id}
                                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-white dark:bg-dark-card ${
                                  isChecked ? "border-emerald-500/20" : "border-slate-100"
                                }`}
                              >
                                <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                                <div className="shrink-0">
                                  {isChecked ? (
                                    <div className="w-5.5 h-5.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-slate-100 text-text-tertiary flex items-center justify-center">
                                      <X className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Critical Issue Status */}
                        {c.critical_issues === "Yes" && (
                          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 p-4 rounded-xl space-y-1.5">
                            <h5 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Critical Issue Escalated
                            </h5>
                            <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold whitespace-pre-wrap pl-5">
                              {c.escalation_details || "No escalation details specified."}
                            </p>
                          </div>
                        )}

                        {/* Details & Verify Action */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                          {/* Remarks Log */}
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
                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                                  ✓ Verified by {c.verified_by}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  Reviewed on {c.verification_date ? new Date(c.verification_date).toLocaleDateString("en-IN") : "-"}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Verification input */}
                          {c.status === "Submitted" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                  Director Verification Feedback / Remarks
                                </label>
                                <textarea
                                  value={reviewRemarks[checklistId] || ""}
                                  onChange={(e) =>
                                    setReviewRemarks((prev) => ({ ...prev, [checklistId]: e.target.value }))
                                  }
                                  placeholder="Add verification notes or feedback comments..."
                                  className="w-full min-h-[80px] p-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
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
                    <option value="ALL">All Branches ({branchesList.length} branches)</option>
                    {branchesList.map((b) => (
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
