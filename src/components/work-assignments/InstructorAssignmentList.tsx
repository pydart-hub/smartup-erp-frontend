// Instructor Assignment List Component
// File: src/components/work-assignments/InstructorAssignmentList.tsx

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Loader2 } from "lucide-react";
import { getAssignmentsForRecipient } from "@/lib/api/workAssignment";
import { InstructorAssignmentView } from "@/lib/types/workAssignment";
import { DeadlineIndicator } from "./DeadlineIndicator";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export interface InstructorAssignmentListProps {
  onStatsChange?: (active: number, submitted: number, approved: number) => void;
  recipientType?: "Instructor" | "Branch Manager";
  basePath?: string;
}

export const InstructorAssignmentList: React.FC<InstructorAssignmentListProps> = ({
  onStatsChange,
  recipientType = "Instructor",
  basePath = "/dashboard/instructor/my-assignments",
}) => {
  const { instructorName, user } = useAuth();
  const [assignments, setAssignments] = useState<InstructorAssignmentView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      const recipientKey = recipientType === "Branch Manager" ? user?.email || "" : instructorName || "";
      if (!recipientKey) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const data = await getAssignmentsForRecipient({ recipientType, recipientKey });
        setAssignments(data);
        setError(null);
        if (onStatsChange) {
          const active = data.filter(
            (a) => a.my_assignment.submission_status === "Pending" && a.my_assignment.approval_status === "Pending"
          ).length;
          const submitted = data.filter(
            (a) => a.my_assignment.submission_status === "Submitted" && a.my_assignment.approval_status === "Pending"
          ).length;
          const approved = data.filter(
            (a) => a.my_assignment.approval_status === "Approved"
          ).length;
          onStatsChange(active, submitted, approved);
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
  }, [instructorName, recipientType, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No work assignments yet.</p>
          <p className="text-sm text-gray-400 mt-2">Check back later for new assignments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.name} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left: Title & Info */}
              <div className="md:col-span-6 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>
                )}
                {assignment.created_by_name && (
                  <p className="text-xs text-gray-500">
                    Assigned by {assignment.created_by_name}
                  </p>
                )}
                {assignment.topic && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      {assignment.topic}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Center: Deadline */}
              <div className="md:col-span-3">
                <DeadlineIndicator deadline={assignment.deadline} submissionStatus={assignment.my_assignment.approval_status} />
              </div>

              {/* Right: Status & Action */}
              <div className="md:col-span-3 flex flex-col items-end justify-between">
                <div className="flex flex-col items-end gap-2 w-full">
                  <StatusBadge
                    status={
                      assignment.my_assignment.approval_status !== "Pending"
                        ? assignment.my_assignment.approval_status
                        : assignment.my_assignment.submission_status
                    }
                  />
                  {assignment.my_assignment.submission_status === "Submitted" && (
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(assignment.my_assignment.submitted_on!).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <Link href={`${basePath}/${assignment.name}`}>
                  <Button size="sm" variant="outline" className="mt-2 w-full">
                    View Details
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
