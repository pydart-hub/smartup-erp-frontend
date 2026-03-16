// ─────────────────────────────────────────────────────────────
// Student Branch Transfer types
// Maps to the custom Frappe DocType "Student Branch Transfer"
// ─────────────────────────────────────────────────────────────

export type TransferStatus = "Pending" | "Approved" | "Rejected" | "Completed" | "Failed";

export interface StudentBranchTransfer {
  name: string;                    // SBT-00001
  student: string;                 // Link → Student
  student_name?: string;
  program: string;                 // Link → Program
  academic_year: string;           // Link → Academic Year
  from_branch: string;             // Link → Company
  to_branch: string;               // Link → Company
  status: TransferStatus;

  // Financial
  old_fee_structure?: string;
  new_fee_structure?: string;
  old_total_amount?: number;
  new_total_amount?: number;
  amount_already_paid?: number;
  adjusted_amount?: number;
  new_payment_plan?: string;       // Basic | Intermediate | Advanced
  new_no_of_instalments?: string;  // 1 | 4 | 6 | 8

  // References
  old_sales_order?: string;
  new_sales_order?: string;
  old_program_enrollment?: string;
  new_program_enrollment?: string;
  requested_by?: string;
  approved_by?: string;
  request_date?: string;
  completion_date?: string;

  // Details
  reason?: string;
  rejection_reason?: string;
  transfer_log?: string;

  // Meta
  creation?: string;
  modified?: string;
  owner?: string;
}

/** Payload to create a transfer request */
export interface TransferRequestPayload {
  student: string;
  to_branch: string;
  reason?: string;
}

/** Payload to respond to a transfer request */
export interface TransferRespondPayload {
  transfer_id: string;
  action: "accept" | "reject";
  new_fee_structure?: string;
  new_payment_plan?: string;
  new_no_of_instalments?: string;
  rejection_reason?: string;
}
