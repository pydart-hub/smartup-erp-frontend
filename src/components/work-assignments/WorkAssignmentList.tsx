// Work Assignment List Component (GM Dashboard)
// File: src/components/work-assignments/WorkAssignmentList.tsx

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, ArrowRight, Loader2, Search, X, ChevronDown, ChevronRight, AlertTriangle, Trash2 } from "lucide-react";
import { deleteWorkAssignment, getGMWorkAssignments } from "@/lib/api/workAssignment";
import { GMAssignmentView } from "@/lib/types/workAssignment";
import { toast } from "sonner";

const workflowColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Active: "bg-blue-100 text-blue-700",
  Submitted: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
};

const isOverdue = (deadline: string, fullyApproved: boolean): boolean => {
  if (!deadline || fullyApproved) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline.replace(" ", "T")) < today;
};

export interface WorkAssignmentListProps {
  branch?: string;
  onRefresh?: () => void;
  onStatsChange?: (active: number, pendingReview: number, completed: number, overdue: number) => void;
  basePath?: string;
}

export const WorkAssignmentList: React.FC<WorkAssignmentListProps> = ({
  branch,
  onStatsChange,
  basePath = "/dashboard/general-manager/work-assignments",
}) => {
  const [assignments, setAssignments] = useState<GMAssignmentView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterInstructor, setFilterInstructor] = useState("all");
  const [expandedInstructors, setExpandedInstructors] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await getGMWorkAssignments(branch);
        setAssignments(data);
        setError(null);
        if (onStatsChange) {
          const active = data.filter((a) => a.status === "Active").length;
          const pendingReview = data.reduce(
            (sum, a) => sum + (a.status_details.pending_review ?? 0),
            0
          );
          const completed = data.filter(
            (a) => (a.status_details.total ?? 0) > 0 && a.status_details.approved === a.status_details.total
          ).length;
          const overdue = data.filter((a) => {
            const total = a.status_details.total ?? 0;
            const approved = a.status_details.approved ?? 0;
            return isOverdue(a.deadline, total > 0 && approved === total);
          }).length;
          onStatsChange(active, pendingReview, completed, overdue);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load assignments";
        setError(msg);
        toast.error("Failed to load assignments");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  const branchOptions = useMemo(() => {
    const set = new Set(assignments.map((a) => a.for_branch).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [assignments]);

  const instructorOptions = useMemo(() => {
    const set = new Set(
      assignments
        .flatMap((a) => (a.submissions || []).map((s) => s.instructor_name || s.instructor))
        .filter(Boolean)
    );
    return Array.from(set).sort() as string[];
  }, [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (filterBranch !== "all" && a.for_branch !== filterBranch) return false;
      if (filterStatus !== "all") {
        if (filterStatus === "Active" && a.status !== "Active") return false;
        if (filterStatus === "Draft" && a.status !== "Draft") return false;
        if (filterStatus === "pending_review") {
          if (!(a.status_details.pending_review > 0)) return false;
        }
        if (filterStatus === "rejected") {
          if (!((a.status_details.rejected ?? 0) > 0)) return false;
        }
        if (filterStatus === "completed") {
          const total = a.status_details.total ?? 0;
          if (!(total > 0 && a.status_details.approved === total)) return false;
        }
      }
      if (filterInstructor !== "all") {
        const hasInstructor = (a.submissions || []).some(
          (s) => (s.instructor_name || s.instructor) === filterInstructor
        );
        if (!hasInstructor) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          a.title.toLowerCase().includes(q) ||
          (a.for_branch ?? "").toLowerCase().includes(q) ||
          (a.topic ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [assignments, filterBranch, filterStatus, filterInstructor, searchQuery]);

  const hasActiveFilters =
    filterBranch !== "all" || filterStatus !== "all" || filterInstructor !== "all" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setFilterBranch("all");
    setFilterStatus("all");
    setFilterInstructor("all");
    setSearchQuery("");
  };

  const groupedByInstructor = useMemo(() => {
    const map = new Map<string, GMAssignmentView[]>();
    for (const a of filtered) {
      const instructors = (a.submissions || [])
        .map((s) => s.instructor_name || s.instructor)
        .filter(Boolean);
      const unique = instructors.length > 0 ? Array.from(new Set(instructors)) : ["Unassigned"];
      for (const instructor of unique) {
        if (!map.has(instructor)) map.set(instructor, []);
        map.get(instructor)!.push(a);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggleInstructor = (name: string) => {
    setExpandedInstructors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleDelete = async (id: string, title: string) => {
    setConfirmTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    try {
      setDeletingId(id);
      await deleteWorkAssignment(id);
      toast.success("Assignment deleted");
      setAssignments((prev) => prev.filter((a) => a.name !== id));
      setConfirmTarget(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete assignment";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[10px] border border-red-200 bg-red-50 p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">All Work Assignments</h2>
        <Link href={`${basePath}/create`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Create New
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, branch…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-[8px] border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="h-9 rounded-[8px] border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Branches</option>
          {branchOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-[8px] border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="pending_review">Pending Review</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Fully Approved</option>
          <option value="overdue">Overdue</option>
        </select>

        {instructorOptions.length > 0 && (
          <select
            value={filterInstructor}
            onChange={(e) => setFilterInstructor(e.target.value)}
            className="h-9 rounded-[8px] border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Instructors</option>
            {instructorOptions.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-[8px] text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {groupedByInstructor.length} instructor{groupedByInstructor.length !== 1 ? "s" : ""} · {filtered.length} assignment{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-[12px] border border-gray-100 bg-white py-12 text-center">
          {assignments.length === 0 ? (
            <>
              <p className="text-gray-500 text-sm">No work assignments yet.</p>
              <Link href={`${basePath}/create`}>
                <Button className="mt-4" size="sm">Create First Assignment</Button>
              </Link>
            </>
          ) : (
            <p className="text-gray-500 text-sm">No assignments match the current filters.</p>
          )}
        </div>
      )}

      {/* Instructor grouped list */}
      <div className="space-y-3">
        {groupedByInstructor.map(([instructor, group]) => {
          const isExpanded = expandedInstructors.has(instructor);

          // Status counts for this instructor
          const stateCounts = group.reduce<Record<string, number>>((acc, a) => {
            const s = a.workflow_state || "Draft";
            acc[s] = (acc[s] ?? 0) + 1;
            return acc;
          }, {});
          const pendingReviewCount = group.reduce(
            (s, a) => s + (a.status_details.pending_review ?? 0),
            0
          );
          const totalApproved = group.reduce((s, a) => s + (a.status_details.approved ?? 0), 0);
          const totalAll = group.reduce((s, a) => s + (a.status_details.total ?? 0), 0);
          const overdueInGroup = group.filter((a) => {
            const total = a.status_details.total ?? 0;
            const approved = a.status_details.approved ?? 0;
            return isOverdue(a.deadline, total > 0 && approved === total);
          }).length;

          return (
            <div key={instructor} className="rounded-[12px] border border-gray-200 bg-white overflow-hidden shadow-sm">
              {/* Instructor header row */}
              <button
                onClick={() => toggleInstructor(instructor)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                {/* Chevron */}
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                }

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {instructor.charAt(0).toUpperCase()}
                </div>

                {/* Name + sub-info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{instructor}</p>
                  <p className="text-xs text-gray-500">
                    {group.length} assignment{group.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;
                    {totalApproved}/{totalAll} approved
                  </p>
                </div>

                {/* Status count pills */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {overdueInGroup > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      <AlertTriangle className="h-3 w-3" /> {overdueInGroup} Overdue
                    </span>
                  )}
                  {pendingReviewCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      ⏳ {pendingReviewCount} Pending Review
                    </span>
                  )}
                  {Object.entries(stateCounts).map(([state, count]) => (
                    <span
                      key={state}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${workflowColors[state] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {count} {state}
                    </span>
                  ))}
                </div>
              </button>

              {/* Expanded assignment rows */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {group.map((assignment) => {
                    const total = assignment.status_details.total ?? 0;
                    const approved = assignment.status_details.approved ?? 0;
                    const submitted = assignment.status_details.submitted ?? 0;
                    const rejected = assignment.status_details.rejected ?? 0;
                    const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
                    const needsReview = (assignment.status_details.pending_review ?? 0) > 0;
                    const overdueRow = isOverdue(assignment.deadline, approved > 0 && approved === total);

                    return (
                      <div
                        key={assignment.name}
                        className="pl-14 pr-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Assignment info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{assignment.title}</p>
                          <p className="text-xs text-gray-500">
                            {assignment.for_branch}
                            {assignment.topic && ` · ${assignment.topic}`}
                            {" · Due "}
                            {new Date(assignment.deadline).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-28 hidden sm:block flex-shrink-0">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{approved}/{total} approved</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Status pill + link */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {overdueRow && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Overdue
                            </span>
                          )}
                          {needsReview ? (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              Review
                            </span>
                          ) : rejected > 0 ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              {rejected} Rejected
                            </span>
                          ) : approved > 0 && approved === total ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              Approved
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${workflowColors[assignment.workflow_state] ?? "bg-gray-100 text-gray-600"}`}>
                              {assignment.workflow_state}
                            </span>
                          )}
                          <Link href={`${basePath}/${assignment.name}`}>
                            <button className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(assignment.name, assignment.title)}
                            disabled={deletingId === assignment.name}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-40"
                            title="Delete assignment"
                          >
                            {deletingId === assignment.name
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Custom delete confirmation dialog */}
    <ConfirmDialog
      open={confirmTarget !== null}
      title="Delete Work Assignment"
      message={`Are you sure you want to delete "${confirmTarget?.title}"? This action cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      loading={deletingId !== null}
      onConfirm={confirmDelete}
      onCancel={() => { if (!deletingId) setConfirmTarget(null); }}
    />
    </>
  );
};
