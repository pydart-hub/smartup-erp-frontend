import { NextRequest, NextResponse } from "next/server";
import { getReportFile } from "@/lib/reports/report-token-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const token = params?.token;

    if (!token) {
      return NextResponse.json({ error: "Download token is required" }, { status: 400 });
    }

    const cachedFile = getReportFile(token);
    if (!cachedFile) {
      return NextResponse.json(
        { error: "Report file expired or not found. Please request a new report share." },
        { status: 404 }
      );
    }

    const uint8Array = new Uint8Array(cachedFile.buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": cachedFile.contentType,
        "Content-Disposition": `attachment; filename="${cachedFile.filename}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err: unknown) {
    console.error("[public-report-download error]", err);
    return NextResponse.json(
      { error: "Failed to download report file" },
      { status: 500 }
    );
  }
}
