import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { frappeAdminPost } from "@/lib/server/frappeAdmin";
import { fetchMentorAssignments, fetchMentorFeedback } from "@/lib/server/mentorData";

const ALLOWED_READ_ROLES = ["Mentor", "Branch Manager", "Administrator", "Director", "Management", "General Manager", "System Manager"];

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_READ_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const student = request.nextUrl.searchParams.get("student") || undefined;
    const branch = request.nextUrl.searchParams.get("branch") || undefined;
    const mentorUser = request.nextUrl.searchParams.get("mentor_user") || undefined;

    const data = await fetchMentorFeedback({
      student,
      branch: auth.roles?.includes("Mentor") ? undefined : branch,
      mentorUser: auth.roles?.includes("Mentor") ? auth.email : mentorUser,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentor feedback" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["Mentor", "Administrator", "Branch Manager", "Director", "Management", "General Manager", "System Manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const student = String(body.student || "").trim();
    if (!student) {
      return NextResponse.json({ error: "student is required" }, { status: 400 });
    }

    const assignments = await fetchMentorAssignments({ student, status: "Active" });
    const assignment = assignments.find((row) => row.mentor_user === auth.email) ?? assignments[0];
    if (!assignment) {
      return NextResponse.json({ error: "Student is not assigned to a mentor" }, { status: 404 });
    }
    if (auth.roles?.includes("Mentor") && assignment.mentor_user !== auth.email) {
      return NextResponse.json({ error: "You can only log feedback for your assigned students" }, { status: 403 });
    }

    const created = await frappeAdminPost("resource/Mentor Feedback", {
      student,
      student_name: assignment.student_name,
      mentor_profile: assignment.mentor_profile,
      mentor_user: assignment.mentor_user,
      branch: assignment.branch,
      contact_person: body.contact_person || undefined,
      contact_number: body.contact_number || undefined,
      call_datetime: new Date().toISOString().slice(0, 19).replace("T", " "),
      call_status: body.call_status,
      discussion_category: body.discussion_category,
      academic_notes: body.academic_notes || undefined,
      fee_notes: body.fee_notes || undefined,
      contact_notes: body.contact_notes || undefined,
      overall_feedback: body.overall_feedback || undefined,
      next_followup_date: body.next_followup_date || undefined,
      priority: body.priority || undefined,
      action_required: body.action_required ? 1 : 0,
      visible_to_management: 1,
    });

    return NextResponse.json({ data: created.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create mentor feedback" },
      { status: 500 },
    );
  }
}
