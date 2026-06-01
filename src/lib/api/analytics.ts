/**
 * analytics.ts
 * Client API layer for academic performance analytics.
 * All heavy aggregation happens server-side in /api/analytics/* routes.
 */

import type {
  AttendanceAnalyticsResponse,
  ExamAnalyticsResponse,
  StudentAcademicProfile,
  TopicCoverageDetailResponse,
  InstructorAnalyticsResponse,
  BranchAcademicsResponse,
  BranchActionsNeededResponse,
  BranchActionsNeededDetailResponse,
  ScheduleSummaryResponse,
  InstructorLeaderboardResponse,
  ClassOverviewResponse,
  ClassBranchesResponse,
  ClassBranchSubjectsResponse,
  SubjectBranchesResponse,
} from "@/lib/types/analytics";

// ── Attendance Analytics ──

export async function getAttendanceAnalytics(params: {
  branch: string;
  from_date: string;
  to_date: string;
  student_group?: string;
}): Promise<AttendanceAnalyticsResponse> {
  const query = new URLSearchParams({
    branch: params.branch,
    from_date: params.from_date,
    to_date: params.to_date,
  });
  if (params.student_group) query.set("student_group", params.student_group);

  const res = await fetch(`/api/analytics/attendance-summary?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch attendance analytics");
  return res.json();
}

// ── Exam Analytics ──

export async function getExamAnalytics(params: {
  branch: string;
  assessment_group?: string;
  student_group?: string;
}): Promise<ExamAnalyticsResponse> {
  const query = new URLSearchParams({ branch: params.branch });
  if (params.assessment_group) query.set("assessment_group", params.assessment_group);
  if (params.student_group) query.set("student_group", params.student_group);

  const res = await fetch(`/api/analytics/exam-summary?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch exam analytics");
  return res.json();
}

// ── Student Performance ──

export async function getStudentPerformance(params: {
  student: string;
  student_group: string;
}): Promise<StudentAcademicProfile> {
  const query = new URLSearchParams(params);
  const res = await fetch(`/api/analytics/student-performance?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch student performance");
  const json = await res.json();
  return json.data;
}

// ── Instructor Performance ──

export async function getInstructorAnalytics(params: {
  branch: string;
}): Promise<InstructorAnalyticsResponse> {
  const query = new URLSearchParams({ branch: params.branch });
  const res = await fetch(`/api/analytics/instructor-performance?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch instructor analytics");
  return res.json();
}

// ── Director Branch Academics ──

export async function getBranchAcademics(): Promise<BranchAcademicsResponse> {
  const res = await fetch("/api/analytics/branch-academics", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch branch academics");
  return res.json();
}

export async function getBranchActionsNeeded(weekStart?: string): Promise<BranchActionsNeededResponse> {
  const params = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : "";
  const res = await fetch(`/api/analytics/branch-actions-needed${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch branch actions-needed analytics");
  return res.json();
}

export async function getBranchActionsNeededDetail(branch: string): Promise<BranchActionsNeededDetailResponse> {
  const query = new URLSearchParams({ branch });
  const res = await fetch(`/api/analytics/branch-actions-needed-detail?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch branch actions-needed detail");
  return res.json();
}

// ── Schedule & Event Analytics ──

export async function getScheduleAnalytics(params: {
  branch: string;
}): Promise<ScheduleSummaryResponse> {
  const query = new URLSearchParams({ branch: params.branch });
  const res = await fetch(`/api/analytics/schedule-summary?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch schedule analytics");
  return res.json();
}

// ── Instructor Leaderboard ──

export async function getInstructorLeaderboard(params: {
  branch: string;
  period?: string;
}): Promise<InstructorLeaderboardResponse> {
  const query = new URLSearchParams({ branch: params.branch });
  if (params.period) query.set("period", params.period);
  const res = await fetch(`/api/analytics/instructor-leaderboard?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch instructor leaderboard");
  return res.json();
}

// ── Topic Coverage Drill-Down ──

export async function getTopicCoverageDetail(branch: string): Promise<TopicCoverageDetailResponse> {
  const query = new URLSearchParams({ branch });
  const res = await fetch(`/api/analytics/topic-coverage?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch topic coverage detail");
  return res.json();
}

// ── Class-First Hierarchy ──

export async function getClassOverview(): Promise<ClassOverviewResponse> {
  const res = await fetch("/api/analytics/class-overview", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch class overview");
  return res.json();
}

export async function getClassBranches(program: string): Promise<ClassBranchesResponse> {
  const query = new URLSearchParams({ program });
  const res = await fetch(`/api/analytics/class-branches?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch class branches");
  return res.json();
}

export async function getClassBranchSubjects(
  program: string,
  branch: string,
): Promise<ClassBranchSubjectsResponse> {
  const query = new URLSearchParams({ program, branch });
  const res = await fetch(`/api/analytics/class-branch-subjects?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch class branch subjects");
  return res.json();
}

export async function getSubjectBranches(
  program: string,
  subject: string,
): Promise<SubjectBranchesResponse> {
  const query = new URLSearchParams({ program, subject });
  const res = await fetch(`/api/analytics/subject-branches?${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch subject branches");
  return res.json();
}
