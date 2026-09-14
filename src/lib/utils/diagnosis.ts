export function buildDiagnosisExamTitle(levelCode: string, subjectName: string) {
  return `${levelCode}th ${subjectName} Diagnosis Exam`;
}

export function formatDiagnosisDisplayTitle(title?: string | null) {
  const raw = String(title || "").trim();
  if (!raw) return "";

  return raw
    .replace(/\bLevel Exam\b/gi, "Diagnosis Exam")
    .replace(/\s*-\s*\d{1,2}(?:st|nd|rd|th)?\s+Assignment\s*$/i, "")
    .trim();
}

/**
 * Standard 9 physical SmartUp tuition centers
 */
export const TUITION_BRANCHES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
] as const;

export const KERALA_DISTRICTS = [
  "ernakulam",
  "thiruvananthapuram",
  "kollam",
  "pathanamthitta",
  "alappuzha",
  "kottayam",
  "idukki",
  "thrissur",
  "palakkad",
  "malappuram",
  "kozhikode",
  "wayanad",
  "kannur",
  "kasaragod",
];

/**
 * Prisma WHERE filter to exclude Kerala Scholarship Exams from tuition Diagnosis Exam queries.
 * This guarantees zero data loss: all scholarship data remains safe in PostgreSQL while keeping
 * the tuition diagnosis dashboard strictly focused on tuition branch centers.
 */
export const DIAGNOSIS_EXAM_PUBLISHING_FILTER = {
  publishing: {
    NOT: [
      { slug: { startsWith: "scholarship" } },
      { title: { contains: "Scholarship", mode: "insensitive" as const } },
    ],
  },
};

/**
 * Helper to determine whether an exam attempt is from the public scholarship portal.
 */
export function isScholarshipAttempt(attempt: {
  studentBranch?: string | null;
  publishing?: { title?: string | null; slug?: string | null } | null;
}): boolean {
  const title = attempt.publishing?.title?.toLowerCase() || "";
  const slug = attempt.publishing?.slug?.toLowerCase() || "";
  if (title.includes("scholarship") || slug.startsWith("scholarship")) {
    return true;
  }

  const branchClean = (attempt.studentBranch || "").replace(/[\s\-_]/g, "").toLowerCase();
  if (KERALA_DISTRICTS.includes(branchClean)) {
    return true;
  }

  return false;
}

