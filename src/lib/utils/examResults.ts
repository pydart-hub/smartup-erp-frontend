/**
 * examResults.ts
 * Utility functions for grade calculation, ranking, and pass/fail determination.
 */

import type { GradingScaleInterval } from "@/lib/types/assessment";

/** Calculate grade from percentage using grading scale intervals */
export function calculateGrade(
  percentage: number,
  intervals: GradingScaleInterval[],
): string {
  // Sort by threshold DESC so we match the highest applicable grade
  const sorted = [...intervals].sort((a, b) => b.threshold - a.threshold);
  for (const interval of sorted) {
    if (percentage >= interval.threshold) {
      return interval.grade_code;
    }
  }
  return sorted[sorted.length - 1]?.grade_code ?? "F";
}

/** Check if a subject score is a pass (≥ 33%) */
export function isSubjectPassed(percentage: number): boolean {
  return percentage >= 33;
}

/** Check if student passed overall (all subjects ≥ 33%) */
export function isOverallPassed(
  subjects: { percentage: number }[],
): boolean {
  return subjects.every((s) => isSubjectPassed(s.percentage));
}

/**
 * Assign ranks to sorted results.
 * Ties get the same rank; next rank skips (1, 2, 2, 4).
 * Input must already be sorted by overall_percentage DESC.
 */
export function assignRanks<T extends { overall_percentage: number }>(
  results: T[],
): (T & { rank: number })[] {
  if (results.length === 0) return [];

  const ranked: (T & { rank: number })[] = [];
  let currentRank = 1;

  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i].overall_percentage < results[i - 1].overall_percentage) {
      currentRank = i + 1; // skip ranks for ties
    }
    ranked.push({ ...results[i], rank: currentRank });
  }

  return ranked;
}

/**
 * Compute summary statistics for a set of results.
 */
export function computeSummary(
  results: { overall_percentage: number; passed: boolean }[],
): {
  total_students: number;
  pass_count: number;
  pass_rate: number;
  average_percentage: number;
  highest_percentage: number;
  lowest_percentage: number;
} {
  if (results.length === 0) {
    return {
      total_students: 0,
      pass_count: 0,
      pass_rate: 0,
      average_percentage: 0,
      highest_percentage: 0,
      lowest_percentage: 0,
    };
  }

  const pass_count = results.filter((r) => r.passed).length;
  const percentages = results.map((r) => r.overall_percentage);
  const sum = percentages.reduce((a, b) => a + b, 0);

  return {
    total_students: results.length,
    pass_count,
    pass_rate: Math.round((pass_count / results.length) * 100 * 10) / 10,
    average_percentage: Math.round((sum / results.length) * 10) / 10,
    highest_percentage: Math.max(...percentages),
    lowest_percentage: Math.min(...percentages),
  };
}
