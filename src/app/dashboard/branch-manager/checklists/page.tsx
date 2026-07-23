"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Check,
  X,
  Building,
  AlertTriangle,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";

// APIs and interfaces
import {
  createBranchChecklist,
  getBranchChecklists,
  updateBranchChecklist,
  BranchChecklistEntry
} from "@/lib/api/branchChecklists";
import {
  getChecklists as getStaffChecklists,
  updateChecklist as updateStaffChecklist,
  ChecklistEntry as StaffChecklistEntry
} from "@/lib/api/checklists";

// ----------------------------------------------------
// Constants and Definitions
// ----------------------------------------------------

interface ChecklistItemDef {
  id: keyof BranchChecklistEntry;
  label: string;
  emoji: string;
  description: string;
}

const BRANCH_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: "staff_attendance_verified",
    label: "Staff attendance verified",
    emoji: "📍",
    description: "Verify that all scheduled staff members are present or accounted for.",
  },
  {
    id: "all_classes_started_on_time",
    label: "All classes started on time",
    emoji: "📍",
    description: "Ensure instruction in every room began strictly at the scheduled time.",
  },
  {
    id: "timetable_executed_without_issues",
    label: "Timetable executed without issues",
    emoji: "📍",
    description: "Confirm there were no room overlaps or unassigned lecture slots.",
  },
  {
    id: "branch_infrastructure_functional",
    label: "Branch infrastructure functional",
    emoji: "📍",
    description: "Check internet, boards, screens, ACs, power backups, and cleanliness.",
  },
  {
    id: "attendance_updated_all_classes",
    label: "Attendance updated (All Classes)",
    emoji: "📍",
    description: "Verify that all class teachers have submitted their daily student attendance.",
  },
  {
    id: "parent_followup_completed",
    label: "Parent follow-up completed",
    emoji: "📍",
    description: "Ensure calls were made for all absent/late students.",
  },
  {
    id: "portion_tracking_verified",
    label: "Portion tracking verified",
    emoji: "📍",
    description: "Audit syllabus progress tracking against academic milestones.",
  },
  {
    id: "class_notes_worksheet_shared",
    label: "Class notes/worksheet shared",
    emoji: "📍",
    description: "Confirm all learning material files have been distributed.",
  },
  {
    id: "next_day_class_time_updated",
    label: "Next day class time updated (all classes)",
    emoji: "📍",
    description: "Verify tomorrow's schedule has been configured and published.",
  },
  {
    id: "overview_updation_checked",
    label: "Overview updation checked",
    emoji: "📍",
    description: "Ensure teachers populated class summaries and feedback logs.",
  },
  {
    id: "class_feedback_forum_sent",
    label: "Class feedback forum sent",
    emoji: "📍",
    description: "Verify feedback links or surveys were successfully sent out.",
  },
  {
    id: "teacher_training_conducted",
    label: "Teacher training conducted",
    emoji: "📍",
    description: "Log training hours or coaching sessions completed today.",
  },
  {
    id: "teacher_performance_reviewed",
    label: "Teacher performance reviewed",
    emoji: "📍",
    description: "Review lesson quality, student response, and teacher engagement levels.",
  },
  {
    id: "smartup_content_shared",
    label: "Smart up content shared (all classes)",
    emoji: "📍",
    description: "Distribute daily educational content and curriculum updates.",
  },
];

interface StaffChecklistItemDef {
  id: keyof StaffChecklistEntry;
  label: string;
}

const STAFF_CHECKLIST_ITEMS: StaffChecklistItemDef[] = [
  { id: "attendance_updated_in_lms", label: "Attendance updated in LMS" },
  { id: "absentees_verified_parents_informed", label: "Absentees verified & parents informed" },
  { id: "all_classes_conducted_as_per_timetable", label: "All classes conducted as per timetable" },
  { id: "portion_completed_as_per_academic_planner", label: "Portion completed as per academic planner" },
  { id: "class_notes_worksheet_shared", label: "Class notes/worksheet shared" },
  { id: "daily_class_overview_updated", label: "Daily class overview updated" },
  { id: "class_feedback_forum_sent", label: "Class feedback forum sent" },
  { id: "next_day_class_time_updated", label: "Next day class time updated" },
  { id: "daily_smartup_content_shared", label: "Daily Smart up content shared" },
];

