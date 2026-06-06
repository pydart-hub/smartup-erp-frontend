const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const LEVEL_EXAM_DOCTYPES = {
  studentSnapshot: process.env.FRAPPE_LEVEL_EXAM_STUDENT_DOCTYPE || "Level Exam Student Snapshot",
  exam: process.env.FRAPPE_LEVEL_EXAM_DOCTYPE || "Level Exam",
  assignment: process.env.FRAPPE_LEVEL_EXAM_ASSIGNMENT_DOCTYPE || "Level Exam Assignment",
  attempt: process.env.FRAPPE_LEVEL_EXAM_ATTEMPT_DOCTYPE || "Level Exam Attempt",
};

export type BoardCode = "state" | "cbse";

type StudentSnapshot = {
  student_id: string;
  student_name: string;
  branch: string;
  program: string;
  student_group: string;
  level_code: "8" | "9" | "10" | null;
  board_code: BoardCode | null;
  is_active: boolean;
};

type AssignmentRecord = {
  exam_id: string;
  student_id: string;
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
  board_code: BoardCode;
  total_questions: number;
  total_marks: number;
  published_at: string | null;
  available_from: string | null;
  available_until: string | null;
  questions: StoredQuestion[];
};

export type AttemptMetric = {
  studentId: string;
  studentName: string;
  branch: string;
  studentGroup: string;
  levelCode: "8" | "9" | "10";
  boardCode: BoardCode;
  examId: string;
  examTitle: string;
  subjectName: string;
  totalMarks: number;
  score: number;
  percentage: number;
  grade: string;
};

type QuestionBankExam = {
  examId: string;
  subjectName: string;
  subjectCode: string;
  levelCode: "8" | "9" | "10";
  totalQuestions: number;
  totalMarks: number;
};

type AssignmentStudentRow = {
  student: string;
  student_name: string;
  program: string;
  student_group: string;
  assignment_status: string;
};

type PublishedAssignment = {
  assignmentId: string;
  title: string;
  subjectName: string;
  levelCode: "8" | "9" | "10" | null;
  paperName: string;
  publishedAt: string;
  students: AssignmentStudentRow[];
};

export function gradeFromPercentage(percentage: number) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 35) return "D";
  return "E";
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round(value: number) {
  return Number(value.toFixed(1));
}

export function getGradeTone(grade: string) {
  if (grade.startsWith("A")) return "text-success bg-success/10";
  if (grade.startsWith("B")) return "text-primary bg-primary/10";
  if (grade === "C") return "text-warning bg-warning/10";
  if (grade === "D") return "text-orange-600 bg-orange-100";
  return "text-error bg-error/10";
}

function normalizeLevelCode(value?: string | null): "8" | "9" | "10" | null {
  const match = String(value || "").match(/\b(10|[8-9])(?:st|nd|rd|th)?\b/i);
  const level = match?.[1];
  return level === "8" || level === "9" || level === "10" ? level : null;
}

function getHeaders() {
  if (!FRAPPE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    throw new Error("Frappe environment is not configured");
  }
  return {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

function isRetryableFrappeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("fetch failed") ||
    message.includes("Connect Timeout Error") ||
    message.includes("UND_ERR_CONNECT_TIMEOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT")
  );
}

async function withRetry<T>(label: string, run: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableFrappeError(error)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  console.warn(`[level-exams] ${label} failed:`, lastError instanceof Error ? lastError.message : lastError);
  throw lastError instanceof Error ? lastError : new Error(`Failed to load ${label}`);
}

function unwrapSettled<T>(result: PromiseSettledResult<T>, fallback: T, label: string) {
  if (result.status === "fulfilled") return result.value;
  console.warn(`[level-exams] ${label} degraded:`, result.reason instanceof Error ? result.reason.message : result.reason);
  return fallback;
}

async function fetchResourceList(
  doctype: string,
  fields: string[],
  filters: unknown[][] = [],
  limit = 5000,
) {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  return withRetry(`resource list ${doctype}`, async () => {
    const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(String(json.exception || json.message || `Failed to fetch ${doctype}`));
    }
    return Array.isArray(json.data) ? json.data as Array<Record<string, unknown>> : [];
  });
}

async function fetchResourceDoc(doctype: string, name: string) {
  return withRetry(`resource doc ${doctype}/${name}`, async () => {
    const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(String(json.exception || json.message || `Failed to fetch ${doctype}/${name}`));
    }
    return (json.data || {}) as Record<string, unknown>;
  });
}

