import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import type {
  AssignmentStatus,
  AttemptStatus,
  LevelCode,
  LevelExamAttemptPayload,
  LevelExamDetail,
  LevelExamListItem,
  LevelExamResult,
  LevelExamSubject,
  LevelExamStudentSnapshot,
} from "@/lib/types/levelExam";
import { buildSeedLevelExamState, type SeedLevelExamState } from "@/lib/level-exams/seed";

type AttemptRecord = SeedLevelExamState["attempts"][number];
const STORE_PATH = path.join(os.tmpdir(), "smartup-level-exams-local.json");

function calculateLevel(program?: string | null): LevelCode | null {
  const match = (program || "").match(/\b(10|[5-9])(?:st|nd|rd|th)?\b/);
  const value = match?.[1] as LevelCode | undefined;
  return value ?? null;
}

function deriveExamStatus(availableFrom: string, availableUntil: string): "upcoming" | "available" | "expired" {
  const now = Date.now();
  const start = new Date(availableFrom).getTime();
  const end = new Date(availableUntil).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "available";
}

function buildEmptyAiSummary(studentName: string, subjectName: string): LevelExamResult["ai_summary"] {
  return {
    headline: `${studentName} completed the ${subjectName} level exam.`,
    overview: "Detailed AI insights are not available for this result yet.",
    strengths: [],
    focus_areas: [],
    exam_summary: [],
    best_topic: null,
    priority_topic: null,
    study_topics: [],
    next_step: "Review the answers and continue with targeted practice.",
  };
}

