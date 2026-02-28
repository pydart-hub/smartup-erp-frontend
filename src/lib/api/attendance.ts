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
 * Bulk mark attendance via the Frappe Education whitelisted method.
 * education.api.mark_attendance understands the student arrays and handles
 * creating/updating attendance records for the whole group at once.
 */
export async function bulkMarkAttendance(payload: BulkAttendancePayload): Promise<{ message: string }> {
  const { data } = await apiClient.post("/method/education.api.mark_attendance", payload);
  return data;
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
