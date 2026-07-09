/**
 * gmStudyMaterials.ts
 *
 * Client-side API helper for the Group-Wise Study Materials Link Assign feature.
 *
 * Doctypes:
 *   GM Study Material Subject  — subject under a Program (e.g. Mathematics under 8th State)
 *   GM Study Material Link     — material item (title + external link) under a Subject
 */

import apiClient from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GMStudyMaterialSubject {
  name: string;
  program: string;
  subject_name: string;
  icon_emoji: string;
  sort_order: number;
}

export interface GMStudyMaterialLink {
  name: string;
  subject: string;
  material_title: string;
  material_url: string;
  description: string | null;
  sort_order: number;
}

// ── GM Study Material Subject CRUD ───────────────────────────────────────────

/** List all subjects for a given Program (e.g. "8th State") */
export async function getGMStudySubjects(program: string): Promise<GMStudyMaterialSubject[]> {
  const q = new URLSearchParams({
    filters: JSON.stringify([["program", "=", program]]),
    fields: JSON.stringify(["name", "program", "subject_name", "icon_emoji", "sort_order"]),
    order_by: "sort_order asc, subject_name asc",
    limit_page_length: "100",
  });
  const { data } = await apiClient.get(`/resource/GM%20Study%20Material%20Subject?${q}`);
  return data.data ?? [];
}

/** Get ALL subjects across all programs */
export async function getAllGMStudySubjects(): Promise<GMStudyMaterialSubject[]> {
  const q = new URLSearchParams({
    fields: JSON.stringify(["name", "program", "subject_name", "icon_emoji", "sort_order"]),
    order_by: "program asc, sort_order asc",
    limit_page_length: "500",
  });
  const { data } = await apiClient.get(`/resource/GM%20Study%20Material%20Subject?${q}`);
  return data.data ?? [];
}

/** Create a new subject under a program */
export async function createGMStudySubject(payload: {
  program: string;
  subject_name: string;
  icon_emoji?: string;
  sort_order?: number;
}): Promise<GMStudyMaterialSubject> {
  const { data } = await apiClient.post("/resource/GM%20Study%20Material%20Subject", {
    icon_emoji: "📚",
    sort_order: 0,
    ...payload,
  });
  return data.data;
}

/** Update a subject's name / emoji */
export async function updateGMStudySubject(
  name: string,
  payload: Partial<Pick<GMStudyMaterialSubject, "subject_name" | "icon_emoji" | "sort_order">>
): Promise<void> {
  await apiClient.put(`/resource/GM%20Study%20Material%20Subject/${encodeURIComponent(name)}`, payload);
}

/** Delete a subject record */
export async function deleteGMStudySubject(name: string): Promise<void> {
  await apiClient.delete(`/resource/GM%20Study%20Material%20Subject/${encodeURIComponent(name)}`);
}

// ── GM Study Material Link CRUD ──────────────────────────────────────────────

/** List all study material links for a subject */
export async function getGMStudyMaterialLinks(subject: string): Promise<GMStudyMaterialLink[]> {
  const q = new URLSearchParams({
    filters: JSON.stringify([["subject", "=", subject]]),
    fields: JSON.stringify(["name", "subject", "material_title", "material_url", "description", "sort_order"]),
    order_by: "sort_order asc, material_title asc",
    limit_page_length: "200",
  });
  const { data } = await apiClient.get(`/resource/GM%20Study%20Material%20Link?${q}`);
  return data.data ?? [];
}

/** Create a new study material link under a subject */
export async function createGMStudyMaterialLink(payload: {
  subject: string;
  material_title: string;
  material_url: string;
  description?: string;
  sort_order?: number;
}): Promise<GMStudyMaterialLink> {
  const { data } = await apiClient.post("/resource/GM%20Study%20Material%20Link", {
    sort_order: 0,
    ...payload,
  });
  return data.data;
}

/** Update a study material link's title or URL */
export async function updateGMStudyMaterialLink(
  name: string,
  payload: Partial<Pick<GMStudyMaterialLink, "material_title" | "material_url" | "description" | "sort_order">>
): Promise<void> {
  await apiClient.put(`/resource/GM%20Study%20Material%20Link/${encodeURIComponent(name)}`, payload);
}

/** Delete a study material link */
export async function deleteGMStudyMaterialLink(name: string): Promise<void> {
  await apiClient.delete(`/resource/GM%20Study%20Material%20Link/${encodeURIComponent(name)}`);
}

/** Fetch total count of active study materials */
export async function getGMStudyMaterialsCount(): Promise<number> {
  const q = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    limit_page_length: "1000",
  });
  const { data } = await apiClient.get(`/resource/GM%20Study%20Material%20Link?${q}`);
  return (data.data ?? []).length;
}
