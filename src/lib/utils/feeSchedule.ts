/**
 * feeSchedule.ts
 * Generates instalment payment schedules from XLSX fee config data.
 * Handles unequal quarterly splits and different last-instalment amounts
 * for 6-month and 8-month plans.
 */

import type { FeeConfigEntry, InstalmentEntry, PaymentOptionSummary } from "@/lib/types/fee";
import { INSTALMENT_DUE_DATES, PAYMENT_OPTION_LABELS } from "./constants";

/**
 * Parse academic year string (e.g. "2026-2027") into the start year.
 */
function parseStartYear(academicYear: string): number {
  const parts = academicYear.split("-");
  return parseInt(parts[0], 10);
}

/**
 * Build an ISO date string from a due-date template and academic year.
 * Months 0-3 (Jan-Mar) belong to the NEXT calendar year.
 */
function buildDueDate(template: { month: number; day: number }, startYear: number): string {
  const calendarYear = template.month < 3 ? startYear + 1 : startYear;
  const m = String(template.month + 1).padStart(2, "0");
  const d = String(template.day).padStart(2, "0");
  return `${calendarYear}-${m}-${d}`;
}

/**
 * Generate the instalment schedule for a given payment option.
 */
export function generateInstalmentSchedule(
  config: FeeConfigEntry,
  instalments: number,
  academicYear: string,
  enrollmentDate?: string,
): InstalmentEntry[] {
  const startYear = parseStartYear(academicYear);

  if (instalments === 1) {
    return [{
      index: 1,
      label: "Full Payment",
      amount: config.otp,
      dueDate: enrollmentDate || buildDueDate(INSTALMENT_DUE_DATES.quarterly[0], startYear),
    }];
  }

  if (instalments === 4) {
    const labels = ["Q1", "Q2", "Q3", "Q4"];
    const amounts = [config.q1, config.q2, config.q3, config.q4];
    return INSTALMENT_DUE_DATES.quarterly.map((tmpl, i) => ({
      index: i + 1,
      label: labels[i],
      amount: amounts[i],
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  if (instalments === 6) {
    return INSTALMENT_DUE_DATES.inst6.map((tmpl, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 5 ? config.inst6_per : config.inst6_last,
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  if (instalments === 8) {
    return INSTALMENT_DUE_DATES.inst8.map((tmpl, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 7 ? config.inst8_per : config.inst8_last,
      dueDate: buildDueDate(tmpl, startYear),
    }));
  }

  return [];
}

/**
 * Get the total amount for a payment option.
 */
export function getOptionTotal(config: FeeConfigEntry, instalments: number): number {
  switch (instalments) {
    case 1: return config.otp;
    case 4: return config.quarterly_total;
    case 6: return config.inst6_total;
    case 8: return config.inst8_total;
    default: return 0;
  }
}

/**
 * Generate all payment option summaries for a fee config entry.
 * Used in the admission Step 4 UI to display all options at once.
 */
export function getAllPaymentOptions(
  config: FeeConfigEntry,
  academicYear: string,
  enrollmentDate?: string,
): PaymentOptionSummary[] {
  return [1, 4, 6, 8].map((n) => {
    const total = getOptionTotal(config, n);
    const schedule = generateInstalmentSchedule(config, n, academicYear, enrollmentDate);
    return {
      instalments: n,
      label: PAYMENT_OPTION_LABELS[String(n)] || `${n} Instalments`,
      total,
      schedule,
      savings: config.annual_fee - total,
    };
  });
}

/**
 * Apply a sibling referral discount to payment options.
 * Advanced plan → 10%, all other plans → 5%.
 * The discount is deducted entirely from the first instalment.
 */
export function applyReferralDiscount(
  options: PaymentOptionSummary[],
  plan?: string,
): PaymentOptionSummary[] {
  const rate = plan === "Advanced" ? 0.10 : 0.05;
  return options.map((opt) => {
    const discount = Math.round(opt.total * rate);
    const newTotal = opt.total - discount;
    const newSchedule = opt.schedule.map((s, i) =>
      i === 0 ? { ...s, amount: s.amount - discount } : s,
    );
    return { ...opt, total: newTotal, schedule: newSchedule, referralDiscount: discount };
  });
}

// ── Branch & Program Mapping ──
// Maps Frappe company names to XLSX branch keys.

const BRANCH_MAP: Record<string, string> = {
  "Smart Up Chullickal": "Tier 1",
  "Smart Up Fortkochi": "Tier 1",
  "Smart Up Eraveli": "Eraveli",
  "Smart Up Palluruthy": "Tier 1",
  "Smart Up Thopumpadi": "Thoppumpady",
  "Smart Up Moolamkuzhi": "Moolamkuzhi",
  "Smart Up Kadavanthara": "Kadavanthara",
  "Smart Up Vennala": "Vennala",
  "Smart Up Edappally": "Edapally",
};

const PROGRAM_MAP: Record<string, string> = {
  "8th State": "8 State",
  "8th CBSE": "8 Cbse",
  "9th State": "9 State",
  "9th CBSE": "9 Cbse",
  "10th State": "10 State",
  "10th CBSE": "10 Cbse",
  "11th State": "Plus One",
  "11th Science State": "Plus One",
  "11th Science CBSE": "Plus One",
  "12th Science State": "Plus Two",
  "12th Science CBSE": "Plus Two",
};

/**
 * Build the XLSX lookup key from Frappe company + program + plan.
 * Returns null if the mapping doesn't exist.
 */
export function buildFeeConfigKey(
  company: string,
  program: string,
  plan: string,
): string | null {
  const branch = BRANCH_MAP[company];
  const cls = PROGRAM_MAP[program];
  if (!branch || !cls) return null;
  return `${branch}|${plan}|${cls}`;
}

// ── Subject-Wise Admission Helpers ──

/** Levels for subject-wise admission */
export type SubjectLevel = "Plus One" | "Plus Two";

/** Subjects available per level */
export const LEVEL_SUBJECTS: Record<SubjectLevel, string[]> = {
  "Plus One":  ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"],
  "Plus Two":  ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"],
};

/** Frappe programs each level maps to (for enrollment & batch lookup) */
export const LEVEL_PROGRAMS: Record<SubjectLevel, string[]> = {
  "Plus One":  ["11th Science State", "11th Science CBSE"],
  "Plus Two":  ["12th Science State", "12th Science CBSE"],
};

/** All Frappe programs that subject-wise students can be enrolled into */
export const HSS_PROGRAMS = [
  "11th Science State", "11th Science CBSE",
  "12th Science State", "12th Science CBSE",
];

/** Branches that support subject-wise admission and their available subjects (all levels combined) */
export const SUBJECT_BY_BRANCH: Record<string, string[]> = {
  "Kadavanthara":   ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"],
  "Vennala":        ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"],
  "Edapally":       ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"],
  "Thoppumpady":    ["Phy-Chem"],
  "Tier 1":         ["Phy-Chem"],
  "Eraveli":        ["Phy-Chem"],
};

/** Get all subjects at a branch (all levels combined) */
export function getSubjectsForBranch(company: string): string[] {
  const branch = BRANCH_MAP[company];
  if (!branch) return [];
  return SUBJECT_BY_BRANCH[branch] ?? [];
}

/** Get which levels are available at a branch (checks that subjects exist) */
export function getLevelsForBranch(company: string): SubjectLevel[] {
  const allSubjects = getSubjectsForBranch(company);
  if (allSubjects.length === 0) return [];
  const levels: SubjectLevel[] = [];
  for (const level of Object.keys(LEVEL_SUBJECTS) as SubjectLevel[]) {
    if (LEVEL_SUBJECTS[level].some((s) => allSubjects.includes(s))) {
      levels.push(level);
    }
  }
  return levels;
}

/** Get subjects available at a branch for a specific level */
export function getSubjectsForBranchLevel(company: string, level: SubjectLevel): string[] {
  const allSubjects = getSubjectsForBranch(company);
  return LEVEL_SUBJECTS[level].filter((s) => allSubjects.includes(s));
}

/** Get Frappe programs for a level that actually exist at a branch (from Student Groups) */
export function getProgramsForLevel(level: SubjectLevel): string[] {
  return LEVEL_PROGRAMS[level] ?? [];
}

/** Build fee config key for subject-wise lookup */
export function buildSubjectFeeConfigKey(
  company: string,
  subject: string,
  plan: string,
): string | null {
  const branch = BRANCH_MAP[company];
  if (!branch) return null;
  return `${branch}|${plan}|${subject}`;
}
