export interface FeeCategory {
  name: string;
  description?: string;
}

/** Child table row in FeeStructure.components and Fees.components */
export interface FeeComponent {
  fees_category: string;    // Fee Category name
  description?: string;
  amount: number;
}

/**
 * Fee Structure  — template per program/academic_year.
 * Named e.g. FST-10th Grade-2025-2026
 */
export interface FeeStructure {
  name: string;             // EDU-FST-YYYY-NNNNN
  program: string;          // link → Program (required)
  academic_year: string;    // link → Academic Year (required)
  academic_term?: string;
  student_category?: string;
  components: FeeComponent[];
  total_amount: number;
  receivable_account: string;  // required
  company?: string;
  cost_center?: string;
}

/**
 * Fees  — the actual per-student fee record.
 * Named e.g. EDU-FEE-2026-00001.
 * Requires program_enrollment (submitted) and fee_structure.
 */
export interface FeeRecord {
  name: string;                 // EDU-FEE-YYYY-NNNNN
  student: string;              // link → Student (required)
  student_name?: string;
  program_enrollment: string;   // link → Program Enrollment (required)
  program?: string;             // link → Program
  academic_year?: string;
  academic_term?: string;
  fee_structure: string;        // link → Fee Structure (required)
  fee_schedule?: string;        // link → Fee Schedule
  company: string;              // link → Company/Branch (required)
  posting_date: string;         // required
  due_date: string;             // required
  grand_total: number;
  outstanding_amount: number;
  components: FeeComponent[];
  contact_email?: string;
  student_batch?: string;
  receivable_account?: string;
  docstatus?: 0 | 1 | 2;
}

export interface FeeRecordFormData {
  student: string;
  program_enrollment: string;
  fee_structure: string;
  company: string;             // branch company
  posting_date: string;
  due_date: string;
  academic_year?: string;
  program?: string;
  fee_schedule?: string;
  contact_email?: string;
}

export interface PaymentEntry {
  name: string;
  payment_type: "Receive";
  party_type: "Student";
  party: string;
  party_name: string;
  paid_amount: number;
  mode_of_payment: string;
  posting_date: string;
  reference_no?: string;
  reference_date?: string;
  remarks?: string;
}

export interface PaymentFormData {
  student: string;
  fee_record: string;
  amount: number;
  mode_of_payment: string;
  reference_no?: string;
  remarks?: string;
}

export interface FeeReportSummary {
  total_fees: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
}

export interface StudentFeeReport {
  student: string;
  student_name: string;
  program: string;
  total_fees: number;
  paid: number;
  outstanding: number;
  installments: FeeRecord[];
}
