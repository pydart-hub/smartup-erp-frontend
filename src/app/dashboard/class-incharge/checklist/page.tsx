"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Plus,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  User,
  MapPin,
  Check,
  ChevronRight,
  Info,
  Search,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getBatches } from "@/lib/api/batches";
import { createChecklist, getChecklists, updateChecklist, ChecklistEntry } from "@/lib/api/checklists";
import { toast } from "sonner";

interface ChecklistItem {
  id: keyof ChecklistEntry;
  label: string;
  emoji: string;
  description: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "attendance_updated_in_lms",
    label: "Attendance updated in LMS",
    emoji: "📍",
    description: "Mark attendance for all present/absent students in the system.",
  },
  {
    id: "absentees_verified_parents_informed",
    label: "Absentees verified & parents informed",
    emoji: "📍",
    description: "Cross-check absentees and contact parents/guardians to verify reasons.",
  },
  {
    id: "all_classes_conducted_as_per_timetable",
    label: "All classes conducted as per timetable",
    emoji: "📍",
    description: "Confirm all scheduled sessions for the day were completed.",
  },
  {
    id: "portion_completed_as_per_academic_planner",
    label: "Portion completed as per academic planner",
    emoji: "📍",
    description: "Verify lesson progress matches the predefined syllabus/milestones.",
  },
  {
    id: "class_notes_worksheet_shared",
    label: "Class notes/worksheet shared",
    emoji: "📍",
    description: "Upload and share course materials or worksheets to study groups.",
  },
  {
    id: "daily_class_overview_updated",
    label: "Daily class overview updated",
    emoji: "📍",
    description: "Log topic summaries and key discussion points for the day.",
  },
  {
    id: "class_feedback_forum_sent",
    label: "Class feedback forum sent",
    emoji: "📍",
    description: "Send daily feedback/polling link to students/parents.",
  },
  {
    id: "next_day_class_time_updated",
    label: "Next day class time updated",
    emoji: "📍",
    description: "Ensure tomorrow's sessions and schedule adjustments are updated.",
  },
  {
    id: "daily_smartup_content_shared",
    label: "Daily Smart up content shared",
    emoji: "📍",
    description: "Distribute daily educational content and updates to student groups.",
  },
];

