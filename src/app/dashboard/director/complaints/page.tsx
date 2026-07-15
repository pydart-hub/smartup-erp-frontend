"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareWarning,
  Clock,
  CheckCircle2,
  Eye,
  Archive,
  ChevronDown,
  ChevronUp,
  Save,
  Filter,
  Edit3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAllBranches } from "@/lib/api/director";
import type {
  Complaint,
  ComplaintStatus,
  ComplaintStats,
  ComplaintCategory,
  UpdateComplaintPayload,
} from "@/lib/types/complaint";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const STATUS_OPTIONS: ComplaintStatus[] = ["Open", "In Review", "Resolved", "Closed"];
const CATEGORY_OPTIONS: ComplaintCategory[] = [
  "Academic", "Fee Related", "Facility", "Staff", "Transport", "Food", "Other",
];

function statusBadgeVariant(status: ComplaintStatus) {
  switch (status) {
    case "Open": return "warning" as const;
    case "In Review": return "info" as const;
    case "Resolved": return "success" as const;
    case "Closed": return "outline" as const;
  }
}

function statusIcon(status: ComplaintStatus) {
  switch (status) {
    case "Open": return <Clock className="h-4 w-4" />;
    case "In Review": return <Eye className="h-4 w-4" />;
    case "Resolved": return <CheckCircle2 className="h-4 w-4" />;
    case "Closed": return <Archive className="h-4 w-4" />;
  }
}

