"use client";

import { MentorSummaryReport } from "@/components/mentors/MentorSummaryReport";
import { getGMMentorSummary } from "@/lib/api/mentors";

export default function GMMentorSummaryPage() {
  return <MentorSummaryReport title="GM Mentor Summary" fetchFn={getGMMentorSummary} />;
}
