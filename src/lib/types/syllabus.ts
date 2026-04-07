// ─────────────────────────────────────────────────────
// Syllabus Configuration (BM-managed template)
//   Defines parts for a course at a branch per academic year
// ─────────────────────────────────────────────────────

export interface SyllabusConfigPart {
  name?: string;
  part_number: number;
  part_title: string;
}

export interface SyllabusConfig {
  name: string; // SYLCFG-.YYYY.-.#####
  course: string;
  program: string;
  company: string;
  academic_year: string;
  total_parts: number;
  configured_by?: string;
  parts: SyllabusConfigPart[];
  creation?: string;
  modified?: string;
}

export interface SyllabusConfigFormData {
  course: string;
  program: string;
  company: string;
  academic_year: string;
  total_parts: number;
  parts: { part_number: number; part_title: string }[];
}

// ─────────────────────────────────────────────────────
// Syllabus Part Completion (per-instructor tracking)
//   One record per part per instructor per course
// ─────────────────────────────────────────────────────

export type SyllabusPartStatus =
  | "Not Started"
  | "Pending Approval"
  | "Completed"
  | "Rejected";

export interface SyllabusPartCompletion {
  name: string; // SPC-.YYYY.-.#####
  syllabus_config: string;
  instructor: string;
  instructor_name?: string;
  course: string;
  program: string;
  student_group?: string;
  academic_year: string;
  company: string;
  part_number: number;
  part_title: string;
  total_parts: number;
  status: SyllabusPartStatus;
  completed_date?: string;
  approved_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
}

// ─────────────────────────────────────────────────────
// Aggregated views for UI
// ─────────────────────────────────────────────────────

/** One card on the instructor's syllabus overview */
export interface InstructorCourseProgress {
  course: string;
  program: string;
  student_group?: string;
  total_parts: number;
  completed: number;
  pending_approval: number;
  rejected: number;
  not_started: number;
  configured: boolean; // whether syllabus config exists
}

/** One row in the BM progress overview */
export interface BranchCourseProgress {
  course: string;
  instructor: string;
  instructor_name?: string;
  program: string;
  student_group?: string;
  total_parts: number;
  completed: number;
  pending_approval: number;
  rejected: number;
  not_started: number;
}
