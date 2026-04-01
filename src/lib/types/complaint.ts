export interface Complaint {
  name: string;             // CMPT-00001
  subject: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  description: string;
  student: string;          // Student ID
  student_name: string;
  branch: string;           // Company name
  branch_abbr: string;
  guardian: string;          // Guardian ID
  guardian_name: string;
  guardian_email: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_date?: string;
  creation: string;         // ISO datetime
  modified: string;
}

export type ComplaintCategory =
  | "Academic"
  | "Fee Related"
  | "Facility"
  | "Staff"
  | "Transport"
  | "Food"
  | "Other";

export type ComplaintPriority = "Low" | "Medium" | "High";

export type ComplaintStatus = "Open" | "In Review" | "Resolved" | "Closed";

export interface CreateComplaintPayload {
  subject: string;
  category: ComplaintCategory;
  description: string;
  student: string;
  priority?: ComplaintPriority;
}

export interface UpdateComplaintPayload {
  status?: ComplaintStatus;
  resolution_notes?: string;
}

export interface ComplaintStats {
  open: number;
  in_review: number;
  resolved: number;
  closed: number;
  total: number;
}
