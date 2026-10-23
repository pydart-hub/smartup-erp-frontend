import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

export interface StoredBranchTarget {
  id: string;
  branch: string;
  month_key: string; // "YYYY-MM"
  admission_target: number;
  collection_target: number;
  notes?: string;
  updated_at: string;
  updated_by?: string;
}

interface TargetStoreState {
  targets: Record<string, StoredBranchTarget>; // key: `${month_key}::${branch}`
}

const DATA_DIR = path.join(process.cwd(), "src", "data", "branch-monitoring");
const TARGETS_FILE = path.join(DATA_DIR, "targets.json");

// Default fallback targets if none have been explicitly set for a month
export const DEFAULT_MONTHLY_TARGETS: Record<
  string,
  { admission_target: number; collection_target: number }
> = {
  "Smart Up Chullickal":   { admission_target: 35, collection_target: 600000 },
  "Smart Up Edappally":    { admission_target: 20, collection_target: 700000 },
  "Smart Up Eraveli":      { admission_target: 35, collection_target: 550000 },
  "Smart Up Fortkochi":    { admission_target: 35, collection_target: 600000 },
  "Smart Up Kadavanthara": { admission_target: 20, collection_target: 800000 },
  "Smart Up Moolamkuzhi":  { admission_target: 18, collection_target: 300000 },
  "Smart Up Palluruthy":   { admission_target: 35, collection_target: 600000 },
  "Smart Up Thopumpadi":   { admission_target: 25, collection_target: 460000 },
  "Smart Up Vennala":      { admission_target: 25, collection_target: 700000 },
};

export const FALLBACK_DEFAULT = { admission_target: 25, collection_target: 500000 };

async function ensureDirs() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readStore(): Promise<TargetStoreState> {
  await ensureDirs();
  if (!existsSync(TARGETS_FILE)) {
    return { targets: {} };
  }
  try {
    const raw = await readFile(TARGETS_FILE, "utf8");
    return JSON.parse(raw) as TargetStoreState;
  } catch (err) {
    console.error("[branchTargetStore] Error reading targets file:", err);
    return { targets: {} };
  }
}

async function writeStore(state: TargetStoreState) {
  await ensureDirs();
  const temp = `${TARGETS_FILE}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await rename(temp, TARGETS_FILE);
}

function makeKey(monthKey: string, branch: string): string {
  return `${monthKey.trim()}::${branch.trim()}`;
}

/** Get targets for a specific month (e.g. "2026-10") */
export async function getTargetsForMonth(
  monthKey: string
): Promise<Record<string, StoredBranchTarget>> {
  const state = await readStore();
  const result: Record<string, StoredBranchTarget> = {};

  for (const [key, item] of Object.entries(state.targets)) {
    if (item.month_key === monthKey) {
      result[item.branch] = item;
    }
  }

  return result;
}

/** Set or update target for a specific branch & month */
export async function setBranchTarget(input: {
  branch: string;
  month_key: string;
  admission_target: number;
  collection_target: number;
  notes?: string;
  user?: string;
}): Promise<StoredBranchTarget> {
  const state = await readStore();
  const key = makeKey(input.month_key, input.branch);

  const target: StoredBranchTarget = {
    id: key,
    branch: input.branch,
    month_key: input.month_key,
    admission_target: Math.max(0, Math.round(Number(input.admission_target) || 0)),
    collection_target: Math.max(0, Math.round(Number(input.collection_target) || 0)),
    notes: input.notes?.trim() || undefined,
    updated_at: new Date().toISOString(),
    updated_by: input.user || "Director",
  };

  state.targets[key] = target;
  await writeStore(state);
  return target;
}

/** Bulk assign targets for a month */
export async function bulkSetTargets(
  monthKey: string,
  targets: Array<{
    branch: string;
    admission_target: number;
    collection_target: number;
    notes?: string;
  }>,
  user?: string
): Promise<StoredBranchTarget[]> {
  const state = await readStore();
  const updated: StoredBranchTarget[] = [];
  const now = new Date().toISOString();

  for (const item of targets) {
    const key = makeKey(monthKey, item.branch);
    const target: StoredBranchTarget = {
      id: key,
      branch: item.branch,
      month_key: monthKey,
      admission_target: Math.max(0, Math.round(Number(item.admission_target) || 0)),
      collection_target: Math.max(0, Math.round(Number(item.collection_target) || 0)),
      notes: item.notes?.trim() || undefined,
      updated_at: now,
      updated_by: user || "Director",
    };
    state.targets[key] = target;
    updated.push(target);
  }

  await writeStore(state);
  return updated;
}

/** Copy targets from a prior month with an optional percentage multiplier (e.g. 10 for +10%) */
export async function copyTargetsFromMonth(
  targetMonthKey: string,
  sourceMonthKey: string,
  adjustmentPct = 0,
  user?: string
): Promise<StoredBranchTarget[]> {
  const sourceTargets = await getTargetsForMonth(sourceMonthKey);
  const factor = 1 + adjustmentPct / 100;
  const listToSet: Array<{
    branch: string;
    admission_target: number;
    collection_target: number;
    notes?: string;
  }> = [];

  for (const [branch, t] of Object.entries(sourceTargets)) {
    listToSet.push({
      branch,
      admission_target: Math.round(t.admission_target * factor),
      collection_target: Math.round(t.collection_target * factor),
      notes: t.notes ? `Copied from ${sourceMonthKey}: ${t.notes}` : undefined,
    });
  }

  if (listToSet.length === 0) {
    // If source month had no targets, seed with defaults
    for (const [branch, def] of Object.entries(DEFAULT_MONTHLY_TARGETS)) {
      listToSet.push({
        branch,
        admission_target: Math.round(def.admission_target * factor),
        collection_target: Math.round(def.collection_target * factor),
      });
    }
  }

  return bulkSetTargets(targetMonthKey, listToSet, user);
}
