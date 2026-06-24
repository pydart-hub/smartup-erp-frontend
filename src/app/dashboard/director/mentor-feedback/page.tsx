"use client";

import { MentorFeedbackReport } from "@/components/mentors/MentorFeedbackReport";

export default function DirectorMentorFeedbackPage() {
  return (
    <MentorFeedbackReport
      title="Director Mentor Feedback"
      endpoint="/api/director/mentor-feedback"
      assignmentsEndpoint="/api/director/mentor-assignments"
      studentDetailHref={(studentId) => `/dashboard/director/mentor-feedback/students/${encodeURIComponent(studentId)}`}
    />
  );
}