export default function ClassInchargeChecklistPage() {
  const { user, defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistEntry | null>(null);

  // Form states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean>>(
    CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  // Fetch batches for dropdown
  const { data: batchesRes } = useQuery({
    queryKey: ["ci-checklist-batches", defaultCompany],
    queryFn: () =>
      getBatches({
        limit_page_length: 500,
        ...(defaultCompany ? { custom_branch: defaultCompany } : {}),
      }),
    enabled: !!defaultCompany,
  });
  const batches = (batchesRes?.data ?? []).filter((b) => !b.disabled);

  // Fetch employee's submitted checklists
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["my-checklists", user?.name],
    queryFn: () => getChecklists({ employee: user?.name || undefined }),
    enabled: !!user?.name,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const hasTodayChecklist = checklists.some((c) => c.date === todayStr);

  // Mutation to create checklist
  const mutation = useMutation({
    mutationFn: (newEntry: Partial<ChecklistEntry>) => createChecklist(newEntry),
    onSuccess: () => {
      toast.success("Daily checklist submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-checklists"] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit daily checklist.");
    },
  });

  // Mutation to update/resubmit checklist
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistEntry> }) =>
      updateChecklist(id, payload),
    onSuccess: () => {
      toast.success("Daily checklist re-submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-checklists"] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to re-submit daily checklist.");
    },
  });

  const resetForm = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedBatches([]);
    setSearchTerm("");
    setIsDropdownOpen(false);
    setStartTime("");
    setEndTime("");
    setRemarks("");
    setChecklistStates(CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
    setEditingChecklist(null);
  };

  const handleStartEdit = (entry: ChecklistEntry) => {
    setEditingChecklist(entry);
    setSelectedDate(entry.date);
    setSelectedBatches(entry.class_name ? entry.class_name.split(", ") : []);
    setStartTime(entry.class_starting_time ? entry.class_starting_time.substring(0, 5) : "");
    setEndTime(entry.class_ending_time ? entry.class_ending_time.substring(0, 5) : "");
    setRemarks(entry.remarks || "");
    
    // Set checkbox states
    const states: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      states[item.id] = !!entry[item.id];
    });
    setChecklistStates(states);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatches.length === 0) {
      toast.error("Please select at least one Class / Batch.");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Please select both Starting and Ending times.");
      return;
    }

    const payload: Partial<ChecklistEntry> = {
      date: selectedDate,
      employee: user?.name || "employee-placeholder",
      employee_name: user?.full_name || "Employee",
      branch: defaultCompany || "Branch Placeholder",
      class_name: selectedBatches.join(", "),
      class_starting_time: `${startTime}:00`,
      class_ending_time: `${endTime}:00`,
      status: "Submitted",
      remarks,
      attendance_updated_in_lms: checklistStates.attendance_updated_in_lms ? 1 : 0,
      absentees_verified_parents_informed: checklistStates.absentees_verified_parents_informed ? 1 : 0,
      all_classes_conducted_as_per_timetable: checklistStates.all_classes_conducted_as_per_timetable ? 1 : 0,
      portion_completed_as_per_academic_planner: checklistStates.portion_completed_as_per_academic_planner ? 1 : 0,
      class_notes_worksheet_shared: checklistStates.class_notes_worksheet_shared ? 1 : 0,
      daily_class_overview_updated: checklistStates.daily_class_overview_updated ? 1 : 0,
      class_feedback_forum_sent: checklistStates.class_feedback_forum_sent ? 1 : 0,
      next_day_class_time_updated: checklistStates.next_day_class_time_updated ? 1 : 0,
      daily_smartup_content_shared: checklistStates.daily_smartup_content_shared ? 1 : 0,
    };

    if (editingChecklist?.name) {
      updateMutation.mutate({ id: editingChecklist.name, payload });
    } else {
      mutation.mutate(payload);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadcrumbNav />
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white hover:bg-primary-hover shadow-md flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5" />
            Fill Daily Checklist
          </Button>
        )}
      </div>

      {!hasTodayChecklist && !showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-text-primary">Daily Checklist Reminder</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                You haven't submitted your checklist for today yet. Please submit it before the end of the day.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md rounded-xl text-xs px-4 py-2 shrink-0 self-start sm:self-center"
          >
            Complete Checklist Now
          </Button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-primary/10 overflow-hidden shadow-xl bg-white/70 dark:bg-dark-card/70 backdrop-blur-md">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-teal-500/10 border-b border-primary/5 py-4 px-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg font-bold text-text-primary">
                        {editingChecklist ? "Edit Daily Checklist" : "Daily Checklist Entry"}
                      </CardTitle>
                      <p className="text-xs text-text-secondary">Fill in class details and updates for the day</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="text-text-secondary hover:text-text-primary text-sm font-medium"
                  >
                    Cancel
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        Date
                      </label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full rounded-xl pl-9"
                          required
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        Class / Batch
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full h-[40px] px-3 rounded-xl border border-input bg-background text-left text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 flex items-center justify-between"
                        >
                          <span className="truncate">
                            {selectedBatches.length === 0
                              ? "Select classes..."
                              : selectedBatches.join(", ")}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${
                              isDropdownOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        {isDropdownOpen && (
                          <>
                            {/* Backdrop click overlay to close dropdown */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                            
                            <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-dark-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto p-2 space-y-1 backdrop-blur-md bg-white/95 dark:bg-dark-card/95">
                              <div className="relative mb-2 px-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                                <input
                                  type="text"
                                  placeholder="Search classes..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                                />
                              </div>

                              {batches.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <div className="text-center text-xs text-text-secondary py-2">No classes found</div>
                              ) : (
                                batches
                                  .filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                  .map((b) => {
                                    const isSelected = selectedBatches.includes(b.name);
                                    return (
                                      <label
                                        key={b.name}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                          isSelected
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "hover:bg-slate-50 dark:hover:bg-dark-card/50 text-text-primary"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setSelectedBatches(selectedBatches.filter((name) => name !== b.name));
                                            } else {
                                              setSelectedBatches([...selectedBatches, b.name]);
                                            }
                                          }}
                                          className="rounded border-input text-primary focus:ring-primary/30 h-3.5 w-3.5"
                                        />
                                        <span className="truncate">{b.name}</span>
                                      </label>
                                    );
                                  })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        Starting Time
                      </label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full rounded-xl pl-9"
                          required
                        />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        Ending Time
                      </label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full rounded-xl pl-9"
                          required
                        />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <hr className="border-primary/5" />

                  {/* Checklist Items */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5">
                      Checklist Items <span className="text-xs text-text-secondary font-normal">(Select Yes or No)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CHECKLIST_ITEMS.map((item) => {
                        const isChecked = checklistStates[item.id];
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
                                onClick={() => setChecklistStates((prev) => ({ ...prev, [item.id]: true }))}
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
                                onClick={() => setChecklistStates((prev) => ({ ...prev, [item.id]: false }))}
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

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      Remarks / Notes
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any extra notes or class feedback details here..."
                      className="w-full min-h-[100px] p-3 rounded-xl border border-input bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                    />
                  </div>
                </CardContent>
                <div className="bg-slate-50 dark:bg-dark-card/20 px-6 py-4 flex items-center justify-end gap-3 border-t border-primary/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                    className="text-text-secondary"
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={mutation.isPending || updateMutation.isPending}
                    className="bg-primary text-white hover:bg-primary-hover px-6 rounded-xl"
                  >
                    {editingChecklist
                      ? (updateMutation.isPending ? "Resubmitting..." : "Resubmit Checklist")
                      : (mutation.isPending ? "Submitting..." : "Submit Checklist")}
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
            <Card className="border-border">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold text-text-primary">Checklist Submission Log</CardTitle>
                <p className="text-xs text-text-secondary">List of daily checklists you have submitted</p>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading your checklists...
                  </div>
                ) : checklists.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-3">
                    <FileText className="h-10 w-10 text-text-tertiary" />
                    <div>
                      <p className="font-semibold text-sm">No checklists submitted yet</p>
                      <p className="text-xs">Click the button above to start logging your daily reports.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-dark-card/30 border-b border-border">
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Class / Batch</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Timing</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Items</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Remarks</th>
                          <th className="px-3 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {checklists.map((c) => {
                          const itemsCount = CHECKLIST_ITEMS.reduce((acc, item) => {
                            return acc + (c[item.id] ? 1 : 0);
                          }, 0);

                          const classes = c.class_name ? c.class_name.split(", ") : [];
                          const firstClass = classes[0] || "-";
                          const extraClasses = classes.length - 1;

                          return (
                            <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-dark-card/10 transition-colors">
                              <td className="px-3 py-3 text-xs font-semibold text-text-primary whitespace-nowrap">
                                {new Date(c.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </td>
                              <td className="px-3 py-3 text-xs text-text-primary font-medium">
                                <div className="flex items-center gap-1.5" title={c.class_name}>
                                  <span className="truncate max-w-[140px] inline-block">{firstClass}</span>
                                  {extraClasses > 0 && (
                                    <Badge variant="info" className="text-[9px] px-1 py-0 rounded shrink-0 bg-primary/10 text-primary">
                                      +{extraClasses}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-text-secondary whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {c.class_starting_time?.substring(0, 5)} - {c.class_ending_time?.substring(0, 5)}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs text-text-primary whitespace-nowrap">
                                <span className="font-semibold text-primary">{itemsCount}</span>/{CHECKLIST_ITEMS.length}
                              </td>
                              <td className="px-3 py-3 text-xs whitespace-nowrap">
                                <Badge variant={getStatusBadgeVariant(c.status)} className="text-[10px] px-1.5 py-0.5">
                                  {c.status}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-xs text-text-secondary max-w-[120px] truncate" title={c.remarks}>
                                {c.remarks || <span className="text-text-tertiary italic">-</span>}
                              </td>
                              <td className="px-3 py-3 text-xs text-right whitespace-nowrap">
                                {c.status !== "Verified" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleStartEdit(c)}
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
  );
}
