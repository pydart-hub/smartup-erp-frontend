import { parseO2OHourlyRate } from "@/lib/utils/o2oFeeRates";

export const O2O_RATE_FIELD_CANDIDATES = [
  "custom_o2o_rate_per_class",
  "custom_o2o_rate_per_hour",
] as const;

export function extractO2ORateFromRecord(record: Record<string, unknown> | null | undefined): number | null {
  if (!record) return null;
  for (const field of O2O_RATE_FIELD_CANDIDATES) {
    const parsed = parseO2OHourlyRate(record[field]);
    if (parsed) return parsed;
  }
  return null;
}
