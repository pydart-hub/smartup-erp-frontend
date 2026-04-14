import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/parent/video-topics
 *
 * Admin-backed API that returns Program Topics (with video URLs) for a parent's children.
 * Groups by child → course, returns all topics with video links.
 *
 * Query:  none (uses session cookie)
 * Returns: { children: [{ student, student_name, program, courses: [{ course, course_name, topics: [...] }] }] }
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

export async function GET(request: NextRequest) {
  try {
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

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    // 1. Find Guardian(s) by email
    const guardians = await safeFetch<{ name: string }>(
      frappeListUrl("Guardian", [["email_address", "=", email]], ["name"], { limit: 20 }),
      headers
    );
    if (guardians.length === 0) {
      return NextResponse.json({ children: [] });
    }
    const guardianIds = guardians.map((g) => g.name);

    // 2. Find Students
    let students = await safeFetch<{
      name: string;
      student_name: string;
    }>(
      frappeListUrl(
        "Student",
        [["Student Guardian", "guardian", "in", guardianIds]],
        ["name", "student_name"],
        { limit: 20 }
      ),
      headers
    );
    if (students.length === 0) {
      students = await safeFetch(
        frappeListUrl(
          "Student",
          [["Student Guardians", "guardian", "in", guardianIds]],
          ["name", "student_name"],
          { limit: 20 }
        ),
        headers
      );
    }
    if (students.length === 0) {
      return NextResponse.json({ children: [] });
    }

    // 3. For each student, get latest submitted Program Enrollment
    const result: {
      student: string;
      student_name: string;
      program: string;
      courses: {
        course: string;
        course_name: string;
        topics: {
          name: string;
          topic: string;
          topic_name: string;
          sort_order: number;
          custom_video_url: string | null;
        }[];
      }[];
    }[] = [];

    for (const student of students) {
      // Get latest enrollment (any docstatus except cancelled)
      const enrollments = await safeFetch<{
        name: string;
        program: string;
      }>(
        frappeListUrl(
          "Program Enrollment",
          [["student", "=", student.name], ["docstatus", "!=", 2]],
          ["name", "program"],
          { limit: 1, orderBy: "enrollment_date desc" }
        ),
        headers
      );

      if (enrollments.length === 0) continue;
      const program = enrollments[0].program;

      // Get ALL Program Topics for this program — already contains course field
      const allTopics = await safeFetch<{
        name: string;
        course: string;
        topic: string;
        topic_name: string;
        sort_order: number;
        custom_video_url: string | null;
      }>(
        frappeListUrl(
          "Program Topic",
          [["program", "=", program]],
          ["name", "course", "topic", "topic_name", "sort_order", "custom_video_url"],
          { limit: 500, orderBy: "course asc, sort_order asc" }
        ),
        headers
      );

      // Group topics by course — no separate course list needed
      const courseMap = new Map<string, { course: string; topics: typeof allTopics }>();
      for (const t of allTopics) {
        if (!courseMap.has(t.course)) {
          courseMap.set(t.course, { course: t.course, topics: [] });
        }
        courseMap.get(t.course)!.topics.push(t);
      }

      const courseEntries = [...courseMap.values()]
        .map((c) => ({
          course: c.course,
          course_name: c.course.replace(/^\d+\w*\s+/, ""), // strip grade prefix for display
          topics: c.topics,
        }))
        .sort((a, b) => a.course.localeCompare(b.course));

      result.push({
        student: student.name,
        student_name: student.student_name,
        program,
        courses: courseEntries,
      });
    }

    return NextResponse.json({ children: result });
  } catch (err) {
    console.error("[parent/video-topics] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
