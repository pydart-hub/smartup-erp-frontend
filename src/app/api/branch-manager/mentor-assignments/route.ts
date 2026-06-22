import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { frappeAdminGet, frappeAdminPost, frappeAdminPut } from "@/lib/server/frappeAdmin";
import { fetchMentorAssignments, normalize } from "@/lib/server/mentorData";

const ALLOWED_ROLES = ["Branch Manager", "Administrator", "Director", "Management", "System Manager"];

function canAccessBranch(session: { roles?: string[]; allowed_companies?: string[] }, branch: string) {
  const roles = session.roles ?? [];
  if (roles.includes("Administrator") || roles.includes("Director") || roles.includes("Management") || roles.includes("System Manager")) {
    return true;
  }
  const allowed = session.allowed_companies ?? [];
  return allowed.length === 0 || allowed.some((row) => normalize(row) === normalize(branch));
}

async function resolveMentorProfile(name: string) {
  const doc = await frappeAdminGet(`resource/Mentor Profile/${encodeURIComponent(name)}`);
  return doc.data as {
    name: string;
    mentor_name: string;
    employee: string;
    user_id: string;
    branch: string;
    status: string;
    max_student_limit?: number;
  };
}

async function enforceMentorCapacity(profileName: string, maxLimit: number) {
  const activeAssignments = await fetchMentorAssignments({ mentorUser: undefined, status: "Active" });
  const count = activeAssignments.filter((row) => row.mentor_profile === profileName).length;
  if (count >= maxLimit) {
    throw new Error("Selected mentor has reached the 100-student limit");
  }
  return count;
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const branch = request.nextUrl.searchParams.get("branch") || auth.default_company || "";
    if (!branch) return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    if (!canAccessBranch(auth, branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const assignments = await fetchMentorAssignments({ branch });
    return NextResponse.json({ data: assignments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch assignments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const student = String(body.student || "").trim();
    const mentorProfileName = String(body.mentor_profile || "").trim();
    const notes = String(body.notes || "").trim();

    if (!student || !mentorProfileName) {
      return NextResponse.json({ error: "student and mentor_profile are required" }, { status: 400 });
    }

    const [studentDocRes, mentorProfile] = await Promise.all([
      frappeAdminGet(`resource/Student/${encodeURIComponent(student)}`, {
        fields: JSON.stringify(["name", "student_name", "custom_branch"]),
      }),
      resolveMentorProfile(mentorProfileName),
    ]);
    const studentDoc = studentDocRes.data as { name: string; student_name?: string; custom_branch?: string };

    if (!studentDoc.custom_branch || normalize(studentDoc.custom_branch) !== normalize(mentorProfile.branch)) {
      return NextResponse.json({ error: "Student and mentor must belong to the same branch" }, { status: 400 });
    }
    if (!canAccessBranch(auth, mentorProfile.branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }
    if (mentorProfile.status !== "Active") {
      return NextResponse.json({ error: "Selected mentor is inactive" }, { status: 400 });
    }

    const existingAssignments = await fetchMentorAssignments({ student, status: "Active" });
    if (existingAssignments.length > 0) {
      return NextResponse.json({ error: "Student already has an active mentor assignment" }, { status: 409 });
    }

    const currentCount = await enforceMentorCapacity(
      mentorProfile.name,
      Number(mentorProfile.max_student_limit || 100),
    );

    const parentSearch = await frappeAdminGet("resource/Mentor Student Assignment", {
      filters: JSON.stringify([["mentor_profile", "=", mentorProfile.name], ["status", "=", "Active"]]),
      limit_page_length: "1",
    });
    const activeParent = parentSearch.data?.[0] as { name: string } | undefined;

    let resultData;
    if (activeParent) {
      const fullParent = await frappeAdminGet(`resource/Mentor Student Assignment/${encodeURIComponent(activeParent.name)}`);
      const studentsList = (fullParent.data?.students ?? []) as Array<unknown>;
      studentsList.push({
        student,
        status: "Active",
        assigned_on: new Date().toISOString().slice(0, 10),
        notes: notes || undefined,
      });

      const updated = await frappeAdminPut(`resource/Mentor Student Assignment/${encodeURIComponent(activeParent.name)}`, {
        students: studentsList,
      });
      resultData = updated.data;
    } else {
      const created = await frappeAdminPost("resource/Mentor Student Assignment", {
        mentor_profile: mentorProfile.name,
        mentor_user: mentorProfile.user_id,
        branch: mentorProfile.branch,
        assigned_by: auth.email,
        assigned_on: new Date().toISOString().slice(0, 10),
        status: "Active",
        notes: notes || undefined,
        students: [
          {
            student,
            status: "Active",
            assigned_on: new Date().toISOString().slice(0, 10),
            notes: notes || undefined,
          }
        ]
      });
      resultData = created.data;
    }

    await frappeAdminPut(`resource/Mentor Profile/${encodeURIComponent(mentorProfile.name)}`, {
      current_student_count: currentCount + 1,
    });

    return NextResponse.json({ data: resultData }, { status: 201 });
  } catch (error) {
    console.error("POST assignment error detail:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create assignment" },
      { status: 500 },
    );
  }
}
