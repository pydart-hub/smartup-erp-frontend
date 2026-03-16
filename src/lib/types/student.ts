// ─────────────────────────────────────────────────────
// Student  (maps to Frappe Education `Student` doctype)
// ─────────────────────────────────────────────────────
export interface Student {
  name: string;                    // EDU-STU-YYYY-NNNNN
  student_name: string;            // computed full name
  first_name: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  student_email_id: string;        // required
  student_mobile_number?: string;
  custom_aadhaar?: string;          // Aadhaar number (12 digits)
  nationality?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  image?: string;
  joining_date?: string;
  enabled: 0 | 1;
  customer?: string;               // linked Customer
  customer_group?: string;

  // Custom fields (Smartup)
  custom_branch?: string;          // Company name e.g. "Smart Up Chullickal"
  custom_branch_abbr?: string;     // e.g. "SU CHL"
  custom_srr_id?: string;          // SRR ID
  custom_parent_name?: string;     // Parent name

  // Guardians child table
  guardians?: StudentGuardianLink[];

  // Discontinuation fields (custom)
  custom_discontinuation_date?: string;
  custom_discontinuation_reason?: string;
  custom_discontinuation_remarks?: string;

  // Timestamps
  creation?: string;
  modified?: string;
}

export interface StudentGuardianLink {
  guardian: string;                // link to Guardian doc
  guardian_name: string;
  relation?: string;               // Father / Mother / Sibling etc.
}

// ─────────────────────────────────────────────────────
// Guardian  (maps to Frappe Education `Guardian` doctype)
// ─────────────────────────────────────────────────────
export interface Guardian {
  name: string;
  guardian_name: string;           // required
  email_address?: string;
  mobile_number?: string;
  alternate_number?: string;
  date_of_birth?: string;
  education?: string;
  occupation?: string;
  designation?: string;
  work_address?: string;
  image?: string;
}

// ─────────────────────────────────────────────────────
// Program Enrollment  (Frappe Education `Program Enrollment`)
//   Must be submitted (docstatus=1) to activate
// ─────────────────────────────────────────────────────
export interface ProgramEnrollment {
  name: string;                    // EDU-PENR-NNNNN
  student: string;                 // link → Student
  student_name?: string;
  enrollment_date: string;         // required
  program: string;                 // link → Program (e.g. "10th Grade")
  academic_year: string;           // link → Academic Year (e.g. "2025-2026")
  academic_term?: string;
  student_category?: string;
  student_batch_name?: string;     // link → Student Batch Name (e.g. "CHL-25")
  docstatus?: 0 | 1 | 2;          // 0=draft, 1=submitted, 2=cancelled

  // Custom fields
  custom_program_abb?: string;
  custom_student_srr?: string;

  creation?: string;
  modified?: string;
}

export interface ProgramEnrollmentFormData {
  student: string;
  program: string;
  academic_year: string;
  academic_term?: string;
  enrollment_date: string;
  student_batch_name?: string;     // Student Batch Name (branch batch code)
  student_category?: string;
  student_group_name?: string;     // Student Group (batch) name e.g. "CHL-10th-25-1" — used to fill custom_batch_name on Course Enrollments
  // Fee fields (stored on Program Enrollment for parent dashboard)
  custom_fee_structure?: string;   // Link → Fee Structure name e.g. "SU ERV-8th State-Basic-4"
  custom_plan?: string;            // "Basic" | "Intermediate" | "Advanced"
  custom_no_of_instalments?: string; // "1" | "4" | "6" | "8"
}

// ─────────────────────────────────────────────────────
// Course Enrollment  (links enrolment to a Student Group)
// ─────────────────────────────────────────────────────
export interface CourseEnrollment {
  name: string;
  program_enrollment: string;      // link → Program Enrollment
  program?: string;
  course: string;                  // link → Course
  student: string;                 // link → Student
  student_name?: string;
  enrollment_date: string;

  // Custom fields
  custom_batch?: string;           // Data — batch code
  custom_batch_name?: string;      // link → Student Group name e.g. "CHL-10th-25-1"
  custom_student_srr?: string;
}

// ─────────────────────────────────────────────────────
// Student Group  (used as "Batch" in Smartup)
//   Student Groups represent the physical batch in a branch
//   Naming convention: {BRANCH}-{PROG_ABB}-{YY}-{SEQ}
//   e.g. CHL-10th-25-1
// ─────────────────────────────────────────────────────
export interface StudentGroup {
  name: string;                    // e.g. "CHL-10th-25-1"
  student_group_name: string;
  academic_year: string;
  group_based_on: "Batch" | "Course" | "Activity";
  program?: string;                // link → Program
  batch?: string;                  // link → Student Batch Name (e.g. "CHL-25")
  max_strength?: number;
  disabled?: 0 | 1;
  custom_branch?: string;          // link → Company

  students?: StudentGroupMember[];
  instructors?: StudentGroupInstructor[];
}

export interface StudentGroupMember {
  student: string;
  student_name?: string;
  batch_roll_number?: number;
  active?: 0 | 1;
}

export interface StudentGroupInstructor {
  instructor: string;
  instructor_name?: string;
}

// ─────────────────────────────────────────────────────
// Multi-step admission wizard form shape
// ─────────────────────────────────────────────────────
export interface StudentFormData {
  // Step 1 — Student Info
  first_name: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  student_email_id: string;
  student_mobile_number?: string;
  custom_aadhaar?: string;          // Aadhaar number (12 digits)
  joining_date?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Step 2 — Academic
  custom_branch: string;           // Company name (branch)
  program: string;                 // Program name e.g. "10th Grade"
  academic_year: string;           // e.g. "2025-2026"
  student_batch_name?: string;     // Batch code e.g. "CHL-25"
  enrollment_date: string;

  // Step 3 — Guardian
  guardian_name: string;
  guardian_email?: string;
  guardian_mobile: string;
  guardian_relation: string;
}
