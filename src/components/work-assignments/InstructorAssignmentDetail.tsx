"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAssignmentsForRecipient, isDeadlinePassed } from "@/lib/api/workAssignment";
import type { InstructorAssignmentView } from "@/lib/types/workAssignment";
import { DeadlineIndicator } from "./DeadlineIndicator";
import { StatusBadge } from "./StatusBadge";
import { UploadGoogleDriveModal } from "./UploadGoogleDriveModal";
import { useAuth } from "@/lib/hooks/useAuth";

export interface InstructorAssignmentDetailProps {
  assignmentId: string;
  recipientType?: "Instructor" | "Branch Manager";
  basePath?: string;
}

export const InstructorAssignmentDetail: React.FC<InstructorAssignmentDetailProps> = ({
  assignmentId,
  recipientType = "Instructor",
  basePath = "/dashboard/instructor/my-assignments",
}) => {
  const { instructorName, user } = useAuth();
  const [assignment, setAssignment] = useState<InstructorAssignmentView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    const recipientKey = recipientType === "Branch Manager" ? user?.email || "" : instructorName || "";
    if (!recipientKey) return;
    try {
      setIsLoading(true);
      const rows = await getAssignmentsForRecipient({ recipientType, recipientKey });
      const found = rows.find((row) => row.name === assignmentId) || null;
      setAssignment(found);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load assignment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // load depends on assignmentId and instructorName only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, instructorName, recipientType, user?.email]);

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

  const finalStatus = assignment.my_assignment.approval_status !== "Pending"
    ? assignment.my_assignment.approval_status
    : assignment.my_assignment.submission_status;

  const deadlineClosed = isDeadlinePassed(assignment.deadline);
  const canResubmit = assignment.my_assignment.can_resubmit;
  const canOpenUpload =
    !deadlineClosed &&
    (
      assignment.my_assignment.submission_status === "Pending" ||
      (assignment.my_assignment.approval_status === "Rejected" && canResubmit)
    );

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
          </div>

          {assignment.description ? <p className="text-sm text-text-secondary">{assignment.description}</p> : null}

          {assignment.created_by_name ? (
            <div className="space-y-1 text-sm text-text-secondary">
              <p>Assigned by: {assignment.created_by_name}</p>
              {assignment.created_on ? (
                <p className="text-xs text-text-tertiary">
                  Assigned on {new Date(assignment.created_on).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}

          <DeadlineIndicator deadline={assignment.deadline} submissionStatus={finalStatus} />

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={assignment.my_assignment.submission_status} />
            <StatusBadge status={assignment.my_assignment.approval_status} type="approval" />
          </div>

          {assignment.my_assignment.google_drive_link ? (
            <a
              className="text-sm text-primary hover:underline"
              href={assignment.my_assignment.google_drive_link}
              target="_blank"
              rel="noreferrer"
            >
              Open submitted link
            </a>
          ) : (
            <p className="text-sm text-text-tertiary">No link submitted yet.</p>
          )}

          {assignment.my_assignment.submitted_on ? (
            <p className="text-xs text-text-tertiary">Submitted on {new Date(assignment.my_assignment.submitted_on).toLocaleString()}</p>
          ) : null}

          {assignment.my_assignment.approval_remarks ? (
            <p className="text-sm text-green-700">Manager remarks: {assignment.my_assignment.approval_remarks}</p>
          ) : null}

          {assignment.my_assignment.rejection_reason ? (
            <p className="text-sm text-red-700">Rejection reason: {assignment.my_assignment.rejection_reason}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={basePath}>
          <Button variant="outline">Back to list</Button>
        </Link>

        {canOpenUpload ? (
          <Button onClick={() => setShowUpload(true)}>
            {assignment.my_assignment.submission_status === "Submitted" ? "Update Submission" : "Upload Submission Link"}
          </Button>
        ) : null}
      </div>

      {deadlineClosed && assignment.my_assignment.submission_status === "Pending" ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-700">Submission is blocked because the deadline has passed.</p>
          </CardContent>
        </Card>
      ) : null}

      <UploadGoogleDriveModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        workAssignmentId={assignment.name}
        deadline={assignment.deadline}
        onSuccess={async () => {
          setShowUpload(false);
          await load();
        }}
      />
    </div>
  );
};
