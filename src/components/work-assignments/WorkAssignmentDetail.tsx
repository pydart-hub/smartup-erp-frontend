"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { approveSubmission, deleteWorkAssignment, getWorkAssignment, rejectSubmission } from "@/lib/api/workAssignment";
import type { WorkAssignment } from "@/lib/types/workAssignment";
import { StatusBadge } from "./StatusBadge";

export interface WorkAssignmentDetailProps {
  assignmentId: string;
}

export const WorkAssignmentDetail: React.FC<WorkAssignmentDetailProps> = ({ assignmentId }) => {
  const router = useRouter();
  const [assignment, setAssignment] = useState<WorkAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [remarksByIdx, setRemarksByIdx] = useState<Record<number, string>>({});
  const [rejectByIdx, setRejectByIdx] = useState<Record<number, string>>({});
  const [resubmitByIdx, setResubmitByIdx] = useState<Record<number, boolean>>({});

  const load = async () => {
    try {
      setIsLoading(true);
      const doc = await getWorkAssignment(assignmentId);
      setAssignment(doc);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load assignment details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assignmentId]);

  const handleApprove = async (idx: number) => {
    try {
      setIsUpdating(idx);
      const result = await approveSubmission({
        work_assignment_id: assignmentId,
        assignment_row_idx: idx,
        approval_remarks: remarksByIdx[idx] || undefined,
      });
      if (result.status === "success") {
        toast.success("Submission approved");
        await load();
      } else {
        toast.error(result.message || "Approval failed");
      }
    } catch (error: any) {
      toast.error(error?.message || "Approval failed");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteWorkAssignment(assignmentId);
      toast.success("Work assignment deleted");
      router.push("/dashboard/general-manager/work-assignments");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete assignment");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReject = async (idx: number) => {
    const reason = (rejectByIdx[idx] || "").trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      setIsUpdating(idx);
      const result = await rejectSubmission({
        work_assignment_id: assignmentId,
        assignment_row_idx: idx,
        rejection_reason: reason,
        can_resubmit: resubmitByIdx[idx] !== false,
      });
      if (result.status === "success") {
        toast.success("Submission rejected");
        await load();
      } else {
        toast.error(result.message || "Rejection failed");
      }
    } catch (error: any) {
      toast.error(error?.message || "Rejection failed");
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-text-secondary">Assignment not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{assignment.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.topic ? <Badge variant="info">{assignment.topic}</Badge> : null}
            <Badge variant="outline">{assignment.for_branch}</Badge>
            <Badge variant="warning">Deadline: {new Date(assignment.deadline).toLocaleDateString()}</Badge>
            <StatusBadge status={assignment.workflow_state as any} />
          </div>
          {assignment.description ? <p className="text-sm text-text-secondary">{assignment.description}</p> : null}
          <div className="text-xs text-text-tertiary">
            Total: {assignment.total_assigned} | Submitted: {assignment.submitted_count} | Approved: {assignment.approved_count}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructor Submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(assignment.assignments || []).map((row) => {
            const canReview = row.submission_status === "Submitted" && row.approval_status === "Pending";
            const rowBusy = isUpdating === row.idx;

            return (
              <div key={row.idx} className="rounded-[12px] border border-border-light p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{row.instructor_name || row.instructor}</p>
                    <p className="text-xs text-text-tertiary">{row.instructor}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.submission_status as any} />
                    <StatusBadge status={row.approval_status as any} type="approval" />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {row.submitted_on ? <p className="text-text-secondary">Submitted on: {new Date(row.submitted_on).toLocaleString()}</p> : null}
                  {row.google_drive_link ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      href={row.google_drive_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Google Drive Link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="text-text-tertiary">No submission link yet</p>
                  )}
                  {row.approval_remarks ? <p className="text-green-700">Remarks: {row.approval_remarks}</p> : null}
                  {row.rejection_reason ? <p className="text-red-700">Rejection: {row.rejection_reason}</p> : null}
                </div>

                {canReview ? (
                  <div className="mt-4 space-y-3 border-t border-border-light pt-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-secondary" htmlFor={`approve-${row.idx}`}>
                        Approval Remarks (optional)
                      </label>
                      <textarea
                        id={`approve-${row.idx}`}
                        className="min-h-16 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm"
                        value={remarksByIdx[row.idx] || ""}
                        onChange={(e) => setRemarksByIdx((prev) => ({ ...prev, [row.idx]: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-secondary" htmlFor={`reject-${row.idx}`}>
                        Rejection Reason
                      </label>
                      <textarea
                        id={`reject-${row.idx}`}
                        className="min-h-16 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm"
                        value={rejectByIdx[row.idx] || ""}
                        onChange={(e) => setRejectByIdx((prev) => ({ ...prev, [row.idx]: e.target.value }))}
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={resubmitByIdx[row.idx] !== false}
                        onChange={(e) => setResubmitByIdx((prev) => ({ ...prev, [row.idx]: e.target.checked }))}
                      />
                      Allow resubmission after rejection
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={() => handleApprove(row.idx)} loading={rowBusy}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button variant="danger" onClick={() => handleReject(row.idx)} loading={rowBusy}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Link href="/dashboard/general-manager/work-assignments">
          <Button variant="outline">Back to list</Button>
        </Link>
        <Link href={`/dashboard/general-manager/work-assignments/${assignmentId}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Edit Assignment
          </Button>
        </Link>
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Work Assignment"
        message={`Are you sure you want to delete "${assignment?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
      />
    </div>
  );
};
