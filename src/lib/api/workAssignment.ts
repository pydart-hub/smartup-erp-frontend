// Work Assignment API Layer
// File: src/lib/api/workAssignment.ts

import apiClient from "./client";
import {
  WorkAssignment,
  WorkAssignmentDetail,
  WorkAssignmentCreatePayload,
  InstructorAssignmentView,
  SubmitWorkPayload,
  ApproveSubmissionPayload,
  RejectSubmissionPayload,
  SubmissionResponse,
  GMAssignmentView,
} from "@/lib/types/workAssignment";

/**
 * Create a new Work Assignment
 */
export async function createWorkAssignment(
  payload: WorkAssignmentCreatePayload
): Promise<WorkAssignment> {
  const response = await apiClient.post("/resource/Work Assignment", payload);
  return response.data.data;
}

/**
 * Get Work Assignment by ID
 */
export async function getWorkAssignment(id: string): Promise<WorkAssignment> {
  const response = await apiClient.get(`/resource/Work Assignment/${id}`);
  return response.data.data;
}

/**
 * Update Work Assignment.
 * - Draft (docstatus=0): simple PUT.
 * - Submitted (docstatus=1): Frappe does not allow PUT on parent fields after
 *   submission. We use the standard Frappe amendment flow:
 *   1. Cancel the submitted doc (PUT docstatus:2)
 *   2. POST a new doc with `amended_from` + updated fields (creates WA-XXXXX-1)
 *   3. Submit the new doc (PUT docstatus:1)
 * Returns the new (amended) document.
 */
export async function updateWorkAssignment(
  id: string,
  payload: Partial<WorkAssignmentCreatePayload>
): Promise<WorkAssignment> {
  const current = await apiClient.get(`/resource/Work Assignment/${encodeURIComponent(id)}`);
  const currentDoc = current.data?.data as WorkAssignment;
  const docstatus: number = currentDoc?.docstatus ?? 0;

  if (docstatus === 1) {
    // Step 1: Cancel the submitted doc
    await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(id)}`, { docstatus: 2 });
    // Step 2: Create amendment (new doc with amended_from)
    const amendedDoc: Record<string, unknown> = { ...currentDoc, ...payload, amended_from: id, docstatus: 0 };
    delete amendedDoc.name;
    const created = await apiClient.post(`/resource/Work Assignment`, amendedDoc);
    const newName: string = created.data?.data?.name;
    // Step 3: Submit the amendment
    const submitted = await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(newName)}`, { docstatus: 1 });
    return submitted.data.data;
  }

  // Draft (docstatus=0) — simple update
  const response = await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(id)}`, payload);
  return response.data.data;
}

/**
 * Submit (activate) Work Assignment
 * Frappe REST submit = PUT with docstatus: 1
 */
export async function submitWorkAssignment(id: string): Promise<WorkAssignment> {
  const response = await apiClient.put(`/resource/Work Assignment/${id}`, { docstatus: 1 });
  return response.data.data;
}

/**
 * Delete Work Assignment.
 * Frappe blocks deletion when another doc references this one via `amended_from`.
 * Amendment chains look like: WA-00001 → WA-00001-1 → WA-00001-2 (active).
 * We must delete in reverse order: cancel the latest, then delete newest→oldest.
 */
export async function deleteWorkAssignment(id: string): Promise<void> {
  // Walk the amendment chain: collect [id, amended_from, amended_from's amended_from, ...]
  const chain: string[] = [];
  let cursor: string | null = id;

  while (cursor) {
    chain.push(cursor);
    try {
      const res: { data?: { data?: Record<string, unknown> } } = await apiClient.get(`/resource/Work Assignment/${encodeURIComponent(cursor)}`);
      const data = res.data?.data;
      // Cancel the head doc (the one we're deleting) if submitted
      if (cursor === id && (data?.docstatus ?? 0) === 1) {
        await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(cursor)}`, { docstatus: 2 });
      }
      cursor = (data?.amended_from as string) ?? null;
    } catch {
      break;
    }
  }

  // Delete newest → oldest so each deletion clears the link reference for the next
  for (const name of chain) {
    try {
      await apiClient.delete(`/resource/Work Assignment/${encodeURIComponent(name)}`);
    } catch {
      // Best-effort — continue even if one in the chain can't be deleted
    }
  }
}

