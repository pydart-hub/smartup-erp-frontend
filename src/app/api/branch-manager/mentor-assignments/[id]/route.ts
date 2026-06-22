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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const mentorProfileName = String(body.mentor_profile || "").trim();
    const notes = String(body.notes || "").trim();
    if (!mentorProfileName) {
      return NextResponse.json({ error: "mentor_profile is required" }, { status: 400 });
    }

    const [childLinkRes, mentorRes] = await Promise.all([
      frappeAdminGet(`resource/Mentor Student Link/${encodeURIComponent(id)}`),
      frappeAdminGet(`resource/Mentor Profile/${encodeURIComponent(mentorProfileName)}`),
    ]);
    const childLink = childLinkRes.data as {
      name: string;
      parent: string;
      student: string;
      status: string;
    };
    
    if (!childLink?.parent) {
      return NextResponse.json({ error: "Assignment link not found" }, { status: 404 });
    }

    const parentRes = await frappeAdminGet(`resource/Mentor Student Assignment/${encodeURIComponent(childLink.parent)}`);
    const parentAssignment = parentRes.data as {
      name: string;
      branch: string;
      status: string;
      mentor_profile: string;
    };

    const assignment = {
      name: childLink.name,
      student: childLink.student,
      branch: parentAssignment.branch,
      status: childLink.status,
      mentor_profile: parentAssignment.mentor_profile,
    };

    const mentor = mentorRes.data as {
      name: string;
      employee: string;
      user_id: string;
      branch: string;
      status: string;
      max_student_limit?: number;
    };

    if (!canAccessBranch(auth, assignment.branch) || !canAccessBranch(auth, mentor.branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }
    if (normalize(assignment.branch) !== normalize(mentor.branch)) {
      return NextResponse.json({ error: "Student and mentor must belong to the same branch" }, { status: 400 });
    }
    if (mentor.status !== "Active") {
      return NextResponse.json({ error: "Selected mentor is inactive" }, { status: 400 });
    }

    const activeAssignments = await fetchMentorAssignments({ status: "Active" });
    const mentorCount = activeAssignments.filter((row) => row.mentor_profile === mentor.name).length;
    if (mentorCount >= Number(mentor.max_student_limit || 100)) {
      return NextResponse.json({ error: "Selected mentor has reached the 100-student limit" }, { status: 400 });
    }

    // Mark child link as Inactive
    await frappeAdminPut(`resource/Mentor Student Link/${encodeURIComponent(id)}`, {
      status: "Inactive",
      notes: notes || undefined,
    });

    const parentSearch = await frappeAdminGet("resource/Mentor Student Assignment", {
      filters: JSON.stringify([["mentor_profile", "=", mentor.name], ["status", "=", "Active"]]),
      limit_page_length: "1",
    });
    const activeParent = parentSearch.data?.[0] as { name: string } | undefined;

    let resultData;
    if (activeParent) {
      const fullParent = await frappeAdminGet(`resource/Mentor Student Assignment/${encodeURIComponent(activeParent.name)}`);
      const studentsList = (fullParent.data?.students ?? []) as Array<unknown>;
      studentsList.push({
        student: assignment.student,
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
        mentor_profile: mentor.name,
        mentor_user: mentor.user_id,
        branch: mentor.branch,
        assigned_by: auth.email,
        assigned_on: new Date().toISOString().slice(0, 10),
        status: "Active",
        notes: notes || undefined,
        students: [
          {
            student: assignment.student,
            status: "Active",
            assigned_on: new Date().toISOString().slice(0, 10),
            notes: notes || undefined,
          }
        ]
      });
      resultData = created.data;
    }

    return NextResponse.json({ data: resultData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reassign mentor" },
      { status: 500 },
    );
  }
}
