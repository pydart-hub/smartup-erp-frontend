// ─────────────────────────────────────────────────────────────────────────────
// Assessment / Exam Types
// ─────────────────────────────────────────────────────────────────────────────

/** Master assessment criteria (e.g. "Theory") */
export interface AssessmentCriteria {
  name: string;
  assessment_criteria: string;
  assessment_criteria_group?: string;
}

/** Grading scale interval — one row in the scale */
export interface GradingScaleInterval {
  grade_code: string;
  threshold: number; // percentage threshold (≥ this %)
  grade_description?: string;
}

/** Grading scale with interval child table */
export interface GradingScale {
  name: string;
  grading_scale_name: string;
  description?: string;
  intervals: GradingScaleInterval[];
  docstatus?: 0 | 1 | 2;
}

/** Exam type category (tree node) */
export interface AssessmentGroup {
  name: string;
  assessment_group_name: string;
  parent_assessment_group?: string;
  is_group: 0 | 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment Plan (the "Exam")
// ─────────────────────────────────────────────────────────────────────────────

/** Child table row on Assessment Plan */
export interface AssessmentPlanCriteria {
  assessment_criteria: string; // Link → Assessment Criteria
  maximum_score: number;
}

/** Assessment Plan — one exam for one course in one batch */
export interface AssessmentPlan {
  name: string;
  student_group: string;
  assessment_name?: string;
  assessment_group: string;
  grading_scale: string;
  program?: string;
  course: string;
  academic_year?: string;
  academic_term?: string;
  schedule_date: string;
  room?: string;
  examiner?: string;
  examiner_name?: string;
  from_time: string;
  to_time: string;
  supervisor?: string;
  supervisor_name?: string;
  maximum_assessment_score: number;
  assessment_criteria: AssessmentPlanCriteria[];
  custom_branch?: string;
  docstatus: 0 | 1 | 2;
  creation?: string;
  modified?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment Result (marks per student per exam)
// ─────────────────────────────────────────────────────────────────────────────

/** Child table row on Assessment Result */
export interface AssessmentResultDetail {
  assessment_criteria: string;
  maximum_score?: number;
  score: number;
  grade?: string;
}

/** Assessment Result — one student's marks for one exam */
export interface AssessmentResult {
  name: string;
  assessment_plan: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  student: string;
  student_name?: string;
  student_group?: string;
  assessment_group?: string;
  grading_scale?: string;
  details: AssessmentResultDetail[];
  maximum_score?: number;
  total_score?: number;
  grade?: string;
  comment?: string;
  custom_branch?: string;
  docstatus: 0 | 1 | 2;
  creation?: string;
  modified?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed types (frontend-only, for result display)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-subject result for a student */
export interface SubjectResult {
  course: string;
  score: number;
  maximum_score: number;
  percentage: number;
  grade: string;
  passed: boolean;
}

/** Aggregated result for one student across all subjects in an exam group */
export interface StudentExamResult {
  student: string;
  student_name: string;
  subjects: SubjectResult[];
  total_score: number;
  total_maximum: number;
  overall_percentage: number;
  overall_grade: string;
  rank: number;
  passed: boolean; // all subjects ≥ 33%
}

// ─────────────────────────────────────────────────────────────────────────────
// Form data for creating exams
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateExamFormData {
  student_group: string;
  course: string;
  assessment_group: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  maximum_assessment_score: number;
  examiner?: string;
  room?: string;
}

/** Mark entry for a single student */
export interface StudentMarkEntry {
  student: string;
  student_name?: string;
  score: number | null;
}
