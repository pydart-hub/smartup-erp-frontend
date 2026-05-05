// ── Student Achievement types & client API ────────────────────────────────────

export interface SubjectGrade {
  subject: string;
  score: number;
  max_score: number;
  grade: string;
}

export type OverallGrade = "A+" | "A" | "B+" | "B" | "C" | "D" | "Pass" | "Fail" | "";

export interface StudentAchievement {
  name: string;
  student_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  school: string;
  program: string;
  branch: string;
  academic_year: string;
  overall_grade: OverallGrade;
  total_score: number;
  max_total: number;
  rank: number;
  remarks: string;
  subject_grades: SubjectGrade[];
}

export interface AchievementDashboard {
  total: number;
  totalSubjectEntries: number;
  aplustotal: number;
  fullAplusCount: number;
  passRate: number;
  gradeDistribution: { grade: string; count: number; pct: number }[];
  aplusDistribution: { count: number; students: number }[];
  subjectBreakdown: {
    subject: string;
    total: number;
    aplus: number;
    grades: { grade: string; count: number }[];
  }[];
  branchBreakdown: { branch: string; total: number; aplus: number; apluspct: number }[];
}

export interface AchievementListResponse {
  records: StudentAchievement[];
  page: number;
  limit: number;
}

export interface AcademicYearsResponse {
  years: { name: string; year_start_date?: string; year_end_date?: string }[];
}

const BASE = "/api/director/student-achievements";

export async function getAchievementYears(): Promise<AcademicYearsResponse> {
  const r = await fetch(`${BASE}?mode=years`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAchievementDashboard(year?: string): Promise<AchievementDashboard> {
  const p = new URLSearchParams({ mode: "dashboard" });
  if (year) p.set("year", year);
  const r = await fetch(`${BASE}?${p}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAchievements(params: {
  year?: string;
  branch?: string;
  grade?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AchievementListResponse> {
  const p = new URLSearchParams({ mode: "list" });
  if (params.year) p.set("year", params.year);
  if (params.branch) p.set("branch", params.branch);
  if (params.grade) p.set("grade", params.grade);
  if (params.search) p.set("search", params.search);
  if (params.page !== undefined) p.set("page", String(params.page));
  if (params.limit !== undefined) p.set("limit", String(params.limit));
  const r = await fetch(`${BASE}?${p}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createAchievement(data: Omit<StudentAchievement, "name">): Promise<{ name: string; ok: boolean }> {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateAchievement(data: StudentAchievement): Promise<{ ok: boolean }> {
  const r = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteAchievement(name: string): Promise<{ ok: boolean }> {
  const r = await fetch(`${BASE}?name=${encodeURIComponent(name)}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
