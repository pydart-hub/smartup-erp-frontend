import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    const roles: string[] = data.roles ?? [];
    const defaultCompany: string = data.default_company ?? "";
    return {
      email: data.email,
      roles,
      defaultCompany,
      instructorName: data.instructor_name as string | undefined,
    };
  } catch {
    return null;
  }
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
const adminHeaders = { Authorization: adminAuth, "Content-Type": "application/json" };

/**
 * GET /api/syllabus-parts
 * List Syllabus Part Completion records.
 * Query: ?company=X&instructor=X&course=X&status=X&academic_year=X&syllabus_config=X
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || session.defaultCompany;
    const instructor = searchParams.get("instructor");
    const course = searchParams.get("course");
    const status = searchParams.get("status");
    const academicYear = searchParams.get("academic_year");
    const syllabusConfig = searchParams.get("syllabus_config");
    const program = searchParams.get("program");

    const filters: unknown[][] = [];
    if (company) filters.push(["company", "=", company]);
    if (instructor) filters.push(["instructor", "=", instructor]);
    if (course) filters.push(["course", "=", course]);
    if (status) filters.push(["status", "=", status]);
    if (academicYear) filters.push(["academic_year", "=", academicYear]);
    if (syllabusConfig) filters.push(["syllabus_config", "=", syllabusConfig]);
    if (program) filters.push(["program", "=", program]);

    // Instructors can only see their own parts
    const isInstructor = session.roles.includes("Instructor");
    const isBM = session.roles.includes("Branch Manager");
    const isDirector = session.roles.includes("Director") || session.roles.includes("Management");

    if (isInstructor && !isBM && !isDirector && session.instructorName) {
      filters.push(["instructor", "=", session.instructorName]);
    }

    const fields = [
      "name", "syllabus_config", "instructor", "instructor_name",
      "course", "program", "student_group", "academic_year", "company",
      "part_number", "part_title", "total_parts", "status",
      "completed_date", "approved_date", "approved_by",
      "rejection_reason", "remarks", "creation", "modified",
    ];

    const params = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      limit_page_length: "500",
      order_by: "course asc, instructor asc, part_number asc",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion?${params}`,
      { headers: adminHeaders, cache: "no-store" },
    );

    if (!res.ok) {
      console.error("[syllabus-parts] GET list error:", res.status);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch (error: unknown) {
    console.error("[syllabus-parts] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
