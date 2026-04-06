"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
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
function useBranchComplaints(status: string, category: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (category) params.set("category", category);

  return useQuery<{ complaints: Complaint[]; stats: ComplaintStats }>({
    queryKey: ["branch-complaints", status, category],
    queryFn: async () => {
      const res = await fetch(`/api/branch-manager/complaints?${params}`, { credentials: "include" });
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
            className="mt-4 border-t border-border-light pt-4 space-y-4"
          >
            {/* Description */}
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
                Complaint Description
              </p>
              <p className="text-sm text-text-primary whitespace-pre-wrap bg-app-bg rounded-[10px] p-3">
                {complaint.description}
              </p>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-text-tertiary">Filed:</span>{" "}
                <span className="text-text-primary">{formatDate(complaint.creation)}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Student:</span>{" "}
                <span className="text-text-primary">{complaint.student_name}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Guardian:</span>{" "}
                <span className="text-text-primary">{complaint.guardian_name || "—"}</span>
              </div>
            </div>

            {/* Action panel */}
            <div className="bg-app-bg rounded-[10px] p-4 space-y-3">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Update Complaint
              </p>

              {/* Status selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                  className="h-10 w-full sm:w-48 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Resolution notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Resolution Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add resolution details..."
                  rows={3}
                  maxLength={5000}
                  className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none"
                />
              </div>

              {/* Save */}
              {hasChanges && (
                <div className="flex justify-end">
                  <button
                    onClick={() => onUpdate(complaint.name, {
                      status: editStatus,
                      resolution_notes: editNotes,
                    })}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[10px] text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            {/* Existing resolution info */}
            {complaint.resolved_by && (
              <div className="text-xs text-text-tertiary">
                Resolved by {complaint.resolved_by}
                {complaint.resolved_date && ` on ${formatDate(complaint.resolved_date)}`}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function BranchManagerComplaintsPage() {
  const { defaultCompany } = useAuth();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useBranchComplaints(filterStatus, filterCategory);
  const complaints = data?.complaints ?? [];
  const stats = data?.stats ?? { open: 0, in_review: 0, resolved: 0, closed: 0, total: 0 };

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateComplaintPayload }) => {
      const res = await fetch(`/api/branch-manager/complaints/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["branch-complaints"] });
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
          Review and resolve parent complaints — {defaultCompany}
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

      {/* Category Filter */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-text-tertiary" />
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
              {(filterCategory || filterStatus) && (
                <button
                  onClick={() => { setFilterCategory(""); setFilterStatus(""); }}
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
                {filterStatus || filterCategory
                  ? "Try adjusting your filters"
                  : "No complaints have been submitted yet"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
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
        </div>
      )}
    </motion.div>
  );
}