/**
 * Get all Work Assignments for GM view.
 * Uses direct REST — no custom Frappe method required.
 * Fetches all WAs (optionally filtered by branch), then attaches each doc's
 * embedded assignments array as the submissions list.
 */
export async function getGMWorkAssignments(branch?: string): Promise<GMAssignmentView[]> {
  try {
    const fields = encodeURIComponent(
      JSON.stringify(["name", "title", "description", "topic", "for_branch",
        "academic_year", "deadline", "docstatus", "total_assigned",
        "submitted_count", "approved_count"])
    );
    const filters: unknown[][] = [["docstatus", "!=", 2]]; // exclude cancelled/amended-away docs
    if (branch) filters.push(["for_branch", "=", branch]);
    const filtersParam = encodeURIComponent(JSON.stringify(filters));

    const listRes = await apiClient.get(
      `/resource/Work Assignment?fields=${fields}${filters.length ? `&filters=${filtersParam}` : ""}&limit_page_length=200&order_by=creation desc`
    );
    const items: Record<string, unknown>[] = listRes.data.data || [];
    if (!items.length) return [];

    // Fetch full docs for assignments child table
    const docs = await Promise.all(
      items.map((item) =>
        apiClient
          .get(`/resource/Work Assignment/${encodeURIComponent(item.name as string)}`)
          .then((r) => r.data.data as Record<string, unknown>)
          .catch(() => null)
      )
    );

    return docs
      .filter((doc): doc is Record<string, unknown> => doc !== null)
      .map((doc) => {
        const childRows = (doc.assignments as Record<string, unknown>[]) || [];
        const submitted = childRows.filter((r) => r.submission_status === "Submitted").length;
        const approved = childRows.filter((r) => r.approval_status === "Approved").length;
        const rejected = childRows.filter((r) => r.approval_status === "Rejected").length;
        const pendingReview = childRows.filter(
          (r) => r.submission_status === "Submitted" && r.approval_status === "Pending"
        ).length;
        const docStatus = doc.docstatus as number;
        const status: "Draft" | "Active" | "Completed" | "Cancelled" =
          docStatus === 0 ? "Draft"
          : docStatus === 1 ? "Active"
          : docStatus === 2 ? "Cancelled"
          : "Draft";

        return {
          ...doc,
          status,
          workflow_state: status,
          enabled: docStatus === 1,
          created_by: doc.owner as string,
          created_on: doc.creation as string,
          instructions_file: null,
          reference_link: null,
          total_assigned: childRows.length,
          submitted_count: submitted,
          approved_count: approved,
          assignments: childRows as unknown as WorkAssignmentDetail[],
          status_details: {
            total: childRows.length,
            submitted,
            approved,
            rejected,
            pending: childRows.length - submitted,
            pending_review: pendingReview,
          },
          submissions: childRows.map((r) => ({
            idx: r.idx as number,
            instructor: r.instructor as string,
            instructor_name: (r.instructor_name as string) || (r.instructor as string),
            submission_status: (r.submission_status as string) || "Pending",
            approval_status: (r.approval_status as string) || "Pending",
            google_drive_link: (r.google_drive_link as string) || null,
            submitted_on: (r.submitted_on as string) || null,
            approval_remarks: (r.approval_remarks as string) || null,
            rejection_reason: (r.rejection_reason as string) || null,
          })),
        } as GMAssignmentView;
      });
  } catch (error) {
    console.error("Error fetching GM assignments:", error);
    return [];
  }
}

/**
 * Get all Work Assignments for the current Instructor.
 * Uses Frappe's child-table filter syntax on the parent doctype so we never
 * need to list Work Assignment Detail directly (that throws PermissionError).
 */
