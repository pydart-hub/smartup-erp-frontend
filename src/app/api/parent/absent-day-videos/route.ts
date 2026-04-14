import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/parent/absent-day-videos?student=STU-XXX&date=2026-04-14
 *
 * Returns the course schedules (with topics + video URLs) for a day
 * when the student was absent.
 *
 * Chain: Attendance → student_group → Student Group → program
 *        student_group + date → Course Schedules → custom_topic
 *        program + topic → Program Topic → custom_video_url
 */

function frappeListUrl(
  doctype: string,
  filters: unknown[][],
  fields: string[],
  opts?: { limit?: number; orderBy?: string }
): string {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    limit_page_length: String(opts?.limit ?? 200),
  });
  if (opts?.orderBy) params.set("order_by", opts.orderBy);
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

async function safeFetchDoc<T = Record<string, unknown>>(
  doctype: string,
  name: string,
  headers: Record<string, string>
): Promise<T | null> {
  try {
    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student");
    const date = searchParams.get("date");

    if (!studentId || !date) {
      return NextResponse.json(
        { error: "student and date query params are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

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
    if (!students.some((s) => s.name === studentId)) {
      return NextResponse.json(
        { error: "Student not linked to guardian" },
        { status: 403 }
      );
    }

    // ── Get attendance record for this student + date ──
    const attendanceRecords = await safeFetch<{
      name: string;
      status: string;
      student_group: string;
      custom_video_watched: number;
    }>(
      frappeListUrl(
        "Student Attendance",
        [
          ["student", "=", studentId],
          ["date", "=", date],
          ["docstatus", "=", 1],
        ],
        ["name", "status", "student_group", "custom_video_watched"],
        { limit: 1 }
      ),
      headers
    );

    if (attendanceRecords.length === 0) {
      return NextResponse.json({ error: "No attendance record found" }, { status: 404 });
    }

    const att = attendanceRecords[0];
    if (att.status !== "Absent") {
      return NextResponse.json({
        attendance_name: att.name,
        video_watched: !!att.custom_video_watched,
        sessions: [],
      });
    }

    // ── Get program from Student Group ──
    const sg = await safeFetchDoc<{ program: string }>(
      "Student Group",
      att.student_group,
      headers
    );
    const program = sg?.program;

    // ── Get course schedules for this student_group + date ──
    const schedules = await safeFetch<{
      name: string;
      course: string;
      custom_topic: string | null;
      from_time: string;
      to_time: string;
      instructor_name: string;
    }>(
      frappeListUrl(
        "Course Schedule",
        [
          ["student_group", "=", att.student_group],
          ["schedule_date", "=", date],
        ],
        ["name", "course", "custom_topic", "from_time", "to_time", "instructor_name"],
        { limit: 20, orderBy: "from_time asc" }
      ),
      headers
    );

    // ── For each schedule with a topic, look up the video URL from Program Topic ──
    const sessions: {
      course: string;
      topic: string | null;
      topic_name: string | null;
      from_time: string;
      to_time: string;
      instructor_name: string;
      video_url: string | null;
      has_video: boolean;
    }[] = [];

    // Batch-fetch all Program Topics for this program (if known) to avoid N+1
    let programTopicMap = new Map<string, string | null>();
    if (program) {
      const topics = await safeFetch<{
        topic: string;
        topic_name: string;
        custom_video_url: string | null;
      }>(
        frappeListUrl(
          "Program Topic",
          [["program", "=", program]],
          ["topic", "topic_name", "custom_video_url"],
          { limit: 500 }
        ),
        headers
      );
      for (const t of topics) {
        programTopicMap.set(t.topic, t.custom_video_url);
      }
    }

    for (const sched of schedules) {
      const videoUrl = sched.custom_topic
        ? programTopicMap.get(sched.custom_topic) ?? null
        : null;

      sessions.push({
        course: sched.course,
        topic: sched.custom_topic,
        topic_name: sched.custom_topic, // topic name equals the Topic docname in our setup
        from_time: sched.from_time,
        to_time: sched.to_time,
        instructor_name: sched.instructor_name,
        video_url: videoUrl,
        has_video: !!videoUrl,
      });
    }

    return NextResponse.json({
      attendance_name: att.name,
      video_watched: !!att.custom_video_watched,
      sessions,
    });
  } catch (err) {
    console.error("[parent/absent-day-videos] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
