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
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBranchChecklists, updateBranchChecklist, BranchChecklistEntry } from "@/lib/api/branchChecklists";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadcrumbNav />
        <div>
          <Badge variant="outline" className="px-3 py-1 bg-white/50 backdrop-blur-sm flex items-center gap-1.5 border-primary/10">
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
    </div>
  );
}
