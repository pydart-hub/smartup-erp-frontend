import axios from "axios";

export interface ChecklistEntry {
  name?: string;
  date: string;
  employee: string;
  employee_name: string;
  branch: string;
  class_name: string;
  class_starting_time: string;
  class_ending_time: string;
  status: "Draft" | "Submitted" | "Verified";
  verified_by?: string;
  verification_date?: string;
  remarks?: string;
  attendance_updated_in_lms: number; // 0 or 1 for Check fields in Frappe
  absentees_verified_parents_informed: number;
  all_classes_conducted_as_per_timetable: number;
  portion_completed_as_per_academic_planner: number;
  class_notes_worksheet_shared: number;
  daily_class_overview_updated: number;
  class_feedback_forum_sent: number;
  next_day_class_time_updated: number;
  daily_smartup_content_shared: number;
  creation?: string;
}

const API_ENDPOINT = "/api/checklists";

export async function createChecklist(data: Partial<ChecklistEntry>): Promise<ChecklistEntry> {
  const response = await axios.post(API_ENDPOINT, data);
  if (!response.data.success && response.data.message) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}

export async function getChecklists(params?: {
  employee?: string;
  branch?: string;
  date?: string;
  status?: string;
}): Promise<ChecklistEntry[]> {
  try {
    const response = await axios.get(API_ENDPOINT, { params });
    return response.data.data || [];
  } catch (error) {
    console.warn("Failed to fetch checklists:", error);
    return [];
  }
}

export async function updateChecklist(
  id: string,
  data: Partial<ChecklistEntry>
): Promise<ChecklistEntry> {
  const response = await axios.put(`${API_ENDPOINT}/${encodeURIComponent(id)}`, data);
  if (!response.data.success && response.data.message) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}
