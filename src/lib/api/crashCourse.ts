/**
 * Crash Course Client API Layer
 * Connects frontend components to Next.js API routes and Frappe
 */

import apiClient from "@/lib/api/client";
import type {
  CrashCourseAdmissionPayload,
  CrashCourseAdmissionResult,
  CrashCourseBatchSummary,
  CrashCourseBranchProgress,
  CrashCourseClass,
} from "@/lib/types/crashCourse";

/**
 * Submit a complete Crash Course admission
 */
export async function admitCrashCourseStudent(
  payload: CrashCourseAdmissionPayload
): Promise<CrashCourseAdmissionResult> {
  const res = await fetch("/api/crash-course/admit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Crash Course admission failed");
  }
  return data;
}

/**
 * Fetch available Crash Course batches with live seat counts
 */
export async function getCrashCourseBatches(params?: {
  branch?: string;
  class_level?: CrashCourseClass;
}): Promise<CrashCourseBatchSummary[]> {
  const query = new URLSearchParams();
  if (params?.branch) query.set("branch", params.branch);
  if (params?.class_level) query.set("class_level", params.class_level);

  const res = await fetch(`/api/crash-course/batches?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch Crash Course batches");
  }
  const data = await res.json();
  return data.batches || [];
}

/**
 * Create a new Crash Course batch (e.g. Batch 2 if Batch 1 is full)
 */
export async function createCrashCourseBatch(payload: {
  branch: string;
  class_level: CrashCourseClass;
  batch_number?: number;
}): Promise<CrashCourseBatchSummary> {
  const res = await fetch("/api/crash-course/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create Crash Course batch");
  }
  const data = await res.json();
  return data.batch;
}

/**
 * Fetch Crash Course sales progress across the 3 branches (Palluruthy, Thoppumpady, Fort Kochi)
 */
export async function getCrashCourseBranchProgress(): Promise<
  CrashCourseBranchProgress[]
> {
  const res = await fetch("/api/crash-course/targets", {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch branch progress");
  }
  const data = await res.json();
  return data.branches || [];
}