function priorityBadgeVariant(priority: string) {
  switch (priority) {
    case "High": return "error" as const;
    case "Medium": return "warning" as const;
    default: return "outline" as const;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

// ── Fetch complaints ────────────────────────────────────────────
function useDirectorComplaints(branch: string, status: string, category: string) {
  const params = new URLSearchParams();
  if (branch) params.set("branch", branch);
  if (status) params.set("status", status);
  if (category) params.set("category", category);

  return useQuery<{ complaints: Complaint[]; stats: ComplaintStats }>({
    queryKey: ["director-complaints", branch, status, category],
    queryFn: async () => {
      const res = await fetch(`/api/director/complaints?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, count, variant, active, onClick }: {
  label: string;
  count: number;
  variant: "warning" | "info" | "success" | "outline";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-3 rounded-[10px] border transition-all ${
        active
          ? "border-primary bg-primary-light shadow-sm"
          : "border-border-light bg-surface hover:border-border-input"
      }`}
    >
      <span className="text-2xl font-bold text-text-primary">{count}</span>
      <Badge variant={variant} className="mt-1">{label}</Badge>
    </button>
  );
}

// ── Complaint Row (expandable) ──────────────────────────────────
function ComplaintRow({
  complaint,
  isExpanded,
  onToggle,
  onUpdate,
  isUpdating,
}: {
  complaint: Complaint;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, data: UpdateComplaintPayload) => void;
  isUpdating: boolean;
}) {
  const [editStatus, setEditStatus] = useState(complaint.status);
  const [editNotes, setEditNotes] = useState(complaint.resolution_notes || "");
  const [showEditForm, setShowEditForm] = useState(false);
  const hasChanges = editStatus !== complaint.status || editNotes !== (complaint.resolution_notes || "");

  return (
    <Card>
      <div className="p-5">
        {/* Header row */}
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {statusIcon(complaint.status)}
              <h3 className="font-semibold text-text-primary">{complaint.subject}</h3>
              <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
              <Badge variant={priorityBadgeVariant(complaint.priority)}>{complaint.priority}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary flex-wrap">
              <span className="font-medium">{complaint.student_name}</span>
              {complaint.branch_abbr && (
                <Badge variant="outline">{complaint.branch_abbr}</Badge>
              )}
              <span className="text-text-tertiary">{complaint.category}</span>
              <span className="text-text-tertiary">by {complaint.guardian_name || complaint.guardian_email}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-tertiary">{formatTimeAgo(complaint.creation)}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            )}
          </div>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 border-t border-border-light pt-5"
          >
            {/* Side-by-side Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3): Core Details & Action Panel */}
              <div className="lg:col-span-2 space-y-5">
                {/* Description */}
                <div className="bg-app-bg/40 rounded-[12px] p-4 border border-border-light">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Complaint Description
                  </p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {complaint.description}
                  </p>
                </div>

                {/* Resolution Notes (Show premium display card if exists) */}
                {complaint.resolution_notes && (
                  <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-[12px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Resolution Notes
                      </p>
                    </div>
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                      {complaint.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Edit Form Toggle button for resolved/closed complaints */}
                {(complaint.status === "Resolved" || complaint.status === "Closed") && !showEditForm ? (
                  <div className="flex justify-start">
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] border border-primary/20 bg-primary/[0.02] text-xs font-semibold text-primary hover:bg-primary hover:text-white hover:border-primary active:scale-[0.98] transition-all duration-200 shadow-2xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Update Status / Edit Notes
                    </button>
                  </div>
                ) : null}

                {/* Action Panel (Form) */}
                {((complaint.status !== "Resolved" && complaint.status !== "Closed") || showEditForm) && (
                  <div className="bg-surface rounded-[12px] p-5 border border-border-input space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Update Complaint status
                      </p>
                      {showEditForm && (
                        <button
                          onClick={() => {
                            setShowEditForm(false);
                            setEditStatus(complaint.status);
                            setEditNotes(complaint.resolution_notes || "");
                          }}
                          className="text-xs text-text-tertiary hover:text-text-secondary transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Status Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-text-secondary">Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                          className="h-10 rounded-[8px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Resolution notes */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-secondary">Resolution Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add resolution details..."
                        rows={3}
                        maxLength={5000}
                        className="w-full rounded-[8px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>

                    {/* Save */}
                    {hasChanges && (
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            await onUpdate(complaint.name, {
                              status: editStatus,
                              resolution_notes: editNotes,
                            });
                            setShowEditForm(false);
                          }}
                          disabled={isUpdating}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[8px] text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          {isUpdating ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column (1/3): Meta Info & Activity Timeline */}
              <div className="space-y-6 bg-app-bg/20 rounded-[12px] p-4 border border-border-light">
                {/* Meta details */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                    Complaint Details
                  </p>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-border-light">
                      <span className="text-text-tertiary">Filed On</span>
                      <span className="font-medium text-text-primary">{formatDate(complaint.creation)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border-light">
                      <span className="text-text-tertiary">Student</span>
                      <span className="font-medium text-text-primary text-right">{complaint.student_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border-light">
                      <span className="text-text-tertiary">Branch</span>
                      <span className="font-medium text-text-primary">{complaint.branch_abbr || complaint.branch}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-text-tertiary">Guardian</span>
                      <span className="font-medium text-text-primary text-right">{complaint.guardian_name || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Activity Log / Timeline */}
                <div className="space-y-4 pt-4 border-t border-border-light">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                    Activity Timeline
                  </p>
                  
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                    className="relative pl-6 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border-light/70"
                  >
                    {/* 1. Filed State (Always present) */}
                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      className="relative"
                    >
                      <div className="absolute -left-[22px] top-[2px] flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-border-input text-text-secondary shadow-sm ring-4 ring-surface">
                        <Clock className="h-3 w-3" />
                      </div>
                      <div className="bg-surface/50 border border-border-light/40 rounded-[8px] p-2.5 hover:bg-surface/90 transition-all shadow-2xs">
                        <p className="text-xs font-semibold text-text-primary">Complaint Filed</p>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          Filed by {complaint.guardian_name || "Parent"} on {formatDate(complaint.creation)}
                        </p>
                      </div>
                    </motion.div>

                    {/* 2. Reviewed State */}
                    {complaint.reviewed_by && (
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        className="relative"
                      >
                        <div className="absolute -left-[22px] top-[2px] flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 shadow-sm ring-4 ring-surface">
                          <Eye className="h-3 w-3" />
                        </div>
                        <div className="bg-amber-500/[0.02] border border-amber-500/10 rounded-[8px] p-2.5 hover:bg-amber-500/[0.04] transition-all shadow-2xs">
                          <p className="text-xs font-semibold text-amber-800">Under Review</p>
                          <p className="text-[10px] text-amber-700/80 mt-0.5">
                            By {complaint.reviewed_by} on {formatDate(complaint.reviewed_date || "")}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* 3. Resolved State */}
                    {complaint.resolved_by && (
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        className="relative"
                      >
                        <div className="absolute -left-[22px] top-[2px] flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm ring-4 ring-surface">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-[8px] p-2.5 hover:bg-emerald-500/[0.04] transition-all shadow-2xs">
                          <p className="text-xs font-semibold text-emerald-850">Resolved</p>
                          <p className="text-[10px] text-emerald-800/80 mt-0.5">
                            By {complaint.resolved_by} on {formatDate(complaint.resolved_date || "")}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function DirectorComplaintsPage() {
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: branches } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => b.name !== "Smart Up"),
    [branches]
  );

  const { data, isLoading } = useDirectorComplaints(filterBranch, filterStatus, filterCategory);
  const complaints = data?.complaints ?? [];
  const stats = data?.stats ?? { open: 0, in_review: 0, resolved: 0, closed: 0, total: 0 };

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateComplaintPayload }) => {
      const res = await fetch(`/api/director/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update complaint");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["director-complaints"] });
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  function handleUpdate(id: string, payload: UpdateComplaintPayload) {
    setUpdatingId(id);
    updateMutation.mutate({ id, payload });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <MessageSquareWarning className="h-6 w-6 text-primary" />
          Complaints
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Review and resolve parent complaints across branches
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="All"
          count={stats.total}
          variant="outline"
          active={filterStatus === ""}
          onClick={() => setFilterStatus("")}
        />
        <StatCard
          label="Open"
          count={stats.open}
          variant="warning"
          active={filterStatus === "Open"}
          onClick={() => setFilterStatus(filterStatus === "Open" ? "" : "Open")}
        />
        <StatCard
          label="In Review"
          count={stats.in_review}
          variant="info"
          active={filterStatus === "In Review"}
          onClick={() => setFilterStatus(filterStatus === "In Review" ? "" : "In Review")}
        />
        <StatCard
          label="Resolved"
          count={stats.resolved}
          variant="success"
          active={filterStatus === "Resolved"}
          onClick={() => setFilterStatus(filterStatus === "Resolved" ? "" : "Resolved")}
        />
        <StatCard
          label="Closed"
          count={stats.closed}
          variant="outline"
          active={filterStatus === "Closed"}
          onClick={() => setFilterStatus(filterStatus === "Closed" ? "" : "Closed")}
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-text-tertiary" />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="h-9 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
              >
                <option value="">All Branches</option>
                {activeBranches.map((b) => (
                  <option key={b.name} value={b.name}>{b.abbr || b.name}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {(filterBranch || filterCategory || filterStatus) && (
                <button
                  onClick={() => { setFilterBranch(""); setFilterCategory(""); setFilterStatus(""); }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[14px] bg-surface border border-border-light animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquareWarning className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No complaints found</p>
              <p className="text-sm text-text-tertiary mt-1">
                {filterBranch || filterStatus || filterCategory
                  ? "Try adjusting your filters"
                  : "No complaints have been submitted yet"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {complaints.map((complaint) => (
            <motion.div key={complaint.name} variants={item}>
              <ComplaintRow
                complaint={complaint}
                isExpanded={expandedId === complaint.name}
                onToggle={() => setExpandedId(expandedId === complaint.name ? null : complaint.name)}
                onUpdate={handleUpdate}
                isUpdating={updatingId === complaint.name}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
