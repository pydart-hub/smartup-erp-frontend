/**
 * AttendanceRecord maps to Frappe Education `Student Attendance` doctype.
 * Named e.g. EDU-ATT-2026-00001
 */
export interface AttendanceRecord {
  name: string;
  student: string;             // link → Student (required)
  student_name?: string;
  student_mobile_number?: string;
  date: string;                // required
  status: "Present" | "Absent" | "Late"; // required
  student_group?: string;      // link → Student Group
  course_schedule?: string;    // link → Course Schedule
  leave_application?: string;
  custom_branch?: string;      // link → Company (Branch)
  link_nvfk?: string;          // Program (internal Frappe link field)
  amended_from?: string;
  custom_video_watched?: 0 | 1; // Parent confirmed video class watched
  custom_video_watched_on?: string; // ISO datetime when marked watched
}

export interface AttendanceSummary {
  student: string;
  student_name: string;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

/**
 * Payload for bulk mark attendance.
 * Uses direct REST API (create/cancel/recreate Student Attendance docs).
 */
export interface BulkAttendancePayload {
  student_group: string;        // Student Group name
  date: string;
  /** Each entry: { student: "STU-...", student_name: "Name", status: "Present"|"Absent"|"Late" } */
  students: { student: string; student_name: string; status: "Present" | "Absent" | "Late" }[];
  custom_branch?: string;       // Company / branch for the student group
}

export interface AttendanceReportParams {
  student_group?: string;
  student?: string;
  from_date: string;
  to_date: string;
  custom_branch?: string;
}
