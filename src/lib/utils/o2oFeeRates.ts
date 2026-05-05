/**
 * o2oFeeRates.ts
 * Hourly fee rates for One-to-One tuition.
 * Rate is determined by the student's program (class level).
 *
 * Plus One / Plus Two  → ₹300/hr
 * 8th / 9th / 10th     → ₹200/hr
 */

export const O2O_RATE_PER_HOUR: Record<string, number> = {
  // Plus One (11th)
  "11th State":          300,
  "11th Science State":  300,
  "11th Science CBSE":   300,

  // Plus Two (12th)
  "12th Science State":  300,
  "12th Science CBSE":   300,

  // 10th
  "10th State":          200,
  "10th CBSE":           200,

  // 9th
  "9th State":           200,
  "9th CBSE":            200,

  // 8th
  "8th State":           200,
  "8th CBSE":            200,
};

/** Returns the hourly rate for a given program, defaulting to ₹200 */
export function getO2OHourlyRate(program: string): number {
  return O2O_RATE_PER_HOUR[program] ?? 200;
}

/** Returns a human-readable label for the rate tier */
export function getO2ORateLabel(program: string): string {
  const rate = getO2OHourlyRate(program);
  return `₹${rate}/hr`;
}

/** Programs eligible for one-to-one (all supported programs) */
export const O2O_SUPPORTED_PROGRAMS = Object.keys(O2O_RATE_PER_HOUR);
