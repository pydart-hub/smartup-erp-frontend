import { NextRequest, NextResponse } from "next/server";
import type { SyllabusConfig, SyllabusConfigFormData } from "@/lib/types/syllabus";

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
    return { email: data.email, roles, defaultCompany, instructorName: data.instructor_name };
  } catch {
    return null;
  }
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
const adminHeaders = { Authorization: adminAuth, "Content-Type": "application/json" };

/**
 * GET /api/syllabus-config
 * List syllabus configurations. Query: ?company=X&academic_year=Y&course=Z
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || session.defaultCompany;
    const academicYear = searchParams.get("academic_year");
    const course = searchParams.get("course");
    const program = searchParams.get("program");

    const filters: unknown[][] = [];
    if (company) filters.push(["company", "=", company]);
    if (academicYear) filters.push(["academic_year", "=", academicYear]);
    if (course) filters.push(["course", "=", course]);
    if (program) filters.push(["program", "=", program]);

    const fields = [
      "name", "course", "program", "company", "academic_year",
      "total_parts", "configured_by", "creation", "modified",
    ];

    const params = new URLSearchParams({
      filters: JSON.stringify(filters),
      fields: JSON.stringify(fields),
      limit_page_length: "200",
      order_by: "course asc",
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration?${params}`,
      { headers: adminHeaders, cache: "no-store" },
    );

    if (!res.ok) {
      console.error("[syllabus-config] GET list error:", res.status);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch (error: unknown) {
    console.error("[syllabus-config] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/syllabus-config
 * Create a syllabus configuration + auto-create completion records for assigned instructors.
 * Body: SyllabusConfigFormData
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!session.roles.includes("Branch Manager") && !session.roles.includes("Director")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body: SyllabusConfigFormData = await request.json();

    if (!body.course || !body.program || !body.company || !body.academic_year || !body.total_parts || !body.parts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for duplicate
    const dupParams = new URLSearchParams({
      filters: JSON.stringify([
        ["course", "=", body.course],
        ["program", "=", body.program],
        ["company", "=", body.company],
        ["academic_year", "=", body.academic_year],
      ]),
      fields: JSON.stringify(["name"]),
      limit_page_length: "1",
    });
    const dupRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration?${dupParams}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (dupRes.ok) {
      const dupJson = await dupRes.json();
      if (dupJson.data?.length > 0) {
        return NextResponse.json(
          { error: "Configuration already exists for this course/program/branch/year", existing: dupJson.data[0].name },
          { status: 409 },
        );
      }
    }

    // Create config
    const configPayload = {
      course: body.course,
      program: body.program,
      company: body.company,
      academic_year: body.academic_year,
      total_parts: body.total_parts,
      configured_by: session.email,
      parts: body.parts.map((p, i) => ({
        part_number: p.part_number || i + 1,
        part_title: p.part_title,
      })),
    };

    const createRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration`,
      { method: "POST", headers: adminHeaders, body: JSON.stringify(configPayload) },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[syllabus-config] Create failed:", createRes.status, errText);
      return NextResponse.json({ error: "Failed to create configuration" }, { status: 500 });
    }

    const config: SyllabusConfig = (await createRes.json()).data;

    // Auto-create completion records for assigned instructors
    const completionResults = await autoCreateCompletionRecords(config);

    return NextResponse.json({
      config,
      completions_created: completionResults.created,
      completions_errors: completionResults.errors,
    });
  } catch (error: unknown) {
    console.error("[syllabus-config] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Find instructors assigned to this course at this branch via instructor_log,
 * then create Syllabus Part Completion records for each.
 */
async function autoCreateCompletionRecords(config: SyllabusConfig) {
  let created = 0;
  const errors: string[] = [];

  try {
    // 1. Get all instructors at this branch
    const instParams = new URLSearchParams({
      fields: JSON.stringify(["name", "instructor_name"]),
      filters: JSON.stringify([["custom_company", "=", config.company]]),
      limit_page_length: "200",
    });
    const instRes = await fetch(
      `${FRAPPE_URL}/api/resource/Instructor?${instParams}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!instRes.ok) {
      errors.push("Failed to fetch instructors");
      return { created, errors };
    }
    const instructors: { name: string; instructor_name: string }[] =
      (await instRes.json()).data ?? [];

    // 2. For each instructor, check instructor_log for matching course + branch
    for (const inst of instructors) {
      const docRes = await fetch(
        `${FRAPPE_URL}/api/resource/Instructor/${encodeURIComponent(inst.name)}`,
        { headers: adminHeaders, cache: "no-store" },
      );
      if (!docRes.ok) continue;
      const doc = (await docRes.json()).data;
      const logs: {
        program: string;
        course: string;
        custom_branch: string;
        academic_year: string;
      }[] = doc.instructor_log ?? [];

      // Find matching log entries for this course + branch + academic year + program
      const matchingLogs = logs.filter(
        (l) =>
          l.course === config.course &&
          l.custom_branch === config.company &&
          l.academic_year === config.academic_year &&
          l.program === config.program,
      );

      for (const log of matchingLogs) {
        // Resolve student group
        const sgParams = new URLSearchParams({
          filters: JSON.stringify([
            ["program", "=", log.program],
            ["custom_branch", "=", config.company],
            ["academic_year", "=", config.academic_year],
          ]),
          fields: JSON.stringify(["name"]),
          limit_page_length: "1",
        });
        const sgRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student Group?${sgParams}`,
          { headers: adminHeaders, cache: "no-store" },
        );
        let studentGroup = "";
        if (sgRes.ok) {
          const sgData = (await sgRes.json()).data;
          if (sgData?.length > 0) studentGroup = sgData[0].name;
        }

        // Create completion records for each part
        for (const part of config.parts) {
          try {
            const compPayload = {
              syllabus_config: config.name,
              instructor: inst.name,
              instructor_name: inst.instructor_name,
              course: config.course,
              program: log.program,
              student_group: studentGroup,
              academic_year: config.academic_year,
              company: config.company,
              part_number: part.part_number,
              part_title: part.part_title,
              total_parts: config.total_parts,
              status: "Not Started",
            };

            const compRes = await fetch(
              `${FRAPPE_URL}/api/resource/Syllabus Part Completion`,
              { method: "POST", headers: adminHeaders, body: JSON.stringify(compPayload) },
            );

            if (compRes.ok) {
              created++;
            } else {
              const errText = await compRes.text();
              errors.push(`Part ${part.part_number} for ${inst.name}: ${errText.slice(0, 100)}`);
            }
          } catch (e) {
            errors.push(`Part ${part.part_number} for ${inst.name}: ${(e as Error).message}`);
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Auto-create failed: ${(e as Error).message}`);
  }

  return { created, errors };
}
