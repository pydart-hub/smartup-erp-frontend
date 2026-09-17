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
  from_date?: string;
  to_date?: string;
  status?: string;
  limit?: number;
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

export interface SubmissionTimeliness {
  isLate: boolean;
  daysLate: number;
  formattedSubmittedAt: string;
  badgeLabel: string;
}

/**
 * Checks whether a checklist submission was submitted after its designated report date.
 */
export function evaluateSubmissionTimeliness(
  reportDateStr: string,
  creationStr?: string
): SubmissionTimeliness {
  if (!creationStr || !reportDateStr) {
    return {
      isLate: false,
      daysLate: 0,
      formattedSubmittedAt: "",
      badgeLabel: "On Time",
    };
  }

  // Parse creation timestamp
  const normalizedStr = creationStr.replace(" ", "T");
  const creationDateObj = new Date(normalizedStr);

  let formattedSubmittedAt = "";
  if (!isNaN(creationDateObj.getTime())) {
    formattedSubmittedAt = creationDateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    formattedSubmittedAt = creationStr;
  }

  // Extract YYYY-MM-DD components
  const reportParts = reportDateStr.split("T")[0].split("-").map(Number);
  const repDate = new Date(reportParts[0], reportParts[1] - 1, reportParts[2]);

  let creDate: Date;
  if (!isNaN(creationDateObj.getTime())) {
    creDate = new Date(
      creationDateObj.getFullYear(),
      creationDateObj.getMonth(),
      creationDateObj.getDate()
    );
  } else {
    const creParts = creationStr.split(" ")[0].split("-").map(Number);
    creDate = new Date(creParts[0], creParts[1] - 1, creParts[2]);
  }

  const diffMs = creDate.getTime() - repDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      isLate: true,
      daysLate: diffDays,
      formattedSubmittedAt,
      badgeLabel: diffDays === 1 ? "1 Day Late" : `${diffDays} Days Late`,
    };
  }

  return {
    isLate: false,
    daysLate: 0,
    formattedSubmittedAt,
    badgeLabel: "On Time",
  };
}

