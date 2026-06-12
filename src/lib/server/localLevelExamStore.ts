import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { buildDiagnosisExamTitle } from "@/lib/utils/diagnosis";
import type {
  LevelExamAttemptPayload,
  LevelExamDetail,
  LevelExamListItem,
  LevelExamResult,
  LevelExamSubject,
} from "@/lib/types/levelExam";
import { parseLevelExamDocx } from "@/lib/server/levelExamDocParser";

export type ExamBoardCode = "state" | "cbse";

type StoredOption = {
  id: string;
  option_key: string;
  option_text: string;
  is_correct: boolean;
};

type StoredQuestion = {
  id: string;
  stem: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  display_order: number;
  options: StoredOption[];
};

type StoredExam = {
  id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  level_code: "8" | "9" | "10";
  board_code: ExamBoardCode;
  instructions: string;
  duration_minutes: number;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  published_at: string | null;
  source_file_name: string;
  source_json_file: string;
  total_questions: number;
  total_marks: number;
  questions: StoredQuestion[];
  source_kind: "generated" | "uploaded";
  conversion_status?: string;
};

type CatalogState = {
  subjects: LevelExamSubject[];
  exams: StoredExam[];
};

type StudentSnapshot = {
  student_id: string;
  student_name: string;
  branch: string;
  program: string;
  student_group: string;
  level_code: "8" | "9" | "10" | null;
  board_code: ExamBoardCode | null;
  is_active: boolean;
  synced_at: string;
};

type AssignmentRecord = {
  id: string;
  exam_id: string;
  student_id: string;
  assigned_at: string;
  status: "assigned" | "started" | "submitted";
};

type AttemptRecord = {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  status: "in_progress" | "submitted" | "auto_submitted";
  answers: Array<{ question_id: string; selected_option_id: string }>;
};

type PublishedExamRecord = {
  exam_id: string;
  published_at: string;
  available_from: string;
  available_until: string;
};

type RuntimeState = {
  studentSnapshots: StudentSnapshot[];
  assignments: AssignmentRecord[];
  attempts: AttemptRecord[];
  publishedExams: PublishedExamRecord[];
};

type GeneratedSubjectQuestion = {
  id: string;
  question_text: string;
  correct_option_key: string | null;
  options: Array<{ id: string; option_key: string; option_text: string }>;
  review_note?: string;
  source_level?: string;
};

type GeneratedTarget = {
  source_levels: string[];
  total_questions: number;
  questions: GeneratedSubjectQuestion[];
};

type GeneratedSubjectFile = {
  subject: string;
  source_file: string;
  parsed_at: string;
  conversion_status: string;
  generated_targets: Record<string, GeneratedTarget>;
};

type GeneratedIndexFile = {
  generated_at: string;
  subjects: Array<{
    subject: string;
    source_file: string;
    output_file: string;
    conversion_status: string;
    warnings: string[];
  }>;
};

const DATA_DIR = path.join(process.cwd(), "src", "data", "level-exams");
const IMPORTS_DIR = path.join(DATA_DIR, "imports");
const SUBJECTS_DIR = path.join(process.cwd(), "docs", "Level Test", "JSON");
const SUBJECTS_INDEX_PATH = path.join(SUBJECTS_DIR, "index.json");
const CATALOG_PATH = path.join(DATA_DIR, "catalog.json");
const RUNTIME_PATH = path.join(DATA_DIR, "runtime.json");

function normalizeSubjectCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function normalizeBoard(value?: string | null): ExamBoardCode | null {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("cbse")) return "cbse";
  if (text.includes("state")) return "state";
  return null;
}

function normalizeLevel(value?: string | null): "8" | "9" | "10" | null {
  const match = String(value || "").match(/\b(10|[8-9])(?:st|nd|rd|th)?\b/i);
  const level = match?.[1];
  return level === "8" || level === "9" || level === "10" ? level : null;
}

function boardLabel(board: ExamBoardCode) {
  return board === "cbse" ? "CBSE" : "State";
}

function deriveExamStatus(exam: StoredExam, attempt?: AttemptRecord): LevelExamListItem["status"] {
  if (attempt?.status === "submitted" || attempt?.status === "auto_submitted") return "completed";
  if (attempt?.status === "in_progress") return "in_progress";
  if (!exam.published_at || !exam.available_from || !exam.available_until) return "draft";
  const now = Date.now();
  const start = new Date(exam.available_from).getTime();
  const end = new Date(exam.available_until).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "available";
}

