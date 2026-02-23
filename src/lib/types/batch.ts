export interface ClassLevel {
  name: string;                    // Program doc name
  program_name?: string;
  program_abbreviation?: string;   // e.g. "10th"
  department?: string;
  courses?: CourseLinkItem[];
}

export interface CourseLinkItem {
  course: string;
  course_name: string;
  required: 0 | 1;
}

/**
 * Batch = Student Group where group_based_on = "Batch"
 * Real naming convention: {BRANCH_ABBR}-{PROG_ABB}-{YY}-{SEQ}
 * e.g. "CHL-10th-25-1"
 */
export interface Batch {
  name: string;                    // e.g. "CHL-10th-25-1"
  student_group_name: string;
  group_based_on: "Batch" | "Course" | "Activity";
  academic_year: string;           // e.g. "2025-2026"
  program?: string;                // link → Program e.g. "10th Grade"
  batch?: string;                  // link → Student Batch Name e.g. "CHL-25"
  max_strength?: number;
  disabled?: 0 | 1;

  // Custom fields (Smartup)
  custom_branch?: string;          // Company name e.g. "Smart Up Chullickal"

  instructors?: BatchInstructor[];
  students?: BatchStudent[];
}

export interface BatchInstructor {
  instructor: string;
  instructor_name?: string;
  course?: string;
}

export interface BatchStudent {
  student: string;
  student_name?: string;
  batch_roll_number?: number;
  active?: 0 | 1;
}

export interface BatchFormData {
  student_group_name: string;      // the name you give the new Student Group
  program: string;                 // Program name
  batch: string;                   // Student Batch Name link (e.g. "CHL-25")
  academic_year: string;
  max_strength?: number;
  custom_branch?: string;          // Company name
}

export interface CourseSchedule {
  name: string;
  student_group: string;           // Student Group name
  instructor: string;              // link → Instructor
  instructor_name?: string;
  program?: string;
  course: string;                  // link → Course (required)
  schedule_date?: string;
  room: string;                    // link → Room (required)
  from_time: string;               // required
  to_time: string;                 // required
  title?: string;
  color?: string;
  custom_branch?: string;
}
