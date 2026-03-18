import apiClient from "./client";
import type { Batch, BatchFormData, CourseSchedule, ClassLevel } from "@/lib/types/batch";
import type { FrappeListResponse, FrappeSingleResponse, PaginationParams } from "@/lib/types/api";
import { MAX_BATCH_CAPACITY, BATCH_NAMES } from "@/lib/utils/constants";

// Default fields for a Student Group list
const SG_LIST_FIELDS = JSON.stringify([
  "name", "student_group_name", "academic_year", "group_based_on",
  "program", "batch", "max_strength", "disabled", "custom_branch",
]);

// ── List Classes (Programs) ──
export async function getClasses(params?: PaginationParams): Promise<FrappeListResponse<ClassLevel>> {
  const searchParams = new URLSearchParams({
    fields: JSON.stringify(["name", "program_name", "program_abbreviation", "department"]),
    order_by: "name",
  });
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length));
  const { data } = await apiClient.get(`/resource/Program?${searchParams.toString()}`);
  return data;
}

// ── Batch counts per program (for Classes overview) ──
export async function getBatchCountsByProgram(company?: string, academic_year?: string): Promise<Record<string, number>> {
  const filters: string[][] = [["group_based_on", "=", "Batch"]];
  if (company) filters.push(["custom_branch", "=", company]);
  if (academic_year) filters.push(["academic_year", "=", academic_year]);
  const query = new URLSearchParams({
    fields: JSON.stringify(["program", "count(name) as cnt"]),
    filters: JSON.stringify(filters),
    group_by: "program",
    limit_page_length: "100",
  });
  const { data } = await apiClient.get(`/resource/Student Group?${query}`);
  const counts: Record<string, number> = {};
  for (const row of data.data ?? []) {
    if (row.program) counts[row.program] = row.cnt ?? 0;
  }
  return counts;
}

// ── Create Class ──
export async function createClass(classData: Partial<ClassLevel>): Promise<FrappeSingleResponse<ClassLevel>> {
  const { data } = await apiClient.post("/resource/Program", classData);
  return data;
}

// ── Student counts per batch (from child table) ──
export async function getBatchStudentCounts(batchNames: string[]): Promise<Record<string, number>> {
  if (!batchNames.length) return {};
  const query = new URLSearchParams({
    fields: JSON.stringify(["parent", "count(name) as cnt"]),
    filters: JSON.stringify([["parent", "in", batchNames], ["active", "=", 1]]),
    group_by: "parent",
    limit_page_length: "0",
  });
  const { data } = await apiClient.get(`/resource/Student Group Student?${query}`);
  const counts: Record<string, number> = {};
  for (const row of data.data ?? []) {
    if (row.parent) counts[row.parent] = row.cnt ?? 0;
  }
  return counts;
}

// ── List Batches (Student Groups) ──
// Batches = Student Groups where group_based_on = "Batch"
// Filter by custom_branch (Company), program, or batch code
export async function getBatches(params?: {
  custom_branch?: string;   // Company name e.g. "Smart Up Chullickal"
  program?: string;         // Program name e.g. "10th Grade"
  batch?: string;           // Batch code e.g. "CHL-25"
  academic_year?: string;
  fields?: string;
} & PaginationParams): Promise<FrappeListResponse<Batch>> {
  const searchParams = new URLSearchParams();
  const filters: string[][] = [["group_based_on", "=", "Batch"]];
  if (params?.custom_branch) filters.push(["custom_branch", "=", params.custom_branch]);
  if (params?.program) filters.push(["program", "=", params.program]);
  if (params?.batch) filters.push(["batch", "=", params.batch]);
  if (params?.academic_year) filters.push(["academic_year", "=", params.academic_year]);
  searchParams.set("filters", JSON.stringify(filters));
  searchParams.set("fields", params?.fields ?? SG_LIST_FIELDS);
  if (params?.limit_page_length) searchParams.set("limit_page_length", String(params.limit_page_length));
  if (params?.order_by) searchParams.set("order_by", params.order_by ?? "name");

  const { data } = await apiClient.get(`/resource/Student Group?${searchParams.toString()}`);
  return data;
}

