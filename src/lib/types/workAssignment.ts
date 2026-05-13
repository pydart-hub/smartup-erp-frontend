// Work Assignment Types
// File: src/lib/types/workAssignment.ts

export interface WorkAssignmentDetail {
  idx: number;
  instructor: string;
  instructor_name: string;
  employee: string;
  department: string;
  submission_status: "Pending" | "Submitted";
  google_drive_link: string | null;
  submitted_on: string | null;
  submitted_by: string | null;
  approval_status: "Pending" | "Approved" | "Rejected";
  approved_by: string | null;
  approval_date: string | null;
  approval_remarks: string | null;
  rejection_reason: string | null;
  can_resubmit: boolean;
}

export interface WorkAssignment {
  name: string; // e.g., "WA-001"
  title: string;
  description: string;
  topic: string; // Just a label, optional
  created_by: string;
  created_on: string;
  for_branch: string;
  academic_year: string;
  deadline: string; // Date (same for all instructors)
  enabled: boolean;
  docstatus: number;
  workflow_state: "Draft" | "Active" | "Completed";
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  total_assigned: number;
  submitted_count: number;
  approved_count: number;
  instructions_file: string | null;
  reference_link: string | null;
  amended_from?: string | null;
  assignments: WorkAssignmentDetail[];
}

export interface WorkAssignmentCreatePayload {
  naming_series?: string;
  title: string;
  description: string;
  topic?: string;
  for_branch: string;
  academic_year?: string;
  deadline: string;
  assignments: {
    instructor: string;
  }[];
  instructions_file?: string;
  reference_link?: string;
}

export interface InstructorAssignmentView {
  name: string;
  title: string;
  description: string;
  topic: string;
  deadline: string;
  for_branch: string;
  my_assignment: {
    idx: number;
    submission_status: "Pending" | "Submitted";
    google_drive_link: string | null;
    submitted_on: string | null;
    approval_status: "Pending" | "Approved" | "Rejected";
    approval_remarks: string | null;
    rejection_reason: string | null;
    can_resubmit: boolean;
  };
}

export interface SubmitWorkPayload {
  work_assignment_id: string;
  instructor_id: string;
  google_drive_link: string;
}

export interface ApproveSubmissionPayload {
  work_assignment_id: string;
  assignment_row_idx: number;
  approval_remarks?: string;
}

export interface RejectSubmissionPayload {
  work_assignment_id: string;
  assignment_row_idx: number;
  rejection_reason: string;
  can_resubmit?: boolean;
}

export interface SubmissionResponse {
  status: "success" | "error";
  message: string;
  submission_status?: string;
  submitted_on?: string;
  approval_status?: string;
  approval_date?: string;
  can_resubmit?: boolean;
}

export interface WorkAssignmentStatusCounts {
  total: number;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  /** Rows that are submitted and NOT yet reviewed (approval_status === "Pending") */
  pending_review: number;
}

export interface GMAssignmentView extends WorkAssignment {
  status_details: WorkAssignmentStatusCounts;
  submissions: {
    idx: number;
    instructor: string;
    instructor_name: string;
    submission_status: string;
    approval_status: string;
    google_drive_link: string | null;
    submitted_on: string | null;
    approval_remarks: string | null;
    rejection_reason: string | null;
  }[];
}