export async function getInstructorAssignments(instructorId: string): Promise<InstructorAssignmentView[]> {
  if (!instructorId) return [];
  try {
    // Step 1: Get parent WAs where this instructor is in the child table, docstatus=1 only
    const parentFields = encodeURIComponent(
      JSON.stringify(["name", "title", "description", "topic", "deadline", "for_branch"])
    );
    const parentFilters = encodeURIComponent(
      JSON.stringify([
        ["docstatus", "=", 1],
        ["Work Assignment Detail", "instructor", "=", instructorId],
      ])
    );
    const listRes = await apiClient.get(
      `/resource/Work Assignment?filters=${parentFilters}&fields=${parentFields}&limit_page_length=200`
    );
    const parentList: Record<string, unknown>[] = listRes.data.data || [];
    if (!parentList.length) return [];

    // Step 2: Fetch each full document to get embedded child row data
    const parentDocs = await Promise.all(
      parentList.map((item) =>
        apiClient
          .get(`/resource/Work Assignment/${encodeURIComponent(item.name as string)}`)
          .then((r) => r.data.data as Record<string, unknown>)
          .catch(() => null)
      )
    );

    const result: InstructorAssignmentView[] = [];
    for (const doc of parentDocs) {
      if (!doc) continue;
      const assignments = (doc.assignments as Record<string, unknown>[]) || [];
      const myDetail = assignments.find((d) => d.instructor === instructorId);
      if (!myDetail) continue;
      result.push({
        name: doc.name as string,
        title: doc.title as string,
        description: (doc.description as string) || "",
        topic: (doc.topic as string) || "",
        deadline: doc.deadline as string,
        for_branch: doc.for_branch as string,
        my_assignment: {
          idx: (myDetail.idx as number) || 0,
          submission_status: (myDetail.submission_status as "Pending" | "Submitted") || "Pending",
          google_drive_link: (myDetail.google_drive_link as string) || null,
          submitted_on: (myDetail.submitted_on as string) || null,
          approval_status: (myDetail.approval_status as "Pending" | "Approved" | "Rejected") || "Pending",
          approval_remarks: (myDetail.approval_remarks as string) || null,
          rejection_reason: (myDetail.rejection_reason as string) || null,
          can_resubmit: Boolean(myDetail.can_resubmit),
        },
      });
    }
    return result;
  } catch (error) {
    console.error("Error fetching instructor assignments:", error);
    return [];
  }
}

/**
 * Instructor submits work (Google Drive link).
 * Uses direct REST: fetches the full WA doc, updates the instructor's child row,
 * then PUTs it back. No custom Frappe method required.
 */