// ── Get Single Batch ──
export async function getBatch(id: string): Promise<FrappeSingleResponse<Batch>> {
  // Fetch full doc with students & instructors child tables
  const { data } = await apiClient.get(`/resource/Student Group/${encodeURIComponent(id)}`);
  return data;
}

// ── Create Batch (Student Group) ──
// Real naming convention: {BRANCH_ABBR}-{PROG_ABB}-{YY}-{SEQ}
// e.g. CHL-10th-25-1
export async function createBatch(batchData: Partial<BatchFormData>): Promise<FrappeSingleResponse<Batch>> {
  const payload = {
    student_group_name: batchData.student_group_name,  // must provide the name
    group_based_on: "Batch",
    academic_year: batchData.academic_year,
    program: batchData.program,
    batch: batchData.batch,                            // Student Batch Name link
    max_strength: batchData.max_strength || MAX_BATCH_CAPACITY,
    custom_branch: batchData.custom_branch,            // Company name
  };
  const { data } = await apiClient.post("/resource/Student Group", payload);
  return data;
}

// ── Update Batch ──
export async function updateBatch(id: string, updates: Partial<Batch>): Promise<FrappeSingleResponse<Batch>> {
  const { data } = await apiClient.put(`/resource/Student Group/${encodeURIComponent(id)}`, updates);
  return data;
}

// ── List Student Batch Names (link table for the `batch` field) ──
export async function getStudentBatchNames(): Promise<string[]> {
  const { data } = await apiClient.get(`/resource/Student Batch Name?limit_page_length=100`);
  return (data.data as { name: string }[]).map((b) => b.name);
}

// ── Auto-assign student to next available batch ──
export async function autoAssignToBatch(program: string, studentId: string): Promise<{ batch: Batch; message: string }> {
  // 1. Get all batches for this program
  const { data: batches } = await getBatches({ program, limit_page_length: 100 });

  // 2. Find batch with available capacity
  let targetBatch: Batch | null = null;
  for (const batch of batches) {
    const strength = batch.students?.length || 0;
    if (strength < (batch.max_strength || MAX_BATCH_CAPACITY)) {
      targetBatch = batch;
      break;
    }
  }

  // 3. If no batch has space, create the next one
  if (!targetBatch) {
    const nextBatchIndex = batches.length;
    if (nextBatchIndex >= BATCH_NAMES.length) {
      throw new Error("Maximum batch limit reached for this class");
    }
    const newBatchName = BATCH_NAMES[nextBatchIndex];
    const { data: newBatch } = await createBatch({
      program,
      batch: newBatchName,
      max_strength: MAX_BATCH_CAPACITY,
    });
    targetBatch = newBatch;
  }

  // 4. Add student to the batch
  const currentStudents = targetBatch.students || [];
  const updatedStudents = [...currentStudents, { student: studentId, student_name: "", active: 1 as const }];
  const { data: updatedBatch } = await updateBatch(targetBatch.name, { students: updatedStudents });

  const strength = updatedStudents.length;
  return {
    batch: updatedBatch,
    message: `Student assigned to ${targetBatch.student_group_name} (${strength}/${targetBatch.max_strength || MAX_BATCH_CAPACITY})`,
  };
}

// ── Course Schedules ──
export async function getSchedules(params?: {
  student_group?: string;
  date?: string;
} & PaginationParams): Promise<FrappeListResponse<CourseSchedule>> {
  const searchParams = new URLSearchParams();
  const filters: string[][] = [];
  if (params?.student_group) filters.push(["student_group", "=", params.student_group]);
  if (params?.date) filters.push(["schedule_date", "=", params.date]);
  if (filters.length) searchParams.set("filters", JSON.stringify(filters));
  const { data } = await apiClient.get(`/resource/Course Schedule?${searchParams.toString()}`);
  return data;
}

export async function createSchedule(schedule: Partial<CourseSchedule>): Promise<FrappeSingleResponse<CourseSchedule>> {
  const { data } = await apiClient.post("/resource/Course Schedule", schedule);
  return data;
}