function getRemainingSeconds(startedAt: string, durationMinutes: number) {
  const end = new Date(startedAt).getTime() + durationMinutes * 60_000;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

async function ensureDataDirs() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(IMPORTS_DIR)) await mkdir(IMPORTS_DIR, { recursive: true });
  if (!existsSync(SUBJECTS_DIR)) await mkdir(SUBJECTS_DIR, { recursive: true });
}

function findFirstJsonDocumentEnd(raw: string) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let started = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (!started) {
      if (/\s/.test(char)) continue;
      if (char !== "{" && char !== "[") return -1;
      started = true;
      depth = 1;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
}

async function parseJsonFileWithRecovery<T>(filePath: string, raw: string): Promise<T> {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const documentEnd = findFirstJsonDocumentEnd(raw);
    if (documentEnd <= 0) throw error;

    const candidate = raw.slice(0, documentEnd).trimEnd();
    const trailing = raw.slice(documentEnd).trim();
    if (!candidate || !trailing) throw error;

    const parsed = JSON.parse(candidate) as T;
    await writeJsonFile(filePath, parsed);
    return parsed;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDataDirs();
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
  const raw = await readFile(filePath, "utf8");
  return parseJsonFileWithRecovery(filePath, raw);
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDataDirs();
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tempPath, filePath);
}

async function readCatalog() {
  const catalog = await readJsonFile<CatalogState>(CATALOG_PATH, { subjects: [], exams: [] });
  catalog.exams = (catalog.exams || []).map((exam) => ({
    ...exam,
    source_kind: exam.source_kind || "uploaded",
  }));
  return catalog;
}

async function writeCatalog(catalog: CatalogState) {
  await writeJsonFile(CATALOG_PATH, catalog);
}

async function readRuntime() {
  const runtime = await readJsonFile<RuntimeState>(RUNTIME_PATH, {
    studentSnapshots: [],
    assignments: [],
    attempts: [],
    publishedExams: [],
  });
  runtime.publishedExams = runtime.publishedExams || [];
  return runtime;
}

async function writeRuntime(runtime: RuntimeState) {
  await writeJsonFile(RUNTIME_PATH, runtime);
}

async function readGeneratedIndex() {
  return readJsonFile<GeneratedIndexFile>(SUBJECTS_INDEX_PATH, { generated_at: "", subjects: [] });
}

async function loadGeneratedExams(publishedRecords: PublishedExamRecord[]): Promise<StoredExam[]> {
  const index = await readGeneratedIndex();
  const exams: StoredExam[] = [];

  for (const subjectEntry of index.subjects || []) {
    const outputPath = path.join(process.cwd(), subjectEntry.output_file);
    if (!existsSync(outputPath)) continue;
    const subjectDoc = await readJsonFile<GeneratedSubjectFile>(outputPath, {
      subject: subjectEntry.subject,
      source_file: subjectEntry.source_file,
      parsed_at: "",
      conversion_status: subjectEntry.conversion_status,
      generated_targets: {},
    });

    for (const board of ["state", "cbse"] as const) {
      for (const level of ["8", "9", "10"] as const) {
        const target = subjectDoc.generated_targets?.[level];
        if (!target || !Array.isArray(target.questions) || target.questions.length === 0) continue;
        const usableQuestions = target.questions.filter(
          (question) =>
            question.correct_option_key &&
            Array.isArray(question.options) &&
            question.options.length >= 2,
        );
        if (usableQuestions.length === 0) continue;

        const published = publishedRecords.find((record) => record.exam_id === `generated:${normalizeSubjectCode(subjectDoc.subject)}:${level}:${board}`);
        const questions: StoredQuestion[] = usableQuestions.map((question, index2) => ({
          id: question.id,
          stem: question.question_text,
          explanation: question.review_note || "",
          difficulty: "medium",
          marks: 1,
          display_order: index2 + 1,
          options: question.options.map((option) => ({
            id: option.id,
            option_key: option.option_key,
            option_text: option.option_text,
            is_correct: option.option_key === question.correct_option_key,
          })),
        }));

        exams.push({
          id: `generated:${normalizeSubjectCode(subjectDoc.subject)}:${level}:${board}`,
          title: buildDiagnosisExamTitle(level, subjectDoc.subject),
          subject_code: normalizeSubjectCode(subjectDoc.subject),
          subject_name: subjectDoc.subject,
          level_code: level,
          board_code: board,
          instructions: `Questions are taken cumulatively from classes ${target.source_levels.join(", ")}. Result will be shown only after submission.`,
          duration_minutes: Math.max(20, questions.length),
          available_from: published?.available_from || null,
          available_until: published?.available_until || null,
          created_at: subjectDoc.parsed_at || index.generated_at || new Date().toISOString(),
          published_at: published?.published_at || null,
          source_file_name: subjectDoc.source_file,
          source_json_file: path.basename(outputPath),
          total_questions: questions.length,
          total_marks: questions.length,
          questions,
          source_kind: "generated",
          conversion_status: subjectDoc.conversion_status,
        });
      }
    }
  }

  return exams;
}

