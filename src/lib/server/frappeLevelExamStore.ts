import { randomUUID } from "crypto";
import { frappeLevelExamDoctypeSync } from "@/lib/server/frappeLevelExamDoctypeSync";
import { parseLevelExamDocx } from "@/lib/server/levelExamDocParser";
import { buildDiagnosisExamTitle } from "@/lib/utils/diagnosis";

function assertFrappeLevelExamReady<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

function normalizeSubjectCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export const frappeLevelExamStore = {
  async ensureStudentSnapshots(
    snapshots: Array<{
      student_id: string;
      student_name: string;
      branch: string;
      program: string;
      student_group: string;
      is_active: boolean;
    }>,
  ) {
    try {
      const batchSize = 25;
      for (let index = 0; index < snapshots.length; index += batchSize) {
        await Promise.all(
          snapshots
            .slice(index, index + batchSize)
            .map((snapshot) => frappeLevelExamDoctypeSync.syncStudentSnapshot(snapshot)),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[level-exams] Student snapshot sync skipped: ${message}`);
    }
  },

  async ensureStudentSnapshot(snapshot: {
    student_id: string;
    student_name: string;
    branch: string;
    program: string;
    student_group: string;
    is_active: boolean;
  }) {
    try {
      await frappeLevelExamDoctypeSync.syncStudentSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[level-exams] Student snapshot sync skipped: ${message}`);
    }
  },

  async listSubjects() {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.listSubjects(),
      "Level Exam doctype is not available in Frappe",
    );
  },

  async listExamCatalog(filters?: { level_codes?: string[]; subject_code?: string }) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.listExamCatalog(filters),
      "Level Exam doctype is not available in Frappe",
    );
  },

  async importExamFromDoc(payload: {
    subject_name: string;
    level_code: "8" | "9" | "10";
    board_code: "state" | "cbse";
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

    const examId = randomUUID();
    const questions = usable.map((question, index) => ({
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

    const exam = {
      id: examId,
      title: payload.title?.trim() || buildDiagnosisExamTitle(payload.level_code, payload.subject_name.trim()),
      subject_code: normalizeSubjectCode(payload.subject_name),
      subject_name: payload.subject_name.trim(),
      level_code: payload.level_code,
      board_code: payload.board_code,
      instructions: payload.instructions?.trim() || "Choose the correct option for each question. Result will be shown only after submission.",
      duration_minutes: Math.max(5, Number(payload.duration_minutes || 20)),
      total_questions: questions.length,
      total_marks: questions.length,
      available_from: null,
      available_until: null,
      questions,
      source_file_name: payload.file.name,
      source_json_file: `${examId}.json`,
      source_kind: "uploaded",
      conversion_status: "converted",
      published_at: null,
    };

    assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.syncExamRecord(exam),
      "Level Exam doctype is not available in Frappe",
    );
    return exam;
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
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.assignExamToTargets(levelCodes, examIds, students),
      "Level Exam Assignment doctype is not available in Frappe",
    );
  },

  async listForStudent(studentId: string) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.listForStudent(studentId),
      "Level Exam Assignment doctype is not available in Frappe",
    );
  },

  async getExamDetail(examId: string, studentId: string) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.getExamDetail(examId, studentId),
      "Level Exam doctype is not available in Frappe",
    );
  },

  async startAttempt(examId: string, studentId: string) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.startAttempt(examId, studentId),
      "Level Exam Attempt doctype is not available in Frappe",
    );
  },

  async getAttemptPayload(attemptId: string, studentId: string) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.getAttemptPayload(attemptId, studentId),
      "Level Exam Attempt doctype is not available in Frappe",
    );
  },

  async saveAnswer(attemptId: string, studentId: string, questionId: string, selectedOptionId: string) {
    assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.saveAnswer(attemptId, studentId, questionId, selectedOptionId),
      "Level Exam Attempt doctype is not available in Frappe",
    );
  },

  async submitAttempt(attemptId: string, studentId: string, autoSubmitted = false) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.submitAttempt(attemptId, studentId, autoSubmitted),
      "Level Exam Attempt doctype is not available in Frappe",
    );
  },

  async getResult(attemptId: string, studentId: string) {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.getResult(attemptId, studentId),
      "Level Exam Attempt doctype is not available in Frappe",
    );
  },

  async listSources() {
    return assertFrappeLevelExamReady(
      await frappeLevelExamDoctypeSync.listSources(),
      "Level Exam Source doctype is not available in Frappe",
    );
  },

  async createSource(payload: {
    source_title: string;
    subject: string;
    class_scope: string;
    notes: string;
    status: string;
    file: File | null;
  }) {
    const data = await frappeLevelExamDoctypeSync.createSource(payload);
    if (!data) throw new Error("Level Exam Source doctype is not available in Frappe");
    return data;
  },

  async listQuestions(filters?: {
    subject?: string;
    class_level?: string;
    source?: string;
    review_status?: string;
  }) {
    const data = await frappeLevelExamDoctypeSync.listQuestions(filters);
    if (!data) throw new Error("Level Exam Question doctype is not available in Frappe");
    return data;
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
    const data = await frappeLevelExamDoctypeSync.createQuestion(payload);
    if (!data) throw new Error("Level Exam Question doctype is not available in Frappe");
    return data;
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
    const data = await frappeLevelExamDoctypeSync.updateQuestion(name, payload);
    if (!data) throw new Error("Level Exam Question doctype is not available in Frappe");
    return data;
  },

  async listPapers(filters?: { subject?: string; class_level?: string; status?: string }) {
    const data = await frappeLevelExamDoctypeSync.listPapers(filters);
    if (!data) throw new Error("Level Exam doctype is not available in Frappe");
    return data;
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
    const data = await frappeLevelExamDoctypeSync.createPaper(payload);
    if (!data) throw new Error("Level Exam doctype is not available in Frappe");
    return data;
  },
};
