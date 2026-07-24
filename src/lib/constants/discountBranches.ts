export const MANUAL_DISCOUNT_COMPANIES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
] as const;

export function canApplyManualDiscount(company?: string | null): boolean {
  if (!company) return false;
  return MANUAL_DISCOUNT_COMPANIES.includes(
    company as (typeof MANUAL_DISCOUNT_COMPANIES)[number],
  );
}

/** Vennala-only percentage discount for Plus Two old students */
const VENNALA_PLUS_TWO_PROGRAMS = ["12th Science State", "12th Science CBSE"] as const;

export function canApplyVennalaPlusTwoDiscount(
  company?: string | null,
  program?: string | null,
): boolean {
  return (
    company === "Smart Up Vennala" &&
    VENNALA_PLUS_TWO_PROGRAMS.includes(program as (typeof VENNALA_PLUS_TWO_PROGRAMS)[number])
  );
}