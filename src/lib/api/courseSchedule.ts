/**
 * courseSchedule.ts
 * API layer for ERPNext Course Schedule and related lookup doctypes.
 *
 * Doctypes used:
 *  - Course Schedule  (/api/resource/Course Schedule)
 *  - Course           (/api/resource/Course)
 *  - Room             (/api/resource/Room)
 *  - Student Group    (/api/resource/Student Group)
 *
 * Filtering by branch uses the `custom_branch` field on Course Schedule
 * and Student Group (mirrors the "company" concept used in HR doctypes).
 */

import apiClient from "./client";
import type { FrappeListResponse } from "@/lib/types/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CourseSchedule {
  name: string;
  title: string;
  course: string;
  student_group: string;
  program: string;
  instructor: string;
  instructor_name: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  room?: string;
  custom_branch?: string;
  color?: string;
  class_schedule_color?: string;
}

export interface CourseOption {
  name: string;
  course_name: string;
}

export interface RoomOption {
  name: string;
  room_name: string;
}

export interface StudentGroupOption {
  name: string;
  student_group_name: string;
  program: string;
  custom_branch?: string;
}

// ── Field lists ────────────────────────────────────────────────────────────────

const SCHEDULE_FIELDS = JSON.stringify([
  "name", "title", "course", "student_group", "program",
  "instructor", "instructor_name", "schedule_date",
  "from_time", "to_time", "room", "custom_branch",
  "color", "class_schedule_color",
]);

// ── Server Script for overlap bypass ───────────────────────────────────────────
// Frappe's education module raises OverlapError when room/instructor/group
// conflicts exist. We create an API-type Server Script that inserts Course
// Schedules with `flags.ignore_validate = True` to bypass this check.
//
// RestrictedPython RULES (Frappe Server Scripts):
//   - NO `import` of any kind
//   - NO `json.loads`, `frappe.parse_json`, `.items()` etc.
//   - Only `frappe.*` globals + literal Python constructs
// We use direct attribute access on `frappe.form_dict` with inline dict.

const FORCE_SCRIPT_NAME = "Create Course Schedule Force";
const FORCE_METHOD_NAME = "create_course_schedule_force";

const FORCE_SCRIPT_BODY = `
doc = frappe.get_doc({
    "doctype": "Course Schedule",
    "student_group": frappe.form_dict.student_group,
    "course": frappe.form_dict.course,
    "instructor": frappe.form_dict.instructor,
    "schedule_date": frappe.form_dict.schedule_date,
    "from_time": frappe.form_dict.from_time,
    "to_time": frappe.form_dict.to_time,
    "room": frappe.form_dict.room,
    "custom_branch": frappe.form_dict.custom_branch
})

doc.flags.ignore_validate = True
doc.insert()

frappe.response["message"] = {"name": doc.name, "doctype": "Course Schedule"}
`.trim();

const SCRIPT_FINGERPRINT = "frappe.form_dict.student_group";

let _scriptVerified = false;

async function ensureForceCreateScript(): Promise<boolean> {
  if (_scriptVerified) return true;

  try {
    const { data: existing } = await apiClient.get(
      `/resource/Server Script/${encodeURIComponent(FORCE_SCRIPT_NAME)}`
    );
    const currentScript = (existing?.data?.script ?? "") as string;

    if (!currentScript.includes(SCRIPT_FINGERPRINT)) {
      await apiClient.put(
        `/resource/Server Script/${encodeURIComponent(FORCE_SCRIPT_NAME)}`,
        { script: FORCE_SCRIPT_BODY },
      );
    }
    _scriptVerified = true;
    return true;
  } catch {
    try {
      await apiClient.post("/resource/Server Script", {
        name: FORCE_SCRIPT_NAME,
        script_type: "API",
        api_method: FORCE_METHOD_NAME,
        allow_guest: 0,
        disabled: 0,
        script: FORCE_SCRIPT_BODY,
      });
      _scriptVerified = true;
      return true;
    } catch (setupErr: unknown) {
      console.error(
        "[courseSchedule] Failed to create Server Script:",
        (setupErr as { response?: { data?: unknown } })?.response?.data,
      );
      return false;
    }
  }
}

// ── Course Schedule CRUD ───────────────────────────────────────────────────────