async function getAllExams() {
  const runtime = await readRuntime();
  const catalog = await readCatalog();
  const generated = await loadGeneratedExams(runtime.publishedExams);
  return {
    runtime,
    catalog,
    exams: [...generated, ...(catalog.exams || [])],
  };
}

function gradeAttempt(exam: StoredExam, attempt: AttemptRecord, studentName: string): LevelExamResult {
  const answerMap = new Map(attempt.answers.map((row) => [row.question_id, row.selected_option_id]));
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const questions = exam.questions.map((question) => {
    const selectedOptionId = answerMap.get(question.id) ?? null;
    const correctOption = question.options.find((option) => option.is_correct);
    const isCorrect = !!selectedOptionId && selectedOptionId === correctOption?.id;
    if (!selectedOptionId) unanswered += 1;
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
      selected_option_id: selectedOptionId,
      correct_option_id: correctOption?.id || "",
      is_correct: isCorrect,
      explanation: question.explanation,
      options: question.options.map((option) => ({
        id: option.id,
        option_key: option.option_key,
        option_text: option.option_text,
        is_correct: option.is_correct,
      })),
    };
  });

  const percentage = exam.total_marks > 0 ? Math.round((score / exam.total_marks) * 100) : 0;
  const aiSummary = buildAiSummary({
    exam,
    studentName,
    percentage,
    correct,
    wrong,
    unanswered,
    questions,
  });

  return {
    attempt_id: attempt.id,
    exam_id: exam.id,
    title: exam.title,
    subject_name: exam.subject_name,
    level_code: exam.level_code,
    board_code: exam.board_code,
    child: {
      student_id: attempt.student_id,
      student_name: studentName,
    },
    submitted_at: attempt.submitted_at || attempt.started_at,
    status: attempt.status,
    score_obtained: score,
    total_marks: exam.total_marks,
    percentage,
    correct_count: correct,
    wrong_count: wrong,
    unanswered_count: unanswered,
    ai_summary: aiSummary,
    questions,
  };
}

