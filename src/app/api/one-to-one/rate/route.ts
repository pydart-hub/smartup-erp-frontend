import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { parseO2OHourlyRate } from "@/lib/utils/o2oFeeRates";
import { resolveStoredO2ORateFromBackend, saveStoredO2ORate } from "@/lib/server/o2oStoredRate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, STAFF_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId")?.trim() || "";
  const program = searchParams.get("program")?.trim() || "";
  const studentGroupName = searchParams.get("studentGroupName")?.trim() || "";

  if (!studentId || !program) {
    return NextResponse.json({ error: "studentId and program are required" }, { status: 400 });
  }

  try {
    const resolved = await resolveStoredO2ORateFromBackend({
      studentId,
      program,
      studentGroupName: studentGroupName || undefined,
    });
    return NextResponse.json(resolved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve O2O rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, STAFF_ROLES);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({})) as {
    rate?: unknown;
    studentGroupName?: string;
    programEnrollmentName?: string;
  };
  const rate = parseO2OHourlyRate(body.rate);
  const studentGroupName = body.studentGroupName?.trim();
  const programEnrollmentName = body.programEnrollmentName?.trim();

  if (!rate) {
    return NextResponse.json({ error: "Valid rate is required" }, { status: 400 });
  }
  if (!studentGroupName && !programEnrollmentName) {
    return NextResponse.json({ error: "studentGroupName or programEnrollmentName is required" }, { status: 400 });
  }

  try {
    const result = await saveStoredO2ORate({
      rate,
      studentGroupName,
      programEnrollmentName,
    });
    if (result.verifiedRate == null) {
      return NextResponse.json({ error: "Rate update could not be verified on backend." }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save O2O rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
