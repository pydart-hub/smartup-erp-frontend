import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/public-exam/db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "predictor-admin-session";
const SESSION_VALUE = "smartup-predictor-admin-2024";

export async function GET(req: NextRequest) {
  // Validate admin session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session || session.value !== SESSION_VALUE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const district = searchParams.get("district") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (district) {
      where.district = district;
    }

    const allSubmissions = await db.plusTwoPredictorSubmission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
    });

    const seen = new Set<string>();
    const deduplicatedSubmissions: typeof allSubmissions = [];
    for (const sub of allSubmissions) {
      const key = `${sub.name.trim().toLowerCase()}|${sub.phone.trim()}|${sub.district.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedSubmissions.push(sub);
      }
    }

    const total = deduplicatedSubmissions.length;
    const submissions = deduplicatedSubmissions.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ submissions, total, page, limit });
  } catch (error) {
    console.error("[predictor/admin] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
