"use client";

import { MentorSummaryReport } from "@/components/mentors/MentorSummaryReport";
import { getDirectorMentorSummary } from "@/lib/api/director";

export default function DirectorMentorSummaryPage() {
  return <MentorSummaryReport title="Director Mentor Summary" fetchFn={getDirectorMentorSummary} />;
}
