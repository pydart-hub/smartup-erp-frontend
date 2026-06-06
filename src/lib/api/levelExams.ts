import type {
  LevelExamAnswerPayload,
  LevelExamAttemptPayload,
  LevelExamDetail,
  LevelExamListItem,
  LevelExamResult,
} from "@/lib/types/levelExam";

export async function getParentLevelExams(studentId: string): Promise<LevelExamListItem[]> {
  const query = new URLSearchParams({ studentId });
  const res = await fetch(`/api/level-exams/parent/list?${query.toString()}`, { credentials: "include" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to fetch level exams");
  }
  const json = await res.json();
  return json.data ?? [];
}

export async function getParentLevelExamDetail(examId: string, studentId: string): Promise<LevelExamDetail> {
  const query = new URLSearchParams({ studentId });
  const res = await fetch(`/api/level-exams/parent/exams/${encodeURIComponent(examId)}?${query.toString()}`, { credentials: "include" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to fetch exam detail");
  }
  const json = await res.json();
  return json.data;
}

export async function startParentLevelExam(examId: string, studentId: string): Promise<{ attempt_id: string }> {
  const res = await fetch(`/api/level-exams/parent/exams/${encodeURIComponent(examId)}/start`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to start exam");
  }
  return res.json();
}

export async function getParentLevelExamAttempt(attemptId: string, studentId: string): Promise<LevelExamAttemptPayload> {
  const query = new URLSearchParams({ studentId });
  const res = await fetch(`/api/level-exams/parent/attempts/${encodeURIComponent(attemptId)}?${query.toString()}`, { credentials: "include" });
  if (res.status === 409) {
    throw new Error("ATTEMPT_TIMED_OUT");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to fetch attempt");
  }
  const json = await res.json();
  return json.data;
}

export async function saveParentLevelExamAnswer(
  attemptId: string,
  studentId: string,
  payload: LevelExamAnswerPayload,
): Promise<void> {
  const res = await fetch(`/api/level-exams/parent/attempts/${encodeURIComponent(attemptId)}/answer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, ...payload }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to save answer");
  }
}

export async function submitParentLevelExamAttempt(attemptId: string, studentId: string): Promise<LevelExamResult> {
  const res = await fetch(`/api/level-exams/parent/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to submit attempt");
  }
  const json = await res.json();
  return json.data;
}

export async function getParentLevelExamResult(attemptId: string, studentId: string): Promise<LevelExamResult> {
  const query = new URLSearchParams({ studentId });
  const res = await fetch(`/api/level-exams/parent/attempts/${encodeURIComponent(attemptId)}/result?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to fetch result");
  }
  const json = await res.json();
  return json.data;
}