function buildAiSummary({
  exam,
  studentName,
  percentage,
  correct,
  wrong,
  unanswered,
  questions,
}: {
  exam: StoredExam;
  studentName: string;
  percentage: number;
  correct: number;
  wrong: number;
  unanswered: number;
  questions: LevelExamResult["questions"];
}) {
  const total = Math.max(questions.length, 1);
  const correctRate = Math.round((correct / total) * 100);
  const topicInsights = buildTopicInsights(exam.subject_name, questions);
  const missedQuestions = questions.filter((question) => !question.is_correct);
  const explainedMisses = missedQuestions.filter((question) => (question.explanation || "").trim().length > 0);
  const missedWithChoices = missedQuestions
    .map((question) => {
      const selectedOption = question.options.find((option) => option.id === question.selected_option_id) || null;
      const correctOption = question.options.find((option) => option.id === question.correct_option_id) || null;
      return {
        stem: question.stem.trim(),
        selected: selectedOption ? `${selectedOption.option_key}. ${selectedOption.option_text}` : null,
        correct: correctOption ? `${correctOption.option_key}. ${correctOption.option_text}` : null,
        explanation: (question.explanation || "").trim(),
      };
    })
    .filter((question) => question.stem.length > 0);
  const plainMisses = missedQuestions.filter((question) => !((question.explanation || "").trim().length > 0));
  const exampleMisses = missedWithChoices.slice(0, 3);

  const headline =
    percentage >= 85
      ? `${studentName} showed very strong understanding in ${exam.subject_name}.`
      : percentage >= 60
        ? `${studentName} has a fair grip on ${exam.subject_name}, with a few topics to tighten up.`
        : percentage >= 35
          ? `${studentName} is building foundational understanding in ${exam.subject_name}, but needs guided revision.`
          : `${studentName} needs focused support in ${exam.subject_name} before the next level exam.`;

  const overviewParts = [
    `Scored ${correct} out of ${exam.total_marks} marks (${percentage}%).`,
    wrong > 0 ? `${wrong} answer${wrong === 1 ? "" : "s"} were incorrect.` : "There were no incorrect answers.",
    unanswered > 0 ? `${unanswered} question${unanswered === 1 ? "" : "s"} were left unanswered.` : "All questions were attempted.",
  ];

  const strengths = [
    topicInsights.find((topic) => topic.status === "strong")
      ? `Best performing area: ${topicInsights.find((topic) => topic.status === "strong")?.topic} with strong answer accuracy.`
      : correct >= Math.ceil(total / 2)
        ? `Attempt accuracy is solid with ${correctRate}% of questions answered correctly.`
        : `The child is still attempting the paper actively, which gives us a clear base to improve from.`,
    unanswered === 0
      ? "Completion was good since every question was answered."
      : `Time management can improve, but ${total - unanswered} questions were still attempted.`,
  ];

  const focusAreas: string[] = [];
  const priorityTopic = topicInsights.find((topic) => topic.status === "revise");
  const watchTopic = topicInsights.find((topic) => topic.status === "watch");
  if (priorityTopic) {
    focusAreas.push(`Priority revision topic: ${priorityTopic.topic}. ${priorityTopic.recommendation}`);
  }
  if (!priorityTopic && watchTopic) {
    focusAreas.push(`Main follow-up topic: ${watchTopic.topic}. ${watchTopic.recommendation}`);
  }
  for (const missed of exampleMisses) {
    if (missed.selected && missed.correct) {
      focusAreas.push(
        `In "${shortenText(missed.stem)}", the chosen answer was ${missed.selected}, but the correct answer is ${missed.correct}.`,
      );
      continue;
    }
    if (missed.correct) {
      focusAreas.push(`Revise "${shortenText(missed.stem)}" carefully. The correct answer is ${missed.correct}.`);
      continue;
    }
    focusAreas.push(`Revise the concept behind "${shortenText(missed.stem)}".`);
  }
  if (explainedMisses.length > 0) {
    focusAreas.push(
      `Revisit concept-based mistakes from ${explainedMisses.length} explained question${explainedMisses.length === 1 ? "" : "s"} in the review below.`,
    );
  }
  if (plainMisses.length > 0) {
    focusAreas.push(
      `Practice ${plainMisses.length} more question${plainMisses.length === 1 ? "" : "s"} similar to the missed items to improve recall and option selection.`,
    );
  }
  if (unanswered > 0) {
    focusAreas.push(
      `Work on pace and confidence so fewer questions are left unanswered in the next attempt.`,
    );
  }
  if (focusAreas.length === 0) {
    focusAreas.push("Continue mixed revision to maintain accuracy across all question types.");
  }

  const next_step =
    percentage >= 85
      ? `Next step: give ${studentName.split(" ")[0]} one more timed practice set in ${exam.subject_name} to maintain this level.`
      : percentage >= 60
        ? `Next step: revise the specific wrong answers above, then retry a short timed quiz in ${exam.subject_name}.`
        : `Next step: review the exact missed questions and correct answers with a teacher or parent, then practice 5 to 10 similar MCQs before the next exam.`;

  return {
    headline,
    overview: overviewParts.join(" "),
    strengths,
    focus_areas: focusAreas,
    exam_summary: [
      `This paper mainly tested ${topicInsights.map((topic) => topic.topic).slice(0, 3).join(", ") || exam.subject_name}.`,
      priorityTopic
        ? `The clearest study need is ${priorityTopic.topic}, where more guided revision is needed.`
        : `No single topic collapsed completely; performance was spread across the paper.`,
      topicInsights.find((topic) => topic.status === "strong")
        ? `The strongest topic was ${topicInsights.find((topic) => topic.status === "strong")?.topic}.`
        : `There is not yet one consistently strong topic across the full exam.`,
    ],
    best_topic: topicInsights.find((topic) => topic.status === "strong")?.topic || null,
    priority_topic: priorityTopic?.topic || watchTopic?.topic || null,
    study_topics: topicInsights,
    next_step,
  };
}

