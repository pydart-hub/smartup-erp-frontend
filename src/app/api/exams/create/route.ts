import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/exams/create
 *
 * Creates an Assessment Plan (exam) and submits it.
 * Auto-fills: program, academic_year, custom_branch from Student Group.
 * Uses admin token since instructors may lack direct create permission.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      student_group,
      course,
      assessment_group,
      schedule_date,
      from_time,
      to_time,
      maximum_assessment_score,
      examiner,
      room,
      custom_topic,
    } = body;

    if (!student_group || !course || !assessment_group || !schedule_date || !from_time || !to_time || !maximum_assessment_score) {
      return NextResponse.json(
        { error: "Missing required fields: student_group, course, assessment_group, schedule_date, from_time, to_time, maximum_assessment_score" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Fetch Student Group to get program, academic_year, custom_branch
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(student_group)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (!sgRes.ok) {
      return NextResponse.json({ error: "Student Group not found" }, { status: 404 });
    }
    const sg = (await sgRes.json()).data;

    // Pre-flight: check for conflicting Course Schedules
    const csFilters = JSON.stringify([
      ["student_group", "=", student_group],
      ["schedule_date", "=", schedule_date],
      ["from_time", "<", to_time],
      ["to_time", ">", from_time],
      ["docstatus", "!=", 2],
    ]);
    const csFields = JSON.stringify(["name", "course", "from_time", "to_time"]);
    const csRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?filters=${encodeURIComponent(csFilters)}&fields=${encodeURIComponent(csFields)}&limit_page_length=5`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (csRes.ok) {
      const csData = (await csRes.json()).data ?? [];
      if (csData.length > 0) {
        const conflicts = csData.map((c: { course: string; from_time: string; to_time: string }) =>
          `${c.course} (${c.from_time.slice(0, 5)}–${c.to_time.slice(0, 5)})`
        ).join(", ");
        return NextResponse.json(
          { error: `Time overlaps with a class: ${conflicts}. Pick a non-overlapping time.` },
          { status: 409 },
        );
      }
    }

    // Pre-flight: check for conflicting Assessment Plans (existing exams)
    const apFilters = JSON.stringify([
      ["student_group", "=", student_group],
      ["schedule_date", "=", schedule_date],
      ["from_time", "<", to_time],
      ["to_time", ">", from_time],
      ["docstatus", "!=", 2],
    ]);
    const apFields = JSON.stringify(["name", "assessment_name", "from_time", "to_time"]);
    const apRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?filters=${encodeURIComponent(apFilters)}&fields=${encodeURIComponent(apFields)}&limit_page_length=5`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (apRes.ok) {
      const apData = (await apRes.json()).data ?? [];
      if (apData.length > 0) {
        const conflicts = apData.map((a: { assessment_name: string; from_time: string; to_time: string }) =>
          `${a.assessment_name} (${a.from_time.slice(0, 5)}–${a.to_time.slice(0, 5)})`
        ).join(", ");
        return NextResponse.json(
          { error: `Time overlaps with an existing exam: ${conflicts}. Pick a non-overlapping time.` },
          { status: 409 },
        );
      }
    }

    // Determine unique assessment criteria name
    // Each topic gets its own criteria so Frappe allows multiple exams per course+type
    const criteriaName = custom_topic || "Theory";

    // Ensure the Assessment Criteria record exists in Frappe
    const criteriaCheckRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Criteria/${encodeURIComponent(criteriaName)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (!criteriaCheckRes.ok) {
      await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Criteria`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_criteria: criteriaName }),
        cache: "no-store",
      });
    }

    const planData = {
      student_group,
      course,
      assessment_group,
      assessment_name: `${course} - ${assessment_group}${custom_topic ? ` (${custom_topic})` : ""}`,
      grading_scale: "SmartUp Grading Scale",
      program: sg.program || "",
      academic_year: sg.academic_year || "",
      custom_branch: sg.custom_branch || "",
      schedule_date,
      from_time,
      to_time,
      maximum_assessment_score: Number(maximum_assessment_score),
      examiner: examiner || "",
      room: room || "",
      assessment_criteria: [
        {
          assessment_criteria: criteriaName,
          maximum_score: Number(maximum_assessment_score),
        },
      ],
    };

    // Create the Assessment Plan
    const createRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Plan`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(planData),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[exams/create] Create failed:", errText.slice(0, 500));
      // Extract user-friendly message from Frappe error
      let msg = "Failed to create exam";
      try {
        const errJson = JSON.parse(errText);
        if (errJson._server_messages) {
          const msgs = JSON.parse(errJson._server_messages);
          const parsed = JSON.parse(msgs[0]);
          if (parsed.message) msg = parsed.message;
        } else if (errJson.exception) {
          const parts = errJson.exception.split(": ");
          if (parts.length > 1) msg = parts.slice(1).join(": ");
        }
      } catch { /* use default msg */ }
      return NextResponse.json({ error: msg }, { status: createRes.status });
    }

    const created = (await createRes.json()).data;

    // Submit the plan (docstatus=1)
    const submitRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(created.name)}`,
      {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ docstatus: 1 }),
        cache: "no-store",
      },
    );

    if (!submitRes.ok) {
      console.error("[exams/create] Submit failed (non-ok):", (await submitRes.text()).slice(0, 300));
      // Return the draft plan — exam is created but not yet submitted
      return NextResponse.json({ data: created });
    }

    const submitJson = await submitRes.json();
    // Frappe can return 200 with exception data on on_submit failures
    if (!submitJson.data || submitJson.exc) {
      console.error("[exams/create] Submit returned 200 with error:", JSON.stringify(submitJson).slice(0, 300));
      return NextResponse.json({ data: created });
    }

    return NextResponse.json({ data: submitJson.data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/create] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
