import { readFile } from "fs/promises";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { callLevelExamMethod } from "@/lib/server/frappeLevelExam";
import type {
  LevelExamAttemptPayload,
  LevelExamDetail,
  LevelExamListItem,
  LevelExamResult,
  LevelExamSubject,
  AttemptStatus,
} from "@/lib/types/levelExam";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const DOCTYPES = {
  studentSnapshot: process.env.FRAPPE_LEVEL_EXAM_STUDENT_DOCTYPE || "Level Exam Student Snapshot",
  exam: process.env.FRAPPE_LEVEL_EXAM_DOCTYPE || "Level Exam",
  assignment: process.env.FRAPPE_LEVEL_EXAM_ASSIGNMENT_DOCTYPE || "Level Exam Assignment",
  assignmentStudent: process.env.FRAPPE_LEVEL_EXAM_ASSIGNMENT_STUDENT_DOCTYPE || "Level Exam Assignment Student",
  attempt: process.env.FRAPPE_LEVEL_EXAM_ATTEMPT_DOCTYPE || "Level Exam Attempt",
  attemptAnswer: process.env.FRAPPE_LEVEL_EXAM_ATTEMPT_ANSWER_DOCTYPE || "Level Exam Attempt Answer",
  source: process.env.FRAPPE_LEVEL_EXAM_SOURCE_DOCTYPE || "Level Exam Source",
  question: process.env.FRAPPE_LEVEL_EXAM_QUESTION_DOCTYPE || "Level Exam Question",
  paper: process.env.FRAPPE_LEVEL_EXAM_PAPER_DOCTYPE || "Level Exam Paper",
};

type OptionRow = {
  id: string;
  option_key: string;
  option_text: string;
  is_correct?: boolean;
};

type ExamQuestionRow = {
  id: string;
  stem: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  display_order: number;
  options: OptionRow[];
};

type StoredExamRecord = {
  id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  level_code: string;
  board_code?: "state" | "cbse";
  instructions: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  available_from: string | null;
  available_until: string | null;
  questions: ExamQuestionRow[];
  source_file_name?: string;
  source_json_file?: string;
  source_kind?: string;
  conversion_status?: string;
  published_at?: string | null;
};

type JsonBankOption = {
  id?: string;
  option_key: string;
  option_text: string;
};

type JsonBankQuestion = {
  id: string;
  source_level?: string;
  question_number?: number;
  question_text: string;
  options?: JsonBankOption[];
  correct_option_key?: string;
  usable_for_exam?: boolean;
  needs_review?: boolean;
};

type JsonBankTarget = {
  total_questions?: number;
  questions?: JsonBankQuestion[];
};

type JsonBankSubjectFile = {
  subject?: string;
  source_file?: string;
  conversion_status?: string;
  generated_targets?: Record<string, JsonBankTarget>;
};

type JsonBankIndexEntry = {
  subject?: string;
  output_file?: string;
  source_file?: string;
  conversion_status?: string;
};

type JsonBankIndex = {
  subjects?: JsonBankIndexEntry[];
};

const LEVEL_EXAM_JSON_INDEX = resolve(process.cwd(), "docs", "Level Test", "JSON", "index.json");

let docsJsonExamCache: StoredExamRecord[] | null = null;

function normalizeSubjectCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function makeQuestionBankExamId(levelCode: string, subjectName: string) {
  return `questionbank:${normalizeLevelCode(levelCode)}:${normalizeSubjectCode(subjectName)}`;
}

function normalizeLevelCode(value?: string | null) {
  const match = String(value || "").match(/\b(10|[5-9])(?:st|nd|rd|th)?\b/i);
  return match?.[1] || String(value || "");
}

function titleForLevelExam(levelCode: string, subjectName: string) {
  return `${levelCode}th ${subjectName} Level Exam`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function mapJsonBankQuestion(question: JsonBankQuestion, index: number): ExamQuestionRow | null {
  const options = Array.isArray(question.options) ? question.options : [];
  const correctOptionKey = String(question.correct_option_key || "").trim();
  const usableOptions = options.filter((option) => option?.option_key && option?.option_text);
  if (!question.id || !question.question_text || usableOptions.length < 2 || !correctOptionKey) {
    return null;
  }

  return {
    id: String(question.id),
    stem: String(question.question_text),
    explanation: "",
    difficulty: "medium",
    marks: 1,
    display_order: index + 1,
    options: usableOptions.map((option) => ({
      id: String(option.id || `${question.id}-${option.option_key}`),
      option_key: String(option.option_key),
      option_text: String(option.option_text),
      is_correct: String(option.option_key) === correctOptionKey,
    })),
  };
}

async function loadDocsJsonExamRecords() {
  if (docsJsonExamCache) return docsJsonExamCache;

  const index = await readJsonFile<JsonBankIndex>(LEVEL_EXAM_JSON_INDEX);
  const exams: StoredExamRecord[] = [];

  for (const entry of index.subjects || []) {
    if (!entry.output_file) continue;

    const outputPath = resolve(process.cwd(), entry.output_file);
    const subjectDoc = await readJsonFile<JsonBankSubjectFile>(outputPath);
    const subjectName = String(subjectDoc.subject || entry.subject || "").trim();
    if (!subjectName) continue;

    for (const [targetLevel, target] of Object.entries(subjectDoc.generated_targets || {})) {
      const levelCode = normalizeLevelCode(targetLevel);
      const targetQuestions = Array.isArray(target.questions) ? target.questions : [];
      const questions = targetQuestions
        .filter((question) => question?.usable_for_exam !== false && question?.needs_review !== true)
        .map((question, index) => mapJsonBankQuestion(question, index))
        .filter((question): question is ExamQuestionRow => Boolean(question));

      if (!levelCode || questions.length === 0) continue;

      exams.push({
        id: makeQuestionBankExamId(levelCode, subjectName),
        title: titleForLevelExam(levelCode, subjectName),
        subject_code: normalizeSubjectCode(subjectName),
        subject_name: subjectName,
        level_code: levelCode,
        instructions: "Choose the correct option for each question. Result will be shown only after submission.",
        duration_minutes: Math.max(20, questions.length),
        total_questions: questions.length,
        total_marks: questions.length,
        available_from: null,
        available_until: null,
        questions,
        source_file_name: subjectDoc.source_file || entry.source_file || "",
        source_json_file: outputPath,
        source_kind: "docs_json_bank",
        conversion_status: subjectDoc.conversion_status || entry.conversion_status || "",
        published_at: null,
      });
    }
  }

  docsJsonExamCache = exams.sort((a, b) => {
    const levelCompare = Number(a.level_code) - Number(b.level_code);
    return levelCompare !== 0 ? levelCompare : a.subject_name.localeCompare(b.subject_name);
  });
  return docsJsonExamCache;
}

function isEnabled() {
  return Boolean(FRAPPE_URL && FRAPPE_API_KEY && FRAPPE_API_SECRET);
}

function headers() {
  return {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

function isMissingDoctypeError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("doctype") && (lower.includes("not found") || lower.includes("does not exist"));
}

function isAppMethodUnavailableError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("app level_exam is not installed") || lower.includes("failed to get method for command level_exam.api.methods");
}

function examStatus(record: { available_from?: string | null; available_until?: string | null }, attemptStatus?: string) {
  if (attemptStatus === "submitted" || attemptStatus === "auto_submitted") return "completed";
  if (attemptStatus === "in_progress") return "in_progress";
  if (!record.available_from || !record.available_until) return "draft";
  const now = Date.now();
  const start = new Date(record.available_from).getTime();
  if (now < start) return "upcoming";
  return "available";
}

function getRemainingSeconds(startedAt: string, durationMinutes: number) {
  const end = new Date(startedAt).getTime() + durationMinutes * 60_000;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

function toFrappeDatetime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function paperTotals(paperDoc: Record<string, unknown>) {
  const questions = Array.isArray(paperDoc.questions) ? paperDoc.questions as Array<Record<string, unknown>> : [];
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, row) => sum + Number(row.marks || 0), 0);
  return { totalQuestions, totalMarks };
}

