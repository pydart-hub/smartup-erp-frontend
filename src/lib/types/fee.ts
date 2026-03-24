export interface FeeCategory {
  name: string;
  description?: string;
}

/** Child table row in FeeStructure.components and Fees.components */
export interface FeeComponent {
  fees_category: string;    // Fee Category name
  description?: string;
  amount: number;
  item?: string;            // link → Item
  discount?: number;        // percentage
  total?: number;           // computed after discount
}

/**
 * Fee Structure  — template per program/academic_year.
 * Named e.g. FST-10th Grade-2025-2026
 */
export interface FeeStructure {
  name: string;             // e.g. "SU ERV-8th State-Basic-4"
  program: string;          // link → Program (required)
  academic_year: string;    // link → Academic Year (required)
  academic_term?: string;
  student_category?: string;
  components: FeeComponent[];
  total_amount: number;
  receivable_account: string;  // required
  company?: string;
  cost_center?: string;
  docstatus?: 0 | 1 | 2;

  // Custom fields
  custom_plan?: string;                // "Basic" | "Intermediate" | "Advanced"
  custom_no_of_instalments?: string;   // "1" | "4" | "6" | "8"
  custom_branch_abbr?: string;         // e.g. "SU ERV"
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

// ── Fee Config (parsed from XLSX pricing data) ──

/** Single pricing entry from fee_structure_parsed.json */
export interface FeeConfigEntry {
  branch: string;        // e.g. "Vennala", "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"
  plan: string;          // "Basic" | "Intermediate" | "Advanced"
  class: string;         // e.g. "8 State", "9 Cbse", "Plus One", "Plus Two"
  annual_fee: number;
  early_bird: number;
  otp: number;           // One-Time Payment
  quarterly_total: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  inst6_total: number;
  inst6_per: number;     // per-instalment for instalments 1-5
  inst6_last: number;    // last instalment (different due to rounding)
  inst8_total: number;
  inst8_per: number;     // per-instalment for instalments 1-7
  inst8_last: number;    // last instalment (different due to rounding)
}

/** A single instalment in the payment schedule */
export interface InstalmentEntry {
  index: number;         // 1-based instalment number
  label: string;         // e.g. "Q1", "Instalment 3", "Full Payment"
  amount: number;
  dueDate: string;       // ISO date string, e.g. "2026-04-15"
}

/** Payment option summary shown in the admission UI */
export interface PaymentOptionSummary {
  instalments: number;   // 1, 4, 6, or 8
  label: string;         // "One-Time Payment", "Quarterly", etc.
  total: number;         // total amount for this option
  schedule: InstalmentEntry[];
  savings?: number;      // savings vs annual_fee (if applicable)
  referralDiscount?: number; // 5% discount amount (only for referred admissions)
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
