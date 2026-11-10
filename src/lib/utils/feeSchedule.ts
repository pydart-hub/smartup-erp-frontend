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

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsClamped(dateIso: string, monthsToAdd: number): string {
  const [rawYear, rawMonth, rawDay] = dateIso.split("-").map(Number);
  if (!rawYear || !rawMonth || !rawDay) return dateIso;

  const baseMonthIndex = rawMonth - 1;
  const totalMonths = baseMonthIndex + monthsToAdd;
  const year = rawYear + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(rawDay, getDaysInMonth(year, month));

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}


/**
 * Calculate available instalment count for mid-year admissions:
 * Countdown to February 15 based on admission date.
 * - October or earlier: 5 instalments
 * - November: 4 instalments (Nov, Dec, Jan, Feb 15)
 * - December: 3 instalments (Dec, Jan, Feb 15)
 * - January: 2 instalments (Jan, Feb 15)
 * - February: 1 instalment (Feb 15 / Full Payment)
 */
export function getAvailableMidYearInstalments(
  enrollmentDate: string,
  academicYear: string,
): number {
  const startYear = parseStartYear(academicYear);
  const [y, m] = enrollmentDate.split("-").map(Number);
  if (!y || !m) return 5;

  if (y === startYear) {
    if (m <= 10) return 5;
    if (m === 11) return 4;
    if (m === 12) return 3;
  } else if (y === startYear + 1) {
    if (m === 1) return 2;
    if (m >= 2) return 1;
  }
  return 5;
}

/**
 * Calculates non-equal front-loaded split in clean multiples of ₹100
 * so the sum equals 100% of the total course fee.
 */
export function calculateReducedMidYearSchedule(totalFee: number, instalments: number): number[] {
  if (instalments <= 1) return [totalFee];
  if (instalments === 2) {
    const inst1 = Math.round((totalFee * 0.55) / 100) * 100;
    const inst2 = totalFee - inst1;
    return [inst1, inst2];
  }
  if (instalments === 3) {
    const base = Math.round((totalFee * 0.31) / 100) * 100;
    const inst1 = totalFee - (base * 2);
    return [inst1, base, base];
  }
  if (instalments === 4) {
    const base = Math.round((totalFee * 0.235) / 100) * 100;
    const inst1 = totalFee - (base * 3);
    return [inst1, base, base, base];
  }
  // Fallback for 5
  const base = Math.round((totalFee * 0.19) / 100) * 100;
  const inst1 = totalFee - (base * (instalments - 1));
  return [inst1, ...Array(instalments - 1).fill(base)];
}

function getInstalmentOffsets(instalments: number): number[] {
  switch (instalments) {
    case 1: return [0];
    case 4: return [0, 3, 6, 9];
    case 5: return [0, 1, 2, 3, 4];
    case 6: return [0, 2, 4, 6, 8, 10];
    case 8: return [0, 1, 2, 3, 4, 5, 6, 7];
    default: return [];
  }
}

/**
 * Generate due dates for an instalment option.
 * If enrollmentDate is provided, dates are computed relative to admission.
 * Otherwise, the academic-year fixed template is used as fallback.
 */
export function generateInstalmentDueDates(
  instalments: number,
  academicYear: string,
  enrollmentDate?: string,
): string[] {
  const startYear = parseStartYear(academicYear);
  const maxAcademicDueDate = String(startYear + 1) + "-02-15";

  if (enrollmentDate) {
    if (instalments === 1) {
      return [enrollmentDate];
    }
    const dates: string[] = [];
    for (let i = 0; i < instalments; i++) {
      if (i === 0) {
        dates.push(enrollmentDate);
      } else if (i === instalments - 1) {
        const nextMonthDate = addMonthsClamped(enrollmentDate, i);
        dates.push(nextMonthDate < maxAcademicDueDate ? nextMonthDate : maxAcademicDueDate);
      } else {
        const calculated = addMonthsClamped(enrollmentDate, i);
        dates.push(calculated > maxAcademicDueDate ? maxAcademicDueDate : calculated);
      }
    }
    return dates;
  }
  if (instalments === 1) {
    return [buildDueDate(INSTALMENT_DUE_DATES.quarterly[0], startYear)];
  }
  if (instalments === 4) {
    return INSTALMENT_DUE_DATES.quarterly.map((tmpl) => buildDueDate(tmpl, startYear));
  }
  if (instalments === 5) {
    return INSTALMENT_DUE_DATES.inst5.map((tmpl) => buildDueDate(tmpl, startYear));
  }
  if (instalments === 6) {
    return INSTALMENT_DUE_DATES.inst6.map((tmpl) => buildDueDate(tmpl, startYear));
  }
  if (instalments === 8) {
    return INSTALMENT_DUE_DATES.inst8.map((tmpl) => buildDueDate(tmpl, startYear));
  }
  return [];
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
  const dueDates = generateInstalmentDueDates(instalments, academicYear, enrollmentDate);

  if (instalments === 1) {
    return [{
      index: 1,
      label: "Full Payment",
      amount: config.otp,
      dueDate: dueDates[0],
    }];
  }

  // Mid-year plan (5 instalments baseline or dynamically reduced to 4, 3, 2)
  // Must be evaluated BEFORE standard quarterly (4) check!
  const isMidYear = Boolean(config.inst5_schedule || config.inst1 || config.instalments_count === 5);
  if (isMidYear && instalments > 1) {
    const totalFee = config.inst5_total || config.annual_fee;
    let amounts: number[];
    if (instalments === 5 && config.inst5_schedule) {
      amounts = config.inst5_schedule;
    } else if (instalments === 5 && config.inst1) {
      amounts = [
        config.inst1 || 0,
        config.inst2 || 0,
        config.inst3 || 0,
        config.inst4 || 0,
        config.inst5 || 0,
      ];
    } else {
      amounts = calculateReducedMidYearSchedule(totalFee, instalments);
    }
    return amounts.map((amt, i) => ({
      index: i + 1,
      label: `Instalment ${i + 1}`,
      amount: amt,
      dueDate: dueDates[i],
    }));
  }

  if (instalments === 4) {
    const labels = ["Q1", "Q2", "Q3", "Q4"];
    const amounts = [config.q1 ?? 0, config.q2 ?? 0, config.q3 ?? 0, config.q4 ?? 0];
    return INSTALMENT_DUE_DATES.quarterly.map((_, i) => ({
      index: i + 1,
      label: labels[i],
      amount: amounts[i],
      dueDate: dueDates[i],
    }));
  }

  if (instalments === 6) {
    return INSTALMENT_DUE_DATES.inst6.map((_, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 5 ? (config.inst6_per ?? 0) : (config.inst6_last ?? 0),
      dueDate: dueDates[i],
    }));
  }

  if (instalments === 8) {
    return INSTALMENT_DUE_DATES.inst8.map((_, i) => ({
      index: i + 1,
      label: `Inst ${i + 1}`,
      amount: i < 7 ? (config.inst8_per ?? 0) : (config.inst8_last ?? 0),
      dueDate: dueDates[i],
    }));
  }

  return [];
}