function formatAssignmentAvailabilityDate(assignmentDoc: Record<string, unknown>, field: "start" | "end") {
  const scheduleDate = String(assignmentDoc.schedule_date || "");
  const timeValue = field === "start"
    ? String(assignmentDoc.start_time || "00:00:00")
    : String(assignmentDoc.end_time || "23:59:59");
  return scheduleDate ? `${scheduleDate}T${timeValue}` : "";
}

function toAttemptStatusLabel(status: string): AttemptStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "auto submitted") return "auto_submitted";
  if (normalized === "submitted") return "submitted";
  return "in_progress";
}

function assignmentStatusLabel(value: unknown) {
  return String(value || "Assigned").trim().toLowerCase() as LevelExamListItem["assignment_status"];
}

function sanitizeAssignmentStudentRow(row: Record<string, unknown>) {
  return {
    student: String(row.student || ""),
    student_name: String(row.student_name || ""),
    program: String(row.program || ""),
    student_group: String(row.student_group || ""),
    assignment_status: String(row.assignment_status || "Assigned"),
  };
}

function sanitizeAttemptAnswerRow(row: Record<string, unknown>) {
  return {
    question: String(row.question || ""),
    selected_option_key: String(row.selected_option_key || ""),
    correct_option_key: String(row.correct_option_key || ""),
    is_correct: Number(row.is_correct || 0) ? 1 : 0,
    marks_awarded: Number(row.marks_awarded || 0),
  };
}

function parseRecordJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    return { raw: text };
  }
}

