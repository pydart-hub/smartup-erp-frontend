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
export interface BatchStudentResult {
  student: string;
  student_name: string;
  pct: number;
  total_score: number;
  total_max: number;
  rank: number;
  passed: boolean;
  failed_subjects: string[];
  grade: string;
  subject_scores: { course: string; score: number; max: number; pct: number; grade: string; passed: boolean }[];
}

export interface BatchAcademicSummary {
  student_group: string;
  program: string;
  assessment_group: string;
  subjects: SubjectAnalytics[];
  total_students: number;
  overall_pass_rate: number;
  overall_avg_pct: number;
  toppers: { student: string; student_name: string; pct: number; total_score: number; total_max: number; rank: number }[];
  weak_students: { student: string; student_name: string; pct: number; total_score: number; total_max: number; failed_subjects: string[] }[];
  all_students: BatchStudentResult[];
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
  metrics_from_date: string;
  metrics_to_date: string;
  non_scheduled_dates: string[];
  attendance_not_marked_dates: string[];
  total_working_days: number;
  scheduled_days: number;
  non_scheduled_days: number;
  attendance_marked_on_scheduled_days: number;
  attendance_not_marked_on_scheduled_days: number;
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
    metrics_from_date: string;
    metrics_to_date: string;
    public_holiday_days: number;
    total_working_days: number;
    total_students: number;
    avg_attendance_pct: number;
    avg_exam_pct: number;
    overall_pass_rate: number;
  };
}

export interface BranchActionNeeded {
  branch: string;
  branch_name: string;
  week_from_date: string;
  week_to_date: string;
  working_days_this_week: number;
  scheduled_days_this_week: number;
  not_scheduled_days_this_week: number;
  attendance_marked_on_scheduled_days_this_week: number;
  attendance_not_marked_on_scheduled_days_this_week: number;
  actions_needed_days: number;
  instructors_scheduled_this_week: number;
  action_items: string[];
}

export interface BranchActionsNeededResponse {
  branches: BranchActionNeeded[];
  overall: {
    week_from_date: string;
    week_to_date: string;
    public_holiday_days_this_week: number;
    working_days_this_week: number;
    total_branches: number;
    branches_with_actions: number;
    total_actions_needed_days: number;
  };
}

export interface BranchActionsNeededDetailResponse {
  branch: string;
  week_from_date: string;
  week_to_date: string;
  public_holiday_days_this_week: number;
  working_days_this_week: number;
  scheduled_days_this_week: number;
  not_scheduled_days_this_week: number;
  attendance_not_marked_on_scheduled_days_this_week: number;
  actions_needed_days: number;
  not_scheduled_dates: string[];
  attendance_not_marked_dates: string[];
  day_details: {
    date: string;
    scheduled: boolean;
    attendance_marked: boolean;
    status: "not_scheduled" | "attendance_not_marked" | "resolved";
  }[];
}

// ── Schedule & Event Analytics ──────────────────────────────────

export interface ScheduleEntry {
  name: string;
  course: string;
  instructor_name: string;
  date: string;
  from_time: string;
  to_time: string;
  topic: string | null;
  topic_covered: 0 | 1;
  conducted: boolean;
}

export interface ScheduleBatchSummary {
  student_group: string;
  total_scheduled: number;
  conducted: number;
  upcoming: number;
  topic_coverage_pct: number;
  instructors: { id: string; name: string }[];
  courses: string[];
  recent: ScheduleEntry[];
  upcoming_list: ScheduleEntry[];
}

export interface ScheduleClassSummary {
  program: string;
  total_scheduled: number;
  conducted: number;
  conducted_pct: number;
  upcoming: number;
  topic_coverage_pct: number;
  batches: ScheduleBatchSummary[];
}

export interface EventEntry {
  name: string;
  event_type: string;
  event_title: string;
  student_group: string | null;
  program: string | null;
  course: string | null;
  instructor_name: string | null;
  date: string;
  from_time: string;
  to_time: string;
  topic: string | null;
}

export interface ScheduleSummaryResponse {
  overall: {
    total_scheduled: number;
    total_conducted: number;
    conducted_pct: number;
    total_upcoming: number;
    topic_coverage_pct: number;
  };
  classes: ScheduleClassSummary[];
  events: {
    total: number;
    this_month: number;
    upcoming: number;
    by_type: { type: string; count: number }[];
    list: EventEntry[];
  };
}