export async function submitInstructorWork(
  payload: SubmitWorkPayload
): Promise<SubmissionResponse> {
  try {
    // Fetch the full document to get current child rows
    const docRes = await apiClient.get(`/resource/Work Assignment/${encodeURIComponent(payload.work_assignment_id)}`);
    const doc = docRes.data.data as { assignments?: Record<string, unknown>[] };
    const assignments = doc.assignments || [];

    // Frappe/MySQL expects "YYYY-MM-DD HH:MM:SS" — not ISO 8601 with T/Z/ms
    const now = new Date();
    const frappeNow = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

    // Find and update the instructor's row.
    // IMPORTANT: reset approval_status to "Pending" so the GM can re-review
    // a resubmission (otherwise canReview stays false and the approve/reject
    // buttons never appear for the new submission).
    const updatedAssignments = assignments.map((row) => {
      if (row.instructor !== payload.instructor_id) return row;
      return {
        ...row,
        google_drive_link: payload.google_drive_link,
        submission_status: "Submitted",
        submitted_on: frappeNow,
        approval_status: "Pending",
        rejection_reason: null,
        can_resubmit: 0,
      };
    });

    await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(payload.work_assignment_id)}`, {
      assignments: updatedAssignments,
    });

    return { status: "success", message: "Work submitted successfully", submission_status: "Submitted" };
  } catch (error: unknown) {
    const axErr = error as { response?: { data?: { message?: string } }; message?: string };
    return {
      status: "error",
      message: axErr.response?.data?.message || axErr.message || "Failed to submit work",
    };
  }
}

/**
 * Shared helper: fetch WA doc, update the child row at idx, PUT back.
 */
async function updateChildRow(
  workAssignmentId: string,
  rowIdx: number,
  patch: Record<string, unknown>
): Promise<void> {
  const docRes = await apiClient.get(`/resource/Work Assignment/${encodeURIComponent(workAssignmentId)}`);
  const doc = docRes.data.data as { assignments?: Record<string, unknown>[] };
  const assignments = doc.assignments || [];
  const updated = assignments.map((row) =>
    (row.idx as number) === rowIdx ? { ...row, ...patch } : row
  );
  await apiClient.put(`/resource/Work Assignment/${encodeURIComponent(workAssignmentId)}`, {
    assignments: updated,
  });
}

/**
 * GM approves a submission — updates child row via direct REST PUT.
 */
export async function approveSubmission(
  payload: ApproveSubmissionPayload
): Promise<SubmissionResponse> {
  try {
    await updateChildRow(payload.work_assignment_id, payload.assignment_row_idx, {
      approval_status: "Approved",
      approved_by: "",      // Frappe fills owner server-side
      approval_date: new Date().toISOString().split("T")[0],
      approval_remarks: payload.approval_remarks || null,
    });
    return { status: "success", message: "Submission approved", approval_status: "Approved" };
  } catch (error: unknown) {
    const axErr = error as { response?: { data?: { message?: string } }; message?: string };
    return {
      status: "error",
      message: axErr.response?.data?.message || axErr.message || "Failed to approve submission",
    };
  }
}

/**
 * GM rejects a submission — updates child row via direct REST PUT.
 */
export async function rejectSubmission(
  payload: RejectSubmissionPayload
): Promise<SubmissionResponse> {
  try {
    await updateChildRow(payload.work_assignment_id, payload.assignment_row_idx, {
      approval_status: "Rejected",
      rejection_reason: payload.rejection_reason,
      can_resubmit: payload.can_resubmit !== false ? 1 : 0,
    });
    return { status: "success", message: "Submission rejected", approval_status: "Rejected" };
  } catch (error: unknown) {
    const axErr = error as { response?: { data?: { message?: string } }; message?: string };
    return {
      status: "error",
      message: axErr.response?.data?.message || axErr.message || "Failed to reject submission",
    };
  }
}

/**
 * List all Work Assignments (with filters)
 */
export async function listWorkAssignments(filters?: {
  branch?: string;
  status?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkAssignment[]> {
  try {
    const filterArray = [];
    
    if (filters?.branch) {
      filterArray.push(["for_branch", "=", filters.branch]);
    }
    if (filters?.status) {
      filterArray.push(["status", "=", filters.status]);
    }
    if (filters?.created_by) {
      filterArray.push(["created_by", "=", filters.created_by]);
    }
    
    const query = new URLSearchParams();
    if (filterArray.length > 0) {
      query.append("filters", JSON.stringify(filterArray));
    }
    if (filters?.limit) {
      query.append("limit_page_length", filters.limit.toString());
    }
    if (filters?.offset) {
      query.append("limit_page_length_start", filters.offset.toString());
    }
    query.append("fields", JSON.stringify(["name", "title", "topic", "for_branch", "deadline", "status", "total_assigned", "submitted_count", "approved_count"]));
    
    const response = await apiClient.get(`/resource/Work Assignment?${query.toString()}`);
    return response.data.data || [];
  } catch (error) {
    console.error("Error listing assignments:", error);
    return [];
  }
}

/**
 * Validate Google Drive URL
 */
export function validateGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  
  const patterns = [
    /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
    /^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Extract file ID from Google Drive URL
 */
export function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Format deadline for display
 */
export function formatDeadline(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculate days remaining until deadline
 */
export function daysUntilDeadline(dateString: string): number {
  const deadline = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get deadline status color
 */
export function getDeadlineStatusColor(dateString: string): "red" | "orange" | "gray" {
  const daysRemaining = daysUntilDeadline(dateString);
  
  if (daysRemaining < 0) {
    return "red"; // Overdue
  } else if (daysRemaining < 3) {
    return "red"; // Very soon
  } else if (daysRemaining < 7) {
    return "orange"; // Approaching
  } else {
    return "gray"; // Plenty of time
  }
}

/**
 * Check if deadline has passed
 */
export function isDeadlinePassed(dateString: string): boolean {
  return daysUntilDeadline(dateString) < 0;
}
