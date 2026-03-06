import apiClient from "./client";
import type { AttendanceRecord, BulkAttendancePayload, AttendanceReportParams, AttendanceSummary } from "@/lib/types/attendance";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";

// Fetch all attendance records for a date, optionally by student_group and/or branch
export async function getAttendance(date: string, params?: {
  student_group?: string;
  custom_branch?: string;
}): Promise<FrappeListResponse<AttendanceRecord>> {
  const filters: string[][] = [["date", "=", date]];
  if (params?.student_group) filters.push(["student_group", "=", params.student_group]);
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);
  const query = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(["name", "student", "student_name", "date", "status", "student_group", "course_schedule", "custom_branch"]),
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Student Attendance?${query.toString()}`);
  return data;
}

// Mark a single attendance record (save, not submit — Student Attendance is not submittable)
export async function markAttendance(record: Partial<AttendanceRecord>): Promise<FrappeSingleResponse<AttendanceRecord>> {
  const { data } = await apiClient.post("/resource/Student Attendance", record);
  return data;
}

// Update an existing attendance record
export async function updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<FrappeSingleResponse<AttendanceRecord>> {
  const { data } = await apiClient.put(`/resource/Student Attendance/${encodeURIComponent(id)}`, updates);
  return data;
}

/**
 * Bulk mark attendance for a student group on a given date.
 *
 * Strategy (Student Attendance is a submittable doctype):
 *  1. Fetch existing submitted records for the date + student_group.
 *  2. For each student:
 *     - No existing record → create + submit (docstatus: 1)
 *     - Existing with same status → skip (no change needed)
 *     - Existing with different status → cancel old, create new submitted
 */
export async function bulkMarkAttendance(payload: BulkAttendancePayload): Promise<{ message: string }> {
  const { student_group, date, students, custom_branch } = payload;

  // 1. Fetch existing attendance for this date + group (only submitted, docstatus=1)
  const existingRes = await getAttendance(date, { student_group });
  const existingMap = new Map<string, AttendanceRecord>();
  for (const rec of existingRes.data) {
    existingMap.set(rec.student, rec);
  }

  // 2. Process each student
  const promises: Promise<unknown>[] = [];

  for (const { student, student_name, status } of students) {
    const existing = existingMap.get(student);

    if (existing && existing.status === status) {
      // Same status — no change needed
      continue;
    }

    if (existing) {
      // Different status — cancel old, then create new
      promises.push(
        apiClient
          .post("/method/frappe.client.cancel", {
            doctype: "Student Attendance",
            name: existing.name,
          })
          .then(() =>
            apiClient.post("/resource/Student Attendance", {
              student,
              student_name,
              date,
              status,
              student_group,
              custom_branch: custom_branch || existing.custom_branch || undefined,
              docstatus: 1,
            })
          )
      );
    } else {
      // No existing record — create new
      promises.push(
        apiClient.post("/resource/Student Attendance", {
          student,
          student_name,
          date,
          status,
          student_group,
          custom_branch: custom_branch || undefined,
          docstatus: 1,
        })
      );
    }
  }

  await Promise.all(promises);
  return { message: `Attendance saved for ${students.length} students` };
}

// ── Attendance Report ──
export async function getAttendanceReport(params: AttendanceReportParams): Promise<AttendanceSummary[]> {
  const searchParams = new URLSearchParams();
  if (params.student_group) searchParams.set("student_group", params.student_group);
  if (params.student) searchParams.set("student", params.student);
  searchParams.set("from_date", params.from_date);
  searchParams.set("to_date", params.to_date);
  const { data } = await apiClient.get(`/method/education.api.get_attendance_report?${searchParams.toString()}`);
  return data.message;
}

// ── Class-wise (Student Group) Attendance Summary ──
export interface ClassAttendanceSummary {
  student_group: string;
  status: string;
  cnt: number;
}

export async function getClassWiseAttendance(date: string, params?: {
  custom_branch?: string;
}): Promise<FrappeListResponse<ClassAttendanceSummary>> {
  const filters: string[][] = [["date", "=", date]];
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);

  const query = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(["student_group", "status", "count(name) as cnt"]),
    group_by: "student_group,status",
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Student Attendance?${query.toString()}`);
  return data;
}

// ── Absentee Count for Today ──
export async function getTodayAbsenteeCount(studentGroup?: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const filters: string[][] = [["date", "=", today], ["status", "=", "Absent"]];
  if (studentGroup) filters.push(["student_group", "=", studentGroup]);
  const params = new URLSearchParams({
    doctype: "Student Attendance",
    filters: JSON.stringify(filters),
  });
  const { data } = await apiClient.get(`/method/frappe.client.get_count?${params.toString()}`);
  return data.message;
}
