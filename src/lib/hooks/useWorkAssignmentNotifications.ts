"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAssignmentsForRecipient } from "@/lib/api/workAssignment";
import { InstructorAssignmentView } from "@/lib/types/workAssignment";
/**
 * Polls pending Work Assignments for the current Instructor.
 * Returns the count of assignments where the instructor has not yet submitted.
 * Refreshes every 2 minutes to stay in sync with class reminder cadence.
 */
export function useWorkAssignmentNotifications() {
  const { isInstructor, instructorName } = useAuth();

  const { data: pendingAssignments = [] } = useQuery({
    queryKey: ["wa-notifications", instructorName],
    queryFn: () => getAssignmentsForRecipient({ recipientType: "Instructor", recipientKey: instructorName! }),
    enabled: !!isInstructor && !!instructorName,
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
    select: (data) => data.filter((a: InstructorAssignmentView) => a.my_assignment.submission_status === "Pending"),
  });

  return {
    pendingAssignments,
    waPendingCount: pendingAssignments.length,
  };
}
