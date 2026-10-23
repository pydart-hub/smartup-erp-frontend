import { NextRequest, NextResponse } from "next/server";
import {
  getTargetsForMonth,
  setBranchTarget,
  bulkSetTargets,
  copyTargetsFromMonth,
  DEFAULT_MONTHLY_TARGETS,
  FALLBACK_DEFAULT,
} from "@/lib/server/branchTargetStore";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      roles?: string[];
      user?: string;
    };
  } catch {
    return null;
  }
}

function isAuthorized(roles: string[]): boolean {
  return (
    roles.includes("Director") ||
    roles.includes("Management") ||
    roles.includes("General Manager") ||
    roles.includes("Administrator")
  );
}

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][],
  orderBy?: string,
  maxRecords = 10000
): Promise<Record<string, unknown>[]> {
  const pageSize = 500;
  let allData: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    const currentLimit = Math.min(pageSize, maxRecords - offset);
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(currentLimit),
      limit_start: String(offset),
      ...(orderBy ? { order_by: orderBy } : {}),
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
      { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const page: Record<string, unknown>[] = json?.data ?? [];
    allData = allData.concat(page);
    if (page.length < currentLimit) break;
    offset += pageSize;
  }

  return allData;
}

// ── GET: Month Performance & Target Metrics ──────────────────────────────────
export async function GET(request: NextRequest) {
  const session = parseSession(request);
  if (!session?.roles || !isAuthorized(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthKey = (searchParams.get("month") || currentMonthKey).trim();

  // Validate YYYY-MM
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM" }, { status: 400 });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Time calculations for run-rate
  const isCurrentMonth = monthKey === currentMonthKey;
  const isPastMonth = monthKey < currentMonthKey;
  const todayDate = now.getDate();
  const elapsedDays = isPastMonth ? lastDay : isCurrentMonth ? Math.min(todayDate, lastDay) : 0;
  const remainingDays = isPastMonth ? 0 : isCurrentMonth ? Math.max(0, lastDay - todayDate) : lastDay;

  try {
    // Parallel fetch: Branches, Target Records, Students, Payment Entries
    const [companies, targetMap, rawStudents, rawPayments] = await Promise.all([
      frappeGet("Company", ["name", "company_name", "abbr"], [], "name asc", 100),
      getTargetsForMonth(monthKey),
      frappeGet(
        "Student",
        ["name", "custom_branch", "joining_date", "enabled"],
        [
          ["joining_date", ">=", fromDate],
          ["joining_date", "<=", toDate],
        ],
        "joining_date desc",
        5000
      ),
      frappeGet(
        "Payment Entry",
        ["name", "company", "posting_date", "paid_amount", "mode_of_payment", "reference_no"],
        [
          ["docstatus", "=", 1],
          ["payment_type", "=", "Receive"],
          ["posting_date", ">=", fromDate],
          ["posting_date", "<=", toDate],
        ],
        "posting_date desc",
        15000
      ),
    ]);

    const branches = companies
      .filter((c) => c.name !== "Smart Up")
      .map((c) => ({
        name: String(c.name),
        company_name: String(c.company_name || c.name),
        abbr: String(c.abbr || ""),
      }));

    // Aggregate Admissions by Branch
    const admissionsByBranch: Record<string, { total: number; active: number }> = {};
    for (const s of rawStudents) {
      const b = String(s.custom_branch || "");
      if (!admissionsByBranch[b]) admissionsByBranch[b] = { total: 0, active: 0 };
      admissionsByBranch[b].total += 1;
      if (s.enabled === 1) admissionsByBranch[b].active += 1;
    }

    // Aggregate Collections by Branch
    interface PaymentBreakdown {
      cash: number;
      upi: number;
      razorpay: number;
      bank_transfer: number;
      cheque: number;
      other: number;
      total: number;
      count: number;
    }

    const collectionsByBranch: Record<string, PaymentBreakdown> = {};
    for (const p of rawPayments) {
      const b = String(p.company || "");
      if (!collectionsByBranch[b]) {
        collectionsByBranch[b] = {
          cash: 0,
          upi: 0,
          razorpay: 0,
          bank_transfer: 0,
          cheque: 0,
          other: 0,
          total: 0,
          count: 0,
        };
      }
      const amount = Number(p.paid_amount) || 0;
      const mode = String(p.mode_of_payment || "").toLowerCase();
      const ref = String(p.reference_no || "");

      collectionsByBranch[b].total += amount;
      collectionsByBranch[b].count += 1;

      if (ref.startsWith("pay_") || mode.includes("razorpay")) {
        collectionsByBranch[b].razorpay += amount;
      } else if (mode.includes("cash")) {
        collectionsByBranch[b].cash += amount;
      } else if (mode.includes("upi")) {
        collectionsByBranch[b].upi += amount;
      } else if (mode.includes("bank") || mode.includes("transfer") || mode.includes("neft") || mode.includes("rtgs")) {
        collectionsByBranch[b].bank_transfer += amount;
      } else if (mode.includes("cheque") || mode.includes("check")) {
        collectionsByBranch[b].cheque += amount;
      } else {
        collectionsByBranch[b].other += amount;
      }
    }

    // Build per-branch metrics
    const branchRows = branches.map((branch) => {
      const bName = branch.name;
      const shortName = bName.replace("Smart Up ", "");

      // Resolve targets: stored target -> default fallback
      const stored = targetMap[bName];
      const defaultTarget = DEFAULT_MONTHLY_TARGETS[bName] || FALLBACK_DEFAULT;
      const admissionTarget = stored?.admission_target ?? defaultTarget.admission_target;
      const collectionTarget = stored?.collection_target ?? defaultTarget.collection_target;
      const isCustomTarget = !!stored;

      // Actuals
      const actualAdmissions = admissionsByBranch[bName]?.total ?? 0;
      const actualActiveAdmissions = admissionsByBranch[bName]?.active ?? 0;
      const coll = collectionsByBranch[bName] ?? {
        cash: 0,
        upi: 0,
        razorpay: 0,
        bank_transfer: 0,
        cheque: 0,
        other: 0,
        total: 0,
        count: 0,
      };
      const actualCollection = coll.total;

      // Pacing & Rates
      const admissionPct = admissionTarget > 0 ? Math.round((actualAdmissions / admissionTarget) * 100) : 0;
      const collectionPct = collectionTarget > 0 ? Math.round((actualCollection / collectionTarget) * 100) : 0;

      const admissionShortfall = Math.max(0, admissionTarget - actualAdmissions);
      const collectionShortfall = Math.max(0, collectionTarget - actualCollection);

      // Daily run-rates (admissions/day & collection/day)
      const currentAdmissionRate = elapsedDays > 0 ? Math.round((actualAdmissions / elapsedDays) * 10) / 10 : 0;
      const requiredAdmissionRate = remainingDays > 0 ? Math.round((admissionShortfall / remainingDays) * 10) / 10 : 0;

      const currentCollectionRate = elapsedDays > 0 ? Math.round(actualCollection / elapsedDays) : 0;
      const requiredCollectionRate = remainingDays > 0 ? Math.round(collectionShortfall / remainingDays) : 0;

      // Expected pro-rata progress % based on days elapsed
      const expectedPacingPct = Math.round((elapsedDays / lastDay) * 100);

      // Status determination
      let status: "exceeded" | "on_track" | "behind" | "critical" = "behind";
      const compositePct = (admissionPct + collectionPct) / 2;
      if (admissionPct >= 100 && collectionPct >= 100) {
        status = "exceeded";
      } else if (compositePct >= expectedPacingPct) {
        status = "on_track";
      } else if (compositePct >= expectedPacingPct * 0.6) {
        status = "behind";
      } else {
        status = "critical";
      }

      return {
        branch: bName,
        branch_short: shortName,
        abbr: branch.abbr,
        targets: {
          admission_target: admissionTarget,
          collection_target: collectionTarget,
          is_custom: isCustomTarget,
          notes: stored?.notes,
          updated_at: stored?.updated_at,
          updated_by: stored?.updated_by,
        },
        actuals: {
          admissions: actualAdmissions,
          active_admissions: actualActiveAdmissions,
          collection: actualCollection,
          payment_count: coll.count,
          breakdown: {
            cash: coll.cash,
            upi: coll.upi,
            razorpay: coll.razorpay,
            bank_transfer: coll.bank_transfer,
            cheque: coll.cheque,
            other: coll.other,
          },
        },
        metrics: {
          admission_pct: admissionPct,
          collection_pct: collectionPct,
          admission_shortfall: admissionShortfall,
          collection_shortfall: collectionShortfall,
          current_admission_rate: currentAdmissionRate,
          required_admission_rate: requiredAdmissionRate,
          current_collection_rate: currentCollectionRate,
          required_collection_rate: requiredCollectionRate,
          status,
        },
      };
    });

    // Network Consolidated Totals
    const networkTotals = branchRows.reduce(
      (acc, r) => ({
        target_admissions: acc.target_admissions + r.targets.admission_target,
        actual_admissions: acc.actual_admissions + r.actuals.admissions,
        target_collection: acc.target_collection + r.targets.collection_target,
        actual_collection: acc.actual_collection + r.actuals.collection,
        payment_count: acc.payment_count + r.actuals.payment_count,
        cash: acc.cash + r.actuals.breakdown.cash,
        upi: acc.upi + r.actuals.breakdown.upi,
        razorpay: acc.razorpay + r.actuals.breakdown.razorpay,
        bank_transfer: acc.bank_transfer + r.actuals.breakdown.bank_transfer,
      }),
      {
        target_admissions: 0,
        actual_admissions: 0,
        target_collection: 0,
        actual_collection: 0,
        payment_count: 0,
        cash: 0,
        upi: 0,
        razorpay: 0,
        bank_transfer: 0,
      }
    );

    const networkAdmissionPct =
      networkTotals.target_admissions > 0
        ? Math.round((networkTotals.actual_admissions / networkTotals.target_admissions) * 100)
        : 0;

    const networkCollectionPct =
      networkTotals.target_collection > 0
        ? Math.round((networkTotals.actual_collection / networkTotals.target_collection) * 100)
        : 0;

    const monthDateObj = new Date(year, month - 1, 1);
    const monthLabel = monthDateObj.toLocaleString("en-US", { month: "long", year: "numeric" });

    return NextResponse.json({
      month_key: monthKey,
      month_label: monthLabel,
      from_date: fromDate,
      to_date: toDate,
      days_in_month: lastDay,
      elapsed_days: elapsedDays,
      remaining_days: remainingDays,
      is_current_month: isCurrentMonth,
      branches: branchRows,
      network_totals: {
        ...networkTotals,
        admission_pct: networkAdmissionPct,
        collection_pct: networkCollectionPct,
        admission_shortfall: Math.max(0, networkTotals.target_admissions - networkTotals.actual_admissions),
        collection_shortfall: Math.max(0, networkTotals.target_collection - networkTotals.actual_collection),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[monthly-targets GET] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Target Assignment ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = parseSession(request);
  if (!session?.roles || !isAuthorized(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action || "single";
    const user = session.user || "Director";

    if (action === "copy") {
      const { target_month, source_month, adjustment_pct } = body;
      if (!target_month || !source_month) {
        return NextResponse.json({ error: "target_month and source_month are required" }, { status: 400 });
      }
      const updated = await copyTargetsFromMonth(target_month, source_month, Number(adjustment_pct) || 0, user);
      return NextResponse.json({ success: true, count: updated.length, data: updated });
    }

    if (action === "bulk") {
      const { month_key, targets } = body;
      if (!month_key || !Array.isArray(targets)) {
        return NextResponse.json({ error: "month_key and targets array required" }, { status: 400 });
      }
      const updated = await bulkSetTargets(month_key, targets, user);
      return NextResponse.json({ success: true, count: updated.length, data: updated });
    }

    // Default: Single branch target upsert
    const { branch, month_key, admission_target, collection_target, notes } = body;
    if (!branch || !month_key) {
      return NextResponse.json({ error: "branch and month_key are required" }, { status: 400 });
    }

    const saved = await setBranchTarget({
      branch,
      month_key,
      admission_target: Number(admission_target) || 0,
      collection_target: Number(collection_target) || 0,
      notes,
      user,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[monthly-targets POST] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
