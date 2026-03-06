/**
 * GET /api/fee-config
 * Serves per-instalment fee breakdown from parsed XLSX data.
 *
 * Query params:
 *   company  — Frappe company name (e.g. "Smart Up Vennala")
 *   program  — Frappe program name (e.g. "9th CBSE")
 *   plan     — "Basic" | "Intermediate" | "Advanced"
 *
 * Returns the matched FeeConfigEntry or 404 if not found.
 */

import { NextRequest, NextResponse } from "next/server";
import feeData from "@/../docs/fee_structure_parsed.json";
import { buildFeeConfigKey } from "@/lib/utils/feeSchedule";
import type { FeeConfigEntry } from "@/lib/types/fee";

const feeConfig = feeData as Record<string, FeeConfigEntry>;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company");
  const program = searchParams.get("program");
  const plan = searchParams.get("plan");

  if (!company || !program || !plan) {
    return NextResponse.json(
      { error: "Missing required params: company, program, plan" },
      { status: 400 },
    );
  }

  const key = buildFeeConfigKey(company, program, plan);
  if (!key) {
    return NextResponse.json(
      { error: `No mapping found for company="${company}", program="${program}"` },
      { status: 404 },
    );
  }

  const entry = feeConfig[key];
  if (!entry) {
    return NextResponse.json(
      { error: `No fee config found for key="${key}"` },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: entry });
}
