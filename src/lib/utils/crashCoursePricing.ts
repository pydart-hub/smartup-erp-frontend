/**
 * Pure pricing engine for SmartUp Crash Course 2026–27
 * Encapsulates the pricing structure defined in the Sales Brief:
 * - 9th: ₹3,999 (Course) + ₹299 (Exam/Materials) = ₹4,298
 * - 10th: ₹4,999 (Course) + ₹299 (Exam/Materials) = ₹5,298
 * - Plus One: ₹5,999 (Course) + ₹299 (Exam/Materials) = ₹6,298
 * - Plus Two: ₹5,999 (Course) + ₹299 (Exam/Materials) = ₹6,298
 * - Optional Sunday Languages (9th & 10th only): 1 for ₹999, 2 for ₹1,998, 3 for ₹2,499 (Bundle saves ₹498)
 */

import type {
  CrashCourseClass,
  CrashCourseLanguage,
  CrashCoursePricingInput,
  CrashCourseFeeBreakdown,
} from "@/lib/types/crashCourse";

export const CRASH_COURSE_BASE_FEES: Record<CrashCourseClass, number> = {
  "9th": 3999,
  "10th": 4999,
  "Plus One": 5999,
  "Plus Two": 5999,
};

export const CRASH_COURSE_EXAM_MATERIALS_FEE = 299;

export const LANGUAGE_SINGLE_RATE = 999;
export const LANGUAGE_BUNDLE_3_RATE = 2499;

export const AVAILABLE_LANGUAGES: CrashCourseLanguage[] = [
  "English",
  "Hindi",
  "Malayalam",
];

export const MIN_BATCH_CAPACITY = 20;
export const MAX_BATCH_CAPACITY = 50;
export const WARN_BATCH_CAPACITY = 45;

/**
 * Checks whether language add-ons are supported for this class
 */
export function isLanguageAddonAllowed(classLevel: CrashCourseClass): boolean {
  return classLevel === "9th" || classLevel === "10th";
}

/**
 * Calculates language fees and potential savings
 */
export function calculateLanguageFee(languages: CrashCourseLanguage[] = []): {
  fee: number;
  savings: number;
} {
  const count = languages.length;
  if (count === 0) return { fee: 0, savings: 0 };
  if (count === 1) return { fee: LANGUAGE_SINGLE_RATE, savings: 0 };
  if (count === 2) return { fee: LANGUAGE_SINGLE_RATE * 2, savings: 0 }; // 1998
  // 3 languages bundle rate: 2499 (individual would be 3 * 999 = 2997, saves 498)
  const regularCost = count * LANGUAGE_SINGLE_RATE;
  return {
    fee: LANGUAGE_BUNDLE_3_RATE,
    savings: regularCost - LANGUAGE_BUNDLE_3_RATE,
  };
}

/**
 * Calculates the full fee breakdown for a crash course admission
 */
export function calculateCrashCourseFee(
  input: CrashCoursePricingInput
): CrashCourseFeeBreakdown {
  const { classLevel, selectedLanguages = [] } = input;
  const courseFee = CRASH_COURSE_BASE_FEES[classLevel] ?? 0;
  const examMaterialsFee = CRASH_COURSE_EXAM_MATERIALS_FEE;
  const mandatoryTotal = courseFee + examMaterialsFee;

  // Language add-on only allowed for 9th and 10th
  const effectiveLanguages = isLanguageAddonAllowed(classLevel)
    ? selectedLanguages
    : [];

  const { fee: languageFee, savings: languageSavings } =
    calculateLanguageFee(effectiveLanguages);

  const grandTotal = mandatoryTotal + languageFee;

  return {
    classLevel,
    courseFee,
    examMaterialsFee,
    mandatoryTotal,
    selectedLanguages: effectiveLanguages,
    languageFee,
    languageSavings,
    grandTotal,
  };
}

/**
 * Formats a currency amount into Indian Rupee string
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
