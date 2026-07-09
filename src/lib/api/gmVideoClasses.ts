/**
 * gmVideoClasses.ts
 *
 * Client-side API helper for the Group-Wise Video Classes feature.
 *
 * Doctypes:
 *   GM Video Subject  — subject under a Frappe Program (e.g. Mathematics under 10th State)
 *   GM Video Chapter  — chapter under a Subject (with optional YouTube/Vimeo video URL)
 *
 * All calls go through /api/proxy → Frappe with admin auth (same pattern as courseSchedule.ts).
 */

import apiClient from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GMVideoSubject {
  name: string;
  program: string;
  subject_name: string;
  icon_emoji: string;
  sort_order: number;
}

export interface GMVideoChapter {
  name: string;
  subject: string;
  chapter_name: string;
  video_url: string | null;
  description: string | null;
  sort_order: number;
}

// ── GM Video Subject CRUD ────────────────────────────────────────────────────

/** List all subjects for a given Program (e.g. "10th State") */
export async function getGMSubjects(program: string): Promise<GMVideoSubject[]> {
  const q = new URLSearchParams({
    filters: JSON.stringify([["program", "=", program]]),
    fields: JSON.stringify(["name", "program", "subject_name", "icon_emoji", "sort_order"]),
    order_by: "sort_order asc, subject_name asc",
    limit_page_length: "100",
  });
  const { data } = await apiClient.get(`/resource/GM%20Video%20Subject?${q}`);
  return data.data ?? [];
}

/** Get ALL subjects across all programs (for count badges on program row) */
export async function getAllGMSubjects(): Promise<GMVideoSubject[]> {
  const q = new URLSearchParams({
    fields: JSON.stringify(["name", "program", "subject_name", "icon_emoji", "sort_order"]),
    order_by: "program asc, sort_order asc",
    limit_page_length: "500",
  });
  const { data } = await apiClient.get(`/resource/GM%20Video%20Subject?${q}`);
  return data.data ?? [];
}

/** Create a new subject under a program */
export async function createGMSubject(payload: {
  program: string;
  subject_name: string;
  icon_emoji?: string;
  sort_order?: number;
}): Promise<GMVideoSubject> {
  const { data } = await apiClient.post("/resource/GM%20Video%20Subject", {
    icon_emoji: "📚",
    sort_order: 0,
    ...payload,
  });
  return data.data;
}

/** Update a subject's name / emoji / sort order */
export async function updateGMSubject(
  name: string,
  payload: Partial<Pick<GMVideoSubject, "subject_name" | "icon_emoji" | "sort_order">>
): Promise<void> {
  await apiClient.put(`/resource/GM%20Video%20Subject/${encodeURIComponent(name)}`, payload);
}

/** Delete a subject record */
export async function deleteGMSubject(name: string): Promise<void> {
  await apiClient.delete(`/resource/GM%20Video%20Subject/${encodeURIComponent(name)}`);
}

// ── GM Video Chapter CRUD ────────────────────────────────────────────────────

/** List all chapters for a subject */
export async function getGMChapters(subject: string): Promise<GMVideoChapter[]> {
  const q = new URLSearchParams({
    filters: JSON.stringify([["subject", "=", subject]]),
    fields: JSON.stringify(["name", "subject", "chapter_name", "video_url", "description", "sort_order"]),
    order_by: "sort_order asc, chapter_name asc",
    limit_page_length: "200",
  });
  const { data } = await apiClient.get(`/resource/GM%20Video%20Chapter?${q}`);
  return data.data ?? [];
}

/** Get chapter counts per subject (for count badges) */
export async function getGMChapterCounts(subjectNames: string[]): Promise<Map<string, { total: number; withVideo: number }>> {
  if (subjectNames.length === 0) return new Map();
  const q = new URLSearchParams({
    filters: JSON.stringify([["subject", "in", subjectNames]]),
    fields: JSON.stringify(["subject", "video_url"]),
    limit_page_length: "1000",
  });
  const { data } = await apiClient.get(`/resource/GM%20Video%20Chapter?${q}`);
  const chapters: { subject: string; video_url: string | null }[] = data.data ?? [];
  const map = new Map<string, { total: number; withVideo: number }>();
  for (const c of chapters) {
    const current = map.get(c.subject) ?? { total: 0, withVideo: 0 };
    map.set(c.subject, {
      total: current.total + 1,
      withVideo: current.withVideo + (c.video_url ? 1 : 0),
    });
  }
  return map;
}

/** Create a new chapter under a subject */
export async function createGMChapter(payload: {
  subject: string;
  chapter_name: string;
  video_url?: string;
  description?: string;
  sort_order?: number;
}): Promise<GMVideoChapter> {
  const { data } = await apiClient.post("/resource/GM%20Video%20Chapter", {
    sort_order: 0,
    ...payload,
  });
  return data.data;
}

/** Update a chapter's name, video URL, description, or sort order */
export async function updateGMChapter(
  name: string,
  payload: Partial<Pick<GMVideoChapter, "chapter_name" | "video_url" | "description" | "sort_order">>
): Promise<void> {
  await apiClient.put(`/resource/GM%20Video%20Chapter/${encodeURIComponent(name)}`, payload);
}

/** Delete a chapter record */
export async function deleteGMChapter(name: string): Promise<void> {
  await apiClient.delete(`/resource/GM%20Video%20Chapter/${encodeURIComponent(name)}`);
}

/** Fetch total count of active video classes */
export async function getGMVideoCount(): Promise<number> {
  const q = new URLSearchParams({
    filters: JSON.stringify([["video_url", "!=", ""]]),
    fields: JSON.stringify(["name"]),
    limit_page_length: "1000",
  });
  const { data } = await apiClient.get(`/resource/GM%20Video%20Chapter?${q}`);
  return (data.data ?? []).length;
}