export default function UnifiedChecklistsPage() {
  const { user, defaultCompany } = useAuth();
  const queryClient = useQueryClient();

  // Tab State: "branch" (Branch Manager's checklist) or "staff" (Staff verification lists)
  const [activeTab, setActiveTab] = useState<"branch" | "staff">("branch");

  // ----------------------------------------------------
  // Query & Mutation: Branch Manager Checklist (Own)
  // ----------------------------------------------------
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranchChecklist, setEditingBranchChecklist] = useState<BranchChecklistEntry | null>(null);

  // BM Form states
  const [bmDate, setBmDate] = useState(new Date().toISOString().split("T")[0]);
  const [bmOpeningTime, setBmOpeningTime] = useState("");
  const [bmOpenedBy, setBmOpenedBy] = useState("");
  const [bmClosingTime, setBmClosingTime] = useState("");
  const [bmClosedBy, setBmClosedBy] = useState("");
  const [bmCriticalIssues, setBmCriticalIssues] = useState<"Yes" | "No">("No");
  const [bmEscalationDetails, setBmEscalationDetails] = useState("");
  const [bmRemarks, setBmRemarks] = useState("");
  const [bmChecklistStates, setBmChecklistStates] = useState<Record<string, boolean>>(
    BRANCH_CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  // Fetch branch manager's own checklists
  const { data: branchChecklists = [], isLoading: isBmLoading } = useQuery({
    queryKey: ["my-branch-checklists", defaultCompany],
    queryFn: () => getBranchChecklists({ branch: defaultCompany || undefined }),
    enabled: !!defaultCompany,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const hasTodayBmChecklist = branchChecklists.some((c) => c.date === todayStr);

  const bmMutation = useMutation({
    mutationFn: (newEntry: Partial<BranchChecklistEntry>) => createBranchChecklist(newEntry),
    onSuccess: () => {
      toast.success("Branch checklist submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-branch-checklists"] });
      resetBmForm();
      setShowBranchForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit branch checklist.");
    },
  });

  const bmUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BranchChecklistEntry> }) =>
      updateBranchChecklist(id, payload),
    onSuccess: () => {
      toast.success("Branch checklist re-submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-branch-checklists"] });
      resetBmForm();
      setShowBranchForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update branch checklist.");
    },
  });

  const resetBmForm = () => {
    setBmDate(new Date().toISOString().split("T")[0]);
    setBmOpeningTime("");
    setBmOpenedBy(user?.full_name || user?.name || "");
    setBmClosingTime("");
    setBmClosedBy(user?.full_name || user?.name || "");
    setBmCriticalIssues("No");
    setBmEscalationDetails("");
    setBmRemarks("");
    setBmChecklistStates(BRANCH_CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
    setEditingBranchChecklist(null);
  };

  const handleStartBmNew = () => {
    resetBmForm();
    setShowBranchForm(true);
  };

  const handleStartBmEdit = (entry: BranchChecklistEntry) => {
    setEditingBranchChecklist(entry);
    setBmDate(entry.date);
    setBmOpeningTime(entry.opening_starting_time ? entry.opening_starting_time.substring(0, 5) : "");
    setBmOpenedBy(entry.opened_by || "");
    setBmClosingTime(entry.closing_time ? entry.closing_time.substring(0, 5) : "");
    setBmClosedBy(entry.closed_by || "");
    setBmCriticalIssues(entry.critical_issues || "No");
    setBmEscalationDetails(entry.escalation_details || "");
    setBmRemarks(entry.remarks || "");

    const states: Record<string, boolean> = {};
    BRANCH_CHECKLIST_ITEMS.forEach((item) => {
      states[item.id] = !!entry[item.id];
    });
    setBmChecklistStates(states);
    setShowBranchForm(true);
  };

  const handleBmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmOpeningTime || !bmClosingTime) {
      toast.error("Please fill opening starting time and closing time.");
      return;
    }
    if (!bmOpenedBy || !bmClosedBy) {
      toast.error("Please fill who opened and who closed the branch.");
      return;
    }

    const payload: Partial<BranchChecklistEntry> = {
      date: bmDate,
      branch: defaultCompany || "Smart Up Kadavanthara",
      opening_starting_time: `${bmOpeningTime}:00`,
      opened_by: bmOpenedBy,
      closing_time: `${bmClosingTime}:00`,
      closed_by: bmClosedBy,
      status: "Submitted",
      critical_issues: bmCriticalIssues,
      escalation_details: bmCriticalIssues === "Yes" ? bmEscalationDetails : "",
      remarks: bmRemarks,
      staff_attendance_verified: bmChecklistStates.staff_attendance_verified ? 1 : 0,
      all_classes_started_on_time: bmChecklistStates.all_classes_started_on_time ? 1 : 0,
      timetable_executed_without_issues: bmChecklistStates.timetable_executed_without_issues ? 1 : 0,
      branch_infrastructure_functional: bmChecklistStates.branch_infrastructure_functional ? 1 : 0,
      attendance_updated_all_classes: bmChecklistStates.attendance_updated_all_classes ? 1 : 0,
      parent_followup_completed: bmChecklistStates.parent_followup_completed ? 1 : 0,
      portion_tracking_verified: bmChecklistStates.portion_tracking_verified ? 1 : 0,
      class_notes_worksheet_shared: bmChecklistStates.class_notes_worksheet_shared ? 1 : 0,
      next_day_class_time_updated: bmChecklistStates.next_day_class_time_updated ? 1 : 0,
      overview_updation_checked: bmChecklistStates.overview_updation_checked ? 1 : 0,
      class_feedback_forum_sent: bmChecklistStates.class_feedback_forum_sent ? 1 : 0,
      teacher_training_conducted: bmChecklistStates.teacher_training_conducted ? 1 : 0,
      teacher_performance_reviewed: bmChecklistStates.teacher_performance_reviewed ? 1 : 0,
      smartup_content_shared: bmChecklistStates.smartup_content_shared ? 1 : 0,
    };

    if (editingBranchChecklist?.name) {
      bmUpdateMutation.mutate({ id: editingBranchChecklist.name, payload });
    } else {
      bmMutation.mutate(payload);
    }
  };

  // ----------------------------------------------------
  // Query & Mutation: Staff Checklists (To Verify)
  // ----------------------------------------------------
  const [filterStaffDate, setFilterStaffDate] = useState("");
  const [filterStaffEmployee, setFilterStaffEmployee] = useState("");
  const [filterStaffStatus, setFilterStaffStatus] = useState("");
  const [expandedStaffChecklist, setExpandedStaffChecklist] = useState<string | null>(null);
  const [staffRemarks, setStaffRemarks] = useState<Record<string, string>>({});

  // Query checklists filtered by current manager's branch
  const { data: staffChecklists = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ["branch-checklists", defaultCompany, filterStaffDate, filterStaffEmployee, filterStaffStatus],
    queryFn: () =>
      getStaffChecklists({
        branch: defaultCompany || undefined,
        date: filterStaffDate || undefined,
        employee: filterStaffEmployee || undefined,
        status: filterStaffStatus || undefined,
      }),
    enabled: !!defaultCompany,
  });

  const staffVerifyMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      updateStaffChecklist(id, {
        status: "Verified",
        remarks: remarks || "",
        verified_by: user?.full_name || user?.name || "Branch Manager",
        verification_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      toast.success("Staff checklist verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["branch-checklists"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to verify staff checklist.");
    },
  });

  const handleStaffVerify = (id: string) => {
    staffVerifyMutation.mutate({ id, remarks: staffRemarks[id] });
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

  const pendingStaffCount = staffChecklists.filter((c) => c.status === "Submitted").length;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadcrumbNav />
        <div>
          <Badge variant="outline" className="px-3 py-1 bg-white/50 backdrop-blur-sm flex items-center gap-1.5 border-primary/10">
            <Building className="h-3.5 w-3.5 text-primary" />
            <span>Branch: <strong>{defaultCompany || "All"}</strong></span>
          </Badge>
        </div>
      </div>

      {/* ----------------------------------------------------
          Two Main Option Cards (Branch vs Staff Checklists)
          ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branch Checklist Card */}
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            setActiveTab("branch");
            setShowBranchForm(false);
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative overflow-hidden flex items-start gap-4 ${
            activeTab === "branch"
              ? "bg-gradient-to-br from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/20 dark:to-blue-950/20 border-primary/30 shadow-md ring-1 ring-primary/20"
              : "bg-white/70 dark:bg-dark-card/70 border-border hover:border-text-tertiary"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            activeTab === "branch" ? "bg-primary text-white" : "bg-slate-100 text-text-secondary"
          }`}>
            <Building className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              📋 Branch Daily Checklist
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Log daily branch operations status, opening & closing times, and escalate critical issues.
            </p>
            <div className="pt-1 flex items-center gap-2">
              {hasTodayBmChecklist ? (
                <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">Today Logged</Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] py-0 px-2 font-bold">Today Pending</Badge>
              )}
            </div>
          </div>

          {activeTab === "branch" && (
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </motion.div>

        {/* Staff Checklist Card */}
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            setActiveTab("staff");
          }}
          className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative overflow-hidden flex items-start gap-4 ${
            activeTab === "staff"
              ? "bg-gradient-to-br from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/20 dark:to-blue-950/20 border-primary/30 shadow-md ring-1 ring-primary/20"
              : "bg-white/70 dark:bg-dark-card/70 border-border hover:border-text-tertiary"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            activeTab === "staff" ? "bg-primary text-white" : "bg-slate-100 text-text-secondary"
          }`}>
            <Users className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              👥 Staff Checklists Verification
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Review and verify daily checklists submitted by class incharges and teachers.
            </p>
            <div className="pt-1 flex items-center gap-2">
              {pendingStaffCount > 0 ? (
                <Badge variant="error" className="text-[10px] py-0 px-2 font-bold">{pendingStaffCount} Pending Verification</Badge>
              ) : (
                <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">All Checked</Badge>
              )}
            </div>
          </div>

          {activeTab === "staff" && (
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </motion.div>
      </div>

      <hr className="border-border/60" />

      {/* ----------------------------------------------------
          TAB 1: Branch Manager's Own Checklist
          ---------------------------------------------------- */}
      {activeTab === "branch" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Branch Operations Log</h2>
            {!showBranchForm && (
              <Button
                onClick={handleStartBmNew}
                className="bg-primary text-white hover:bg-primary-hover shadow-md flex items-center gap-2 rounded-xl px-4 py-2"
              >
                <Plus className="h-4.5 w-4.5" />
                Fill Daily Checklist
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {showBranchForm ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full"
              >
                <form onSubmit={handleBmSubmit} className="space-y-6">
                  <Card className="border-primary/10 overflow-hidden shadow-xl bg-white/70 dark:bg-dark-card/70 backdrop-blur-md">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-indigo-500/10 border-b border-primary/5 py-4 px-6 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-lg font-bold text-text-primary">
                            {editingBranchChecklist ? "Edit Daily Checklist" : "Daily Branch Operations Entry"}
                          </CardTitle>
                          <p className="text-xs text-text-secondary">Log timings, staff details, and operational checks for the day</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowBranchForm(false);
                          resetBmForm();
                        }}
                        className="text-text-secondary hover:text-text-primary text-sm font-medium"
                      >
                        Cancel
                      </Button>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                      {/* Basic details */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Date
                          </label>
                          <div className="relative">
                            <Input
                              type="date"
                              value={bmDate}
                              onChange={(e) => setBmDate(e.target.value)}
                              className="w-full rounded-xl pl-9"
                              required
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Opening Start Time
                          </label>
                          <div className="relative">
                            <Input
                              type="time"
                              value={bmOpeningTime}
                              onChange={(e) => setBmOpeningTime(e.target.value)}
                              className="w-full rounded-xl pl-9"
                              required
                            />
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Opened By
                          </label>
                          <div className="relative">
                            <Input
                              type="text"
                              value={bmOpenedBy}
                              onChange={(e) => setBmOpenedBy(e.target.value)}
                              placeholder="Manager name"
                              className="w-full rounded-xl pl-9"
                              required
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Closing Time
                          </label>
                          <div className="relative">
                            <Input
                              type="time"
                              value={bmClosingTime}
                              onChange={(e) => setBmClosingTime(e.target.value)}
                              className="w-full rounded-xl pl-9"
                              required
                            />
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Closed By
                          </label>
                          <div className="relative">
                            <Input
                              type="text"
                              value={bmClosedBy}
                              onChange={(e) => setBmClosedBy(e.target.value)}
                              placeholder="Manager name"
                              className="w-full rounded-xl pl-9"
                              required
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <hr className="border-primary/5" />

                      {/* Branch metrics checklist */}
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5">
                          Daily Checklist Tasks <span className="text-xs text-text-secondary font-normal">(Toggle Yes or No)</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {BRANCH_CHECKLIST_ITEMS.map((item) => {
                            const isChecked = bmChecklistStates[item.id];
                            return (
                              <div
                                key={item.id}
                                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-200 ${
                                  isChecked
                                    ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm"
                                    : "bg-card border-border hover:border-text-tertiary"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-base select-none mt-0.5">{item.emoji}</span>
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-text-primary">
                                      {item.label}
                                    </p>
                                    <p className="text-xs text-text-secondary">{item.description}</p>
                                  </div>
                                </div>

                                <div className="flex items-center bg-slate-100 dark:bg-dark-card/50 p-1 rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setBmChecklistStates((prev) => ({ ...prev, [item.id]: true }))}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                      isChecked
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "text-text-secondary hover:text-text-primary"
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBmChecklistStates((prev) => ({ ...prev, [item.id]: false }))}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                      !isChecked
                                        ? "bg-rose-500 text-white shadow-sm"
                                        : "text-text-secondary hover:text-text-primary"
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <hr className="border-primary/5" />

                      {/* Critical Issues & Escalation */}
                      <div className="bg-slate-50 dark:bg-dark-card/30 p-5 rounded-2xl border border-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-text-primary">If there is any critical issues?</p>
                              <p className="text-xs text-text-secondary mt-0.5">Please indicate if any blockers or safety incidents occurred today.</p>
                            </div>
                          </div>

                          <div className="flex items-center bg-white dark:bg-dark-card p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                            <button
                              type="button"
                              onClick={() => setBmCriticalIssues("Yes")}
                              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                bmCriticalIssues === "Yes"
                                  ? "bg-rose-500 text-white shadow-sm"
                                  : "text-text-secondary hover:text-text-primary"
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBmCriticalIssues("No");
                                setBmEscalationDetails("");
                              }}
                              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                bmCriticalIssues === "No"
                                  ? "bg-slate-300 dark:bg-slate-800 text-text-primary shadow-sm"
                                  : "text-text-secondary hover:text-text-primary"
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {bmCriticalIssues === "Yes" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2"
                            >
                              <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                Escalation details and action taken
                              </label>
                              <textarea
                                value={bmEscalationDetails}
                                onChange={(e) => setBmEscalationDetails(e.target.value)}
                                placeholder="Detail the critical issue and explain who it was escalated to..."
                                className="w-full min-h-[90px] p-3 rounded-xl border border-rose-500/30 bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-rose-500/40 focus:border-rose-500/40"
                                required={bmCriticalIssues === "Yes"}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* General Remarks */}
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                          General Remarks / Notes
                        </label>
                        <textarea
                          value={bmRemarks}
                          onChange={(e) => setBmRemarks(e.target.value)}
                          placeholder="Add any extra operational notes or branch updates here..."
                          className="w-full min-h-[90px] p-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                        />
                      </div>
                    </CardContent>

                    <div className="bg-slate-50 dark:bg-dark-card/20 px-6 py-4 flex items-center justify-end gap-3 border-t border-primary/5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={resetBmForm}
                        className="text-text-secondary"
                      >
                        Reset Form
                      </Button>
                      <Button
                        type="submit"
                        disabled={bmMutation.isPending || bmUpdateMutation.isPending}
                        className="bg-primary text-white hover:bg-primary-hover px-6 rounded-xl"
                      >
                        {editingBranchChecklist
                          ? (bmUpdateMutation.isPending ? "Resubmitting..." : "Resubmit Checklist")
                          : (bmMutation.isPending ? "Submitting..." : "Submit Checklist")}
                      </Button>
                    </div>
                  </Card>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                {/* Checklist Log List */}
                <Card className="border-border bg-white/70 dark:bg-dark-card/70 backdrop-blur-md rounded-2xl shadow-sm">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base font-bold text-text-primary">Branch Checklist Submission Log</CardTitle>
                    <p className="text-xs text-text-secondary">History of submitted checklists for {defaultCompany || "your branch"}</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isBmLoading ? (
                      <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading checklists...
                      </div>
                    ) : branchChecklists.length === 0 ? (
                      <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-3">
                        <FileText className="h-10 w-10 text-text-tertiary" />
                        <div>
                          <p className="font-semibold text-sm">No checklists submitted yet</p>
                          <p className="text-xs">Click "Fill Daily Checklist" above to start logging daily reports.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-dark-card/30 border-b border-border">
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Opened By</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Closed By</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Timings</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Score</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Critical Issues</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {branchChecklists.map((c) => {
                              const itemsCount = BRANCH_CHECKLIST_ITEMS.reduce((acc, item) => {
                                return acc + (c[item.id] ? 1 : 0);
                              }, 0);

                              return (
                                <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-dark-card/10 transition-colors">
                                  <td className="px-4 py-3 text-xs font-semibold text-text-primary whitespace-nowrap">
                                    {new Date(c.date).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-text-primary font-medium">
                                    {c.opened_by}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-text-primary font-medium">
                                    {c.closed_by}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 text-primary" />
                                      {c.opening_starting_time?.substring(0, 5)} - {c.closing_time?.substring(0, 5)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-text-primary whitespace-nowrap">
                                    <span className="font-semibold text-primary">{itemsCount}</span>/{BRANCH_CHECKLIST_ITEMS.length}
                                  </td>
                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                                    {c.critical_issues === "Yes" ? (
                                      <Badge variant="error" className="text-[10px] px-1.5 py-0.5">Yes</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-text-secondary">No</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                                    <Badge variant={getStatusBadgeVariant(c.status)} className="text-[10px] px-1.5 py-0.5">
                                      {c.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                                    {c.status !== "Verified" && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleStartBmEdit(c)}
                                        className="text-primary hover:text-primary-hover p-1 h-auto text-xs font-bold rounded-lg ml-auto"
                                      >
                                        Edit
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: Staff Checklists Verification Log
          ---------------------------------------------------- */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Staff Daily Submissions</h2>
          </div>

          {/* Filters */}
          <Card className="border-border bg-white/70 dark:bg-dark-card/70 backdrop-blur-md rounded-2xl shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  type="text"
                  placeholder="Search by Employee name..."
                  value={filterStaffEmployee}
                  onChange={(e) => setFilterStaffEmployee(e.target.value)}
                  className="pl-10 w-full rounded-xl"
                />
              </div>

              <div className="w-full md:w-48 relative">
                <Input
                  type="date"
                  value={filterStaffDate}
                  onChange={(e) => setFilterStaffDate(e.target.value)}
                  className="w-full rounded-xl pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              </div>

              <div className="w-full md:w-48 relative">
                <select
                  value={filterStaffStatus}
                  onChange={(e) => setFilterStaffStatus(e.target.value)}
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

              {(filterStaffDate || filterStaffEmployee || filterStaffStatus) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterStaffDate("");
                    setFilterStaffEmployee("");
                    setFilterStaffStatus("");
                  }}
                  className="text-text-secondary text-sm shrink-0"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {/* List of checklists */}
          <div className="space-y-4">
            {isStaffLoading ? (
              <div className="p-12 text-center text-text-secondary flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading staff checklists...
              </div>
            ) : staffChecklists.length === 0 ? (
              <Card className="border-dashed p-8 text-center text-text-secondary">
                <FileText className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
                <p className="font-semibold text-sm">No daily checklists found</p>
                <p className="text-xs mt-1">Try matching other filter criteria or check back later.</p>
              </Card>
            ) : (
              staffChecklists.map((c) => {
                const checklistId = c.name || "";
                const isExpanded = expandedStaffChecklist === checklistId;
                const checkedCount = STAFF_CHECKLIST_ITEMS.reduce((acc, item) => acc + (c[item.id] ? 1 : 0), 0);

                return (
                  <Card
                    key={checklistId}
                    className={`overflow-hidden border transition-all duration-200 rounded-2xl shadow-sm ${
                      isExpanded ? "border-primary/20 shadow-md bg-white/90" : "border-border hover:border-text-tertiary"
                    }`}
                  >
                    <div
                      onClick={() => setExpandedStaffChecklist(isExpanded ? null : checklistId)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-text-primary flex items-center justify-center shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                            {c.employee_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                            <span>Class: <strong>{c.class_name}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {c.class_starting_time?.substring(0, 5)} - {c.class_ending_time?.substring(0, 5)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right hidden md:block">
                          <p className="text-xs font-semibold text-text-secondary">Submission Date</p>
                          <p className="text-sm font-semibold text-text-primary mt-0.5">
                            {new Date(c.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-semibold text-text-secondary hidden md:block">Score</p>
                          <p className="text-sm font-bold text-primary mt-0.5 whitespace-nowrap">
                            {checkedCount} / {STAFF_CHECKLIST_ITEMS.length} Checked
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
                            {/* Items Checklist grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {STAFF_CHECKLIST_ITEMS.map((item) => {
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

                            {/* Details & Verify Action */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                              {/* Remarks Log */}
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    Employee Remarks
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
                                      Manager Verification Feedback / Remarks
                                    </label>
                                    <textarea
                                      value={staffRemarks[checklistId] || ""}
                                      onChange={(e) =>
                                        setStaffRemarks((prev) => ({ ...prev, [checklistId]: e.target.value }))
                                      }
                                      placeholder="Add verification notes or feedback comments..."
                                      className="w-full min-h-[80px] p-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                                    />
                                  </div>
                                  <div className="flex items-center justify-end">
                                    <Button
                                      onClick={() => handleStaffVerify(checklistId)}
                                      disabled={staffVerifyMutation.isPending}
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
      )}
    </div>
  );
}
