/**
 * assessment.ts
 * Client API layer for the Exam & Mark Entry system.
 *
 * Exam creation + mark entry routes go through /api/exams/* (server-side admin auth).
 * Master data (criteria, grading scale, groups) goes through the proxy.
 */

import apiClient from "@/lib/api/client";
import type {
  AssessmentCriteria,
  AssessmentGroup,
  AssessmentPlan,
  GradingScale,
} from "@/lib/types/assessment";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Master Data (via proxy)
// ─────────────────────────────────────────────────────────────────────────────

/** List all assessment criteria */
export async function getAssessmentCriteria(): Promise<AssessmentCriteria[]> {
  const { data } = await apiClient.get<FrappeListResponse<AssessmentCriteria>>(
    "/resource/Assessment Criteria",
    { params: { fields: JSON.stringify(["name", "assessment_criteria", "assessment_criteria_group"]), limit_page_length: 50 } },
  );
  return data.data;
}

/** List grading scales */
export async function getGradingScales(): Promise<GradingScale[]> {
  const { data } = await apiClient.get<FrappeListResponse<GradingScale>>(
    "/resource/Grading Scale",
    { params: { fields: JSON.stringify(["name", "grading_scale_name"]), filters: JSON.stringify([["docstatus", "=", 1]]), limit_page_length: 50 } },
  );
  return data.data;
}

/** Get a single grading scale with intervals */
export async function getGradingScale(name: string): Promise<GradingScale> {
  const { data } = await apiClient.get<FrappeSingleResponse<GradingScale>>(
    `/resource/Grading Scale/${encodeURIComponent(name)}`,
  );
  return data.data;
}

/** List assessment groups (exam types) — exclude root group */
export async function getAssessmentGroups(): Promise<AssessmentGroup[]> {
  const { data } = await apiClient.get<FrappeListResponse<AssessmentGroup>>(
    "/resource/Assessment Group",
    {
      params: {
        fields: JSON.stringify(["name", "assessment_group_name", "parent_assessment_group", "is_group"]),
        filters: JSON.stringify([["name", "!=", "All Assessment Groups"]]),
        limit_page_length: 50,
      },
    },
  );
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment Plans — Exams (via proxy for listing, /api/exams/* for create)
// ─────────────────────────────────────────────────────────────────────────────

/** List assessment plans with filters */
export async function getAssessmentPlans(params?: {
  custom_branch?: string;
  program?: string;
  course?: string;
  assessment_group?: string;
  student_group?: string;
  schedule_date_gte?: string;
  schedule_date_lte?: string;
}): Promise<AssessmentPlan[]> {
  const filters: string[][] = [];
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.course) filters.push(["course", "=", params.course]);
  if (params?.assessment_group) filters.push(["assessment_group", "=", params.assessment_group]);
  if (params?.student_group) filters.push(["student_group", "=", params.student_group]);
  if (params?.schedule_date_gte) filters.push(["schedule_date", ">=", params.schedule_date_gte]);
  if (params?.schedule_date_lte) filters.push(["schedule_date", "<=", params.schedule_date_lte]);

  const { data } = await apiClient.get<FrappeListResponse<AssessmentPlan>>(
    "/resource/Assessment Plan",
    {
      params: {
        fields: JSON.stringify([
          "name", "student_group", "assessment_name", "assessment_group",
          "grading_scale", "program", "course", "academic_year",
          "schedule_date", "from_time", "to_time", "examiner", "examiner_name",
          "maximum_assessment_score", "custom_branch", "docstatus",
        ]),
        filters: JSON.stringify(filters),
        order_by: "schedule_date desc",
        limit_page_length: 200,
      },
    },
  );
  return data.data;
}

/** Get a single assessment plan with child table */
export async function getAssessmentPlan(name: string): Promise<AssessmentPlan> {
  const { data } = await apiClient.get<FrappeSingleResponse<AssessmentPlan>>(
    `/resource/Assessment Plan/${encodeURIComponent(name)}`,
  );
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-Side API Routes (use /api/exams/* with admin auth)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch existing Assessment Plans for a batch + date (to show occupied exam slots) */
export async function getExamsForBatchDate(
  studentGroup: string,
  date: string,
): Promise<{ name: string; assessment_name: string; from_time: string; to_time: string }[]> {
  const filters = JSON.stringify([
    ["student_group", "=", studentGroup],
    ["schedule_date", "=", date],
    ["docstatus", "!=", 2],
  ]);
  const fields = JSON.stringify(["name", "assessment_name", "from_time", "to_time"]);
  const { data } = await apiClient.get(
    `/resource/Assessment Plan?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=20&order_by=from_time asc`,
  );
  return data?.data ?? [];
}

/** Create a new exam (Assessment Plan) */
export async function createExam(data: {
  student_group: string;
  course: string;
  assessment_group: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  maximum_assessment_score: number;
  examiner?: string;
  room?: string;
  custom_topic?: string;
}): Promise<AssessmentPlan> {
  const res = await fetch("/api/exams/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to create exam");
  }
  const json = await res.json();
  return json.data;
}

/** Bulk save marks for an exam */
export async function saveMarks(data: {
  assessment_plan: string;
  marks: { student: string; score: number }[];
}): Promise<{ created: number; errors: string[] }> {
  const res = await fetch("/api/exams/marks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to save marks");
  }
  return res.json();
}

/** Get results for an exam plan */
export async function getExamResults(assessmentPlan: string): Promise<{
  data: {
    student: string;
    student_name: string;
    total_score: number;
    maximum_score: number;
    grade: string;
    name: string;
  }[];
}> {
  const query = new URLSearchParams({ assessment_plan: assessmentPlan });
  const res = await fetch(`/api/exams/results?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch exam results");
  return res.json();
}

/** Get batch-wide results with ranks for an exam group */
export async function getBatchResults(params: {
  student_group: string;
  assessment_group: string;
}): Promise<{
  data: {
    student: string;
    student_name: string;
    subjects: { course: string; score: number; maximum_score: number; percentage: number; grade: string; passed: boolean }[];
    total_score: number;
    total_maximum: number;
    overall_percentage: number;
    overall_grade: string;
    rank: number;
    passed: boolean;
  }[];
  summary: {
    total_students: number;
    pass_count: number;
    pass_rate: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
  };
}> {
  const query = new URLSearchParams(params);
  const res = await fetch(`/api/exams/batch-results?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch batch results");
  return res.json();
}

/** Get report card for a single student */
export async function getReportCard(params: {
  student: string;
  assessment_group: string;
  student_group: string;
}): Promise<{
  data: {
    student: string;
    student_name: string;
    program: string;
    student_group: string;
    assessment_group: string;
    academic_year: string;
    branch: string;
    subjects: { course: string; score: number; maximum_score: number; percentage: number; grade: string; passed: boolean }[];
    total_score: number;
    total_maximum: number;
    overall_percentage: number;
    overall_grade: string;
    rank: number;
    total_students: number;
    passed: boolean;
  };
}> {
  const query = new URLSearchParams(params);
  const res = await fetch(`/api/exams/report-card?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch report card");
  return res.json();
}