function shortenText(value: string, maxLength = 90) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildTopicInsights(subjectName: string, questions: LevelExamResult["questions"]) {
  const topicMap = new Map<
    string,
    {
      topic: string;
      correct_count: number;
      wrong_count: number;
      total_questions: number;
      sample_questions: string[];
    }
  >();

  for (const question of questions) {
    const topic = inferTopicFromQuestion(subjectName, question.stem, question.explanation || "");
    const existing = topicMap.get(topic) || {
      topic,
      correct_count: 0,
      wrong_count: 0,
      total_questions: 0,
      sample_questions: [],
    };

    existing.total_questions += 1;
    if (question.is_correct) existing.correct_count += 1;
    else existing.wrong_count += 1;
    if (existing.sample_questions.length < 3) {
      existing.sample_questions.push(shortenText(question.stem, 80));
    }
    topicMap.set(topic, existing);
  }

  return Array.from(topicMap.values())
    .map((topic) => {
      const accuracy = topic.total_questions > 0 ? Math.round((topic.correct_count / topic.total_questions) * 100) : 0;
      const status = accuracy >= 75 ? "strong" : accuracy >= 40 ? "watch" : "revise";
      const recommendation =
        status === "strong"
          ? `Keep practicing ${topic.topic} with a few more timed questions to retain confidence.`
          : status === "watch"
            ? `Spend some revision time on ${topic.topic} and retry similar MCQs to improve consistency.`
            : `Study ${topic.topic} first before the next exam and review the related wrong answers one by one.`;

      return {
        topic: topic.topic,
        status,
        correct_count: topic.correct_count,
        wrong_count: topic.wrong_count,
        total_questions: topic.total_questions,
        accuracy,
        recommendation,
        sample_questions: topic.sample_questions,
      } as const;
    })
    .sort((a, b) => {
      const statusOrder = { revise: 0, watch: 1, strong: 2 };
      return statusOrder[a.status] - statusOrder[b.status] || b.total_questions - a.total_questions;
    });
}

function inferTopicFromQuestion(subjectName: string, stem: string, explanation: string) {
  const text = `${subjectName} ${stem} ${explanation}`.toLowerCase();
  const subject = subjectName.toLowerCase();

  const topicRules =
    subject.includes("chem")
      ? [
          { topic: "Solutions and Mixtures", keywords: ["solvent", "solute", "salt water", "mixture", "solution", "dissolve"] },
          { topic: "Electricity and Energy", keywords: ["electricity", "wind energy", "solar", "current", "battery", "energy"] },
          { topic: "States of Matter", keywords: ["solid", "liquid", "gas", "evaporation", "condensation", "matter"] },
          { topic: "Acids, Bases and Salts", keywords: ["acid", "base", "salt", "litmus", "neutral"] },
          { topic: "Atoms and Materials", keywords: ["atom", "element", "compound", "metal", "non-metal", "material"] },
        ]
      : subject.includes("bio")
        ? [
            { topic: "Plants and Photosynthesis", keywords: ["leaf", "plant", "chlorophyll", "photosynthesis", "root", "stem"] },
            { topic: "Human Body and Health", keywords: ["breathing", "lungs", "heart", "blood", "disease", "body"] },
            { topic: "Animals and Habitats", keywords: ["animal", "habitat", "food chain", "forest", "water animal"] },
            { topic: "Cells and Life Processes", keywords: ["cell", "tissue", "organ", "living", "organism"] },
          ]
        : [
            { topic: "Concept Understanding", keywords: ["define", "example", "correct", "which of the following"] },
            { topic: "Application and Reasoning", keywords: ["why", "how", "used", "produced", "result"] },
          ];

  for (const rule of topicRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.topic;
    }
  }

  const normalized = stem.replace(/\s+/g, " ").trim();
  const lead = normalized.split(/[?.]/)[0]?.trim() || `${subjectName} Core Concepts`;
  return shortenText(lead, 32);
}