async function fetchResourceListWithFallbacks(
  doctype: string,
  fieldSets: string[][],
  filters: unknown[][] = [],
  limit = 5000,
) {
  let lastError: unknown = null;
  for (const fields of fieldSets) {
    try {
      return await fetchResourceList(doctype, fields, filters, limit);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${doctype}`);
}

async function fetchFullDocsFromNames(doctype: string) {
  const rows = await fetchResourceList(doctype, ["name"], [], 5000);
  return Promise.all(
    rows
      .map((row) => String(row.name || ""))
      .filter(Boolean)
      .map((name) => fetchResourceDoc(doctype, name)),
  );
}

async function fetchEligibleStudentsFromCore(): Promise<StudentSnapshot[]> {
  const students = await fetchResourceList(
    "Student",
    ["name", "student_name", "custom_branch"],
    [["enabled", "=", 1]],
    5000,
  );

  const studentIds = students.map((row) => String(row.name || "")).filter(Boolean);
  const latestEnrollmentByStudent = new Map<string, { program: string; student_batch_name?: string }>();
  const batchSize = 50;

  for (let index = 0; index < studentIds.length; index += batchSize) {
    const chunk = studentIds.slice(index, index + batchSize);
    if (!chunk.length) continue;
    const enrollments = await fetchResourceList(
      "Program Enrollment",
      ["student", "program", "student_batch_name"],
      [["docstatus", "=", 1], ["student", "in", chunk]],
      chunk.length * 3,
    );
    for (const enrollment of enrollments) {
      const studentId = String(enrollment.student || "");
      if (studentId && !latestEnrollmentByStudent.has(studentId)) {
        latestEnrollmentByStudent.set(studentId, {
          program: String(enrollment.program || ""),
          student_batch_name: enrollment.student_batch_name ? String(enrollment.student_batch_name) : "",
        });
      }
    }
  }

  return students
    .map((row) => {
      const studentId = String(row.name || "");
      const latestEnrollment = latestEnrollmentByStudent.get(studentId);
      const program = latestEnrollment?.program || "";
      const levelCode = normalizeLevelCode(program);
      const boardText = program.toLowerCase();
      const boardCode: BoardCode | null = boardText.includes("cbse") ? "cbse" : (boardText.includes("state") ? "state" : null);

      return {
        student_id: studentId,
        student_name: String(row.student_name || ""),
        branch: String(row.custom_branch || ""),
        program,
        student_group: latestEnrollment?.student_batch_name || "",
        level_code: levelCode,
        board_code: boardCode,
        is_active: true,
      } satisfies StudentSnapshot;
    })
    .filter((student) => Boolean(student.student_id && student.level_code));
}

function normalizeSubjectCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function makeQuestionBankExamId(levelCode: string, subjectName: string) {
  return `questionbank:${levelCode}:${normalizeSubjectCode(subjectName)}`;
}

async function fetchQuestionBankExams(): Promise<QuestionBankExam[]> {
  const questionDocs = await fetchFullDocsFromNames(process.env.FRAPPE_LEVEL_EXAM_QUESTION_DOCTYPE || "Level Exam Question");
  const grouped = new Map<string, { subjectName: string; levelCode: "8" | "9" | "10"; count: number }>();

  for (const row of questionDocs) {
    const subjectName = String(row.subject || "").trim();
    const levelCode = normalizeLevelCode(String(row.class_level || ""));
    const isActive = Boolean(Number(row.is_active ?? 1));
    if (!subjectName || !levelCode || !isActive) continue;
    const key = `${levelCode}::${subjectName}`;
    const existing = grouped.get(key) || { subjectName, levelCode, count: 0 };
    existing.count += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).map((item) => ({
    examId: makeQuestionBankExamId(item.levelCode, item.subjectName),
    subjectName: item.subjectName,
    subjectCode: normalizeSubjectCode(item.subjectName),
    levelCode: item.levelCode,
    totalQuestions: item.count,
    totalMarks: item.count,
  }));
}

export async function getLevelExamDashboardData() {
  const emptyDashboard = {
    hero: {
      publishedExams: 0,
      assignedRecords: 0,
      attendedStudents: 0,
      activeStudents: 0,
      overallAvgPercentage: 0,
      overallAvgScore: 0,
      passRate: 0,
      generatedExams: 0,
      activeSubjects: 0,
      assignedExamIds: 0,
    },
    classSummaries: ["8", "9", "10"].map((levelCode) => ({
      levelCode,
      studentCount: 0,
      assignedCount: 0,
      attendedCount: 0,
      avgScore: 0,
      avgPercentage: 0,
      topGrade: "NA",
      passRate: 0,
    })),
    branchSummaries: [] as Array<{
      branch: string;
      studentCount: number;
      attendedCount: number;
      avgMarks: number;
      avgPercentage: number;
      topGrade: string;
      passRate: number;
    }>,
    subjectSummaries: [] as Array<{
      subjectName: string;
      attempts: number;
      avgScore: number;
      avgPercentage: number;
      topGrade: string;
    }>,
    recentExamSummaries: [] as Array<{
      examId: string;
      title: string;
      subjectName: string;
      levelCode: "8" | "9" | "10";
      boardCode: BoardCode;
      assignedCount: number;
      attendedCount: number;
      avgPercentage: number;
      publishedAt: string;
    }>,
    attempts: [] as AttemptMetric[],
    activeStudents: [] as StudentSnapshot[],
  };

  try {
    const [activeStudentsResult, assignmentRowsResult, attemptRowsResult, questionBankExamsResult, paperRowsResult] =
      await Promise.allSettled([
        fetchEligibleStudentsFromCore(),
        fetchFullDocsFromNames(LEVEL_EXAM_DOCTYPES.assignment),
        fetchFullDocsFromNames(LEVEL_EXAM_DOCTYPES.attempt),
        fetchQuestionBankExams(),
        fetchFullDocsFromNames(process.env.FRAPPE_LEVEL_EXAM_PAPER_DOCTYPE || "Level Exam Paper"),
      ]);

    const activeStudents = unwrapSettled(activeStudentsResult, [] as StudentSnapshot[], "active students");
    const assignmentRows = unwrapSettled(assignmentRowsResult, [] as Array<Record<string, unknown>>, "assignments");
    const attemptRows = unwrapSettled(attemptRowsResult, [] as Array<Record<string, unknown>>, "attempts");
    const questionBankExams = unwrapSettled(questionBankExamsResult, [] as QuestionBankExam[], "question bank exams");
    const paperRows = unwrapSettled(paperRowsResult, [] as Array<Record<string, unknown>>, "papers");

  const studentMap = new Map(activeStudents.map((student) => [student.student_id, student]));
  const paperMap = new Map(paperRows.map((row) => [String(row.name || ""), row]));
  const publishedAssignments: PublishedAssignment[] = assignmentRows
    .map((row) => ({
      assignmentId: String(row.name || ""),
      title: String(row.assignment_title || row.subject || ""),
      subjectName: String(row.subject || ""),
      levelCode: normalizeLevelCode(String(row.class_level || "")),
      paperName: String(row.exam_paper || ""),
      publishedAt: String(row.modified || row.creation || row.schedule_date || ""),
      students: Array.isArray(row.students)
        ? (row.students as Array<Record<string, unknown>>).map((studentRow) => ({
            student: String(studentRow.student || ""),
            student_name: String(studentRow.student_name || ""),
            program: String(studentRow.program || ""),
            student_group: String(studentRow.student_group || ""),
            assignment_status: String(studentRow.assignment_status || "Assigned"),
          }))
        : [],
    }))
    .filter((assignment) => assignment.assignmentId && assignment.levelCode);

  const flattenedAssignments = publishedAssignments.flatMap((assignment) =>
    assignment.students
      .filter((studentRow) => studentRow.student)
      .map((studentRow) => ({
        assignmentId: assignment.assignmentId,
        studentId: studentRow.student,
        status: studentRow.assignment_status.trim().toLowerCase(),
        levelCode: assignment.levelCode,
        subjectName: assignment.subjectName,
      })),
  );

  const assignmentMap = new Map(publishedAssignments.map((assignment) => [assignment.assignmentId, assignment]));

  const attempts: AttemptMetric[] = attemptRows
    .map((row) => {
      const status = String(row.status || "").trim().toLowerCase();
      if (status !== "submitted" && status !== "auto submitted") return null;

      const assignmentId = String(row.assignment || "");
      const assignment = assignmentMap.get(assignmentId);
      const studentId = String(row.student || "");
      const student = studentMap.get(studentId);
      const paper = paperMap.get(String(row.exam_paper || assignment?.paperName || ""));
      const levelCode = normalizeLevelCode(String(row.class_level || assignment?.levelCode || student?.level_code || ""));
      if (!assignment || !student || !levelCode) return null;

      const percentage = Number(row.percentage || 0);
      const score = Number(row.score_obtained || 0);
      return {
        studentId,
        studentName: String(row.student_name || student.student_name),
        branch: student.branch,
        studentGroup: student.student_group,
        levelCode,
        boardCode: student.board_code || "state",
        examId: assignmentId,
        examTitle: assignment.title || String(paper?.paper_title || assignment.subjectName || ""),
        subjectName: String(row.subject || assignment.subjectName || paper?.subject || ""),
        totalMarks: Number(row.total_marks || paper?.total_marks || 0),
        score,
        percentage,
        grade: gradeFromPercentage(percentage),
      } satisfies AttemptMetric;
    })
    .filter((attempt): attempt is AttemptMetric => attempt !== null)
    .filter((attempt, index, arr) => arr.findIndex((item) => item.examId === attempt.examId && item.studentId === attempt.studentId) === index);

  const uniqueAttendedStudents = new Set(attempts.map((attempt) => attempt.studentId));
  const assignedExamIds = new Set(flattenedAssignments.map((assignment) => assignment.assignmentId));

  const overallAvgPercentage = round(average(attempts.map((attempt) => attempt.percentage)));
  const overallAvgScore = round(average(attempts.map((attempt) => attempt.score)));
  const passRate = attempts.length
    ? round((attempts.filter((attempt) => attempt.percentage >= 35).length / attempts.length) * 100)
    : 0;

  const classSummaries = ["8", "9", "10"].map((levelCode) => {
    const classStudents = activeStudents.filter((student) => student.level_code === levelCode);
    const classAssignments = flattenedAssignments.filter((assignment) => assignment.levelCode === levelCode);
    const classAttempts = attempts.filter((attempt) => attempt.levelCode === levelCode);
    const gradeCounts = classAttempts.reduce<Record<string, number>>((acc, attempt) => {
      acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
      return acc;
    }, {});
    const topGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA";

    return {
      levelCode,
      studentCount: classStudents.length,
      assignedCount: classAssignments.length,
      attendedCount: new Set(classAttempts.map((attempt) => attempt.studentId)).size,
      avgScore: round(average(classAttempts.map((attempt) => attempt.score))),
      avgPercentage: round(average(classAttempts.map((attempt) => attempt.percentage))),
      topGrade,
      passRate: classAttempts.length
        ? round((classAttempts.filter((attempt) => attempt.percentage >= 35).length / classAttempts.length) * 100)
        : 0,
    };
  });

  const branchSummaries = Array.from(
    activeStudents.reduce<Map<string, StudentSnapshot[]>>((acc, student) => {
      const existing = acc.get(student.branch) || [];
      existing.push(student);
      acc.set(student.branch, existing);
      return acc;
    }, new Map()),
  )
    .map(([branch, students]) => {
      const branchAttempts = attempts.filter((attempt) => attempt.branch === branch);
      const gradeCounts = branchAttempts.reduce<Record<string, number>>((acc, attempt) => {
        acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
        return acc;
      }, {});
      const topGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA";

      return {
        branch,
        studentCount: students.length,
        attendedCount: new Set(branchAttempts.map((attempt) => attempt.studentId)).size,
        avgMarks: round(average(branchAttempts.map((attempt) => attempt.score))),
        avgPercentage: round(average(branchAttempts.map((attempt) => attempt.percentage))),
        topGrade,
        passRate: branchAttempts.length
          ? round((branchAttempts.filter((attempt) => attempt.percentage >= 35).length / branchAttempts.length) * 100)
          : 0,
      };
    })
    .sort((a, b) => b.attendedCount - a.attendedCount || b.avgPercentage - a.avgPercentage);

  const subjectSummaries = Array.from(
    attempts.reduce<Map<string, AttemptMetric[]>>((acc, attempt) => {
      const existing = acc.get(attempt.subjectName) || [];
      existing.push(attempt);
      acc.set(attempt.subjectName, existing);
      return acc;
    }, new Map()),
  )
    .map(([subjectName, subjectAttempts]) => ({
      subjectName,
      attempts: subjectAttempts.length,
      avgScore: round(average(subjectAttempts.map((attempt) => attempt.score))),
      avgPercentage: round(average(subjectAttempts.map((attempt) => attempt.percentage))),
      topGrade:
        Object.entries(
          subjectAttempts.reduce<Record<string, number>>((acc, attempt) => {
            acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA",
    }))
    .sort((a, b) => b.attempts - a.attempts || b.avgPercentage - a.avgPercentage);

  const recentExamSummaries = publishedAssignments
    .map((assignment) => {
      const examAttempts = attempts.filter((attempt) => attempt.examId === assignment.assignmentId);
      const assignedStudents = assignment.students.filter((studentRow) => studentRow.student);
      const boardVotes = assignedStudents
        .map((studentRow) => studentMap.get(studentRow.student)?.board_code)
        .filter((board): board is BoardCode => board === "state" || board === "cbse");
      const boardCode = boardVotes[0] || "state";
      return {
        examId: assignment.assignmentId,
        title: assignment.title,
        subjectName: assignment.subjectName,
        levelCode: assignment.levelCode || "8",
        boardCode,
        assignedCount: assignedStudents.length,
        attendedCount: new Set(examAttempts.map((attempt) => attempt.studentId)).size,
        avgPercentage: round(average(examAttempts.map((attempt) => attempt.percentage))),
        publishedAt: assignment.publishedAt || new Date().toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 4);

    return {
      hero: {
        publishedExams: publishedAssignments.length,
        assignedRecords: flattenedAssignments.length,
        attendedStudents: uniqueAttendedStudents.size,
        activeStudents: activeStudents.length,
        overallAvgPercentage,
        overallAvgScore,
        passRate,
        generatedExams: questionBankExams.length,
        activeSubjects: new Set(
          publishedAssignments.map((assignment) => assignment.subjectName).filter(Boolean),
        ).size,
        assignedExamIds: assignedExamIds.size,
      },
      classSummaries,
      branchSummaries: branchSummaries.slice(0, 8),
      subjectSummaries: subjectSummaries.slice(0, 6),
      recentExamSummaries,
      attempts,
      activeStudents,
    };
  } catch (error) {
    console.warn("[level-exams] Dashboard fallback used:", error instanceof Error ? error.message : error);
    return emptyDashboard;
  }
}

export async function getLevelExamClassDetail(levelCode: "8" | "9" | "10") {
  const data = await getLevelExamDashboardData();
  const classSummary = data.classSummaries.find((item) => item.levelCode === levelCode) || null;
  const classStudents = data.activeStudents.filter((student) => student.level_code === levelCode);
  const classAttempts = data.attempts.filter((attempt) => attempt.levelCode === levelCode);

  const branchSummaries = Array.from(
    classStudents.reduce<Map<string, StudentSnapshot[]>>((acc, student) => {
      const existing = acc.get(student.branch) || [];
      existing.push(student);
      acc.set(student.branch, existing);
      return acc;
    }, new Map()),
  )
    .map(([branch, students]) => {
      const branchAttempts = classAttempts.filter((attempt) => attempt.branch === branch);
      return {
        branch,
        studentCount: students.length,
        attendedCount: new Set(branchAttempts.map((attempt) => attempt.studentId)).size,
        avgScore: round(average(branchAttempts.map((attempt) => attempt.score))),
        avgPercentage: round(average(branchAttempts.map((attempt) => attempt.percentage))),
      };
    })
    .sort((a, b) => b.attendedCount - a.attendedCount || b.avgPercentage - a.avgPercentage);

  const studentsByBranch = branchSummaries.map((branch) => ({
    branch: branch.branch,
    students: classStudents
      .filter((student) => student.branch === branch.branch)
      .map((student) => {
        const studentAttempts = classAttempts.filter((attempt) => attempt.studentId === student.student_id);
        return {
          studentId: student.student_id,
          studentName: student.student_name,
          studentGroup: student.student_group,
          attemptedExams: studentAttempts.length,
          scoredMarks: round(average(studentAttempts.map((attempt) => attempt.score))),
          percentage: round(average(studentAttempts.map((attempt) => attempt.percentage))),
          topGrade:
            studentAttempts.sort((a, b) => b.percentage - a.percentage)[0]?.grade || "NA",
        };
      })
      .sort((a, b) => b.percentage - a.percentage || a.studentName.localeCompare(b.studentName)),
  }));

  return {
    classSummary,
    branchSummaries,
    studentsByBranch,
  };
}

export async function getLevelExamSubjectDetail(levelCode: "8" | "9" | "10", subjectName: string) {
  const data = await getLevelExamDashboardData();
  const classAttempts = data.attempts.filter(
    (attempt) => attempt.levelCode === levelCode && attempt.subjectName.toLowerCase() === subjectName.toLowerCase(),
  );
  const classStudents = data.activeStudents.filter((student) => student.level_code === levelCode);

  const subjectSummary = {
    levelCode,
    subjectName,
    attempts: classAttempts.length,
    attendedStudents: new Set(classAttempts.map((attempt) => attempt.studentId)).size,
    avgScore: round(average(classAttempts.map((attempt) => attempt.score))),
    avgPercentage: round(average(classAttempts.map((attempt) => attempt.percentage))),
    passRate: classAttempts.length
      ? round((classAttempts.filter((attempt) => attempt.percentage >= 35).length / classAttempts.length) * 100)
      : 0,
    topGrade:
      Object.entries(
        classAttempts.reduce<Record<string, number>>((acc, attempt) => {
          acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA",
  };

  const branchSummaries = Array.from(
    classStudents.reduce<Map<string, typeof classAttempts>>((acc, student) => {
      if (!acc.has(student.branch)) acc.set(student.branch, []);
      return acc;
    }, new Map()),
  )
    .map(([branch]) => {
      const branchAttempts = classAttempts.filter((attempt) => attempt.branch === branch);
      const branchStudents = classStudents.filter((student) => student.branch === branch);
      return {
        branch,
        studentCount: branchStudents.length,
        attendedCount: new Set(branchAttempts.map((attempt) => attempt.studentId)).size,
        attempts: branchAttempts.length,
        avgScore: round(average(branchAttempts.map((attempt) => attempt.score))),
        avgPercentage: round(average(branchAttempts.map((attempt) => attempt.percentage))),
        topGrade:
          Object.entries(
            branchAttempts.reduce<Record<string, number>>((acc, attempt) => {
              acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
              return acc;
            }, {}),
          ).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA",
      };
    })
    .sort((a, b) => b.avgPercentage - a.avgPercentage || b.attendedCount - a.attendedCount);

  return {
    subjectSummary,
    branchSummaries,
  };
}

export async function getLevelExamBranchSubjectDetail(
  levelCode: "8" | "9" | "10",
  subjectName: string,
  branchName: string,
) {
  const data = await getLevelExamDashboardData();
  const attempts = data.attempts.filter(
    (attempt) =>
      attempt.levelCode === levelCode &&
      attempt.branch === branchName &&
      attempt.subjectName.toLowerCase() === subjectName.toLowerCase(),
  );
  const students = data.activeStudents.filter(
    (student) => student.level_code === levelCode && student.branch === branchName,
  );

  const studentSummaries = students
    .map((student) => {
      const studentAttempts = attempts.filter((attempt) => attempt.studentId === student.student_id);
      const bestAttempt = studentAttempts.slice().sort((a, b) => b.percentage - a.percentage)[0] || null;
      return {
        studentId: student.student_id,
        studentName: student.student_name,
        studentGroup: student.student_group,
        attempts: studentAttempts.length,
        avgScore: round(average(studentAttempts.map((attempt) => attempt.score))),
        avgPercentage: round(average(studentAttempts.map((attempt) => attempt.percentage))),
        bestScore: bestAttempt?.score ?? 0,
        bestPercentage: bestAttempt?.percentage ?? 0,
        latestExamTitle: bestAttempt?.examTitle ?? "Not attempted",
        topGrade: bestAttempt?.grade ?? "NA",
      };
    })
    .sort((a, b) => b.avgPercentage - a.avgPercentage || a.studentName.localeCompare(b.studentName));

  const branchSummary = {
    branch: branchName,
    levelCode,
    subjectName,
    studentCount: students.length,
    attendedCount: new Set(attempts.map((attempt) => attempt.studentId)).size,
    attempts: attempts.length,
    avgScore: round(average(attempts.map((attempt) => attempt.score))),
    avgPercentage: round(average(attempts.map((attempt) => attempt.percentage))),
    passRate: attempts.length
      ? round((attempts.filter((attempt) => attempt.percentage >= 35).length / attempts.length) * 100)
      : 0,
  };

  return {
    branchSummary,
    studentSummaries,
  };
}
