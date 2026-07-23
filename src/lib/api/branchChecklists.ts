import axios from "axios";

export interface BranchChecklistEntry {
  name?: string;
  date: string;
  branch: string;
  opening_starting_time: string;
  opened_by: string;
  closing_time: string;
  closed_by: string;
  status: "Draft" | "Submitted" | "Verified";
  verified_by?: string;
  verification_date?: string;
  remarks?: string;
  
  // Checklist Metrics (Checks: 0 or 1)
  staff_attendance_verified: number;
  all_classes_started_on_time: number;
  timetable_executed_without_issues: number;
  branch_infrastructure_functional: number;
  attendance_updated_all_classes: number;
  parent_followup_completed: number;
  portion_tracking_verified: number;
  class_notes_worksheet_shared: number;
  next_day_class_time_updated: number;
  overview_updation_checked: number;
  class_feedback_forum_sent: number;
  teacher_training_conducted: number;
  teacher_performance_reviewed: number;
  smartup_content_shared: number;

  // Issue Tracking & Escalation
  critical_issues: "Yes" | "No";
  escalation_details?: string;

  creation?: string;
}

const API_ENDPOINT = "/api/branch-checklists";

export async function createBranchChecklist(data: Partial<BranchChecklistEntry>): Promise<BranchChecklistEntry> {
  const response = await axios.post(API_ENDPOINT, data);
  if (!response.data.success && response.data.message) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}

export async function getBranchChecklists(params?: {
  branch?: string;
  date?: string;
  status?: string;
}): Promise<BranchChecklistEntry[]> {
  try {
    const response = await axios.get(API_ENDPOINT, { params });
    return response.data.data || [];
  } catch (error) {
    console.warn("Failed to fetch branch checklists:", error);
    return [];
  }
}

export async function updateBranchChecklist(
  id: string,
  data: Partial<BranchChecklistEntry>
): Promise<BranchChecklistEntry> {
  const response = await axios.put(`${API_ENDPOINT}/${encodeURIComponent(id)}`, data);
  if (!response.data.success && response.data.message) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}
