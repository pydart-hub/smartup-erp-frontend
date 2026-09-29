import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  handleOptions,
  verifyAiAccess,
  getLiveStudentsData,
} from "@/lib/server/aiErpEngine";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, identity } = verifyAiAccess(request);
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing AI agent key." },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const data = await getLiveStudentsData(branch, limit);

    return NextResponse.json(
      {
        success: true,
        meta: {
          system_name: "SmartUp ERP",
          endpoint: "students",
          queried_by: identity,
          timestamp: new Date().toISOString(),
        },
        data,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500, headers: corsHeaders });
  }
}
