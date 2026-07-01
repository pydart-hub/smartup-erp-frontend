export interface AttemptWithPublishing {
  id: string;
  studentName: string;
  studentBranch: string | null;
  studentPhone: string | null;
  classLevel: string;
  status: string;
  startedAt: Date | string;
  submittedAt: Date | string | null;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  paperSnapshotJson?: any;
  resultSnapshotJson?: any;
  publishing: {
    title: string;
    subject: {
      name: string;
    };
  };
  answers?: Array<{
    questionId: string;
    selectedOption: string;
  }>;
}

export function getOrdinalSuffix(val: string): string {
  const num = parseInt(val, 10);
  if (isNaN(num)) return val;
  if (num === 1) return "1st";
  if (num === 2) return "2nd";
  if (num === 3) return "3rd";
  return `${num}th`;
}

export function getAttemptLevelBreakdown(attempt: AttemptWithPublishing) {
  try {
    const questions: any[] = typeof attempt.paperSnapshotJson === "string"
      ? JSON.parse(attempt.paperSnapshotJson)
      : attempt.paperSnapshotJson;

    if (!questions || questions.length === 0) return { breakdown: [], diagnosedLevel: null };

    // Map correct answers
    const correctMap = new Map<string, boolean>();
    const isSubmitted = attempt.status === "submitted" || attempt.status === "auto_submitted";

    if (isSubmitted) {
      const results = typeof attempt.resultSnapshotJson === "string"
        ? JSON.parse(attempt.resultSnapshotJson)
        : attempt.resultSnapshotJson;
      if (results && results.questions) {
        results.questions.forEach((q: any) => {
          correctMap.set(q.questionId, q.isCorrect);
        });
      }
    } else {
      const answers = attempt.answers || [];
      const answerMap = new Map(answers.map((a: any) => [a.questionId, a.selectedOption]));
      questions.forEach((q) => {
        const ans = answerMap.get(q.id);
        correctMap.set(q.id, !!ans && ans === q.correctOption);
      });
    }

    // Group questions by classLevel
    const levelsMap = new Map<string, { correct: number; total: number }>();
    questions.forEach((q) => {
      const lvl = q.classLevel;
      const stats = levelsMap.get(lvl) || { correct: 0, total: 0 };
      stats.total += 1;
      if (correctMap.get(q.id)) {
        stats.correct += 1;
      }
      levelsMap.set(lvl, stats);
    });

    const levelCodes = Array.from(levelsMap.keys())
      .map((lvl) => parseInt(lvl, 10))
      .filter((lvl) => !isNaN(lvl))
      .sort((a, b) => a - b);

    let firstFailedLvlStr: string | null = null;
    const breakdown = levelCodes.map((lvl) => {
      const lvlStr = String(lvl);
      const stats = levelsMap.get(lvlStr)!;
      const isPassed = stats.correct === stats.total;
      if (!isPassed && firstFailedLvlStr === null) {
        firstFailedLvlStr = lvlStr;
      }
      return {
        level: lvlStr,
        correctCount: stats.correct,
        totalCount: stats.total,
        isPassed,
        isDiagnosedLevel: false,
      };
    });

    // Mark the diagnosed level in the breakdown
    let diagnosedLevelStr: string | null = null;
    let diagnosedCorrect: number | null = null;
    let diagnosedTotal: number | null = null;
    if (firstFailedLvlStr !== null) {
      diagnosedLevelStr = getOrdinalSuffix(firstFailedLvlStr);
      breakdown.forEach((item) => {
        if (item.level === firstFailedLvlStr) {
          item.isDiagnosedLevel = true;
          diagnosedCorrect = item.correctCount;
          diagnosedTotal = item.totalCount;
        }
      });
    } else {
      diagnosedLevelStr = getOrdinalSuffix(attempt.classLevel);
      breakdown.forEach((item) => {
        if (item.level === attempt.classLevel) {
          item.isDiagnosedLevel = true;
          diagnosedCorrect = item.correctCount;
          diagnosedTotal = item.totalCount;
        }
      });
      // Fallback if no matching level was in breakdown
      if (diagnosedCorrect === null && breakdown.length > 0) {
        const lastLvl = breakdown[breakdown.length - 1];
        lastLvl.isDiagnosedLevel = true;
        diagnosedCorrect = lastLvl.correctCount;
        diagnosedTotal = lastLvl.totalCount;
      }
    }

    return { breakdown, diagnosedLevel: diagnosedLevelStr, diagnosedCorrect, diagnosedTotal };
  } catch (e) {
    console.error("Error generating level breakdown:", e);
    return { breakdown: [], diagnosedLevel: null };
  }
}
