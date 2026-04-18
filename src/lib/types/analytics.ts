// ─────────────────────────────────────────────────────────────────────────────
// Academic Performance Analytics Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Attendance Analytics ──

/** Per-batch attendance summary for a date range */
export interface BatchAttendanceSummary {
  student_group: string;
  program: string;
  total_students: number;
  total_working_days: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  avg_attendance_pct: number;
  chronic_absentees: number; // students with <75% attendance
}

/** Monthly attendance data point */
export interface MonthlyAttendancePoint {
  month: string; // "2026-04"
  present: number;
  absent: number;
  late: number;
  total: number;
  pct: number;
}

/** Student-level attendance trend */
export interface StudentAttendanceTrend {
  student: string;
  student_name: string;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_days: number;
  overall_pct: number;
  monthly_data: MonthlyAttendancePoint[];
}

/** Students with critically low attendance */
export interface ChronicAbsentee {
  student: string;
  student_name: string;
  student_group: string;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  pct: number;
}

// ── Exam / Academic Analytics ──

/** Subject-level analytics for a batch */
export interface SubjectAnalytics {
  course: string;
  total_students: number;
  avg_score: number;
  max_score: number;
  min_score: number;
  maximum_possible: number;
  avg_pct: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  grade_distribution: Record<string, number>; // { "A+": 5, "A": 8, ... }
}

/** Batch-level academic summary for an exam group */
export interface BatchAcademicSummary {
  student_group: string;
  assessment_group: string;
  subjects: SubjectAnalytics[];
  total_students: number;
  overall_pass_rate: number;
  overall_avg_pct: number;
  toppers: { student: string; student_name: string; pct: number; rank: number }[];
  weak_students: { student: string; student_name: string; pct: number; failed_subjects: string[] }[];
}

/** Comprehensive student academic profile */
export interface StudentAcademicProfile {
  student: string;
  student_name: string;
  student_group: string;
  program: string;
  attendance: {
    total_days: number;
    present: number;
    absent: number;
    late: number;
    pct: number;
  };
  exams: {
    assessment_group: string;
    subjects: {
      course: string;
      total_score: number;
      maximum_score: number;
      pct: number;
      grade: string;
      passed: boolean;
    }[];
    avg_pct: number;
    overall_grade: string;
    rank: number;
    total_in_batch: number;
  }[];
  trend: "improving" | "declining" | "stable";
  strengths: string[];
  weaknesses: string[];
}

// ── Instructor Performance ──

export interface InstructorBatchMetrics {
  student_group: string;
  course: string;
  program: string;
  classes_conducted: number;
  topics_completed: number;
  topics_total: number;
  avg_score_pct: number;
  pass_rate: number;
  student_attendance_pct: number;
}

export interface InstructorPerformanceMetrics {
  instructor: string;
  instructor_name: string;
  classes_scheduled: number;
  classes_conducted: number; // classes where attendance was marked
  topics_assigned: number;
  topics_covered: number;
  topic_completion_pct: number;
  batches: InstructorBatchMetrics[];
}

// ── Director Branch Overview ──

export interface BranchAcademicHealth {
  branch: string;
  branch_name: string;
  total_students: number;
  total_batches: number;
  avg_attendance_pct: number;
  avg_exam_score_pct: number;
  pass_rate: number;
  topic_coverage_pct: number;
  total_exams_conducted: number;
  chronic_absentees: number;
  total_instructors: number;
  avg_classes_conducted_pct: number;
  avg_instructor_topic_pct: number;
}

// ── API Response Wrappers ──

export interface AttendanceAnalyticsResponse {
  batches: BatchAttendanceSummary[];
  chronic_absentees: ChronicAbsentee[];
  daily_trend: { date: string; present: number; absent: number; late: number; total: number }[];
  overall: {
    total_students: number;
    avg_attendance_pct: number;
    total_working_days: number;
  };
}

export interface ExamAnalyticsResponse {
  batches: BatchAcademicSummary[];
  overall: {
    total_exams: number;
    total_students_assessed: number;
    avg_score_pct: number;
    overall_pass_rate: number;
  };
}

export interface InstructorAnalyticsResponse {
  instructors: InstructorPerformanceMetrics[];
  overall: {
    total_instructors: number;
    avg_topic_completion_pct: number;
    avg_classes_conducted_pct: number;
  };
}

export interface BranchAcademicsResponse {
  branches: BranchAcademicHealth[];
  overall: {
    total_students: number;
    avg_attendance_pct: number;
    avg_exam_pct: number;
    overall_pass_rate: number;
  };
}
