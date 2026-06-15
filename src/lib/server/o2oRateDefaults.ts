export const BACKEND_O2O_DEFAULT_RATE_PER_HOUR: Record<string, number> = {
  "11th State": 300,
  "11th Science State": 300,
  "11th Science CBSE": 300,
  "12th Science State": 300,
  "12th Science CBSE": 300,
  "10th State": 200,
  "10th CBSE": 200,
  "9th State": 200,
  "9th CBSE": 200,
  "8th State": 200,
  "8th CBSE": 200,
};

export function getBackendDefaultO2ORate(program: string): number {
  return BACKEND_O2O_DEFAULT_RATE_PER_HOUR[program] ?? 200;
}
