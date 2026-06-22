"use client";

import React from "react";
import { MentorFeedbackReport } from "@/components/mentors/MentorFeedbackReport";
import { useAuth } from "@/lib/hooks/useAuth";

export default function BranchManagerMentorsFeedbackPage() {
  const { defaultCompany } = useAuth();

  return (
    <MentorFeedbackReport
      title="Student Feedback"
      endpoint="/api/branch-manager/mentor-feedback"
      hideBranchLevel={true}
      lockedBranch={defaultCompany || undefined}
      backHref="/dashboard/branch-manager/mentors"
      studentDetailHref={(studentId) => `/dashboard/branch-manager/mentors/students/${encodeURIComponent(studentId)}`}
    />
  );
}
