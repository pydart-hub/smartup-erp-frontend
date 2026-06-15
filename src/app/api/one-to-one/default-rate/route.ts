import { NextRequest, NextResponse } from "next/server";
import { getBackendDefaultO2ORate } from "@/lib/server/o2oRateDefaults";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const program = request.nextUrl.searchParams.get("program")?.trim() ?? "";
  if (!program) {
    return NextResponse.json({ error: "program is required" }, { status: 400 });
  }

  return NextResponse.json({
    program,
    rate: getBackendDefaultO2ORate(program),
    source: "backend_default",
  });
}
