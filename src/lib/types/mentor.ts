export interface MentorProfile {
  name: string;
  mentor_name: string;
  employee: string;
  user_id: string;
  branch: string;
  status: "Active" | "Inactive";
  max_student_limit: number;
  current_student_count?: number;
  remarks?: string;
  creation?: string;
  modified?: string;
}

export interface MentorStudentAssignment {
  name: string;
  student: string;
  student_name: string;
  mentor_profile: string;
  mentor_user: string;
  mentor_employee?: string;
  branch: string;
  assigned_by: string;
  assigned_on?: string;
  status: "Active" | "Reassigned" | "Inactive";
  notes?: string;
  creation?: string;
  modified?: string;
}

export interface MentorFeedback {
  name: string;
  student: string;
  student_name: string;
  mentor_profile: string;
  mentor_user: string;
  mentor_name?: string;
  branch: string;
  contact_person?: string;
  contact_number?: string;
  call_datetime: string;
  call_status: string;
  discussion_category: string;
  academic_notes?: string;
  fee_notes?: string;
  contact_notes?: string;
  overall_feedback?: string;
  next_followup_date?: string;
  priority?: string;
  action_required?: 0 | 1;
  visible_to_management?: 0 | 1;
  creation?: string;
  student_type?: string;
  program?: string;
  custom_plan?: string;
  attendance_pct?: number | null;
  average_score?: number | null;
}

export interface MentorStudentSummary {
  assignment: MentorStudentAssignment;
  student: {
    id: string;
    name: string;
    branch: string;
    mobile?: string;
    email?: string;
    parent_name?: string;
    parent_mobile?: string;
    address?: string;
    joining_date?: string;
    student_type?: string;
  };
  academic: {
    program?: string;
    academic_year?: string;
    batch?: string;
    program_enrollment?: string;
    average_score?: number | null;
    attendance_pct?: number | null;
  };
  fees: {
    custom_plan?: string;
    fee_structure?: string;
    total_invoiced: number;
    outstanding: number;
    invoice_count: number;
  };
  latest_feedback?: MentorFeedback | null;
}

export interface MentorStudentDetail extends MentorStudentSummary {
  guardians: Array<{
    guardian?: string;
    guardian_name?: string;
    relation?: string;
    mobile_number?: string;
    email_address?: string;
  }>;
  leave_applications?: Array<{
    name: string;
    from_date?: string;
    to_date?: string;
    total_leave_days: number;
    reason?: string;
    status?: string;
  }>;
  invoices: Array<{
    name: string;
    due_date?: string;
    posting_date?: string;
    grand_total: number;
    outstanding_amount: number;
    status?: string;
  }>;
  feedback: MentorFeedback[];
  exams?: Array<{
    name: string;
    course: string;
    assessment_plan: string;
    total_score: number;
    maximum_score: number;
    grade: string;
    assessment_group: string;
    schedule_date?: string;
    assessment_name?: string;
  }>;
  attendance?: Array<{
    name: string;
    status: string;
    date: string;
    student_group?: string;
  }>;
}

export interface SystemMentorSummary {
  totalMentors: number;
  totalAssignedStudents: number;
  averageStudentsPerMentor: number;
  pendingFollowUps: number;
  studentsWithoutMentor: number;
  studentsWithoutRecentLog: number;
  branchWiseSummary: Array<{
    branch: string;
    mentorCount: number;
    assignedCount: number;
    averageLoad: number;
  }>;
  mentorLoadComparison: Array<{
    mentorName: string;
    branch: string;
    assignedStudents: number;
    capacity: number;
    pendingFollowUps: number;
    feedbackCount: number;
  }>;
}

export const MENTOR_CALL_STATUSES = [
  "Answered",
  "No Answer",
  "Busy",
  "Switched Off",
  "Call Back Requested",
] as const;

export const MENTOR_DISCUSSION_CATEGORIES = [
  "Academic",
  "Fees",
  "Attendance",
  "Behaviour",
  "General",
  "Other",
] as const;

export const MENTOR_FEEDBACK_PRIORITIES = ["Low", "Medium", "High"] as const;