/** List course schedules filtered by branch and optional date range */
export async function getCourseSchedules(params?: {
  branch?: string;
  branches?: string[];
  from_date?: string;
  to_date?: string;
  date?: string;
  student_group?: string;
  instructor?: string;
  limit_page_length?: number;
}): Promise<FrappeListResponse<CourseSchedule>> {
  const filters: (string | string[])[][] = [];
  if (params?.branch)                  filters.push(["custom_branch", "=", params.branch]);
  else if (params?.branches?.length)   filters.push(["custom_branch", "in", params.branches as unknown as string]);
  if (params?.date)                    filters.push(["schedule_date", "=", params.date]);
  if (params?.from_date)               filters.push(["schedule_date", ">=", params.from_date]);
  if (params?.to_date)                 filters.push(["schedule_date", "<=", params.to_date]);
  if (params?.student_group)           filters.push(["student_group", "=", params.student_group]);
  if (params?.instructor)              filters.push(["instructor", "=", params.instructor]);

  const query = new URLSearchParams({
    fields: SCHEDULE_FIELDS,
    limit_page_length: String(params?.limit_page_length ?? 100),
    order_by: "schedule_date asc, from_time asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Course Schedule?${query}`);
  return data;
}

/** Get a single course schedule */
export async function getCourseSchedule(name: string): Promise<{ data: CourseSchedule }> {
  const { data } = await apiClient.get(`/resource/Course Schedule/${encodeURIComponent(name)}`);
  return data;
}

/** Create a new course schedule (bypasses overlap validation via Server Script) */
export async function createCourseSchedule(payload: {
  course: string;
  student_group: string;
  instructor: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  room?: string;
  custom_branch?: string;
  class_schedule_color?: string;
}): Promise<{ data: CourseSchedule }> {
  const hasScript = await ensureForceCreateScript();
  if (hasScript) {
    const { data } = await apiClient.post(`/method/${FORCE_METHOD_NAME}`, payload);
    return data;
  }
  const { data } = await apiClient.post("/resource/Course Schedule", payload);
  return data;
}

/** Delete a course schedule */
export async function deleteCourseSchedule(name: string): Promise<void> {
  await apiClient.delete(`/resource/Course Schedule/${encodeURIComponent(name)}`);
}

// ── Bulk creation ──────────────────────────────────────────────────────────────

export interface BulkSchedulePayload {
  student_group: string;
  course: string;
  instructor: string;
  room?: string;
  from_time: string;
  to_time: string;
  custom_branch?: string;
  class_schedule_color?: string;
  dates: string[];
}

export interface BulkScheduleResult {
  total: number;
  created: number;
  failed: { date: string; error: string }[];
}

function friendlyError(raw: string, excType?: string): string {
  const type = excType || raw;
  if (type.includes("OverlapError") || raw.includes("OverlapError")) {
    const roomMatch = raw.match(/for Room\s+([\w-]+)/i);
    const instrMatch = raw.match(/for Instructor\s+([\w-]+)/i);
    if (roomMatch) return `Room "${roomMatch[1]}" is already booked at this time`;
    if (instrMatch) return `Instructor is already scheduled at this time`;
    return "Room or instructor already booked at this time";
  }
  if (type.includes("DuplicateEntryError") || raw.includes("Duplicate entry"))
    return "A schedule already exists for this date & time";
  if (type.includes("ValidationError") || raw.includes("ValidationError")) {
    const msgMatch = raw.match(/ValidationError[:\s]+(.+)/);
    return msgMatch ? msgMatch[1].trim() : "Validation failed";
  }
  const short = raw.replace(/^[\w.]+:\s*/, "").trim();
  return short.length > 120 ? short.slice(0, 117) + "…" : short || "Unknown error";
}

async function createScheduleForce(payload: Record<string, unknown>): Promise<void> {
  const hasScript = await ensureForceCreateScript();
  if (hasScript) {
    await apiClient.post(`/method/${FORCE_METHOD_NAME}`, payload);
  } else {
    await apiClient.post("/resource/Course Schedule", payload);
  }
}

export async function bulkCreateCourseSchedules(
  payload: BulkSchedulePayload,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkScheduleResult> {
  const { dates, ...base } = payload;
  const result: BulkScheduleResult = { total: dates.length, created: 0, failed: [] };

  for (let i = 0; i < dates.length; i++) {
    try {
      await createScheduleForce({ ...base, schedule_date: dates[i] });
      result.created++;
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { exception?: string; exc_type?: string } } })
        ?.response?.data;
      const raw = resp?.exception || "Unknown error";
      const excType = resp?.exc_type;
      result.failed.push({ date: dates[i], error: friendlyError(raw, excType) });
    }
    onProgress?.(i + 1, dates.length);
  }

  return result;
}

// ── Lookup lists ───────────────────────────────────────────────────────────────

export async function getCourses(): Promise<FrappeListResponse<CourseOption>> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "course_name"]),
    limit_page_length: "0",
    order_by: "course_name asc",
  });
  const { data } = await apiClient.get(`/resource/Course?${query}`);
  return data;
}

export async function getRooms(): Promise<FrappeListResponse<RoomOption>> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "room_name"]),
    limit_page_length: "0",
    order_by: "room_name asc",
  });
  const { data } = await apiClient.get(`/resource/Room?${query}`);
  return data;
}

export async function getStudentGroups(params?: {
  branch?: string;
}): Promise<FrappeListResponse<StudentGroupOption>> {
  const filters: string[][] = [];
  if (params?.branch) filters.push(["custom_branch", "=", params.branch]);

  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "student_group_name", "program", "custom_branch"]),
    limit_page_length: "0",
    order_by: "student_group_name asc",
    ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
  });
  const { data } = await apiClient.get(`/resource/Student Group?${query}`);
  return data;
}

// ── Program → Courses ──────────────────────────────────────────────────────────

export interface ProgramCourse {
  course: string;
  course_name: string;
  required: number;
}

interface ProgramDoc {
  name: string;
  program_name: string;
  courses: ProgramCourse[];
}

export async function getProgramCourses(program: string): Promise<ProgramCourse[]> {
  const { data } = await apiClient.get<{ data: ProgramDoc }>(
    `/resource/Program/${encodeURIComponent(program)}`
  );
  return data.data.courses ?? [];
}
