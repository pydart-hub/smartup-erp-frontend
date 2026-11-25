/**
 * Crash Course 2026–27 TypeScript Definitions
 * Aligned with "SmartUp Crash Course 2026–27 Sales Team Brief"
 */

export type CrashCourseClass = "9th" | "10th" | "Plus One" | "Plus Two";

export type CrashCourseLanguage = "English" | "Hindi" | "Malayalam";

export interface CrashCourseBranchConfig {
  label: string;
  company: string;
  abbr: string;
  minTarget: number;
  recTarget: number;
}

export const CRASH_COURSE_BRANCHES: CrashCourseBranchConfig[] = [
  {
    label: "Palluruthy",
    company: "Smart Up Palluruthy",
    abbr: "PAL",
    minTarget: 80,
    recTarget: 150,
  },
  {
    label: "Thoppumpady",
    company: "Smart Up Thopumpadi",
    abbr: "THP",
    minTarget: 80,
    recTarget: 150,
  },
  {
    label: "Fort Kochi",
    company: "Smart Up Fortkochi",
    abbr: "FTK",
    minTarget: 80,
    recTarget: 150,
  },
];

export interface CrashCoursePricingInput {
  classLevel: CrashCourseClass;
  selectedLanguages?: CrashCourseLanguage[];
}

export interface CrashCourseFeeBreakdown {
  classLevel: CrashCourseClass;
  courseFee: number;
  examMaterialsFee: number;
  mandatoryTotal: number;
  selectedLanguages: CrashCourseLanguage[];
  languageFee: number;
  languageSavings: number;
  grandTotal: number;
}

export interface CrashCourseBatchSummary {
  name: string;               // Student Group name e.g. CC-2026-10-THP-B1
  student_group_name: string;
  batch_name?: string;
  class_level: CrashCourseClass;
  branch: string;
  enrolled_count: number;
  min_capacity: number;       // 20
  max_capacity: number;       // 50
  is_full: boolean;
  is_near_capacity: boolean;  // >= 45
  seats_remaining: number;
}

export interface CrashCourseBranchProgress {
  branch: string;
  company: string;
  enrolledCount: number;
  minTarget: number;          // 80
  recTarget: number;          // 150
  minTargetAchievedPercent: number;
  recTargetAchievedPercent: number;
  totalRevenuePotential: number;
  totalCollected: number;
  totalOutstanding: number;
  batches: CrashCourseBatchSummary[];
}

export interface CrashCourseAdmissionPayload {
  // Step 1: Student
  first_name: string;
  last_name?: string;
  date_of_birth: string;
  gender: "Male" | "Female" | "Other";
  student_email_id?: string;
  student_mobile_number?: string;
  aadhaar_number?: string;
  custom_school_name?: string;
  custom_place?: string;

  // Step 2: Guardian
  guardian_name: string;
  guardian_email: string;
  guardian_mobile: string;
  guardian_relation: string;
  guardian_password?: string;

  // Step 3: Academic & Batch
  branch: string;             // Frappe Company name
  class_level: CrashCourseClass;
  academic_year: string;      // default: "2026-2027"
  batch_name?: string;        // Student Group name
  selected_languages: CrashCourseLanguage[];

  // Step 4: Payment
  payment_mode?: "Cash" | "Bank Transfer" | "UPI" | "Razorpay";
  paid_amount?: number;
  payment_reference?: string;
}

export interface CrashCourseAdmissionResult {
  success: boolean;
  student_id: string;
  student_name: string;
  srr_id?: string;
  program_enrollment: string;
  student_group?: string;
  sales_order?: string;
  invoice?: string;
  invoice_url?: string;
  payment_entry?: string;
  breakdown: CrashCourseFeeBreakdown;
  whatsapp_sent?: boolean;
}

export interface CrashCourseBranchCardData {
  branchName: string; // e.g. "Smart Up Palluruthy"
  shortName: string;  // e.g. "Palluruthy"
  abbr: string;       // e.g. "PAL"
  activeStudents: number;
  targetStudents: number;
  totalBilled: number;
  totalCollected: number;
  totalDue: number;
  classCounts: Record<CrashCourseClass, number>;
  batches: Array<{
    name: string;
    class_level: CrashCourseClass;
    enrolled_count: number;
    max_capacity: number;
  }>;
}

export interface CrashCourseDashboardStats {
  totalStudents: number;
  activeStudents: number;
  discontinuedStudents: number;
  totalInvoiced: number;
  totalCollected: number;
  totalDue: number;
  classCounts: Record<CrashCourseClass, number>;
  sundayLanguagesCount: number;
  branches: CrashCourseBranchCardData[];
}

export interface CrashCourseStudentRosterItem {
  id: string; // Student docname
  srrId: string;
  name: string;
  phone?: string;
  email?: string;
  branch: string;
  classLevel: CrashCourseClass;
  program: string;
  batchName?: string;
  invoiceName?: string;
  amountBilled: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: "Paid" | "Partly Paid" | "Unpaid";
  enrollmentDate?: string;
}

export interface CrashCourseBranchDetailData {
  branchName: string;
  shortName: string;
  abbr: string;
  totalStudents: number;
  activeStudents: number;
  totalBilled: number;
  totalCollected: number;
  totalDue: number;
  activeBatchesCount: number;
  programsCount: number;
  programs: Array<{
    program: string;
    classLevel: CrashCourseClass;
    studentCount: number;
    totalBilled: number;
    totalCollected: number;
    totalDue: number;
    batches: Array<{
      name: string;
      student_group_name: string;
      enrolled_count: number;
      max_capacity: number;
    }>;
  }>;
  students: CrashCourseStudentRosterItem[];
}