function gradeAttempt(
  state: SeedLevelExamState,
  attempt: AttemptRecord,
): LevelExamResult {
  const exam = state.exams.find((item) => item.id === attempt.exam_id);
  if (!exam) {
    throw new Error("Exam not found for attempt");
  }
  const student = state.studentSnapshots.find((item) => item.frappe_student_id === attempt.frappe_student_id);
  if (!student) {
    throw new Error("Student snapshot not found");
  }

  const answersByQuestion = new Map(attempt.answers.map((answer) => [answer.question_id, answer.selected_option_id]));
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const questions = exam.questions.map((question) => {
    const selectedOptionId = answersByQuestion.get(question.id) ?? null;
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

  const totalMarks = exam.questions.reduce((sum, question) => sum + question.marks, 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const subjectName = state.subjects.find((subject) => subject.code === exam.subject_code)?.name || exam.subject_code;

  return {
    attempt_id: attempt.id,
    exam_id: exam.id,
    title: exam.title,
    subject_name: subjectName,
    level_code: exam.level_code,
    child: {
      student_id: student.frappe_student_id,
      student_name: student.student_name,
    },
    submitted_at: attempt.submitted_at || attempt.started_at,
    status: attempt.status,
    score_obtained: score,
    total_marks: totalMarks,
    percentage,
    correct_count: correct,
    wrong_count: wrong,
    unanswered_count: unanswered,
    ai_summary: buildEmptyAiSummary(student.student_name, subjectName),
    questions,
  };
}

function getRemainingSeconds(startedAt: string, durationMinutes: number): number {
  const endsAt = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
}

async function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readLocalState(): Promise<SeedLevelExamState> {
  await ensureStoreDir();
  if (!existsSync(STORE_PATH)) {
    const initial = buildSeedLevelExamState();
    await writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  const raw = await readFile(STORE_PATH, "utf8");
  return mergeSeedState(JSON.parse(raw) as SeedLevelExamState);
}

async function writeLocalState(state: SeedLevelExamState) {
  await ensureStoreDir();
  await writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function mergeSeedState(state: SeedLevelExamState): SeedLevelExamState {
  const seed = buildSeedLevelExamState();

  for (const subject of seed.subjects) {
    if (!state.subjects.some((item) => item.code === subject.code)) state.subjects.push(subject);
  }
  for (const level of seed.levels) {
    if (!state.levels.some((item) => item.code === level.code)) state.levels.push(level);
  }
  for (const exam of seed.exams) {
    if (!state.exams.some((item) => item.id === exam.id)) state.exams.push(exam);
  }
  for (const snapshot of seed.studentSnapshots) {
    if (!state.studentSnapshots.some((item) => item.frappe_student_id === snapshot.frappe_student_id)) {
      state.studentSnapshots.push(snapshot);
    }
  }
  for (const assignment of seed.assignments) {
    if (!state.assignments.some((item) => item.id === assignment.id)) state.assignments.push(assignment);
  }
  for (const attempt of seed.attempts) {
    if (!state.attempts.some((item) => item.id === attempt.id)) state.attempts.push(attempt);
  }

  return state;
}

type PostgresPool = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  end?: () => Promise<void>;
};

let pgPoolPromise: Promise<PostgresPool | null> | null = null;

async function getPgPool(): Promise<PostgresPool | null> {
  if (pgPoolPromise) return pgPoolPromise;
  pgPoolPromise = (async () => {
    const connectionString = process.env.LEVEL_EXAMS_DB_URL;
    if (!connectionString) return null;
    try {
      const loadPg = new Function('return import("pg")') as () => Promise<{ Pool: new (config: { connectionString: string }) => PostgresPool }>;
      const mod = await loadPg();
      const Pool = mod.Pool as new (config: { connectionString: string }) => PostgresPool;
      return new Pool({ connectionString });
    } catch {
      return null;
    }
  })();
  return pgPoolPromise;
}

export class LevelExamStore {
  private assignMatchingLocalExamsInState(state: SeedLevelExamState, studentId: string, levelCode: LevelCode) {
    const matchingExams = state.exams.filter((exam) => exam.level_code === levelCode);
    let assigned = 0;
    for (const exam of matchingExams) {
      const alreadyAssigned = state.assignments.some(
        (assignment) => assignment.exam_id === exam.id && assignment.frappe_student_id === studentId,
      );
      if (!alreadyAssigned) {
        state.assignments.push({
          id: randomUUID(),
          exam_id: exam.id,
          frappe_student_id: studentId,
          assigned_at: new Date().toISOString(),
          status: "assigned",
        });
        assigned += 1;
      }
    }
    return assigned;
  }

  private async getState() {
    const pg = await getPgPool();
    if (pg) return { mode: "pg" as const, pg };
    return { mode: "local" as const, state: await readLocalState() };
  }

  async ensureStudentSnapshot(snapshot: Omit<LevelExamStudentSnapshot, "level_code"> & { level_code?: LevelCode | null }) {
    const levelCode = snapshot.level_code ?? calculateLevel(snapshot.program) ?? "7";
    const current = await this.getState();
    if (current.mode === "pg") {
      await current.pg.query(
        `insert into level_exam_student_snapshots
         (frappe_student_id, student_name, branch, program, student_group, level_code, is_active, synced_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())
         on conflict (frappe_student_id) do update set
           student_name = excluded.student_name,
           branch = excluded.branch,
           program = excluded.program,
           student_group = excluded.student_group,
           level_code = excluded.level_code,
           is_active = excluded.is_active,
           synced_at = now()`,
        [
          snapshot.frappe_student_id,
          snapshot.student_name,
          snapshot.branch,
          snapshot.program,
          snapshot.student_group,
          levelCode,
          snapshot.is_active,
        ],
      );
      return;
    }

    const existing = current.state.studentSnapshots.find((item) => item.frappe_student_id === snapshot.frappe_student_id);
    if (existing) {
      existing.student_name = snapshot.student_name;
      existing.branch = snapshot.branch;
      existing.program = snapshot.program;
      existing.student_group = snapshot.student_group;
      existing.level_code = levelCode;
      existing.is_active = snapshot.is_active;
    } else {
      current.state.studentSnapshots.push({
        frappe_student_id: snapshot.frappe_student_id,
        student_name: snapshot.student_name,
        branch: snapshot.branch,
        program: snapshot.program,
        student_group: snapshot.student_group,
        level_code: levelCode,
        is_active: snapshot.is_active,
      });
    }

    this.assignMatchingLocalExamsInState(current.state, snapshot.frappe_student_id, levelCode);
    await writeLocalState(current.state);
  }

  async listExamCatalog(filters?: { level_code?: LevelCode; subject_code?: string }) {
    const current = await this.getState();
    if (current.mode === "pg") {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filters?.level_code) {
        clauses.push(`e.level_code = $${params.length + 1}`);
        params.push(filters.level_code);
      }
      if (filters?.subject_code) {
        clauses.push(`e.subject_code = $${params.length + 1}`);
        params.push(filters.subject_code);
      }
      const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
      const rows = await current.pg.query(
        `select e.id, e.title, e.subject_code, s.name as subject_name, e.level_code, e.duration_minutes, e.total_questions, e.total_marks, e.available_from, e.available_until
         from level_exam_exams e
         join level_exam_subjects s on s.code = e.subject_code
         ${where}
         order by e.level_code asc, s.name asc, e.title asc`,
        params,
      );
      return rows.rows.map((row) => ({
        exam_id: String(row.id),
        title: String(row.title),
        subject_code: String(row.subject_code),
        subject_name: String(row.subject_name),
        level_code: String(row.level_code) as LevelCode,
        duration_minutes: Number(row.duration_minutes),
        total_questions: Number(row.total_questions),
        total_marks: Number(row.total_marks),
        available_from: new Date(String(row.available_from)).toISOString(),
        available_until: new Date(String(row.available_until)).toISOString(),
      }));
    }

    return current.state.exams
      .filter((exam) => !filters?.level_code || exam.level_code === filters.level_code)
      .filter((exam) => !filters?.subject_code || exam.subject_code === filters.subject_code)
      .map((exam) => ({
        exam_id: exam.id,
        title: exam.title,
        subject_code: exam.subject_code,
        subject_name: current.state.subjects.find((subject) => subject.code === exam.subject_code)?.name || exam.subject_code,
        level_code: exam.level_code,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.questions.length,
        total_marks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
        available_from: exam.available_from,
        available_until: exam.available_until,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async listSubjects(): Promise<LevelExamSubject[]> {
    const current = await this.getState();
    if (current.mode === "pg") {
      const rows = await current.pg.query(`select code, name from level_exam_subjects order by name asc`);
      return rows.rows.map((row) => ({ code: String(row.code), name: String(row.name) }));
    }
    return [...current.state.subjects].sort((a, b) => a.name.localeCompare(b.name));
  }

  async assignMatchingExamsForStudent(studentId: string) {
    const current = await this.getState();
    if (current.mode === "pg") {
      const snapshotRows = await current.pg.query(
        `select level_code from level_exam_student_snapshots where frappe_student_id = $1 limit 1`,
        [studentId],
      );
      const levelCode = snapshotRows.rows[0]?.level_code;
      if (!levelCode) throw new Error("Student snapshot not found");
      await current.pg.query(
        `insert into level_exam_assignments (id, exam_id, frappe_student_id, assigned_at, status)
         select gen_random_uuid(), e.id, $1, now(), 'assigned'
         from level_exam_exams e
         where e.level_code = $2
           and not exists (
             select 1 from level_exam_assignments a
             where a.exam_id = e.id and a.frappe_student_id = $1
           )`,
        [studentId, levelCode],
      );
      const countRows = await current.pg.query(
        `select count(*)::int as count from level_exam_assignments where frappe_student_id = $1 and exam_id in (select id from level_exam_exams where level_code = $2)`,
        [studentId, levelCode],
      );
      return { assigned_count: Number(countRows.rows[0]?.count || 0), level_code: String(levelCode) };
    }

    const snapshot = current.state.studentSnapshots.find((item) => item.frappe_student_id === studentId);
    if (!snapshot) throw new Error("Student snapshot not found");
    const assignedCount = this.assignMatchingLocalExamsInState(current.state, studentId, snapshot.level_code);
    await writeLocalState(current.state);
    return { assigned_count: assignedCount, level_code: snapshot.level_code };
  }

  async assignExamToStudent(studentId: string, examId: string) {
    const current = await this.getState();
    if (current.mode === "pg") {
      await current.pg.query(
        `insert into level_exam_assignments (id, exam_id, frappe_student_id, assigned_at, status)
         values (gen_random_uuid(), $1, $2, now(), 'assigned')
         on conflict do nothing`,
        [examId, studentId],
      );
      return { assigned: 1 };
    }

    const exists = current.state.assignments.some(
      (assignment) => assignment.exam_id === examId && assignment.frappe_student_id === studentId,
    );
    if (!exists) {
      current.state.assignments.push({
        id: randomUUID(),
        exam_id: examId,
        frappe_student_id: studentId,
        assigned_at: new Date().toISOString(),
        status: "assigned",
      });
      await writeLocalState(current.state);
      return { assigned: 1 };
    }

    return { assigned: 0 };
  }

  async listForStudent(studentId: string): Promise<LevelExamListItem[]> {
    const current = await this.getState();
    if (current.mode === "pg") {
      const rows = await current.pg.query(
        `select
           e.id as exam_id,
           e.title,
           e.subject_code,
           s.name as subject_name,
           e.level_code,
           e.duration_minutes,
           e.total_questions,
           e.total_marks,
           e.available_from,
           e.available_until,
           a.status as assignment_status,
           at.id as attempt_id,
           at.submitted_at,
           at.percentage
         from level_exam_assignments a
         join level_exam_exams e on e.id = a.exam_id
         join level_exam_subjects s on s.code = e.subject_code
         left join lateral (
           select * from level_exam_attempts at
           where at.exam_id = e.id and at.frappe_student_id = a.frappe_student_id
           order by coalesce(at.submitted_at, at.started_at) desc
           limit 1
         ) at on true
         where a.frappe_student_id = $1
         order by e.available_from desc`,
        [studentId],
      );
      return rows.rows.map((row) => ({
        exam_id: String(row.exam_id),
        title: String(row.title),
        subject_code: String(row.subject_code),
        subject_name: String(row.subject_name),
        level_code: String(row.level_code) as LevelCode,
        duration_minutes: Number(row.duration_minutes),
        total_questions: Number(row.total_questions),
        total_marks: Number(row.total_marks),
        available_from: new Date(String(row.available_from)).toISOString(),
        available_until: new Date(String(row.available_until)).toISOString(),
        status: deriveExamStatus(String(row.available_from), String(row.available_until)),
        assignment_status: String(row.assignment_status) as AssignmentStatus,
        attempt_id: row.attempt_id ? String(row.attempt_id) : undefined,
        submitted_at: row.submitted_at ? String(row.submitted_at) : null,
        percentage: row.percentage === null || row.percentage === undefined ? null : Number(row.percentage),
      }));
    }

    const mapped: Array<LevelExamListItem | null> = current.state.assignments
      .filter((assignment) => assignment.frappe_student_id === studentId)
      .map((assignment) => {
        const exam = current.state.exams.find((item) => item.id === assignment.exam_id);
        if (!exam) return null;
        const subject = current.state.subjects.find((item) => item.code === exam.subject_code);
        const latestAttempt = current.state.attempts
          .filter((attempt) => attempt.exam_id === exam.id && attempt.frappe_student_id === studentId)
          .sort((a, b) => (b.submitted_at || b.started_at).localeCompare(a.submitted_at || a.started_at))[0];

        let status: LevelExamListItem["status"] = deriveExamStatus(exam.available_from, exam.available_until);
        if (latestAttempt?.status === "submitted") status = "completed";
        else if (latestAttempt?.status === "in_progress") status = "in_progress";

        const graded = latestAttempt?.status === "submitted" ? gradeAttempt(current.state, latestAttempt) : null;
        return {
          exam_id: exam.id,
          title: exam.title,
          subject_code: exam.subject_code,
          subject_name: subject?.name || exam.subject_code,
          level_code: exam.level_code,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.questions.length,
          total_marks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
          available_from: exam.available_from,
          available_until: exam.available_until,
          status,
          assignment_status: latestAttempt?.status === "submitted" ? "submitted" : latestAttempt ? "started" : assignment.status,
          attempt_id: latestAttempt?.id,
          submitted_at: latestAttempt?.submitted_at || null,
          percentage: graded?.percentage ?? null,
        };
      });

    return mapped
      .filter((item): item is LevelExamListItem => item !== null)
      .sort((a, b) => b.available_from.localeCompare(a.available_from));
  }

  async getExamDetail(examId: string, studentId: string): Promise<LevelExamDetail | null> {
    const list = await this.listForStudent(studentId);
    const item = list.find((exam) => exam.exam_id === examId);
    if (!item) return null;

    const current = await this.getState();
    if (current.mode === "pg") {
      const studentRows = await current.pg.query(
        `select frappe_student_id, student_name, level_code from level_exam_student_snapshots where frappe_student_id = $1 limit 1`,
        [studentId],
      );
      const attemptRows = await current.pg.query(
        `select id, status, started_at, submitted_at
         from level_exam_attempts
         where exam_id = $1 and frappe_student_id = $2
         order by coalesce(submitted_at, started_at) desc
         limit 1`,
        [examId, studentId],
      );
      const child = studentRows.rows[0];
      const attempt = attemptRows.rows[0];
      const questionCountRows = await current.pg.query(
        `select count(*)::int as total_questions from level_exam_exam_questions where exam_id = $1`,
        [examId],
      );
      const answerCountRows = attempt
        ? await current.pg.query(`select count(*)::int as answered_count from level_exam_attempt_answers where attempt_id = $1`, [attempt.id])
        : { rows: [{ answered_count: 0 }] };

      return {
        exam_id: item.exam_id,
        title: item.title,
        subject_code: item.subject_code,
        subject_name: item.subject_name,
        level_code: item.level_code,
        instructions: "Read each question carefully and submit before the timer ends.",
        duration_minutes: item.duration_minutes,
        total_questions: item.total_questions,
        total_marks: item.total_marks,
        available_from: item.available_from,
        available_until: item.available_until,
        status: item.status,
        child: {
          student_id: String(child.frappe_student_id),
          student_name: String(child.student_name),
          level_code: String(child.level_code) as LevelCode,
        },
        active_attempt: attempt && attempt.status === "in_progress"
          ? {
              attempt_id: String(attempt.id),
              status: "in_progress",
              started_at: new Date(String(attempt.started_at)).toISOString(),
              submitted_at: null,
              answered_count: Number(answerCountRows.rows[0].answered_count),
              total_questions: Number(questionCountRows.rows[0].total_questions),
              remaining_seconds: getRemainingSeconds(String(attempt.started_at), item.duration_minutes),
            }
          : null,
      };
    }

    const exam = current.state.exams.find((record) => record.id === examId);
    const student = current.state.studentSnapshots.find((record) => record.frappe_student_id === studentId);
    if (!exam || !student) return null;
    const activeAttempt = current.state.attempts
      .filter((record) => record.exam_id === examId && record.frappe_student_id === studentId && record.status === "in_progress")
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];

    return {
      exam_id: exam.id,
      title: exam.title,
      subject_code: exam.subject_code,
      subject_name: current.state.subjects.find((record) => record.code === exam.subject_code)?.name || exam.subject_code,
      level_code: exam.level_code,
      instructions: exam.instructions,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.questions.length,
      total_marks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
      available_from: exam.available_from,
      available_until: exam.available_until,
      status: item.status,
      child: {
        student_id: student.frappe_student_id,
        student_name: student.student_name,
        level_code: student.level_code,
      },
      active_attempt: activeAttempt
        ? {
            attempt_id: activeAttempt.id,
            status: activeAttempt.status,
            started_at: activeAttempt.started_at,
            submitted_at: activeAttempt.submitted_at || null,
            answered_count: activeAttempt.answers.length,
            total_questions: exam.questions.length,
            remaining_seconds: getRemainingSeconds(activeAttempt.started_at, exam.duration_minutes),
          }
        : null,
    };
  }

  async startAttempt(examId: string, studentId: string): Promise<{ attempt_id: string }> {
    const detail = await this.getExamDetail(examId, studentId);
    if (!detail) throw new Error("Exam not found");
    if (detail.status === "expired") throw new Error("This exam is no longer available");
    if (detail.active_attempt?.attempt_id) return { attempt_id: detail.active_attempt.attempt_id };

    const current = await this.getState();
    if (current.mode === "pg") {
      const rows = await current.pg.query(
        `insert into level_exam_attempts (id, exam_id, frappe_student_id, started_at, status)
         values ($1, $2, $3, now(), 'in_progress')
         returning id`,
        [randomUUID(), examId, studentId],
      );
      return { attempt_id: String(rows.rows[0].id) };
    }

    const assignment = current.state.assignments.find((record) => record.exam_id === examId && record.frappe_student_id === studentId);
    if (assignment) assignment.status = "started";
    const attemptId = randomUUID();
    current.state.attempts.push({
      id: attemptId,
      exam_id: examId,
      frappe_student_id: studentId,
      started_at: new Date().toISOString(),
      status: "in_progress",
      answers: [],
    });
    await writeLocalState(current.state);
    return { attempt_id: attemptId };
  }

  async getAttemptPayload(attemptId: string, studentId: string): Promise<LevelExamAttemptPayload | null> {
    const current = await this.getState();
    if (current.mode === "pg") {
      const attemptRows = await current.pg.query(
        `select at.id, at.exam_id, at.started_at, at.status, e.title, e.level_code, e.duration_minutes, e.total_questions, e.total_marks, s.name as subject_name, ss.student_name
         from level_exam_attempts at
         join level_exam_exams e on e.id = at.exam_id
         join level_exam_subjects s on s.code = e.subject_code
         join level_exam_student_snapshots ss on ss.frappe_student_id = at.frappe_student_id
         where at.id = $1 and at.frappe_student_id = $2
         limit 1`,
        [attemptId, studentId],
      );
      const attempt = attemptRows.rows[0];
      if (!attempt) return null;
      if (String(attempt.status) !== "in_progress") {
        throw new Error("Attempt already submitted");
      }
      const questionRows = await current.pg.query(
        `select q.id, q.stem, q.explanation, q.difficulty, eq.display_order, eq.marks, ao.selected_option_id
         from level_exam_exam_questions eq
         join level_exam_questions q on q.id = eq.question_id
         left join level_exam_attempt_answers ao on ao.attempt_id = $1 and ao.question_id = q.id
         where eq.exam_id = $2
         order by eq.display_order asc`,
        [attemptId, attempt.exam_id],
      );
      const optionRows = await current.pg.query(
        `select question_id, id, option_key, option_text
         from level_exam_question_options
         where question_id in (
           select question_id from level_exam_exam_questions where exam_id = $1
         )
         order by option_key asc`,
        [attempt.exam_id],
      );
      const optionsByQuestion = new Map<string, Array<{ id: string; option_key: string; option_text: string }>>();
      for (const row of optionRows.rows) {
        const key = String(row.question_id);
        const list = optionsByQuestion.get(key) ?? [];
        list.push({
          id: String(row.id),
          option_key: String(row.option_key),
          option_text: String(row.option_text),
        });
        optionsByQuestion.set(key, list);
      }

      return {
        attempt_id: String(attempt.id),
        exam_id: String(attempt.exam_id),
        title: String(attempt.title),
        subject_name: String(attempt.subject_name),
        level_code: String(attempt.level_code) as LevelCode,
        duration_minutes: Number(attempt.duration_minutes),
        total_questions: Number(attempt.total_questions),
        total_marks: Number(attempt.total_marks),
        started_at: new Date(String(attempt.started_at)).toISOString(),
        remaining_seconds: getRemainingSeconds(String(attempt.started_at), Number(attempt.duration_minutes)),
        child: {
          student_id: studentId,
          student_name: String(attempt.student_name),
        },
        questions: questionRows.rows.map((row) => ({
          id: String(row.id),
          stem: String(row.stem),
          explanation: row.explanation ? String(row.explanation) : undefined,
          difficulty: String(row.difficulty) as "easy" | "medium" | "hard",
          marks: Number(row.marks),
          display_order: Number(row.display_order),
          selected_option_id: row.selected_option_id ? String(row.selected_option_id) : null,
          options: optionsByQuestion.get(String(row.id)) ?? [],
        })),
      };
    }

    const attempt = current.state.attempts.find((record) => record.id === attemptId && record.frappe_student_id === studentId);
    if (!attempt) return null;
    if (attempt.status !== "in_progress") {
      throw new Error("Attempt already submitted");
    }
    const exam = current.state.exams.find((record) => record.id === attempt.exam_id);
    const child = current.state.studentSnapshots.find((record) => record.frappe_student_id === studentId);
    if (!exam || !child) return null;
    const answersByQuestion = new Map(attempt.answers.map((answer) => [answer.question_id, answer.selected_option_id]));

    return {
      attempt_id: attempt.id,
      exam_id: exam.id,
      title: exam.title,
      subject_name: current.state.subjects.find((record) => record.code === exam.subject_code)?.name || exam.subject_code,
      level_code: exam.level_code,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.questions.length,
      total_marks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
      started_at: attempt.started_at,
      remaining_seconds: getRemainingSeconds(attempt.started_at, exam.duration_minutes),
      child: {
        student_id: child.frappe_student_id,
        student_name: child.student_name,
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
          selected_option_id: answersByQuestion.get(question.id) ?? null,
          options: question.options.map((option) => ({
            id: option.id,
            option_key: option.option_key,
            option_text: option.option_text,
          })),
        })),
    };
  }

  async saveAnswer(attemptId: string, studentId: string, questionId: string, selectedOptionId: string) {
    const current = await this.getState();
    if (current.mode === "pg") {
      await current.pg.query(
        `insert into level_exam_attempt_answers (id, attempt_id, question_id, selected_option_id, answered_at)
         values ($1, $2, $3, $4, now())
         on conflict (attempt_id, question_id) do update set
           selected_option_id = excluded.selected_option_id,
           answered_at = now()`,
        [randomUUID(), attemptId, questionId, selectedOptionId],
      );
      return;
    }

    const attempt = current.state.attempts.find((record) => record.id === attemptId && record.frappe_student_id === studentId);
    if (!attempt || attempt.status !== "in_progress") {
      throw new Error("Attempt not found");
    }
    const existing = attempt.answers.find((answer) => answer.question_id === questionId);
    if (existing) {
      existing.selected_option_id = selectedOptionId;
    } else {
      attempt.answers.push({ question_id: questionId, selected_option_id: selectedOptionId });
    }
    await writeLocalState(current.state);
  }

  async submitAttempt(attemptId: string, studentId: string, autoSubmitted = false): Promise<LevelExamResult> {
    const current = await this.getState();
    if (current.mode === "pg") {
      const attemptRows = await current.pg.query(
        `select id, exam_id, frappe_student_id, started_at, submitted_at, status
         from level_exam_attempts where id = $1 and frappe_student_id = $2 limit 1`,
        [attemptId, studentId],
      );
      const row = attemptRows.rows[0];
      if (!row) throw new Error("Attempt not found");
      if (String(row.status) !== "in_progress") {
        return (await this.getResult(attemptId, studentId))!;
      }

      const payload = await this.getAttemptPayload(attemptId, studentId);
      if (!payload) throw new Error("Attempt payload not found");
      const optionRows = await current.pg.query(
        `select q.id as question_id, q.explanation, eq.marks, qo.id as option_id, qo.option_key, qo.option_text, qo.is_correct
         from level_exam_exam_questions eq
         join level_exam_questions q on q.id = eq.question_id
         join level_exam_question_options qo on qo.question_id = q.id
         where eq.exam_id = $1
         order by eq.display_order asc, qo.option_key asc`,
        [payload.exam_id],
      );
      const answersRows = await current.pg.query(
        `select question_id, selected_option_id from level_exam_attempt_answers where attempt_id = $1`,
        [attemptId],
      );
      const answersByQuestion = new Map(answersRows.rows.map((answer) => [String(answer.question_id), answer.selected_option_id ? String(answer.selected_option_id) : null]));
      const grouped = new Map<string, { marks: number; explanation?: string; options: Array<{ id: string; is_correct: boolean }> }>();
      for (const rowOption of optionRows.rows) {
        const key = String(rowOption.question_id);
        const group = grouped.get(key) ?? { marks: Number(rowOption.marks), explanation: rowOption.explanation ? String(rowOption.explanation) : undefined, options: [] };
        group.options.push({ id: String(rowOption.option_id), is_correct: Boolean(rowOption.is_correct) });
        grouped.set(key, group);
      }
      let score = 0;
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      for (const [questionId, group] of grouped.entries()) {
        const selected = answersByQuestion.get(questionId) ?? null;
        const correctOption = group.options.find((option) => option.is_correct);
        if (!selected) unanswered += 1;
        else if (selected === correctOption?.id) {
          correct += 1;
          score += group.marks;
        } else wrong += 1;
      }
      const totalMarks = payload.total_marks;
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      await current.pg.query(
        `update level_exam_attempts
         set submitted_at = now(),
             status = $3,
             score_obtained = $4,
             total_marks = $5,
             percentage = $6,
             correct_count = $7,
             wrong_count = $8,
             unanswered_count = $9
         where id = $1 and frappe_student_id = $2`,
        [attemptId, studentId, autoSubmitted ? "auto_submitted" : "submitted", score, totalMarks, percentage, correct, wrong, unanswered],
      );
      return (await this.getResult(attemptId, studentId))!;
    }

    const attempt = current.state.attempts.find((record) => record.id === attemptId && record.frappe_student_id === studentId);
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== "in_progress") {
      return gradeAttempt(current.state, attempt);
    }
    attempt.status = autoSubmitted ? "auto_submitted" : "submitted";
    attempt.submitted_at = new Date().toISOString();
    const assignment = current.state.assignments.find((record) => record.exam_id === attempt.exam_id && record.frappe_student_id === studentId);
    if (assignment) assignment.status = "submitted";
    await writeLocalState(current.state);
    return gradeAttempt(current.state, attempt as AttemptRecord & { status: AttemptStatus });
  }

  async getResult(attemptId: string, studentId: string): Promise<LevelExamResult | null> {
    const current = await this.getState();
    if (current.mode === "pg") {
      const attemptRows = await current.pg.query(
        `select id, exam_id, frappe_student_id, started_at, submitted_at, status
         from level_exam_attempts
         where id = $1 and frappe_student_id = $2
         limit 1`,
        [attemptId, studentId],
      );
      const row = attemptRows.rows[0];
      if (!row) return null;
      if (String(row.status) === "in_progress") {
        return this.submitAttempt(attemptId, studentId, true);
      }
      const payload = await this.getAttemptPayload(attemptId, studentId).catch(() => null);
      const examDetail = await this.getExamDetail(String(row.exam_id), studentId);
      const optionRows = await current.pg.query(
        `select q.id as question_id, q.stem, q.explanation, eq.marks, qo.id as option_id, qo.option_key, qo.option_text, qo.is_correct
         from level_exam_exam_questions eq
         join level_exam_questions q on q.id = eq.question_id
         join level_exam_question_options qo on qo.question_id = q.id
         where eq.exam_id = $1
         order by eq.display_order asc, qo.option_key asc`,
        [row.exam_id],
      );
      const answerRows = await current.pg.query(
        `select question_id, selected_option_id from level_exam_attempt_answers where attempt_id = $1`,
        [attemptId],
      );
      const snapshotRows = await current.pg.query(
        `select student_name from level_exam_student_snapshots where frappe_student_id = $1 limit 1`,
        [studentId],
      );
      const answersByQuestion = new Map(answerRows.rows.map((answer) => [String(answer.question_id), answer.selected_option_id ? String(answer.selected_option_id) : null]));
      const grouped = new Map<string, { stem: string; explanation?: string; marks: number; options: Array<{ id: string; option_key: string; option_text: string; is_correct: boolean }> }>();
      for (const rowOption of optionRows.rows) {
        const key = String(rowOption.question_id);
        const group = grouped.get(key) ?? {
          stem: String(rowOption.stem),
          explanation: rowOption.explanation ? String(rowOption.explanation) : undefined,
          marks: Number(rowOption.marks),
          options: [],
        };
        group.options.push({
          id: String(rowOption.option_id),
          option_key: String(rowOption.option_key),
          option_text: String(rowOption.option_text),
          is_correct: Boolean(rowOption.is_correct),
        });
        grouped.set(key, group);
      }
      let score = 0;
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      const questions = Array.from(grouped.entries()).map(([questionId, group]) => {
        const selected = answersByQuestion.get(questionId) ?? null;
        const correctOption = group.options.find((option) => option.is_correct);
        const isCorrect = !!selected && selected === correctOption?.id;
        if (!selected) unanswered += 1;
        else if (isCorrect) {
          correct += 1;
          score += group.marks;
        } else wrong += 1;
        return {
          question_id: questionId,
          stem: group.stem,
          marks: group.marks,
          selected_option_id: selected,
          correct_option_id: correctOption?.id || "",
          is_correct: isCorrect,
          explanation: group.explanation,
          options: group.options,
        };
      });
      const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      const subjectName = examDetail?.subject_name || payload?.subject_name || "Subject";
      const studentName = String(snapshotRows.rows[0]?.student_name || "Student");
      return {
        attempt_id: attemptId,
        exam_id: String(row.exam_id),
        title: examDetail?.title || payload?.title || "Level Exam",
        subject_name: subjectName,
        level_code: (examDetail?.level_code || payload?.level_code || "7") as LevelCode,
        child: {
          student_id: studentId,
          student_name: studentName,
        },
        submitted_at: String(row.submitted_at || row.started_at),
        status: String(row.status) as AttemptStatus,
        score_obtained: score,
        total_marks: totalMarks,
        percentage,
        correct_count: correct,
        wrong_count: wrong,
        unanswered_count: unanswered,
        ai_summary: buildEmptyAiSummary(studentName, subjectName),
        questions,
      };
    }

    const attempt = current.state.attempts.find((record) => record.id === attemptId && record.frappe_student_id === studentId);
    if (!attempt) return null;
    if (attempt.status === "in_progress") {
      return this.submitAttempt(attemptId, studentId, true);
    }
    return gradeAttempt(current.state, attempt as AttemptRecord & { status: AttemptStatus });
  }
}

export const levelExamStore = new LevelExamStore();
