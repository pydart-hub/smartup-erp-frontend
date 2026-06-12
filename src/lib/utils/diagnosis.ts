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
