import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/parent/mark-video-watched
 *
 * Body: { attendance_name: "EDU-ATT-2026-XXXXX" }
 *
 * Sets custom_video_watched=1 and custom_video_watched_on=now() on the
 * Student Attendance record, after verifying the parent owns the student.
 */

function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number }
): string {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 20),
  });
  return `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

async function safeFetch<T = unknown>(
  url: string,
  headers: Record<string, string>
): Promise<T[]> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let email: string;
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );
      email = sessionData.email;
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "No email in session" }, { status: 400 });
    }

    const body = await request.json();
    const attendanceName = body?.attendance_name;
    if (!attendanceName || typeof attendanceName !== "string") {
      return NextResponse.json(
        { error: "attendance_name is required" },
        { status: 400 }
      );
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    // ── Fetch the attendance record ──
    const attRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance/${encodeURIComponent(attendanceName)}`,
      { headers, cache: "no-store" }
    );
    if (!attRes.ok) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }
    const attDoc = (await attRes.json()).data as {
      name: string;
      student: string;
      status: string;
      docstatus: number;
      custom_video_watched: number;
    };

    // Must be submitted and Absent
    if (attDoc.docstatus !== 1) {
      return NextResponse.json(
        { error: "Attendance record is not submitted" },
        { status: 400 }
      );
    }
    if (attDoc.status !== "Absent") {
      return NextResponse.json(
        { error: "Can only mark video watched for Absent records" },
        { status: 400 }
      );
    }

    // ── Verify parent owns this student ──
    const guardians = await safeFetch<{ name: string }>(
      frappeListUrl("Guardian", [["email_address", "=", email]], ["name"], {
        limit: 20,
      }),
      headers
    );
    if (guardians.length === 0) {
      return NextResponse.json({ error: "No guardian found" }, { status: 403 });
    }
    const guardianIds = guardians.map((g) => g.name);

    let students = await safeFetch<{ name: string }>(
      frappeListUrl(
        "Student",
        [["Student Guardian", "guardian", "in", guardianIds]],
        ["name"],
        { limit: 20 }
      ),
      headers
    );
    if (students.length === 0) {
      students = await safeFetch(
        frappeListUrl(
          "Student",
          [["Student Guardians", "guardian", "in", guardianIds]],
          ["name"],
          { limit: 20 }
        ),
        headers
      );
    }
    if (!students.some((s) => s.name === attDoc.student)) {
      return NextResponse.json(
        { error: "Student not linked to guardian" },
        { status: 403 }
      );
    }

    // ── Update the attendance record ──
    // Student Attendance is submittable and allow_on_submit is set on these fields
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const updateRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance/${encodeURIComponent(attendanceName)}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          custom_video_watched: 1,
          custom_video_watched_on: now,
        }),
      }
    );

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      console.error("[mark-video-watched] Update failed:", errBody);
      return NextResponse.json(
        { error: "Failed to update attendance record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, video_watched_on: now });
  } catch (err) {
    console.error("[parent/mark-video-watched] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
