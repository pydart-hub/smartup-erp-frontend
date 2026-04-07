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
    return { email: data.email, roles, defaultCompany };
  } catch {
    return null;
  }
}

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
const adminHeaders = { Authorization: adminAuth, "Content-Type": "application/json" };

/**
 * GET /api/syllabus-config/[id]
 * Get a single Syllabus Configuration with its parts child table.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration/${encodeURIComponent(id)}`,
      { headers: adminHeaders, cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 404 ? "Configuration not found" : "Failed to fetch" },
        { status: res.status === 404 ? 404 : 500 },
      );
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data });
  } catch (error: unknown) {
    console.error("[syllabus-config/[id]] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/syllabus-config/[id]
 * Update a syllabus configuration. BM can add/remove/rename parts.
 * Body: { total_parts, parts: [{ part_number, part_title }] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!session.roles.includes("Branch Manager") && !session.roles.includes("Director")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify config belongs to this branch
    const checkRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration/${encodeURIComponent(id)}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!checkRes.ok) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }
    const existing = (await checkRes.json()).data;

    if (existing.company !== session.defaultCompany && !session.roles.includes("Director")) {
      return NextResponse.json({ error: "Access denied: wrong branch" }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (body.total_parts) updatePayload.total_parts = body.total_parts;
    if (body.parts) {
      updatePayload.parts = body.parts.map((p: { part_number: number; part_title: string }, i: number) => ({
        part_number: p.part_number || i + 1,
        part_title: p.part_title,
      }));
    }

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration/${encodeURIComponent(id)}`,
      { method: "PUT", headers: adminHeaders, body: JSON.stringify(updatePayload) },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[syllabus-config/[id]] PUT error:", res.status, errText);
      return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
    }

    const updated = (await res.json()).data;

    // Sync completion records: add records for new parts, remove records for deleted parts
    if (body.parts) {
      await syncCompletionRecords(updated);
    }

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[syllabus-config/[id]] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/syllabus-config/[id]
 * Delete a Syllabus Configuration and all associated Syllabus Part Completion records.
 * Only allowed for BM (their own company) or Director.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!session.roles.includes("Branch Manager") && !session.roles.includes("Director")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    // Verify config exists and belongs to this branch
    const checkRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration/${encodeURIComponent(id)}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!checkRes.ok) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }
    const existing = (await checkRes.json()).data;

    if (existing.company !== session.defaultCompany && !session.roles.includes("Director")) {
      return NextResponse.json({ error: "Access denied: wrong branch" }, { status: 403 });
    }

    // Fetch all completion records for this config
    const compParams = new URLSearchParams({
      filters: JSON.stringify([["syllabus_config", "=", id]]),
      fields: JSON.stringify(["name"]),
      limit_page_length: "500",
    });
    const compRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion?${compParams}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    const completionRecords: { name: string }[] = compRes.ok
      ? (await compRes.json()).data ?? []
      : [];

    // Delete all completion records first
    for (const rec of completionRecords) {
      await fetch(
        `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(rec.name)}`,
        { method: "DELETE", headers: adminHeaders },
      );
    }

    // Delete the Syllabus Configuration itself
    const delRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Configuration/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: adminHeaders },
    );

    if (!delRes.ok) {
      const errText = await delRes.text();
      console.error("[syllabus-config/[id]] DELETE error:", delRes.status, errText);
      return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted_completions: completionRecords.length,
    });
  } catch (error: unknown) {
    console.error("[syllabus-config/[id]] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * After updating parts, ensure completion records match.
 * - New parts → create Not Started records for each instructor
 * - Removed parts → delete Not Started records (but keep Pending/Completed/Rejected)
 */
async function syncCompletionRecords(config: {
  name: string;
  course: string;
  program: string;
  company: string;
  academic_year: string;
  total_parts: number;
  parts: { part_number: number; part_title: string }[];
}) {
  try {
    // Get existing completion records for this config
    const compParams = new URLSearchParams({
      filters: JSON.stringify([["syllabus_config", "=", config.name]]),
      fields: JSON.stringify(["name", "instructor", "instructor_name", "program", "student_group", "part_number", "status"]),
      limit_page_length: "500",
    });
    const compRes = await fetch(
      `${FRAPPE_URL}/api/resource/Syllabus Part Completion?${compParams}`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!compRes.ok) return;
    const existingRecords: {
      name: string;
      instructor: string;
      instructor_name: string;
      program: string;
      student_group: string;
      part_number: number;
      status: string;
    }[] = (await compRes.json()).data ?? [];

    const configPartNumbers = new Set(config.parts.map((p) => p.part_number));
    const existingPartMap = new Map<string, typeof existingRecords>();
    for (const rec of existingRecords) {
      const key = `${rec.instructor}::${rec.program}::${rec.part_number}`;
      if (!existingPartMap.has(key)) existingPartMap.set(key, []);
      existingPartMap.get(key)!.push(rec);
    }

    // Collect unique instructor+program combos
    const instructorCombos = new Map<string, { instructor: string; instructor_name: string; program: string; student_group: string }>();
    for (const rec of existingRecords) {
      const key = `${rec.instructor}::${rec.program}`;
      if (!instructorCombos.has(key)) {
        instructorCombos.set(key, {
          instructor: rec.instructor,
          instructor_name: rec.instructor_name,
          program: rec.program,
          student_group: rec.student_group,
        });
      }
    }

    // Create missing parts for each instructor+program combo
    for (const [, combo] of instructorCombos) {
      for (const part of config.parts) {
        const key = `${combo.instructor}::${combo.program}::${part.part_number}`;
        if (!existingPartMap.has(key)) {
          await fetch(`${FRAPPE_URL}/api/resource/Syllabus Part Completion`, {
            method: "POST",
            headers: adminHeaders,
            body: JSON.stringify({
              syllabus_config: config.name,
              instructor: combo.instructor,
              instructor_name: combo.instructor_name,
              course: config.course,
              program: combo.program,
              student_group: combo.student_group,
              academic_year: config.academic_year,
              company: config.company,
              part_number: part.part_number,
              part_title: part.part_title,
              total_parts: config.total_parts,
              status: "Not Started",
            }),
          });
        }
      }
    }

    // Update total_parts and part_title on existing records
    for (const rec of existingRecords) {
      if (configPartNumbers.has(rec.part_number)) {
        const matchingPart = config.parts.find((p) => p.part_number === rec.part_number);
        if (matchingPart) {
          await fetch(
            `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(rec.name)}`,
            {
              method: "PUT",
              headers: adminHeaders,
              body: JSON.stringify({
                part_title: matchingPart.part_title,
                total_parts: config.total_parts,
              }),
            },
          );
        }
      }
    }

    // Delete only "Not Started" records for parts no longer in config
    for (const rec of existingRecords) {
      if (!configPartNumbers.has(rec.part_number) && rec.status === "Not Started") {
        await fetch(
          `${FRAPPE_URL}/api/resource/Syllabus Part Completion/${encodeURIComponent(rec.name)}`,
          { method: "DELETE", headers: adminHeaders },
        );
      }
    }
  } catch (e) {
    console.error("[syllabus-config] syncCompletionRecords error:", e);
  }
}