async function resourceList(doctype: string, filters: unknown[][], fields: string[], limit = 1000, orderBy?: string) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(limit),
  });
  if (orderBy) params.set("order_by", orderBy);
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`,
    { headers: headers(), cache: "no-store" },
  );
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(json.exception || json.message || `List failed for ${doctype}`));
  }
  return Array.isArray(json.data) ? json.data as Array<Record<string, unknown>> : [];
}

async function resourceCreate(doctype: string, payload: Record<string, unknown>) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ doctype, ...payload }),
    cache: "no-store",
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(json.exception || json.message || `Create failed for ${doctype}`));
  }
  return (json.data || {}) as Record<string, unknown>;
}

async function resourceUpdate(doctype: string, name: string, payload: Record<string, unknown>) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(json.exception || json.message || `Update failed for ${doctype}`));
  }
  return (json.data || {}) as Record<string, unknown>;
}

async function resourceGet(doctype: string, name: string) {
  const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    headers: headers(),
    cache: "no-store",
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(json.exception || json.message || `Read failed for ${doctype}`));
  }
  return (json.data || {}) as Record<string, unknown>;
}

async function upsertDoc(
  doctype: string,
  externalField: string,
  externalValue: string,
  payload: Record<string, unknown>,
) {
  try {
    const matches = await resourceList(doctype, [[externalField, "=", externalValue]], ["name"], 1);
    const existingName = matches[0]?.name ? String(matches[0].name) : null;
    if (!existingName) {
      return resourceCreate(doctype, { name: externalValue, ...payload, [externalField]: externalValue });
    }
    return resourceUpdate(doctype, existingName, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("field not permitted in query")) {
      throw error;
    }

    try {
      return await resourceUpdate(doctype, externalValue, payload);
    } catch {
      return resourceCreate(doctype, { name: externalValue, ...payload, [externalField]: externalValue });
    }
  }
}

async function bestEffort<T>(task: () => Promise<T>): Promise<T | null> {
  if (!isEnabled()) return null;
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingDoctypeError(message)) {
      console.warn(`[level-exams] Frappe Level Exam doctype missing: ${message}`);
      return null;
    }
    throw error;
  }
}

function normalizeStoredExam(raw: Record<string, unknown>): StoredExamRecord | null {
  const fromJson = parseRecordJson<StoredExamRecord | null>(raw.exam_json, null);
  if (fromJson?.id && Array.isArray(fromJson.questions)) {
    return {
      ...fromJson,
      level_code: normalizeLevelCode(fromJson.level_code),
    };
  }
  if (!raw.exam_id) return null;
  return {
    id: String(raw.exam_id),
    title: String(raw.title || ""),
    subject_code: String(raw.subject_code || ""),
    subject_name: String(raw.subject_name || raw.subject_code || ""),
    level_code: normalizeLevelCode(String(raw.level_code || "")),
    board_code: raw.board_code === "state" || raw.board_code === "cbse" ? raw.board_code : undefined,
    instructions: String(raw.instructions || ""),
    duration_minutes: Number(raw.duration_minutes || 20),
    total_questions: Number(raw.total_questions || 0),
    total_marks: Number(raw.total_marks || 0),
    available_from: raw.available_from ? String(raw.available_from) : null,
    available_until: raw.available_until ? String(raw.available_until) : null,
    questions: [],
  };
}

function buildAttemptPayloadFromExam(
  exam: StoredExamRecord,
  studentId: string,
  studentName: string,
  attemptId: string,
  startedAt: string,
  selected: Map<string, string | null>,
): LevelExamAttemptPayload {
  return {
    attempt_id: attemptId,
    exam_id: exam.id,
    title: exam.title,
    subject_name: exam.subject_name,
    level_code: exam.level_code as LevelExamAttemptPayload["level_code"],
    board_code: exam.board_code,
    duration_minutes: exam.duration_minutes,
    total_questions: exam.total_questions,
    total_marks: exam.total_marks,
    started_at: startedAt,
    remaining_seconds: getRemainingSeconds(startedAt, exam.duration_minutes),
    child: {
      student_id: studentId,
      student_name: studentName,
    },
    questions: exam.questions
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((question) => ({
        id: question.id,
        stem: question.stem,
        explanation: question.explanation,
        difficulty: question.difficulty,
        marks: question.marks,
        display_order: question.display_order,
        selected_option_id: selected.get(question.id) ?? null,
        options: question.options.map((option) => ({
          id: option.id,
          option_key: option.option_key,
          option_text: option.option_text,
          is_correct: option.is_correct,
        })),
      })),
  };
}

function gradePayload(payload: LevelExamAttemptPayload, status: AttemptStatus, submittedAt: string): LevelExamResult {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const questions = payload.questions.map((question) => {
    const correctOption = question.options.find((option) => (option as OptionRow).is_correct);
    const selected = question.selected_option_id ?? null;
    const isCorrect = !!selected && selected === correctOption?.id;
    if (!selected) unanswered += 1;
    else if (isCorrect) {
      correct += 1;
      score += question.marks;
    } else {
      wrong += 1;
    }
    return {
      question_id: question.id,
      stem: question.stem,
      marks: question.marks,
      selected_option_id: selected,
      correct_option_id: correctOption?.id || "",
      is_correct: isCorrect,
      explanation: question.explanation,
      options: question.options.map((option) => ({
        ...option,
        is_correct: (option as OptionRow).is_correct,
      })),
    };
  });

  const percentage = payload.total_marks > 0 ? Math.round((score / payload.total_marks) * 100) : 0;
  return {
    attempt_id: payload.attempt_id,
    exam_id: payload.exam_id,
    title: payload.title,
    subject_name: payload.subject_name,
    level_code: payload.level_code,
    board_code: payload.board_code,
    child: payload.child,
    submitted_at: submittedAt,
    status,
    score_obtained: score,
    total_marks: payload.total_marks,
    percentage,
    correct_count: correct,
    wrong_count: wrong,
    unanswered_count: unanswered,
    ai_summary: {
      headline: percentage >= 80 ? "Strong performance" : percentage >= 50 ? "Steady progress" : "Needs support",
      overview: `${payload.child.student_name} scored ${score}/${payload.total_marks}.`,
      strengths: [],
      focus_areas: [],
      exam_summary: [],
      best_topic: null,
      priority_topic: null,
      study_topics: [],
      next_step: "Review incorrect questions and practise the weak topics.",
    },
    questions,
  };
}

async function getStudentName(studentId: string) {
  try {
    const rows = await resourceList(DOCTYPES.studentSnapshot, [["student_id", "=", studentId]], ["student_name"], 1);
    if (rows[0]?.student_name) return String(rows[0].student_name);
  } catch {
    // Snapshot doctype is optional for runtime lookups.
  }

  try {
    const rows = await resourceList("Student", [["name", "=", studentId]], ["student_name"], 1);
    if (rows[0]?.student_name) return String(rows[0].student_name);
  } catch {
    // Ignore and fall back to generic label.
  }

  return "Student";
}

async function getExamDocById(examId: string) {
  const rows = await resourceList(
    DOCTYPES.exam,
    [["exam_id", "=", examId]],
    ["name", "exam_id", "title", "subject_code", "subject_name", "level_code", "board_code", "instructions", "duration_minutes", "total_questions", "total_marks", "available_from", "available_until", "exam_status", "exam_json"],
    1,
  );
  return rows[0] || null;
}

async function getAssignmentDoc(examId: string, studentId: string) {
  try {
    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(DOCTYPES.assignment)}/${encodeURIComponent(`${examId}::${studentId}`)}`,
      { headers: headers(), cache: "no-store" },
    );
    const json = await parseJson(res);
    if (!res.ok) return null;
    return (json.data || null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

async function getAssignmentDocByName(name: string) {
  try {
    return await resourceGet(DOCTYPES.assignment, name);
  } catch {
    return null;
  }
}

async function getPaperDocByName(name: string) {
  try {
    return await resourceGet(DOCTYPES.paper, name);
  } catch {
    return null;
  }
}

async function getQuestionDocByName(name: string) {
  try {
    return await resourceGet(DOCTYPES.question, name);
  } catch {
    return null;
  }
}

async function isPaperFullyPublished(exam: StoredExamRecord, paperName: string) {
  const paperDoc = await getPaperDocByName(paperName);
  if (!paperDoc) return false;
  if (String(paperDoc.status || "") !== "Published") return false;

  const paperQuestionRows = Array.isArray(paperDoc.questions)
    ? paperDoc.questions as Array<Record<string, unknown>>
    : [];

  if (paperQuestionRows.length !== exam.total_questions) return false;

  const linkedQuestionCount = paperQuestionRows
    .map((row) => String(row.question || "").trim())
    .filter(Boolean)
    .length;

  if (linkedQuestionCount !== exam.total_questions) return false;

  return true;
}

async function getAssignmentStudentRows(studentId: string) {
  return resourceList(
    DOCTYPES.assignmentStudent,
    [["student", "=", studentId], ["parenttype", "=", DOCTYPES.assignment]],
    ["name", "parent", "student", "student_name", "program", "student_group", "assignment_status"],
    1000,
    "modified desc",
  );
}

async function getLatestAttemptForAssignment(assignmentName: string, studentId: string) {
  const rows = await resourceList(
    DOCTYPES.attempt,
    [["assignment", "=", assignmentName], ["student", "=", studentId]],
    ["name", "assignment", "exam_paper", "student", "student_name", "subject", "class_level", "started_on", "submitted_on", "status", "percentage", "score_obtained", "total_marks", "correct_count", "wrong_count", "unanswered_count"],
    5,
    "modified desc",
  );
  return rows[0] || null;
}

async function getAttemptDoc(attemptId: string) {
  const rows = await resourceList(
    DOCTYPES.attempt,
    [["attempt_id", "=", attemptId]],
    ["name", "status", "started_at", "submitted_at", "remaining_seconds", "answered_count", "duration_minutes", "total_questions", "total_marks", "exam_id", "student", "student_name", "title", "subject_name", "level_code", "board_code", "score_obtained", "percentage", "correct_count", "wrong_count", "unanswered_count"],
    1,
  );
  return rows[0] || null;
}

async function fetchQuestionBankExamRecords() {
  return loadDocsJsonExamRecords();
}

async function getQuestionBankExamById(examId: string) {
  const exams = await fetchQuestionBankExamRecords();
  return exams.find((exam) => exam.id === examId) || null;
}

async function getPublishedExamIdsSafe(exams: StoredExamRecord[]) {
  if (!isEnabled()) return new Set<string>();

  try {
    const paperRows = await resourceList(
      DOCTYPES.paper,
      [],
      ["name", "paper_title", "subject", "class_level", "status", "total_questions"],
      5000,
    );

    const examMap = new Map(
      exams.map((exam) => [
        `${normalizeLevelCode(exam.level_code)}::${exam.subject_name.trim().toLowerCase()}`,
        exam,
      ]),
    );

    const publishedExamIds = new Set<string>();

    for (const row of paperRows) {
      if (String(row.status || "") !== "Published") continue;

      const levelCode = normalizeLevelCode(String(row.class_level || ""));
      const subjectName = String(row.subject || "").trim();
      if (!levelCode || !subjectName) continue;

      const exam = examMap.get(`${levelCode}::${subjectName.toLowerCase()}`);
      if (!exam) continue;

      const paperName = String(row.name || "");
      if (!paperName) continue;
      if (!(await isPaperFullyPublished(exam, paperName))) continue;

      publishedExamIds.add(exam.id);
    }

    return publishedExamIds;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingDoctypeError(message)) {
      console.warn(`[level-exams] Assignment doctype missing while listing catalog: ${message}`);
      return new Set<string>();
    }
    console.warn(`[level-exams] Failed to read published assignment state: ${message}`);
    return new Set<string>();
  }
}

function isExistingQuestionReusable(
  existingQuestion: Record<string, unknown> | undefined,
  question: ExamQuestionRow,
) {
  if (!existingQuestion) return false;
  if (Number(existingQuestion.is_active || 0) !== 1) return false;
  if (String(existingQuestion.review_status || "").trim() !== "Approved") return false;
  if (String(existingQuestion.correct_option_key || "").trim() !== (question.options.find((option) => option.is_correct)?.option_key || "")) {
    return false;
  }
  return true;
}

async function ensureQuestionDoc(
  exam: StoredExamRecord,
  question: ExamQuestionRow,
  existingQuestionsByText?: Map<string, Record<string, unknown>>,
) {
  const existingQuestion = existingQuestionsByText?.get(question.stem.trim()) || null;
  const payload = {
    subject: exam.subject_name,
    class_level: exam.level_code,
    question_text: question.stem,
    difficulty: question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1),
    correct_option_key: question.options.find((option) => option.is_correct)?.option_key || "",
    explanation: question.explanation || "",
    is_active: 1,
    review_status: "Approved",
    options: question.options.map((option) => ({
      option_key: option.option_key,
      option_text: option.option_text,
    })),
  };

  if (existingQuestion?.name) {
    if (!isExistingQuestionReusable(existingQuestion, question)) {
      await resourceUpdate(DOCTYPES.question, String(existingQuestion.name), payload);
    }
    return String(existingQuestion.name);
  }

  const created = await resourceCreate(DOCTYPES.question, payload);
  return String(created.name || "");
}

