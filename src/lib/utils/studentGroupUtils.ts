/**
 * Utilities to classify and filter Student Groups across SmartUp ERP.
 * Ensures that subject-wise tuition groups and one-to-one records
 * do not pollute standard class cohort and syllabus completion tracking.
 */

/**
 * Detect if a student group represents an individual student (One-to-One),
 * e.g. "karthik (STU-SU EDPLY-26-025)" or "ABINAV MOHAN (STU-SU KDV-26-040)"
 */
export function isOneToOneStudentGroup(studentGroup: string): boolean {
  if (!studentGroup) return false;
  const trimmed = studentGroup.trim();
  // Check for student ID patterns: "(STU-" or "STU-"
  if (/STU-[A-Z0-9-]+/i.test(trimmed)) return true;
  // Check for explicit one-to-one indicators
  if (/one[-_\s]?to[-_\s]?one|1[-_\s]?to[-_\s]?1|1:1/i.test(trimmed)) return true;
  return false;
}

/**
 * Detect if a student group represents a subject-wise tuition group
 * rather than a canonical class cohort batch.
 *
 * Examples of subject-wise groups:
 * - "Chullickal-Phy-Chem-11-A"
 * - "Edappally-Chem-Maths-11-A"
 * - "Edappally-Chemistry-11-A"
 * - "Vennala-Maths-12-A"
 * - "Kadavanthara-Physics-11-A"
 */
export function isSubjectWiseStudentGroup(studentGroup: string): boolean {
  if (!studentGroup) return false;
  const trimmed = studentGroup.trim();

  // Pattern 1: Multi-subject abbreviations (Phy-Chem, Chem-Maths, Phy-Maths, Bio-Maths)
  if (
    /phy[-_\s]?chem/i.test(trimmed) ||
    /chem[-_\s]?maths/i.test(trimmed) ||
    /phy[-_\s]?maths/i.test(trimmed) ||
    /bio[-_\s]?maths/i.test(trimmed)
  ) {
    return true;
  }

  // Pattern 2: Single subject names flanked by hyphens/delimiters (e.g. -Physics-, -Chemistry-, -Maths-, -Biology-)
  if (/-(physics|chemistry|maths|mathematics|biology|botany|zoology)-/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Check if a student group is a canonical whole-class batch group
 * (i.e. neither One-to-One nor Subject-wise).
 */
export function isCanonicalBatchGroup(studentGroup: string): boolean {
  if (!studentGroup) return false;
  return !isOneToOneStudentGroup(studentGroup) && !isSubjectWiseStudentGroup(studentGroup);
}

/**
 * Extract a friendly batch display name from a student group string.
 * e.g. "Palluruthy-10th State-A" -> "Batch A"
 *      "Edappally-11th Science State-B" -> "Batch B"
 */
export function extractBatchName(studentGroup: string): string {
  if (!studentGroup) return "General";
  const trimmed = studentGroup.trim();
  const dashMatch = trimmed.match(/-([A-Za-z0-9]+)$/);
  if (dashMatch && dashMatch[1]) {
    const code = dashMatch[1].toUpperCase();
    return code.length <= 2 ? `Batch ${code}` : dashMatch[1];
  }
  const batchMatch = trimmed.match(/batch\s*([A-Za-z0-9]+)/i);
  if (batchMatch && batchMatch[1]) {
    return `Batch ${batchMatch[1].toUpperCase()}`;
  }
  return trimmed;
}

/**
 * Normalizes subject/course names to reconcile naming variations
 * across historical data entries without modifying the database.
 * 
 * E.g.:
 * - "Malayalam" -> "Malayalam I"
 * - "MALAYALAM II" -> "Malayalam II"
 * - "Social Science" -> "Social Science I - History"
 */
export function normalizeSubjectCourse(courseName: string | undefined | null): string {
  if (!courseName) return "General Subject";
  const trimmed = courseName.trim();
  const lower = trimmed.toLowerCase();

  // Malayalam variants
  if (lower === "malayalam" || lower === "malayalam 1" || lower === "malayalam i") {
    return "Malayalam I";
  }
  if (lower === "malayalam 2" || lower === "malayalam ii") {
    return "Malayalam II";
  }

  // Social Science variants (if single generic 'Social Science' exists alongside History/Geography)
  if (lower === "social science" || lower === "social science 1" || lower === "social science i") {
    return "Social Science I - History";
  }
  if (lower === "social science 2" || lower === "social science ii") {
    return "Social Science II - Geography";
  }

  // Default to original trimmed string
  return trimmed;
}

