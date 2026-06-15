const O2O_META_PREFIX = "[O2O_META]";

type ScheduleLike = {
  name: string;
  schedule_date?: string;
  from_time?: string;
  to_time?: string;
};

type SalesOrderLike = {
  name: string;
  transaction_date?: string;
  creation?: string;
  items?: Array<{ description?: string | null }>;
};

export function getBillingMonthKey(dateStr?: string): string | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return dateStr.slice(0, 7);
}

export function formatBillingMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export function buildO2OBillingDescription(params: {
  sessionCount: number;
  totalHours: number;
  ratePerHour: number;
  monthKey: string;
  scheduleNames: string[];
}): string {
  const meta = JSON.stringify({
    month: params.monthKey,
    schedules: params.scheduleNames,
  });

  return `One-to-One tuition: ${params.sessionCount} session(s), ${params.totalHours.toFixed(2)}h total x ₹${params.ratePerHour}/h\n${O2O_META_PREFIX}${meta}`;
}

export function extractO2OBillingMeta(description?: string | null): {
  month?: string;
  schedules: string[];
} | null {
  if (!description) return null;
  const idx = description.indexOf(O2O_META_PREFIX);
  if (idx < 0) return null;
  const jsonText = description.slice(idx + O2O_META_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(jsonText) as { month?: unknown; schedules?: unknown };
    return {
      month: typeof parsed.month === "string" ? parsed.month : undefined,
      schedules: Array.isArray(parsed.schedules)
        ? parsed.schedules.filter((v): v is string => typeof v === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export function extractBilledScheduleNames(descriptions: Array<string | null | undefined>): Set<string> {
  const billed = new Set<string>();
  for (const description of descriptions) {
    const meta = extractO2OBillingMeta(description);
    if (!meta) continue;
    for (const scheduleName of meta.schedules) billed.add(scheduleName);
  }
  return billed;
}

function parseTimeToSeconds(value?: string): number {
  if (!value) return 0;
  const [h = "0", m = "0", s = "0"] = value.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function getScheduleHours(row: ScheduleLike): number {
  const from = parseTimeToSeconds(row.from_time);
  const to = parseTimeToSeconds(row.to_time);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return Number(((to - from) / 3600).toFixed(2));
}

function parseLegacyBilledHours(description?: string | null): number | null {
  if (!description) return null;
  const totalHoursMatch = description.match(/([0-9]+(?:\.[0-9]+)?)h total/i);
  if (totalHoursMatch) {
    const value = Number(totalHoursMatch[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const qtyMatch = description.match(/(\d+)\s*session\(s\)/i);
  const perSessionMatch = description.match(/x\s*([0-9]+(?:\.[0-9]+)?)h/i);
  if (qtyMatch && perSessionMatch) {
    const qty = Number(qtyMatch[1]);
    const perSession = Number(perSessionMatch[1]);
    const total = qty * perSession;
    return Number.isFinite(total) && total > 0 ? Number(total.toFixed(2)) : null;
  }

  return null;
}

export function resolveBilledScheduleNames(params: {
  schedules: ScheduleLike[];
  salesOrders: SalesOrderLike[];
}): Set<string> {
  const billed = new Set<string>();

  for (const salesOrder of params.salesOrders) {
    for (const item of salesOrder.items ?? []) {
      const meta = extractO2OBillingMeta(item.description);
      if (!meta) continue;
      for (const scheduleName of meta.schedules) billed.add(scheduleName);
    }
  }

  const schedulesByMonth = new Map<string, ScheduleLike[]>();
  for (const schedule of params.schedules) {
    const monthKey = getBillingMonthKey(schedule.schedule_date);
    if (!monthKey) continue;
    if (!schedulesByMonth.has(monthKey)) schedulesByMonth.set(monthKey, []);
    schedulesByMonth.get(monthKey)!.push(schedule);
  }
  for (const rows of schedulesByMonth.values()) {
    rows.sort((a, b) => {
      const dateA = `${a.schedule_date ?? ""} ${a.from_time ?? ""}`;
      const dateB = `${b.schedule_date ?? ""} ${b.from_time ?? ""}`;
      return dateA.localeCompare(dateB);
    });
  }

  for (const salesOrder of params.salesOrders) {
    const orderMonth = getBillingMonthKey(salesOrder.transaction_date) ?? getBillingMonthKey(salesOrder.creation?.slice(0, 10));
    if (!orderMonth) continue;

    for (const item of salesOrder.items ?? []) {
      if (extractO2OBillingMeta(item.description)) continue;
      const billedHours = parseLegacyBilledHours(item.description);
      if (!billedHours) continue;

      const monthSchedules = schedulesByMonth.get(orderMonth) ?? [];
      let remainingHours = billedHours;

      for (const schedule of monthSchedules) {
        if (remainingHours <= 0) break;
        if (billed.has(schedule.name)) continue;
        const hours = getScheduleHours(schedule);
        if (hours <= 0) continue;
        billed.add(schedule.name);
        remainingHours = Number((remainingHours - hours).toFixed(2));
      }
    }
  }

  return billed;
}
