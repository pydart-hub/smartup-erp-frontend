"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareWarning,
  Plus,
  Clock,
  CheckCircle2,
  Eye,
  X,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParentData } from "@/app/dashboard/parent/page";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  CreateComplaintPayload,
} from "@/lib/types/complaint";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CATEGORIES: ComplaintCategory[] = [
  "Academic", "Fee Related", "Facility", "Staff", "Transport", "Food", "Other",
];
const PRIORITIES: ComplaintPriority[] = ["Low", "Medium", "High"];

function statusBadgeVariant(status: ComplaintStatus) {
  switch (status) {
    case "Open": return "warning" as const;
    case "In Review": return "info" as const;
    case "Resolved": return "success" as const;
    case "Closed": return "outline" as const;
  }
}

function priorityBadgeVariant(priority: ComplaintPriority) {
  switch (priority) {
    case "High": return "error" as const;
    case "Medium": return "warning" as const;
    case "Low": return "outline" as const;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Hook: fetch complaints ──────────────────────────────────────
function useParentComplaints() {
  return useQuery<{ complaints: Complaint[] }>({
    queryKey: ["parent-complaints"],
    queryFn: async () => {
      const res = await fetch("/api/parent/complaints", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ── Component ───────────────────────────────────────────────────
export default function ParentComplaintsPage() {
  const { user } = useAuth();
  const { data: parentData } = useParentData(user?.email);
  const { data, isLoading } = useParentComplaints();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("Academic");
  const [priority, setPriority] = useState<ComplaintPriority>("Medium");
  const [description, setDescription] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [formError, setFormError] = useState("");

  const children = parentData?.children ?? [];
  const complaints = data?.complaints ?? [];

  const submitMutation = useMutation({
    mutationFn: async (payload: CreateComplaintPayload) => {
      const res = await fetch("/api/parent/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit complaint");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-complaints"] });
      setShowForm(false);
      resetForm();
    },
  });

  function resetForm() {
    setSubject("");
    setCategory("Academic");
    setPriority("Medium");
    setDescription("");
    setSelectedStudent("");
    setFormError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!selectedStudent) { setFormError("Please select a child"); return; }
    if (!subject.trim()) { setFormError("Subject is required"); return; }
    if (!description.trim()) { setFormError("Description is required"); return; }
    if (subject.trim().length > 140) { setFormError("Subject must be 140 characters or less"); return; }

    submitMutation.mutate({
      subject: subject.trim(),
      category,
      priority,
      description: description.trim(),
      student: selectedStudent,
    });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-primary" />
            My Complaints
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Submit and track complaints or suggestions
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Complaint"}
        </button>
      </motion.div>

      {/* New Complaint Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit a Complaint</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Child selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Child *</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                  >
                    <option value="">Select a child</option>
                    {children.map((child) => (
                      <option key={child.name} value={child.name}>
                        {child.student_name} ({child.custom_branch_abbr || child.custom_branch})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Subject *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your complaint"
                    maxLength={140}
                    className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary"
                  />
                  <span className="text-xs text-text-tertiary text-right">{subject.length}/140</span>
                </div>

                {/* Category + Priority row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                      className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-secondary">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    maxLength={5000}
                    className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                </div>

                {/* Error */}
                {(formError || submitMutation.error) && (
                  <div className="flex items-center gap-2 text-sm text-error">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {formError || (submitMutation.error as Error)?.message}
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitMutation.isPending ? "Submitting..." : "Submit Complaint"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Complaints List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-[14px] bg-surface border border-border-light animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquareWarning className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No complaints yet</p>
              <p className="text-sm text-text-tertiary mt-1">
                Click &quot;New Complaint&quot; to submit one
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {complaints.map((complaint) => {
            const isExpanded = expandedId === complaint.name;
            return (
              <motion.div key={complaint.name} variants={item}>
                <Card>
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : complaint.name)}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-text-primary truncate">
                            {complaint.subject}
                          </h3>
                          <Badge variant={statusBadgeVariant(complaint.status)}>
                            {complaint.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary flex-wrap">
                          <span>{complaint.student_name}</span>
                          {complaint.branch_abbr && (
                            <Badge variant="outline">{complaint.branch_abbr}</Badge>
                          )}
                          <Badge variant={priorityBadgeVariant(complaint.priority)}>
                            {complaint.priority}
                          </Badge>
                          <span className="text-text-tertiary">
                            {complaint.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-tertiary">
                          {formatDate(complaint.creation)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-text-tertiary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-tertiary" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 space-y-3"
                      >
                        <div>
                          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">Description</p>
                          <p className="text-sm text-text-primary whitespace-pre-wrap">
                            {complaint.description}
                          </p>
                        </div>

                        {/* Resolution (if resolved/closed) */}
                        {complaint.resolution_notes && (
                          <div className="border-t border-border-light pt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <p className="text-xs font-medium text-success uppercase tracking-wider">Resolution</p>
                            </div>
                            <p className="text-sm text-text-primary whitespace-pre-wrap">
                              {complaint.resolution_notes}
                            </p>
                            {complaint.resolved_by && (
                              <p className="text-xs text-text-tertiary mt-1">
                                Resolved by {complaint.resolved_by}
                                {complaint.resolved_date && ` on ${formatDate(complaint.resolved_date)}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Status indicator for non-resolved */}
                        {!complaint.resolution_notes && complaint.status === "Open" && (
                          <div className="flex items-center gap-2 text-sm text-text-tertiary">
                            <Clock className="h-4 w-4" />
                            Waiting for review
                          </div>
                        )}
                        {!complaint.resolution_notes && complaint.status === "In Review" && (
                          <div className="flex items-center gap-2 text-sm text-info">
                            <Eye className="h-4 w-4" />
                            Under review by management
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
