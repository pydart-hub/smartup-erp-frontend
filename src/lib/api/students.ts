import apiClient from "./client";
import type { Student, StudentFormData, Guardian } from "@/lib/types/student";
import type { FrappeListResponse, FrappeSingleResponse, PaginationParams } from "@/lib/types/api";

// Default fields returned in a student list (keeps response lean)
const STUDENT_LIST_FIELDS = JSON.stringify([
  "name", "student_name", "first_name", "last_name",
  "student_email_id", "student_mobile_number",
  "gender", "date_of_birth", "image", "enabled",
  "custom_branch", "custom_branch_abbr", "custom_srr_id", "custom_parent_name",
  "joining_date", "creation",
]);

// ── List Students ──
export async function getStudents(params?: {
  search?: string;
  enabled?: 0 | 1;        // 1 = active, 0 = disabled (left/dropped)
  custom_branch?: string; // Company name e.g. "Smart Up Chullickal"
  fields?: string;        // override default fields
} & PaginationParams): Promise<FrappeListResponse<Student>> {
  const searchParams = new URLSearchParams();

  searchParams.set("fields", params?.fields ?? STUDENT_LIST_FIELDS);
  if (params?.limit_start) searchParams.set("limit_start", String(params.limit_start));
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length ?? 50));
  if (params?.order_by) searchParams.set("order_by", String(params.order_by));

  const filters: string[][] = [];
  if (params?.enabled !== undefined) filters.push(["enabled", "=", String(params.enabled)]);
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);
  // Search across name, email, and mobile
  if (params?.search) {
    filters.push(["student_name", "like", `%${params.search}%`]);
  }
  if (filters.length) searchParams.set("filters", JSON.stringify(filters));

  const { data } = await apiClient.get(`/resource/Student?${searchParams.toString()}`);
  return data;
}

// ── Get Single Student ──
export async function getStudent(id: string): Promise<FrappeSingleResponse<Student>> {
  const { data } = await apiClient.get(`/resource/Student/${id}`);
  return data;
}

// ── Create Student ──
export async function createStudent(student: Partial<StudentFormData>): Promise<FrappeSingleResponse<Student>> {
  const { data } = await apiClient.post("/resource/Student", student);
  return data;
}

// ── Update Student ──
export async function updateStudent(id: string, updates: Partial<Student>): Promise<FrappeSingleResponse<Student>> {
  const { data } = await apiClient.put(`/resource/Student/${id}`, updates);
  return data;
}

// ── Delete Student ──
export async function deleteStudent(id: string): Promise<void> {
  await apiClient.delete(`/resource/Student/${id}`);
}

// ── Get Student Count ──
export async function getStudentCount(filters?: string[][]): Promise<number> {
  const params = new URLSearchParams({ doctype: "Student" });
  if (filters) params.set("filters", JSON.stringify(filters));
  const { data } = await apiClient.get(`/method/frappe.client.get_count?${params.toString()}`);
  return data.message;
}

/** Search students by name or email (for autocomplete / link pickers) */
export async function searchStudents(query: string, branch?: string): Promise<Student[]> {
  const filters: string[][] = [
    ["student_name", "like", `%${query}%`],
  ];
  if (branch) filters.push(["custom_branch", "=", branch]);
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "student_name", "student_email_id", "custom_branch", "custom_srr_id"]),
    filters: JSON.stringify(filters),
    limit_page_length: "20",
  });
  const { data } = await apiClient.get(`/resource/Student?${params.toString()}`);
  return data.data;
}

// ── Guardian CRUD ──
export async function createGuardian(guardian: Partial<Guardian>): Promise<FrappeSingleResponse<Guardian>> {
  const { data } = await apiClient.post("/resource/Guardian", guardian);
  return data;
}

export async function getGuardians(studentId?: string): Promise<FrappeListResponse<Guardian>> {
  const params = new URLSearchParams();
  if (studentId) params.set("filters", JSON.stringify([["student", "=", studentId]]));
  const { data } = await apiClient.get(`/resource/Guardian?${params.toString()}`);
  return data;
}