async function ensurePaperDoc(exam: StoredExamRecord) {
  const existingQuestionDocs = await resourceList(
    DOCTYPES.question,
    [
      ["subject", "=", exam.subject_name],
      ["class_level", "=", exam.level_code],
    ],
    ["name", "question_text", "is_active", "review_status", "correct_option_key"],
    5000,
  );

  const existingQuestionsByText = new Map<string, Record<string, unknown>>();
  for (const row of existingQuestionDocs) {
    const questionText = String(row.question_text || "").trim();
    if (questionText && !existingQuestionsByText.has(questionText)) {
      existingQuestionsByText.set(questionText, row);
    }
  }

  const questionRows = [];
  for (const question of exam.questions.slice().sort((a, b) => a.display_order - b.display_order)) {
    const questionName = await ensureQuestionDoc(exam, question, existingQuestionsByText);
    if (!questionName) continue;
    questionRows.push({
      question: questionName,
      marks: question.marks,
      display_order: question.display_order,
    });
  }

  if (questionRows.length === 0) {
    throw new Error(`No valid questions available for ${exam.title}`);
  }

  const matches = await resourceList(
    DOCTYPES.paper,
    [
      ["paper_title", "=", exam.title],
      ["subject", "=", exam.subject_name],
      ["class_level", "=", exam.level_code],
    ],
    ["name"],
    1,
  );

  const payload = {
    paper_title: exam.title,
    subject: exam.subject_name,
    class_level: exam.level_code,
    duration_minutes: exam.duration_minutes,
    instructions: exam.instructions,
    total_questions: questionRows.length,
    total_marks: questionRows.reduce((sum, row) => sum + Number(row.marks || 0), 0),
    status: "Published",
    questions: questionRows,
  };

  if (matches[0]?.name) {
    await resourceUpdate(DOCTYPES.paper, String(matches[0].name), payload);
    return String(matches[0].name);
  }

  const created = await resourceCreate(DOCTYPES.paper, payload);
  return String(created.name || "");
}

async function fallbackAssignExamToTargets(
  levelCodes: string[],
  examIds: string[],
  students: Array<{
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    level_code: string | null;
    board_code?: string | null;
  }>,
) {
  let assignedCount = 0;
  const studentUpdateBatchSize = 25;

  for (const examId of examIds) {
    const exam = await getQuestionBankExamById(examId);
    if (!exam) continue;

    const paperName = await ensurePaperDoc(exam);

    const matchingStudents = students.filter((student) =>
      student.level_code === exam.level_code &&
      levelCodes.includes(exam.level_code) &&
      (!exam.board_code || !student.board_code || student.board_code === exam.board_code),
    );
    if (matchingStudents.length === 0) continue;

    const existingAssignments = await resourceList(
      DOCTYPES.assignment,
      [
        ["exam_paper", "=", paperName],
        ["class_level", "=", exam.level_code],
        ["status", "!=", "Closed"],
      ],
      ["name"],
      1,
    );

    const assignmentPayload = {
      assignment_title: `${exam.title} - ${exam.level_code}th Assignment`,
      exam_paper: paperName,
      subject: exam.subject_name,
      class_level: exam.level_code,
      assignment_mode: "By Class",
      program: matchingStudents[0]?.program || `${exam.level_code}th`,
      student_group: "",
      schedule_date: new Date().toISOString().slice(0, 10),
      start_time: "00:00:00",
      end_time: "23:59:59",
      status: "Published",
    };

    let assignmentName = existingAssignments[0]?.name ? String(existingAssignments[0].name) : "";

    if (existingAssignments[0]?.name) {
      await resourceUpdate(DOCTYPES.assignment, assignmentName, assignmentPayload);
    } else {
      const seedStudent = matchingStudents[0];
      const createdAssignment = await resourceCreate(DOCTYPES.assignment, {
        ...assignmentPayload,
        students: seedStudent
          ? [{
              student: seedStudent.student_id,
              student_name: seedStudent.student_name,
              program: seedStudent.program,
              student_group: seedStudent.student_group || "",
              assignment_status: "Assigned",
            }]
          : [],
      });
      assignmentName = String(createdAssignment.name || "");
      if (seedStudent) assignedCount += 1;
    }

    if (!assignmentName) continue;

    const assignmentDoc = await resourceGet(DOCTYPES.assignment, assignmentName);
    const existingStudents = Array.isArray(assignmentDoc.students)
      ? assignmentDoc.students as Array<Record<string, unknown>>
      : [];
    const existingStudentIds = new Set(
      existingStudents
        .map((row) => String(row.student || "").trim())
        .filter(Boolean),
    );

    const missingStudents = matchingStudents.filter((student) => !existingStudentIds.has(student.student_id));
    let mergedStudents = [...existingStudents];

    for (let index = 0; index < missingStudents.length; index += studentUpdateBatchSize) {
      const batch = missingStudents.slice(index, index + studentUpdateBatchSize);
      mergedStudents = [
        ...mergedStudents,
        ...batch.map((student) => ({
            student: student.student_id,
            student_name: student.student_name,
            program: student.program,
            student_group: student.student_group || "",
            assignment_status: "Assigned",
        })),
      ];

      await resourceUpdate(DOCTYPES.assignment, assignmentName, {
        ...assignmentPayload,
        students: mergedStudents,
      });
    }

    assignedCount += missingStudents.length;
  }

  return {
    assigned_count: assignedCount,
    target_student_count: students.filter((student) => student.level_code && levelCodes.includes(student.level_code)).length,
    level_codes: levelCodes,
  };
}

