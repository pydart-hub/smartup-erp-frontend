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

    const planData = {
      student_group,
      course,
      assessment_group,
      assessment_name: `${course} - ${assessment_group}`,
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
          assessment_criteria: "Theory",
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
      return NextResponse.json({ error: "Failed to create exam" }, { status: createRes.status });
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
      console.error("[exams/create] Submit failed:", (await submitRes.text()).slice(0, 500));
      // Return the draft plan anyway
      return NextResponse.json({ data: created });
    }

    const submitted = (await submitRes.json()).data;
    return NextResponse.json({ data: submitted });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/create] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
