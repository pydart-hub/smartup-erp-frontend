export const MANUAL_DISCOUNT_COMPANIES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
] as const;

export function canApplyManualDiscount(company?: string | null): boolean {
  if (!company) return false;
  return MANUAL_DISCOUNT_COMPANIES.includes(
    company as (typeof MANUAL_DISCOUNT_COMPANIES)[number],
  );
}