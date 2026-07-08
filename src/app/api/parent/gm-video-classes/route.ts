import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL    = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY    = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * GET /api/parent/gm-video-classes
 *
 * Returns group-wise video class content auto-filtered to the parent's
 * children's enrolled programs.
 *
 * Chain:
 *   session.email → Guardian → Student → Program Enrollment → program name
 *   → GM Video Subject WHERE program IN [student programs]
 *   → GM Video Chapter WHERE subject IN [subject names]
 *
 * Returns:
 * {
 *   children: [{
 *     student, student_name, program,
 *     subjects: [{
 *       name, subject_name, icon_emoji, sort_order,
 *       chapters: [{ name, chapter_name, video_url, description, sort_order }]
 *     }]
 *   }]
 * }
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
    // ── Auth ──────────────────────────────────────────────────────────────────
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
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // ── 1. Guardian lookup ────────────────────────────────────────────────────
    const guardians = await safeFetch<{ name: string }>(
      frappeListUrl("Guardian", [["email_address", "=", email]], ["name"], { limit: 20 }),
      headers
    );
    if (guardians.length === 0) return NextResponse.json({ children: [] });
    const guardianIds = guardians.map((g) => g.name);

    // ── 2. Students via Guardian ──────────────────────────────────────────────
    let students = await safeFetch<{ name: string; student_name: string }>(
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
    if (students.length === 0) return NextResponse.json({ children: [] });

    // ── 3. For each student: get program from latest enrollment ───────────────
    const studentPrograms: { student: string; student_name: string; program: string }[] = [];

    for (const student of students) {
      const enrollments = await safeFetch<{ name: string; program: string }>(
        frappeListUrl(
          "Program Enrollment",
          [["student", "=", student.name], ["docstatus", "!=", 2]],
          ["name", "program"],
          { limit: 1, orderBy: "enrollment_date desc" }
        ),
        headers
      );
      if (enrollments.length === 0) continue;
      studentPrograms.push({
        student: student.name,
        student_name: student.student_name,
        program: enrollments[0].program,
      });
    }

    if (studentPrograms.length === 0) return NextResponse.json({ children: [] });

    // ── 4. Fetch GM Video Subjects for all programs ───────────────────────────
    const programNames = [...new Set(studentPrograms.map((s) => s.program))];

    const allSubjects = await safeFetch<{
      name: string;
      program: string;
      subject_name: string;
      icon_emoji: string;
      sort_order: number;
    }>(
      frappeListUrl(
        "GM Video Subject",
        [["program", "in", programNames]],
        ["name", "program", "subject_name", "icon_emoji", "sort_order"],
        { limit: 500, orderBy: "program asc, sort_order asc, subject_name asc" }
      ),
      headers
    );

    // ── 5. Fetch GM Video Chapters for all subjects ───────────────────────────
    const subjectNames = allSubjects.map((s) => s.name);
    let allChapters: {
      name: string;
      subject: string;
      chapter_name: string;
      video_url: string | null;
      description: string | null;
      sort_order: number;
    }[] = [];

    if (subjectNames.length > 0) {
      allChapters = await safeFetch<typeof allChapters[0]>(
        frappeListUrl(
          "GM Video Chapter",
          [["subject", "in", subjectNames]],
          ["name", "subject", "chapter_name", "video_url", "description", "sort_order"],
          { limit: 2000, orderBy: "subject asc, sort_order asc, chapter_name asc" }
        ),
        headers
      );
    }

    // ── 6. Build chapter map keyed by subject ─────────────────────────────────
    const chaptersBySubject = new Map<string, typeof allChapters>();
    for (const ch of allChapters) {
      if (!chaptersBySubject.has(ch.subject)) chaptersBySubject.set(ch.subject, []);
      chaptersBySubject.get(ch.subject)!.push(ch);
    }

    // ── 7. Build subjects map keyed by program ────────────────────────────────
    const subjectsByProgram = new Map<
      string,
      { name: string; subject_name: string; icon_emoji: string; sort_order: number; chapters: typeof allChapters }[]
    >();

    for (const sub of allSubjects) {
      if (!subjectsByProgram.has(sub.program)) subjectsByProgram.set(sub.program, []);
      subjectsByProgram.get(sub.program)!.push({
        name: sub.name,
        subject_name: sub.subject_name,
        icon_emoji: sub.icon_emoji || "📚",
        sort_order: sub.sort_order,
        chapters: chaptersBySubject.get(sub.name) ?? [],
      });
    }

    // ── 8. Assemble final response ─────────────────────────────────────────────
    const children = studentPrograms.map((sp) => ({
      student: sp.student,
      student_name: sp.student_name,
      program: sp.program,
      subjects: subjectsByProgram.get(sp.program) ?? [],
    }));

    return NextResponse.json({ children });
  } catch (err) {
    console.error("[parent/gm-video-classes] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