/**
 * Get the total amount for a payment option.
 */
export function getOptionTotal(config: FeeConfigEntry, instalments: number): number {
  if (instalments === 1) return config.otp;
  const isMidYear = Boolean(config.inst5_schedule || config.inst1 || config.instalments_count === 5);
  if (isMidYear) {
    return config.inst5_total || config.annual_fee;
  }
  switch (instalments) {
    case 4:
      return (config.q1 ?? 0) + (config.q2 ?? 0) + (config.q3 ?? 0) + (config.q4 ?? 0);
    case 6:
      return ((config.inst6_per ?? 0) * 5) + (config.inst6_last ?? 0);
    case 8:
      return ((config.inst8_per ?? 0) * 7) + (config.inst8_last ?? 0);
    default: return config.annual_fee;
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
  const isMidYear = Boolean(config.inst5_schedule || config.inst1 || config.instalments_count === 5);

  let optionsToGenerate: number[];
  if (isMidYear) {
    const k = enrollmentDate ? getAvailableMidYearInstalments(enrollmentDate, academicYear) : 5;
    optionsToGenerate = k > 1 ? [1, k] : [1];
  } else {
    optionsToGenerate = [1, 4, 6, 8];
  }

  return optionsToGenerate.map((n) => {
    const total = getOptionTotal(config, n);
    const schedule = generateInstalmentSchedule(config, n, academicYear, enrollmentDate);
    const label = isMidYear && n > 1
      ? `${n} Monthly Instalments`
      : PAYMENT_OPTION_LABELS[String(n)] || `${n} Instalments`;
    return {
      instalments: n,
      label,
      total,
      schedule,
      savings: config.annual_fee - total,
    };
  });
}

/**
 * Apply a sibling referral discount to payment options.
 * Advanced plan → 10%, all other plans → 5%.
 * The discount is deducted entirely from the last instalment.
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
      i === opt.schedule.length - 1 ? { ...s, amount: s.amount - discount } : s,
    );
    return { ...opt, total: newTotal, schedule: newSchedule, referralDiscount: discount };
  });
}

/**
 * Apply a manual admission discount to payment options.
 * The discount is deducted from the last instalment first, then moves backward.
 */
export function applyAdmissionDiscount(
  options: PaymentOptionSummary[],
  discountAmount: number,
  remark?: string,
): PaymentOptionSummary[] {
  const normalizedDiscount = Number.isFinite(discountAmount)
    ? Math.max(0, Math.round(discountAmount * 100) / 100)
    : 0;

  if (normalizedDiscount <= 0) return options;

  return options.map((opt) => {
    let remaining = Math.min(normalizedDiscount, opt.total);
    const newSchedule = [...opt.schedule];

    for (let index = newSchedule.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const entry = newSchedule[index];
      const applied = Math.min(entry.amount, remaining);
      if (applied <= 0) continue;

      newSchedule[index] = {
        ...entry,
        amount: entry.amount - applied,
        discountApplied: (entry.discountApplied ?? 0) + applied,
        discountRemark: remark || entry.discountRemark,
      };
      remaining -= applied;
    }

    const effectiveDiscount = Math.min(normalizedDiscount, opt.total);
    return {
      ...opt,
      total: opt.total - effectiveDiscount,
      schedule: newSchedule,
      manualDiscount: effectiveDiscount,
    };
  });
}

/**
 * Apply a percentage-based discount to payment options (Vennala Plus Two old student).
 * discountPercent: 0-100. Deducts computed rupee amount from the last instalment first.
 */
export function applyPercentageDiscount(
  options: PaymentOptionSummary[],
  discountPercent: number,
  remark?: string,
): PaymentOptionSummary[] {
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return options;
  const pct = Math.min(100, Math.max(0, discountPercent));
  return options.map((opt) => {
    const discountAmount = Math.round(opt.total * pct / 100);
    return applyAdmissionDiscount([opt], discountAmount, remark ?? `Plus Two Old Student Discount (${pct}%)`)[0];
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
  "Kadavanthara":   ["Phy-Chem", "Maths"],
  "Vennala":        ["Phy-Chem", "Maths"],
  "Edapally":       ["Phy-Chem", "Maths"],
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