export const frappeLevelExamDoctypeSync = {
  isEnabled,

  async syncStudentSnapshot(snapshot: {
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    is_active: boolean;
  }) {
    await bestEffort(async () => {
      const programLower = snapshot.program.toLowerCase();
      await upsertDoc(DOCTYPES.studentSnapshot, "student_id", snapshot.student_id, {
        student: snapshot.student_id,
        student_name: snapshot.student_name,
        branch: snapshot.branch,
        program: snapshot.program,
        student_group: snapshot.student_group,
        level_code: snapshot.program.match(/\b(10|[5-9])(?:st|nd|rd|th)?\b/i)?.[1] || "",
        board_code: programLower.includes("cbse") ? "cbse" : (programLower.includes("state") ? "state" : ""),
        is_active: snapshot.is_active ? 1 : 0,
        snapshot_json: JSON.stringify(snapshot),
      });
    });
  },

  async syncExamRecord(exam: StoredExamRecord) {
    return bestEffort(async () => upsertDoc(DOCTYPES.exam, "exam_id", exam.id, {
      title: exam.title,
      subject_code: exam.subject_code,
      subject_name: exam.subject_name,
      level_code: exam.level_code,
      board_code: exam.board_code || "",
      instructions: exam.instructions,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      total_marks: exam.total_marks,
      available_from: exam.available_from,
      available_until: exam.available_until,
      exam_status: examStatus(exam),
      source_file_name: exam.source_file_name || "",
      source_json_file: exam.source_json_file || "",
      source_kind: exam.source_kind || "",
      conversion_status: exam.conversion_status || "",
      published_at: exam.published_at || null,
      exam_json: JSON.stringify(exam),
    }));
  },

  async assignExamToTargets(
    levelCodes: string[],
    examIds: string[],
    students: Array<{
      student_id: string;
      student_name: string;
      branch: string;
      program: string;
      student_group: string;
      level_code: string | null;
      board_code?: string | null;
    }>,
  ) {
    return bestEffort(async () => {
      const paperNames: string[] = [];
      for (const examId of examIds) {
        const exam = await getQuestionBankExamById(examId);
        if (!exam) continue;
        paperNames.push(await ensurePaperDoc(exam));
      }

      if (paperNames.length === 0) {
        return {
          assigned_count: 0,
          target_student_count: 0,
          level_codes: levelCodes,
        };
      }

      try {
        return await callLevelExamMethod<{
          assigned_count: number;
          target_student_count: number;
          level_codes: string[];
        }>("assign_level_exam_to_targets", {
          exam_papers: paperNames,
          class_levels: levelCodes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isAppMethodUnavailableError(message)) {
          console.warn("[level-exams] Frappe level_exam app method is unavailable, using fallback assignment path.");
        } else {
          console.warn(`[level-exams] Bulk Frappe assignment method failed, using fallback path: ${message}`);
        }
        return fallbackAssignExamToTargets(levelCodes, examIds, students);
      }
    });
  },

  async syncExam(detail: LevelExamDetail) {
    return bestEffort(async () => {
      const existingDoc = await getExamDocById(detail.exam_id);
      const existingExam = existingDoc ? normalizeStoredExam(existingDoc) : null;
      const mergedExamJson = existingExam
        ? {
            ...existingExam,
            title: detail.title,
            subject_code: detail.subject_code,
            subject_name: detail.subject_name,
            level_code: normalizeLevelCode(detail.level_code),
            board_code: detail.board_code || existingExam.board_code,
            instructions: detail.instructions,
            duration_minutes: detail.duration_minutes,
            total_questions: detail.total_questions,
            total_marks: detail.total_marks,
            available_from: detail.available_from,
            available_until: detail.available_until,
          }
        : null;

      return upsertDoc(DOCTYPES.exam, "exam_id", detail.exam_id, {
        title: detail.title,
        subject_code: detail.subject_code,
        subject_name: detail.subject_name,
        level_code: normalizeLevelCode(detail.level_code),
        board_code: detail.board_code || "",
        instructions: detail.instructions,
        duration_minutes: detail.duration_minutes,
        total_questions: detail.total_questions,
        total_marks: detail.total_marks,
        available_from: detail.available_from,
        available_until: detail.available_until,
        exam_status: detail.status,
        ...(mergedExamJson ? { exam_json: JSON.stringify(mergedExamJson) } : {}),
      });
    });
  },

  async syncAssignment(studentId: string, item: LevelExamListItem) {
    return bestEffort(async () => upsertDoc(
      DOCTYPES.assignment,
      "assignment_id",
      `${item.exam_id}::${studentId}`,
      {
        exam_id: item.exam_id,
        student: studentId,
        title: item.title,
        subject_code: item.subject_code,
        subject_name: item.subject_name,
        level_code: item.level_code,
        board_code: item.board_code || "",
        assignment_status: item.assignment_status,
        exam_status: item.status,
        available_from: item.available_from,
        available_until: item.available_until,
        submitted_at: item.submitted_at || null,
        percentage: item.percentage ?? null,
        assignment_json: JSON.stringify(item),
      },
    ));
  },

  async syncAttempt(payload: LevelExamAttemptPayload) {
    return bestEffort(async () => upsertDoc(DOCTYPES.attempt, "attempt_id", payload.attempt_id, {
      exam_id: payload.exam_id,
      student: payload.child.student_id,
      student_name: payload.child.student_name,
      title: payload.title,
      subject_name: payload.subject_name,
      level_code: payload.level_code,
      board_code: payload.board_code || "",
      status: "in_progress",
      started_at: toFrappeDatetime(payload.started_at),
      duration_minutes: payload.duration_minutes,
      total_questions: payload.total_questions,
      total_marks: payload.total_marks,
      answered_count: payload.questions.filter((question) => question.selected_option_id).length,
      remaining_seconds: payload.remaining_seconds,
      answers_json: JSON.stringify(payload.questions.map((question) => ({
        question_id: question.id,
        selected_option_id: question.selected_option_id || null,
      }))),
      attempt_json: JSON.stringify(payload),
    }));
  },

  async syncResult(result: LevelExamResult) {
    return bestEffort(async () => upsertDoc(DOCTYPES.attempt, "attempt_id", result.attempt_id, {
      exam_id: result.exam_id,
      student: result.child.student_id,
      student_name: result.child.student_name,
      title: result.title,
      subject_name: result.subject_name,
      level_code: result.level_code,
      board_code: result.board_code || "",
      status: result.status,
      submitted_at: toFrappeDatetime(result.submitted_at),
      score_obtained: result.score_obtained,
      total_marks: result.total_marks,
      percentage: result.percentage,
      correct_count: result.correct_count,
      wrong_count: result.wrong_count,
      unanswered_count: result.unanswered_count,
      result_json: JSON.stringify(result),
    }));
  },

  async listExamCatalog(filters?: { level_codes?: string[]; subject_code?: string }) {
    const exams = await fetchQuestionBankExamRecords();
    const publishedExamIds = await getPublishedExamIdsSafe(exams);

    return exams
      .map((exam) => ({
        exam_id: exam.id,
        title: exam.title,
        subject_code: exam.subject_code,
        subject_name: exam.subject_name,
        level_code: normalizeLevelCode(exam.level_code),
        board_code: undefined,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        total_marks: exam.total_marks,
        available_from: null,
        available_until: null,
        status: publishedExamIds.has(exam.id) ? "Published" : "Draft",
        source_file_name: exam.source_file_name || "",
        conversion_status: exam.conversion_status || "",
      }))
      .filter((item) => !filters?.level_codes?.length || filters.level_codes.includes(normalizeLevelCode(item.level_code)))
      .filter((item) => !filters?.subject_code || item.subject_code === filters.subject_code)
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  async listSubjects() {
    const map = new Map<string, string>();
    const exams = await fetchQuestionBankExamRecords();
    for (const exam of exams) {
      if (exam.subject_name) map.set(normalizeSubjectCode(exam.subject_name), exam.subject_name);
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name } satisfies LevelExamSubject))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getCatalogExamRecord(examId: string) {
    return getQuestionBankExamById(examId);
  },

  async listForStudent(studentId: string) {
    return bestEffort(async () => {
      const assignmentRefs = await resourceList(
        DOCTYPES.assignment,
        [["status", "=", "Published"]],
        ["name"],
        1000,
        "modified desc",
      );

      const results: LevelExamListItem[] = [];

      for (const ref of assignmentRefs) {
        const assignmentName = String(ref.name || "");
        if (!assignmentName) continue;

        const assignmentDoc = await getAssignmentDocByName(assignmentName);
        if (!assignmentDoc || String(assignmentDoc.status || "") !== "Published") continue;

        const studentRows = Array.isArray(assignmentDoc.students)
          ? assignmentDoc.students as Array<Record<string, unknown>>
          : [];
        const row = studentRows.find((studentRow) => String(studentRow.student || "") === studentId);
        if (!row) continue;

        const paperName = String(assignmentDoc.exam_paper || "");
        if (!paperName) continue;
        const paperDoc = await getPaperDocByName(paperName);
        if (!paperDoc) continue;

        const { totalQuestions, totalMarks } = paperTotals(paperDoc);
        const latestAttempt = await getLatestAttemptForAssignment(assignmentName, studentId);
        const rawAttemptStatus = String(latestAttempt?.status || "");
        const assignmentRowStatus = String(row.assignment_status || "Assigned");
        const status = examStatus(
          {
            available_from: formatAssignmentAvailabilityDate(assignmentDoc, "start"),
            available_until: formatAssignmentAvailabilityDate(assignmentDoc, "end"),
          },
          rawAttemptStatus === "Auto Submitted" ? "auto_submitted" : rawAttemptStatus === "Submitted" ? "submitted" : rawAttemptStatus === "In Progress" ? "in_progress" : undefined,
        );

        results.push({
          exam_id: assignmentName,
          title: String(assignmentDoc.assignment_title || assignmentDoc.subject || paperDoc.paper_title || ""),
          subject_code: String(assignmentDoc.subject || paperDoc.subject || ""),
          subject_name: String(assignmentDoc.subject || paperDoc.subject || ""),
          level_code: normalizeLevelCode(String(assignmentDoc.class_level || "")) as LevelExamListItem["level_code"],
          duration_minutes: Number(paperDoc.duration_minutes || 0),
          total_questions: totalQuestions,
          total_marks: totalMarks,
          available_from: formatAssignmentAvailabilityDate(assignmentDoc, "start"),
          available_until: formatAssignmentAvailabilityDate(assignmentDoc, "end"),
          status: assignmentRowStatus === "Submitted" ? "completed" : status,
          assignment_status: assignmentStatusLabel(row.assignment_status),
          attempt_id: latestAttempt?.name ? String(latestAttempt.name) : undefined,
          submitted_at: latestAttempt?.submitted_on ? String(latestAttempt.submitted_on) : null,
          percentage: latestAttempt?.submitted_on ? Number(latestAttempt.percentage || 0) : null,
        });
      }

      return results.sort((a, b) => b.available_from.localeCompare(a.available_from));
    });
  },

  async getExamDetail(examId: string, studentId: string) {
    return bestEffort(async () => {
      const assignmentDoc = await getAssignmentDocByName(examId);
      if (!assignmentDoc) return null;
      const studentRow = Array.isArray(assignmentDoc.students)
        ? (assignmentDoc.students as Array<Record<string, unknown>>).find((row) => String(row.student || "") === studentId)
        : null;
      if (!studentRow) return null;

      const paperDoc = await getPaperDocByName(String(assignmentDoc.exam_paper || ""));
      if (!paperDoc) return null;
      const { totalQuestions, totalMarks } = paperTotals(paperDoc);
      const studentName = String(studentRow.student_name || await getStudentName(studentId));
      const activeAttemptRows = await resourceList(
        DOCTYPES.attempt,
        [["assignment", "=", examId], ["student", "=", studentId], ["status", "=", "In Progress"]],
        ["name", "started_on"],
        1,
        "modified desc",
      );
      const active = activeAttemptRows[0];
      let answeredCount = 0;
      if (active?.name) {
        const activeDoc = await resourceGet(DOCTYPES.attempt, String(active.name));
        answeredCount = Array.isArray(activeDoc.answers)
          ? (activeDoc.answers as Array<Record<string, unknown>>).filter((row) => String(row.selected_option_key || "").trim()).length
          : 0;
      }

      return {
        exam_id: String(assignmentDoc.name || examId),
        title: String(assignmentDoc.assignment_title || paperDoc.paper_title || assignmentDoc.subject || ""),
        subject_code: String(assignmentDoc.subject || paperDoc.subject || ""),
        subject_name: String(assignmentDoc.subject || paperDoc.subject || ""),
        level_code: normalizeLevelCode(String(assignmentDoc.class_level || "")) as LevelExamDetail["level_code"],
        instructions: String(paperDoc.instructions || ""),
        duration_minutes: Number(paperDoc.duration_minutes || 0),
        total_questions: totalQuestions,
        total_marks: totalMarks,
        available_from: formatAssignmentAvailabilityDate(assignmentDoc, "start"),
        available_until: formatAssignmentAvailabilityDate(assignmentDoc, "end"),
        status: examStatus(
          {
            available_from: formatAssignmentAvailabilityDate(assignmentDoc, "start"),
            available_until: formatAssignmentAvailabilityDate(assignmentDoc, "end"),
          },
          active ? "in_progress" : undefined,
        ) as LevelExamDetail["status"],
        child: {
          student_id: studentId,
          student_name: studentName,
          level_code: normalizeLevelCode(String(assignmentDoc.class_level || "")) as LevelExamDetail["child"]["level_code"],
        },
        active_attempt: active ? {
          attempt_id: String(active.name),
          status: "in_progress",
          started_at: String(active.started_on),
          submitted_at: null,
          answered_count: answeredCount,
          total_questions: totalQuestions,
          remaining_seconds: getRemainingSeconds(String(active.started_on), Number(paperDoc.duration_minutes || 0)),
        } : null,
      } satisfies LevelExamDetail;
    });
  },

  async startAttempt(examId: string, studentId: string) {
    return bestEffort(async () => {
      const detail = await this.getExamDetail(examId, studentId);
      if (!detail) throw new Error("Exam not found");
      if (detail.active_attempt?.attempt_id) return { attempt_id: detail.active_attempt.attempt_id };
      if (detail.status === "expired") throw new Error("This exam is no longer available");
      if (detail.status === "upcoming") throw new Error("This exam is not open yet");

      const assignmentDoc = await getAssignmentDocByName(examId);
      if (!assignmentDoc) throw new Error("Exam not found");
      const paperDoc = await getPaperDocByName(String(assignmentDoc.exam_paper || ""));
      if (!paperDoc) throw new Error("Exam paper not found");
      const studentRows = Array.isArray(assignmentDoc.students) ? assignmentDoc.students as Array<Record<string, unknown>> : [];
      const studentRow = studentRows.find((row) => String(row.student || "") === studentId);
      if (!studentRow) throw new Error("Student not assigned to this exam");

      const { totalMarks } = paperTotals(paperDoc);
      const startedOn = toFrappeDatetime(new Date());
      const created = await resourceCreate(DOCTYPES.attempt, {
        assignment: examId,
        exam_paper: String(assignmentDoc.exam_paper || ""),
        student: studentId,
        student_name: detail.child.student_name,
        subject: String(assignmentDoc.subject || ""),
        class_level: String(assignmentDoc.class_level || ""),
        started_on: startedOn,
        status: "In Progress",
        total_marks: totalMarks,
        answers: [],
      });

      const updatedStudents = studentRows.map((row) =>
        String(row.student || "") === studentId
          ? sanitizeAssignmentStudentRow({ ...row, assignment_status: "Started" })
          : sanitizeAssignmentStudentRow(row),
      );
      await resourceUpdate(DOCTYPES.assignment, examId, { students: updatedStudents });
      return { attempt_id: String(created.name || "") };
    });
  },

  async getAttemptPayload(attemptId: string, studentId: string) {
    return bestEffort(async () => {
      const attemptDoc = await resourceGet(DOCTYPES.attempt, attemptId);
      if (!attemptDoc || String(attemptDoc.student || "") !== studentId) return null;
      if (String(attemptDoc.status || "") !== "In Progress") throw new Error("Attempt already submitted");

      const paperDoc = await getPaperDocByName(String(attemptDoc.exam_paper || ""));
      if (!paperDoc) return null;

      const answerMap = new Map<string, string | null>();
      const answerRows = Array.isArray(attemptDoc.answers) ? attemptDoc.answers as Array<Record<string, unknown>> : [];
      for (const row of answerRows) {
        answerMap.set(String(row.question || ""), String(row.selected_option_key || "") || null);
      }

      const questions = [];
      for (const paperRow of (Array.isArray(paperDoc.questions) ? paperDoc.questions as Array<Record<string, unknown>> : []).sort((a, b) => Number(a.display_order || a.idx || 0) - Number(b.display_order || b.idx || 0))) {
        const questionName = String(paperRow.question || "");
        if (!questionName) continue;
        const questionDoc = await getQuestionDocByName(questionName);
        if (!questionDoc) continue;
        const options = Array.isArray(questionDoc.options) ? questionDoc.options as Array<Record<string, unknown>> : [];
        questions.push({
          id: questionName,
          stem: String(questionDoc.question_text || ""),
          explanation: questionDoc.explanation ? String(questionDoc.explanation) : "",
          difficulty: String(questionDoc.difficulty || "Medium").toLowerCase() as LevelExamAttemptPayload["questions"][number]["difficulty"],
          marks: Number(paperRow.marks || 0),
          display_order: Number(paperRow.display_order || paperRow.idx || 0),
          selected_option_id: answerMap.get(questionName) ?? null,
          options: options.map((option) => ({
            id: String(option.option_key || ""),
            option_key: String(option.option_key || ""),
            option_text: String(option.option_text || ""),
          })),
        });
      }

      const { totalQuestions, totalMarks } = paperTotals(paperDoc);
      return {
        attempt_id: attemptId,
        exam_id: String(attemptDoc.assignment || ""),
        title: String((await getAssignmentDocByName(String(attemptDoc.assignment || "")))?.assignment_title || paperDoc.paper_title || ""),
        subject_name: String(attemptDoc.subject || ""),
        level_code: normalizeLevelCode(String(attemptDoc.class_level || "")) as LevelExamAttemptPayload["level_code"],
        duration_minutes: Number(paperDoc.duration_minutes || 0),
        total_questions: totalQuestions,
        total_marks: totalMarks,
        started_at: String(attemptDoc.started_on || ""),
        remaining_seconds: getRemainingSeconds(String(attemptDoc.started_on || ""), Number(paperDoc.duration_minutes || 0)),
        child: {
          student_id: studentId,
          student_name: String(attemptDoc.student_name || await getStudentName(studentId)),
        },
        questions,
      } satisfies LevelExamAttemptPayload;
    });
  },

  async saveAnswer(attemptId: string, studentId: string, questionId: string, selectedOptionId: string) {
    return bestEffort(async () => {
      const attemptDoc = await resourceGet(DOCTYPES.attempt, attemptId);
      if (!attemptDoc || String(attemptDoc.student || "") !== studentId) throw new Error("Attempt not found");

      const answers = Array.isArray(attemptDoc.answers)
        ? (attemptDoc.answers as Array<Record<string, unknown>>).map((row) => sanitizeAttemptAnswerRow(row))
        : [];
      const existingIndex = answers.findIndex((row) => String(row.question || "") === questionId);
      const answerPayload = {
        question: questionId,
        selected_option_key: selectedOptionId,
      };

      if (existingIndex >= 0) {
        answers[existingIndex] = sanitizeAttemptAnswerRow({ ...answers[existingIndex], ...answerPayload });
      } else {
        answers.push(sanitizeAttemptAnswerRow(answerPayload));
      }

      await resourceUpdate(DOCTYPES.attempt, attemptId, {
        answers,
      });
    });
  },

  async submitAttempt(attemptId: string, studentId: string, autoSubmitted = false): Promise<LevelExamResult | null> {
    return bestEffort(async () => {
      const attemptDoc = await resourceGet(DOCTYPES.attempt, attemptId);
      if (!attemptDoc || String(attemptDoc.student || "") !== studentId) throw new Error("Attempt not found");
      if (String(attemptDoc.status || "") !== "In Progress") {
        return this.getResult(attemptId, studentId);
      }

      const payload = await this.getAttemptPayload(attemptId, studentId);
      if (!payload) throw new Error("Attempt not found");
      const paperDoc = await getPaperDocByName(String(attemptDoc.exam_paper || ""));
      if (!paperDoc) throw new Error("Exam paper not found");

      const answers = Array.isArray(attemptDoc.answers)
        ? (attemptDoc.answers as Array<Record<string, unknown>>).map((row) => sanitizeAttemptAnswerRow(row))
        : [];
      const answersByQuestion = new Map(answers.map((row) => [String(row.question || ""), row]));

      let score = 0;
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;

      for (const question of payload.questions) {
        const questionDoc = await getQuestionDocByName(question.id);
        if (!questionDoc) continue;
        const correctOptionKey = String(questionDoc.correct_option_key || "");
        const selectedKey = question.selected_option_id ? String(question.selected_option_id) : "";
        const isCorrect = !!selectedKey && selectedKey === correctOptionKey;

        if (!selectedKey) unanswered += 1;
        else if (isCorrect) {
          correct += 1;
          score += question.marks;
        } else {
          wrong += 1;
        }

        const row = answersByQuestion.get(question.id);
        const nextRow = {
          ...(row || { question: question.id }),
          question: question.id,
          selected_option_key: selectedKey || "",
          correct_option_key: correctOptionKey,
          is_correct: isCorrect ? 1 : 0,
          marks_awarded: isCorrect ? question.marks : 0,
        };

        if (row) {
          const index = answers.findIndex((item) => String(item.question || "") === question.id);
          if (index >= 0) answers[index] = nextRow;
        } else {
          answers.push(sanitizeAttemptAnswerRow(nextRow));
        }
      }

      const submittedAt = toFrappeDatetime(new Date());
      const totalMarks = payload.total_marks;
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      const statusLabel = autoSubmitted ? "Auto Submitted" : "Submitted";

      await resourceUpdate(DOCTYPES.attempt, attemptId, {
        status: statusLabel,
        submitted_on: submittedAt,
        score_obtained: score,
        total_marks: totalMarks,
        percentage,
        correct_count: correct,
        wrong_count: wrong,
        unanswered_count: unanswered,
        answers,
      });

      const assignmentDoc = await getAssignmentDocByName(String(attemptDoc.assignment || ""));
      if (assignmentDoc && Array.isArray(assignmentDoc.students)) {
        const updatedStudents = (assignmentDoc.students as Array<Record<string, unknown>>).map((row) =>
          String(row.student || "") === studentId
            ? sanitizeAssignmentStudentRow({ ...row, assignment_status: "Submitted" })
            : sanitizeAssignmentStudentRow(row),
        );
        await resourceUpdate(DOCTYPES.assignment, String(assignmentDoc.name || attemptDoc.assignment || ""), {
          students: updatedStudents,
        });
      }

      return this.getResult(attemptId, studentId);
    });
  },

  async getResult(attemptId: string, studentId: string): Promise<LevelExamResult | null> {
    return bestEffort(async () => {
      const doc = await resourceGet(DOCTYPES.attempt, attemptId);
      if (!doc || String(doc.student || "") !== studentId) return null;
      if (String(doc.status || "") === "In Progress") {
        return this.submitAttempt(attemptId, studentId, true);
      }
      const paperDoc = await getPaperDocByName(String(doc.exam_paper || ""));
      if (!paperDoc) return null;
      const assignmentDoc = await getAssignmentDocByName(String(doc.assignment || ""));
      const answerRows = Array.isArray(doc.answers) ? doc.answers as Array<Record<string, unknown>> : [];
      const answerMap = new Map(answerRows.map((row) => [String(row.question || ""), row]));

      const questionResults: LevelExamResult["questions"] = [];
      for (const paperRow of (Array.isArray(paperDoc.questions) ? paperDoc.questions as Array<Record<string, unknown>> : []).sort((a, b) => Number(a.display_order || a.idx || 0) - Number(b.display_order || b.idx || 0))) {
        const questionId = String(paperRow.question || "");
        if (!questionId) continue;
        const questionDoc = await getQuestionDocByName(questionId);
        if (!questionDoc) continue;
        const answerRow = answerMap.get(questionId);
        const correctOptionKey = String(answerRow?.correct_option_key || questionDoc.correct_option_key || "");
        const options = Array.isArray(questionDoc.options) ? questionDoc.options as Array<Record<string, unknown>> : [];
        questionResults.push({
          question_id: questionId,
          stem: String(questionDoc.question_text || ""),
          marks: Number(paperRow.marks || 0),
          selected_option_id: answerRow?.selected_option_key ? String(answerRow.selected_option_key) : null,
          correct_option_id: correctOptionKey,
          is_correct: Boolean(Number(answerRow?.is_correct || 0)),
          explanation: questionDoc.explanation ? String(questionDoc.explanation) : "",
          options: options.map((option) => ({
            id: String(option.option_key || ""),
            option_key: String(option.option_key || ""),
            option_text: String(option.option_text || ""),
            is_correct: String(option.option_key || "") === correctOptionKey,
          })),
        });
      }

      return {
        attempt_id: attemptId,
        exam_id: String(doc.assignment || ""),
        title: String(assignmentDoc?.assignment_title || paperDoc.paper_title || ""),
        subject_name: String(doc.subject || assignmentDoc?.subject || paperDoc.subject || ""),
        level_code: normalizeLevelCode(String(doc.class_level || "")) as LevelExamResult["level_code"],
        child: {
          student_id: studentId,
          student_name: String(doc.student_name || await getStudentName(studentId)),
        },
        submitted_at: String(doc.submitted_on || ""),
        status: toAttemptStatusLabel(String(doc.status || "")),
        score_obtained: Number(doc.score_obtained || 0),
        total_marks: Number(doc.total_marks || 0),
        percentage: Number(doc.percentage || 0),
        correct_count: Number(doc.correct_count || 0),
        wrong_count: Number(doc.wrong_count || 0),
        unanswered_count: Number(doc.unanswered_count || 0),
        ai_summary: {
          headline: Number(doc.percentage || 0) >= 80 ? "Strong performance" : Number(doc.percentage || 0) >= 50 ? "Steady progress" : "Needs support",
          overview: `${String(doc.student_name || "Student")} scored ${Number(doc.score_obtained || 0)}/${Number(doc.total_marks || 0)}.`,
          strengths: [],
          focus_areas: [],
          exam_summary: [],
          best_topic: null,
          priority_topic: null,
          study_topics: [],
          next_step: "Review incorrect questions and practise the weak topics.",
        },
        questions: questionResults,
      } satisfies LevelExamResult;
    });
  },

  async listSources() {
    return bestEffort(async () => resourceList(
      DOCTYPES.source,
      [],
      ["name", "source_title", "subject", "class_scope", "attachment", "status", "notes", "modified"],
      1000,
      "modified desc",
    ));
  },

  async createSource(payload: {
    source_title: string;
    subject: string;
    class_scope: string;
    notes: string;
    status: string;
    file: File | null;
  }) {
    return bestEffort(async () => resourceCreate(DOCTYPES.source, {
      source_title: payload.source_title,
      subject: payload.subject,
      class_scope: payload.class_scope,
      notes: payload.notes,
      status: payload.status,
      attachment_name: payload.file?.name || "",
    }));
  },

  async listQuestions(filters?: {
    subject?: string;
    class_level?: string;
    source?: string;
    review_status?: string;
  }) {
    return bestEffort(async () => {
      const rows = await resourceList(
        DOCTYPES.question,
        [],
        ["name", "subject", "class_level", "source", "question_text", "difficulty", "correct_option_key", "explanation", "is_active", "review_status", "options_json"],
        1000,
        "modified desc",
      );
      return rows
        .map((row): Record<string, unknown> & { options: Array<{ option_key: string; option_text: string }> } => ({
          ...row,
          options: parseRecordJson<Array<{ option_key: string; option_text: string }>>(row.options_json, []),
        }))
        .filter((row) => !filters?.subject || String(row.subject || "") === filters.subject)
        .filter((row) => !filters?.class_level || String(row.class_level || "") === filters.class_level)
        .filter((row) => !filters?.source || String(row.source || "") === filters.source)
        .filter((row) => !filters?.review_status || String(row.review_status || "") === filters.review_status);
    });
  },

  async createQuestion(payload: {
    subject: string;
    class_level: string;
    source: string;
    question_text: string;
    difficulty: string;
    correct_option_key: string;
    explanation: string;
    is_active: boolean;
    review_status: string;
    options: Array<{ option_key: string; option_text: string }>;
  }) {
    return bestEffort(async () => resourceCreate(DOCTYPES.question, {
      ...payload,
      is_active: payload.is_active ? 1 : 0,
      options_json: JSON.stringify(payload.options),
    }));
  },

  async updateQuestion(name: string, payload: {
    subject: string;
    class_level: string;
    source: string;
    question_text: string;
    difficulty: string;
    correct_option_key: string;
    explanation: string;
    is_active: boolean;
    review_status: string;
    options: Array<{ option_key: string; option_text: string }>;
  }) {
    return bestEffort(async () => resourceUpdate(DOCTYPES.question, name, {
      ...payload,
      is_active: payload.is_active ? 1 : 0,
      options_json: JSON.stringify(payload.options),
    }));
  },

  async listPapers(filters?: { subject?: string; class_level?: string; status?: string }) {
    return bestEffort(async () => {
      const exams = await this.listExamCatalog();
      return (exams || [])
        .filter((exam) => !filters?.subject || exam.subject_name === filters.subject || exam.subject_code === filters.subject)
        .filter((exam) => !filters?.class_level || exam.level_code === filters.class_level)
        .filter((exam) => !filters?.status || String(exam.status).toLowerCase() === filters.status.toLowerCase())
        .map((exam) => ({
          name: exam.exam_id,
          paper_title: exam.title,
          subject: exam.subject_name,
          class_level: exam.level_code,
          status: exam.status,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions,
          total_marks: exam.total_marks,
        }));
    });
  },

  async createPaper(payload: {
    paper_title: string;
    subject: string;
    class_level: string;
    duration_minutes: number;
    instructions: string;
    status: string;
    questions: Array<{ question: string; marks: number; display_order: number }>;
  }) {
    return bestEffort(async () => {
      const questionRows = await resourceList(
        DOCTYPES.question,
        [["name", "in", payload.questions.map((row) => row.question)]],
        ["name", "question_text", "difficulty", "correct_option_key", "explanation", "options_json"],
        1000,
      );
      const questionMap = new Map(questionRows.map((row) => [String(row.name), row]));
      const examId = randomUUID();
      const questions: ExamQuestionRow[] = payload.questions.map((row) => {
        const questionDoc = questionMap.get(row.question);
        const options = parseRecordJson<Array<{ option_key: string; option_text: string }>>(questionDoc?.options_json, []);
        return {
          id: String(questionDoc?.name || row.question),
          stem: String(questionDoc?.question_text || ""),
          explanation: questionDoc?.explanation ? String(questionDoc.explanation) : "",
          difficulty: String(questionDoc?.difficulty || "medium").toLowerCase() as ExamQuestionRow["difficulty"],
          marks: row.marks,
          display_order: row.display_order,
          options: options.map((option) => ({
            id: randomUUID(),
            option_key: option.option_key,
            option_text: option.option_text,
            is_correct: option.option_key === questionDoc?.correct_option_key,
          })),
        };
      });
      const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
      const now = new Date().toISOString();
      const exam: StoredExamRecord = {
        id: examId,
        title: payload.paper_title,
        subject_code: payload.subject.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
        subject_name: payload.subject,
        level_code: normalizeLevelCode(payload.class_level),
        instructions: payload.instructions,
        duration_minutes: payload.duration_minutes,
        total_questions: questions.length,
        total_marks: totalMarks,
        available_from: payload.status === "Published" ? now : null,
        available_until: payload.status === "Published" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        questions,
        source_kind: "frappe_paper",
        published_at: payload.status === "Published" ? now : null,
      };
      await this.syncExamRecord(exam);
      return { name: examId, ...exam };
    });
  },
};
