import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ALLOWED_ROLES = ["Administrator", "Director", "Management", "General Manager", "Branch Manager"];

function parseSession(cookie: string): { roles?: string[] } | null {
  try {
    return JSON.parse(Buffer.from(cookie, "base64").toString());
  } catch {
    return null;
  }
}

/**
 * POST /api/director/student-enrollments
 * Body: { studentIds: string[] }
 * Returns: Record<studentId, { program, student_batch_name, custom_plan, custom_fee_structure }>
 * Uses admin token so Directors without PE read permission still get enrollment data.
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = parseSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const roles = session.roles ?? [];
  if (!ALLOWED_ROLES.some((r) => roles.includes(r))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let studentIds: string[];
  try {
    const body = await request.json();
    studentIds = body.studentIds;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({});
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  try {
    const map: Record<string, {
      program: string;
      student_batch_name?: string;
      custom_plan?: string;
      custom_fee_structure?: string;
    }> = {};

    // Chunk requests to avoid URL length limits
    const chunkSize = 60;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);
      const params = new URLSearchParams({
        fields: JSON.stringify(["student", "program", "student_batch_name", "custom_plan", "custom_fee_structure"]),
        filters: JSON.stringify([["student", "in", chunk], ["docstatus", "=", 1]]),
        order_by: "enrollment_date desc",
        limit_page_length: String(chunk.length * 4),
      });

      const res = await fetch(
        `${FRAPPE_URL}/api/resource/Program%20Enrollment?${params}`,
        { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" }
      );

      if (!res.ok) continue;

      const json = await res.json();
      for (const row of json?.data ?? []) {
        if (row.student && !map[row.student]) {
          map[row.student] = {
            program: row.program,
            student_batch_name: row.student_batch_name,
            custom_plan: row.custom_plan,
            custom_fee_structure: row.custom_fee_structure,
          };
        }
      }
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error("[student-enrollments] Error:", err);
    return NextResponse.json({});
  }
}
