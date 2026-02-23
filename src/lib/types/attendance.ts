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
 * Payload for the Frappe Education bulk mark attendance method.
 * Calls: POST /api/method/education.api.mark_attendance
 */
export interface BulkAttendancePayload {
  student_group: string;        // Student Group name
  course_schedule?: string;
  date: string;
  students_present: string[];   // array of student IDs
  students_absent: string[];    // array of student IDs
  students_late?: string[];
}

export interface AttendanceReportParams {
  student_group?: string;
  student?: string;
  from_date: string;
  to_date: string;
  custom_branch?: string;
}
