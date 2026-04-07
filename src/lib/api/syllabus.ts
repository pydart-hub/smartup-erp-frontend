/**
 * syllabus.ts
 * Client API layer for Syllabus Configuration + Part Completion.
 *
 * Config routes go through /api/syllabus-config (server-side admin auth).
 * Parts routes go through /api/syllabus-parts (server-side admin auth).
 */

import type {
  SyllabusConfig,
  SyllabusConfigFormData,
  SyllabusPartCompletion,
} from "@/lib/types/syllabus";

// ─────────────────────────────────────────────────────────────────────────────
// Syllabus Configuration (BM manages)
// ─────────────────────────────────────────────────────────────────────────────

/** List all syllabus configs for a branch + academic year */
export async function getSyllabusConfigs(params?: {
  company?: string;
  academic_year?: string;
  course?: string;
  program?: string;
}): Promise<SyllabusConfig[]> {
  const query = new URLSearchParams();
  if (params?.company) query.set("company", params.company);
  if (params?.academic_year) query.set("academic_year", params.academic_year);
  if (params?.course) query.set("course", params.course);
  if (params?.program) query.set("program", params.program);

  const res = await fetch(`/api/syllabus-config?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch syllabus configs");
  const json = await res.json();
  return json.data;
}

/** Get a single config with child table */
export async function getSyllabusConfig(id: string): Promise<SyllabusConfig> {
  const res = await fetch(`/api/syllabus-config/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch syllabus config");
  const json = await res.json();
  return json.data;
}

/** Create a new syllabus config (BM) → also auto-creates completion records */
export async function createSyllabusConfig(
  data: SyllabusConfigFormData,
): Promise<{ config: SyllabusConfig; completions_created: number; completions_errors: string[] }> {
  const res = await fetch("/api/syllabus-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to create syllabus config");
  }
  return res.json();
}

/** Update a syllabus config (BM) */
export async function updateSyllabusConfig(
  id: string,
  data: { total_parts: number; parts: { part_number: number; part_title: string }[] },
): Promise<SyllabusConfig> {
  const res = await fetch(`/api/syllabus-config/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to update syllabus config");
  }
  const json = await res.json();
  return json.data;
}

/** Delete a syllabus config and all its completion records (BM) */
export async function deleteSyllabusConfig(
  id: string,
): Promise<{ success: boolean; deleted_completions: number }> {
  const res = await fetch(`/api/syllabus-config/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to delete syllabus config");
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Syllabus Part Completion (Teacher + BM)
// ─────────────────────────────────────────────────────────────────────────────

/** List syllabus part completions with filters */
export async function getSyllabusParts(params?: {
  company?: string;
  instructor?: string;
  course?: string;
  status?: string;
  academic_year?: string;
  syllabus_config?: string;
  program?: string;
}): Promise<SyllabusPartCompletion[]> {
  const query = new URLSearchParams();
  if (params?.company) query.set("company", params.company);
  if (params?.instructor) query.set("instructor", params.instructor);
  if (params?.course) query.set("course", params.course);
  if (params?.status) query.set("status", params.status);
  if (params?.academic_year) query.set("academic_year", params.academic_year);
  if (params?.syllabus_config) query.set("syllabus_config", params.syllabus_config);
  if (params?.program) query.set("program", params.program);

  const res = await fetch(`/api/syllabus-parts?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch syllabus parts");
  const json = await res.json();
  return json.data;
}

/** Teacher marks a part as "Pending Approval" */
export async function submitSyllabusPart(
  id: string,
  remarks?: string,
): Promise<SyllabusPartCompletion> {
  const res = await fetch(`/api/syllabus-parts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ remarks }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to submit part");
  }
  const json = await res.json();
  return json.data;
}

/** BM approves a part */
export async function approveSyllabusPart(id: string): Promise<SyllabusPartCompletion> {
  const res = await fetch(`/api/syllabus-parts/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to approve part");
  }
  const json = await res.json();
  return json.data;
}

/** BM rejects a part */
export async function rejectSyllabusPart(
  id: string,
  rejection_reason: string,
): Promise<SyllabusPartCompletion> {
  const res = await fetch(`/api/syllabus-parts/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rejection_reason }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to reject part");
  }
  const json = await res.json();
  return json.data;
}
