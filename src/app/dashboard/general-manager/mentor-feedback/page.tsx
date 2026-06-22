"use client";

import { MentorFeedbackReport } from "@/components/mentors/MentorFeedbackReport";

export default function GeneralManagerMentorFeedbackPage() {
  return <MentorFeedbackReport title="General Manager Mentor Feedback" endpoint="/api/general-manager/mentor-feedback" />;
}
