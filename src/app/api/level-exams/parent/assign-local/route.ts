import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "Local level exam assignment has been replaced by Frappe-backed Level Exam assignments." },
    { status: 410 },
  );
}
