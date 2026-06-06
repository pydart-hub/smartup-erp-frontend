export type LevelCode = "5" | "6" | "7" | "8" | "9" | "10";

export type LevelExamStatus =
  | "draft"
  | "published"
  | "upcoming"
  | "available"
  | "in_progress"
  | "completed"
  | "expired";

export type AssignmentStatus = "assigned" | "started" | "submitted";

export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted";

export interface LevelExamOption {
  id: string;
  option_key: string;
  option_text: string;
}

export interface LevelExamQuestion {
  id: string;
  stem: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  options: LevelExamOption[];
}

export interface LevelExamListItem {
  exam_id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  level_code: LevelCode;
  board_code?: "state" | "cbse";
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  available_from: string;
  available_until: string;
  status: LevelExamStatus;
  assignment_status: AssignmentStatus;
  attempt_id?: string;
  submitted_at?: string | null;
  percentage?: number | null;
}

export interface LevelExamDetail {
  exam_id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  level_code: LevelCode;
  board_code?: "state" | "cbse";
  instructions: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  available_from: string;
  available_until: string;
  status: LevelExamStatus;
  child: {
    student_id: string;
    student_name: string;
    level_code: LevelCode;
  };
  active_attempt?: {
    attempt_id: string;
    status: AttemptStatus;
    started_at: string;
    submitted_at?: string | null;
    answered_count: number;
    total_questions: number;
    remaining_seconds: number;
  } | null;
}

export interface LevelExamAttemptQuestion extends LevelExamQuestion {
  display_order: number;
  selected_option_id?: string | null;
}

export interface LevelExamAttemptPayload {
  attempt_id: string;
  exam_id: string;
  title: string;
  subject_name: string;
  level_code: LevelCode;
  board_code?: "state" | "cbse";
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  started_at: string;
  remaining_seconds: number;
  child: {
    student_id: string;
    student_name: string;
  };
  questions: LevelExamAttemptQuestion[];
}

export interface LevelExamResultQuestion {
  question_id: string;
  stem: string;
  marks: number;
  selected_option_id?: string | null;
  correct_option_id: string;
  is_correct: boolean;
  explanation?: string;
  options: Array<LevelExamOption & { is_correct?: boolean }>;
}

export interface LevelExamAiSummary {
  headline: string;
  overview: string;
  strengths: string[];
  focus_areas: string[];
  exam_summary: string[];
  best_topic?: string | null;
  priority_topic?: string | null;
  study_topics: Array<{
    topic: string;
    status: "strong" | "watch" | "revise";
    correct_count: number;
    wrong_count: number;
    total_questions: number;
    accuracy: number;
    recommendation: string;
    sample_questions: string[];
  }>;
  next_step: string;
}

export interface LevelExamResult {
  attempt_id: string;
  exam_id: string;
  title: string;
  subject_name: string;
  level_code: LevelCode;
  board_code?: "state" | "cbse";
  child: {
    student_id: string;
    student_name: string;
  };
  submitted_at: string;
  status: AttemptStatus;
  score_obtained: number;
  total_marks: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  ai_summary: LevelExamAiSummary;
  questions: LevelExamResultQuestion[];
}

export interface LevelExamAnswerPayload {
  question_id: string;
  selected_option_id: string;
}

export interface LevelExamSubject {
  code: string;
  name: string;
}

export interface LevelExamStudentSnapshot {
  frappe_student_id: string;
  student_name: string;
  branch: string;
  program: string;
  student_group: string;
  level_code: LevelCode;
  board_code?: "state" | "cbse";
  is_active: boolean;
}