export const localLevelExamStore = {
  async ensureStudentSnapshots(snapshots: Array<{
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    is_active: boolean;
  }>) {
    const runtime = await readRuntime();

    for (const snapshot of snapshots) {
      const level_code = normalizeLevel(snapshot.program);
      const board_code = normalizeBoard(snapshot.program);
      const existing = runtime.studentSnapshots.find((row) => row.student_id === snapshot.student_id);
      if (existing) {
        existing.student_name = snapshot.student_name;
        existing.branch = snapshot.branch;
        existing.program = snapshot.program;
        existing.student_group = snapshot.student_group;
        existing.level_code = level_code;
        existing.board_code = board_code;
        existing.is_active = snapshot.is_active;
        existing.synced_at = new Date().toISOString();
      } else {
        runtime.studentSnapshots.push({
          ...snapshot,
          level_code,
          board_code,
          synced_at: new Date().toISOString(),
        });
      }
    }

    await writeRuntime(runtime);
  },

  async ensureStudentSnapshot(snapshot: {
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    is_active: boolean;
  }) {
    await this.ensureStudentSnapshots([snapshot]);
  },

  async importExamFromDoc(payload: {
    subject_name: string;
    level_code: "8" | "9" | "10";
    board_code: ExamBoardCode;
    title?: string;
    duration_minutes?: number;
    instructions?: string;
    file: File;
  }) {
    const parsed = await parseLevelExamDocx(payload.file, payload.level_code);
    const usable = parsed.filter((question) => question.options.length >= 2);
    if (usable.length === 0) {
      throw new Error("No valid MCQ questions were found in the uploaded doc");
    }

    const catalog = await readCatalog();
    const subject_code = normalizeSubjectCode(payload.subject_name);
    if (!catalog.subjects.some((item) => item.code === subject_code)) {
      catalog.subjects.push({ code: subject_code, name: payload.subject_name.trim() });
    }

    const examId = randomUUID();
    const sourceJsonFile = `${payload.level_code}-${payload.board_code}-${subject_code}-${examId}.json`;
    const questions: StoredQuestion[] = usable.map((question, index) => ({
      id: randomUUID(),
      stem: question.question_text.trim(),
      explanation: question.explanation?.trim() || "",
      difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
      marks: 1,
      display_order: index + 1,
      options: question.options.map((option) => ({
        id: randomUUID(),
        option_key: option.option_key,
        option_text: option.option_text,
        is_correct: option.option_key === question.correct_option_key,
      })),
    }));

    const exam: StoredExam = {
      id: examId,
      title: payload.title?.trim() || buildDiagnosisExamTitle(payload.level_code, payload.subject_name.trim()),
      subject_code,
      subject_name: payload.subject_name.trim(),
      level_code: payload.level_code,
      board_code: payload.board_code,
      instructions: payload.instructions?.trim() || "Choose the correct option for each question. Result will be shown only after submission.",
      duration_minutes: Math.max(5, Number(payload.duration_minutes || 20)),
      available_from: null,
      available_until: null,
      created_at: new Date().toISOString(),
      published_at: null,
      source_file_name: payload.file.name,
      source_json_file: sourceJsonFile,
      total_questions: questions.length,
      total_marks: questions.length,
      questions,
      source_kind: "uploaded",
    };

    catalog.exams.push(exam);
    await writeCatalog(catalog);
    await writeJsonFile(path.join(IMPORTS_DIR, sourceJsonFile), exam);
    return exam;
  },

  async listExamCatalog(filters?: { level_codes?: string[]; subject_code?: string }) {
    const { exams } = await getAllExams();
    return exams
      .filter((exam) => !filters?.level_codes?.length || filters.level_codes.includes(exam.level_code))
      .filter((exam) => !filters?.subject_code || exam.subject_code === filters.subject_code)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((exam) => ({
        exam_id: exam.id,
        title: exam.title,
        subject_code: exam.subject_code,
        subject_name: exam.subject_name,
        level_code: exam.level_code,
        board_code: exam.board_code,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        total_marks: exam.total_marks,
        available_from: exam.available_from,
        available_until: exam.available_until,
        status: exam.published_at ? "Published" : "Draft",
        source_file_name: exam.source_file_name,
        conversion_status: exam.conversion_status,
      }));
  },

  async listSubjects(): Promise<LevelExamSubject[]> {
    const { exams, catalog } = await getAllExams();
    const generatedIndex = await readGeneratedIndex();
    const map = new Map<string, string>();
    for (const subject of catalog.subjects || []) {
      map.set(subject.code, subject.name);
    }
    for (const subject of generatedIndex.subjects || []) {
      map.set(normalizeSubjectCode(subject.subject), subject.subject);
    }
    for (const exam of exams) {
      map.set(exam.subject_code, exam.subject_name);
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async listSources() {
    const index = await readGeneratedIndex();
    return index.subjects.map((subject) => ({
      name: subject.subject,
      source_title: subject.subject,
      subject: subject.subject,
      class_scope: "5th to 9th source bank",
      attachment: `/${subject.output_file.replace(/\\/g, "/")}`,
      status: subject.conversion_status,
      notes: subject.warnings.join(" | "),
      modified: index.generated_at,
    }));
  },

  async assignExamToTargets(levelCodes: string[], examIds: string[], students: Array<{
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    level_code: string | null;
    board_code?: string | null;
  }>) {
    const { runtime, exams } = await getAllExams();
    let assignedCount = 0;

    for (const examId of examIds) {
      const exam = exams.find((item) => item.id === examId);
      if (!exam) continue;

      let published = runtime.publishedExams.find((record) => record.exam_id === exam.id);
      if (!published) {
        published = {
          exam_id: exam.id,
          published_at: new Date().toISOString(),
          available_from: new Date().toISOString(),
          available_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        runtime.publishedExams.push(published);
      }

      const matchingStudents = students.filter((student) =>
        student.level_code === exam.level_code &&
        levelCodes.includes(exam.level_code) &&
        normalizeBoard(student.board_code || student.program) === exam.board_code,
      );

      for (const student of matchingStudents) {
        const exists = runtime.assignments.some((assignment) => assignment.exam_id === exam.id && assignment.student_id === student.student_id);
        if (exists) continue;
        runtime.assignments.push({
          id: randomUUID(),
          exam_id: exam.id,
          student_id: student.student_id,
          assigned_at: new Date().toISOString(),
          status: "assigned",
        });
        assignedCount += 1;
      }
    }

    await writeRuntime(runtime);
    return {
      assigned_count: assignedCount,
      target_student_count: students.filter((student) => student.level_code && levelCodes.includes(student.level_code)).length,
      level_codes: levelCodes,
    };
  },

  async listForStudent(studentId: string): Promise<LevelExamListItem[]> {
    const { runtime, exams } = await getAllExams();
    const items = runtime.assignments
      .filter((assignment) => assignment.student_id === studentId)
      .map((assignment): LevelExamListItem | null => {
        const exam = exams.find((item) => item.id === assignment.exam_id);
        if (!exam || !exam.available_from || !exam.available_until) return null;
        const latestAttempt = runtime.attempts
          .filter((attempt) => attempt.exam_id === exam.id && attempt.student_id === studentId)
          .sort((a, b) => (b.submitted_at || b.started_at).localeCompare(a.submitted_at || a.started_at))[0];
        const graded =
          latestAttempt && latestAttempt.status !== "in_progress"
            ? gradeAttempt(exam, latestAttempt, runtime.studentSnapshots.find((row) => row.student_id === studentId)?.student_name || "Student")
            : null;
        return {
          exam_id: exam.id,
          title: exam.title,
          subject_code: exam.subject_code,
          subject_name: exam.subject_name,
          level_code: exam.level_code,
          board_code: exam.board_code,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions,
          total_marks: exam.total_marks,
          available_from: exam.available_from,
          available_until: exam.available_until,
          status: deriveExamStatus(exam, latestAttempt),
          assignment_status: latestAttempt?.status === "in_progress" ? "started" : latestAttempt?.status ? "submitted" : assignment.status,
          attempt_id: latestAttempt?.id,
          submitted_at: latestAttempt?.submitted_at || null,
          percentage: graded?.percentage ?? null,
        } satisfies LevelExamListItem;
      })
      .filter((item): item is LevelExamListItem => item !== null);

    return items.sort((a, b) => b.available_from.localeCompare(a.available_from));
  },

  async getExamDetail(examId: string, studentId: string): Promise<LevelExamDetail | null> {
    const { runtime, exams } = await getAllExams();
    const exam = exams.find((item) => item.id === examId);
    const student = runtime.studentSnapshots.find((item) => item.student_id === studentId);
    const assignment = runtime.assignments.find((item) => item.exam_id === examId && item.student_id === studentId);
    if (!exam || !student || !assignment || !exam.available_from || !exam.available_until) return null;

    const activeAttempt = runtime.attempts
      .filter((item) => item.exam_id === examId && item.student_id === studentId && item.status === "in_progress")
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];

    return {
      exam_id: exam.id,
      title: exam.title,
      subject_code: exam.subject_code,
      subject_name: exam.subject_name,
      level_code: exam.level_code,
      board_code: exam.board_code,
      instructions: exam.instructions,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      total_marks: exam.total_marks,
      available_from: exam.available_from,
      available_until: exam.available_until,
      status: deriveExamStatus(exam, activeAttempt),
      child: {
        student_id: student.student_id,
        student_name: student.student_name,
        level_code: exam.level_code,
      },
      active_attempt: activeAttempt
        ? {
            attempt_id: activeAttempt.id,
            status: "in_progress",
            started_at: activeAttempt.started_at,
            submitted_at: null,
            answered_count: activeAttempt.answers.length,
            total_questions: exam.total_questions,
            remaining_seconds: getRemainingSeconds(activeAttempt.started_at, exam.duration_minutes),
          }
        : null,
    };
  },

  async startAttempt(examId: string, studentId: string) {
    const runtime = await readRuntime();
    const active = runtime.attempts.find((item) => item.exam_id === examId && item.student_id === studentId && item.status === "in_progress");
    if (active) return { attempt_id: active.id };

    const detail = await this.getExamDetail(examId, studentId);
    if (!detail) throw new Error("Exam not found");
    if (detail.status === "expired") throw new Error("This exam is no longer available");
    if (detail.status === "upcoming") throw new Error("This exam is not open yet");

    const attemptId = randomUUID();
    runtime.attempts.push({
      id: attemptId,
      exam_id: examId,
      student_id: studentId,
      started_at: new Date().toISOString(),
      status: "in_progress",
      answers: [],
    });
    const assignment = runtime.assignments.find((item) => item.exam_id === examId && item.student_id === studentId);
    if (assignment) assignment.status = "started";
    await writeRuntime(runtime);
    return { attempt_id: attemptId };
  },

  async getAttemptPayload(attemptId: string, studentId: string): Promise<LevelExamAttemptPayload | null> {
    const { runtime, exams } = await getAllExams();
    const attempt = runtime.attempts.find((item) => item.id === attemptId && item.student_id === studentId);
    const student = runtime.studentSnapshots.find((item) => item.student_id === studentId);
    if (!attempt || !student) return null;
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");
    const exam = exams.find((item) => item.id === attempt.exam_id);
    if (!exam) return null;

    const answers = new Map(attempt.answers.map((row) => [row.question_id, row.selected_option_id]));
    return {
      attempt_id: attempt.id,
      exam_id: exam.id,
      title: exam.title,
      subject_name: exam.subject_name,
      level_code: exam.level_code,
      board_code: exam.board_code,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      total_marks: exam.total_marks,
      started_at: attempt.started_at,
      remaining_seconds: getRemainingSeconds(attempt.started_at, exam.duration_minutes),
      child: {
        student_id: student.student_id,
        student_name: student.student_name,
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
          selected_option_id: answers.get(question.id) ?? null,
          options: question.options.map((option) => ({
            id: option.id,
            option_key: option.option_key,
            option_text: option.option_text,
          })),
        })),
    };
  },

  async saveAnswer(attemptId: string, studentId: string, questionId: string, selectedOptionId: string) {
    const runtime = await readRuntime();
    const attempt = runtime.attempts.find((item) => item.id === attemptId && item.student_id === studentId);
    if (!attempt || attempt.status !== "in_progress") throw new Error("Attempt not found");
    const existing = attempt.answers.find((row) => row.question_id === questionId);
    if (existing) existing.selected_option_id = selectedOptionId;
    else attempt.answers.push({ question_id: questionId, selected_option_id: selectedOptionId });
    await writeRuntime(runtime);
  },

  async submitAttempt(attemptId: string, studentId: string, autoSubmitted = false) {
    const { runtime, exams } = await getAllExams();
    const attempt = runtime.attempts.find((item) => item.id === attemptId && item.student_id === studentId);
    const student = runtime.studentSnapshots.find((item) => item.student_id === studentId);
    if (!attempt || !student) throw new Error("Attempt not found");
    const exam = exams.find((item) => item.id === attempt.exam_id);
    if (!exam) throw new Error("Exam not found");

    if (attempt.status !== "in_progress") {
      return gradeAttempt(exam, attempt, student.student_name);
    }

    attempt.status = autoSubmitted ? "auto_submitted" : "submitted";
    attempt.submitted_at = new Date().toISOString();
    const assignment = runtime.assignments.find((item) => item.exam_id === exam.id && item.student_id === studentId);
    if (assignment) assignment.status = "submitted";
    await writeRuntime(runtime);
    return gradeAttempt(exam, attempt, student.student_name);
  },

  async getResult(attemptId: string, studentId: string) {
    const { runtime, exams } = await getAllExams();
    const attempt = runtime.attempts.find((item) => item.id === attemptId && item.student_id === studentId);
    const student = runtime.studentSnapshots.find((item) => item.student_id === studentId);
    if (!attempt || !student) return null;
    const exam = exams.find((item) => item.id === attempt.exam_id);
    if (!exam) return null;
    if (attempt.status === "in_progress") {
      return this.submitAttempt(attemptId, studentId, true);
    }
    return gradeAttempt(exam, attempt, student.student_name);
  },
};
