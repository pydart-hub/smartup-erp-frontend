export type QuestionSnapshot = {
  id: string;
  classLevel: string;
  questionText: string;
  difficulty: string;
  marks: number;
  displayOrder: number;
  correctOption: string;
  options: Array<{
    id: string;
    optionKey: string;
    optionText: string;
  }>;
};

export type AnswerRecord = {
  questionId: string;
  selectedOption: string;
};

export type GradeResult = {
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  diagnosedLevel?: string;
  aiSummary: {
    headline: string;
    overview: string;
    strengths: string[];
    focus_areas: string[];
    exam_summary: string[];
    best_topic: string | null;
    priority_topic: string | null;
    next_step: string;
  };
  questions: Array<{
    questionId: string;
    questionText: string;
    classLevel?: string;
    marks: number;
    selectedOption: string | null;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
    options: Array<{
      id: string;
      optionKey: string;
      optionText: string;
    }>;
  }>;
};

export function getOrdinalSuffix(val: string): string {
  const num = parseInt(val, 10);
  if (isNaN(num)) return val;
  if (num === 1) return "1st";
  if (num === 2) return "2nd";
  if (num === 3) return "3rd";
  return `${num}th`;
}

export function calculateDiagnosedLevel(
  attemptClassLevel: string,
  paperSnapshotJson: any,
  resultSnapshotJson: any
): string | null {
  if (!resultSnapshotJson) return null;

  try {
    const paperQuestions: QuestionSnapshot[] = typeof paperSnapshotJson === "string"
      ? JSON.parse(paperSnapshotJson)
      : paperSnapshotJson;

    const results: GradeResult = typeof resultSnapshotJson === "string"
      ? JSON.parse(resultSnapshotJson)
      : resultSnapshotJson;

    if (!paperQuestions || !results || !results.questions) return null;

    const correctMap = new Map(results.questions.map((q) => [q.questionId, q.isCorrect]));

    // Group questions by class level and determine if all questions in that level are correct
    const levels = Array.from(new Set(paperQuestions.map((q) => q.classLevel)))
      .map(lvl => parseInt(lvl, 10))
      .filter(lvl => !isNaN(lvl))
      .sort((a, b) => a - b);

    for (const lvl of levels) {
      const lvlStr = String(lvl);
      const lvlQuestions = paperQuestions.filter((q) => q.classLevel === lvlStr);
      const hasFailure = lvlQuestions.some((q) => !correctMap.get(q.id));
      if (hasFailure) {
        return getOrdinalSuffix(lvlStr);
      }
    }

    return getOrdinalSuffix(attemptClassLevel);
  } catch (error) {
    console.error("Error calculating diagnosed level:", error);
    return null;
  }
}

export function gradeAttempt(
  studentName: string,
  subjectName: string,
  questions: QuestionSnapshot[],
  answers: AnswerRecord[],
  targetClassLevel?: string
): GradeResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOption]));

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const gradedQuestions = questions.map((q) => {
    const selected = answerMap.get(q.id) || null;
    const isCorrect = !!selected && selected === q.correctOption;

    if (!selected) {
      unanswered += 1;
    } else if (isCorrect) {
      correct += 1;
      score += q.marks;
    } else {
      wrong += 1;
    }

    return {
      questionId: q.id,
      questionText: q.questionText,
      classLevel: q.classLevel,
      marks: q.marks,
      selectedOption: selected,
      correctOption: q.correctOption,
      isCorrect,
      explanation: "",
      options: q.options,
    };
  });

  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  // Build simple but beautiful AI text summaries
  const headline =
    percentage >= 80
      ? `${studentName} showed an excellent command over ${subjectName} concepts.`
      : percentage >= 50
      ? `${studentName} is building steady foundations in ${subjectName}, with some areas to improve.`
      : `${studentName} needs focused support and conceptual guidance in ${subjectName}.`;

  const overview = `${studentName} scored ${score} out of ${totalMarks} (${percentage}%). ${correct} questions were answered correctly, ${wrong} incorrect, and ${unanswered} left blank.`;

  const strengths: string[] = [];
  if (percentage >= 70) {
    strengths.push("Demonstrates strong analytical thinking and accurate option selection.");
  }
  if (unanswered === 0) {
    strengths.push("Good pacing and exam management: attempted all available questions.");
  } else {
    strengths.push(`Attempted ${totalQuestions - unanswered} out of ${totalQuestions} questions under timed conditions.`);
  }

  const focus_areas: string[] = [];
  if (wrong > 0) {
    focus_areas.push(`Review the ${wrong} incorrect answers to identify conceptual gaps.`);
  }
  if (unanswered > 0) {
    focus_areas.push(`Improve speed and confidence so that the ${unanswered} remaining questions can be attempted.`);
  }
  if (percentage < 60) {
    focus_areas.push("Strongly recommend revising fundamental definitions and doing targeted worksheets.");
  }

  const exam_summary = [
    `The exam evaluated core standard capabilities in ${subjectName}.`,
    percentage >= 80 ? "The student is ready for advanced tasks." : "A revision plan should be created.",
  ];

  const next_step =
    percentage >= 80
      ? `Provide ${studentName.split(" ")[0]} with mock papers and higher-level problem sheets to sustain performance.`
      : percentage >= 50
      ? `Revise incorrect questions with explanations, then attempt a short revision quiz.`
      : `Schedule a 1-to-1 session to review the exam paper and clarify primary concepts.`;

  // Calculate diagnosed level if targetClassLevel is supplied
  let diagnosedLevel: string | undefined = undefined;
  if (targetClassLevel) {
    const correctMap = new Map(gradedQuestions.map((q) => [q.questionId, q.isCorrect]));
    const levels = Array.from(new Set(questions.map((q) => q.classLevel)))
      .map(lvl => parseInt(lvl, 10))
      .filter(lvl => !isNaN(lvl))
      .sort((a, b) => a - b);

    for (const lvl of levels) {
      const lvlStr = String(lvl);
      const lvlQuestions = questions.filter((q) => q.classLevel === lvlStr);
      const hasFailure = lvlQuestions.some((q) => !correctMap.get(q.id));
      if (hasFailure) {
        diagnosedLevel = getOrdinalSuffix(lvlStr);
        break;
      }
    }
    if (!diagnosedLevel) {
      diagnosedLevel = getOrdinalSuffix(targetClassLevel);
    }
  }

  return {
    scoreObtained: score,
    totalMarks,
    percentage,
    correctCount: correct,
    wrongCount: wrong,
    unansweredCount: unanswered,
    diagnosedLevel,
    aiSummary: {
      headline,
      overview,
      strengths,
      focus_areas,
      exam_summary,
      best_topic: percentage >= 80 ? "Core concepts" : null,
      priority_topic: percentage < 70 ? "Key foundations" : null,
      next_step,
    },
    questions: gradedQuestions,
  };
}
