import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/utils/apiAuth";
import { frappeAdminGet, frappeAdminPost, frappeAdminPut } from "@/lib/server/frappeAdmin";
import { fetchMentorAssignments, fetchMentorProfiles, normalize } from "@/lib/server/mentorData";

const ALLOWED_ROLES = ["Branch Manager", "Administrator", "Director", "Management", "System Manager"];

function canAccessBranch(session: { roles?: string[]; allowed_companies?: string[] }, branch: string) {
  const roles = session.roles ?? [];
  if (roles.includes("Administrator") || roles.includes("Director") || roles.includes("Management") || roles.includes("System Manager")) {
    return true;
  }
  const allowed = session.allowed_companies ?? [];
  return allowed.length === 0 || allowed.some((row) => normalize(row) === normalize(branch));
}

async function ensureMentorRole(userId: string) {
  const userDoc = await frappeAdminGet(`resource/User/${encodeURIComponent(userId)}`, {
    fields: JSON.stringify(["name", "roles"]),
  });
  const roles = (userDoc.data?.roles ?? []) as Array<{ role: string; name?: string }>;
  if (roles.some((row) => row.role === "Mentor")) return;
  await frappeAdminPut(`resource/User/${encodeURIComponent(userId)}`, {
    roles: [...roles, { role: "Mentor" }],
  });
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const branch = request.nextUrl.searchParams.get("branch") || auth.default_company || "";
    if (!branch) {
      return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    }
    if (!canAccessBranch(auth, branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const [profiles, assignments] = await Promise.all([
      fetchMentorProfiles(branch),
      fetchMentorAssignments({ branch, status: "Active" }),
    ]);
    const countMap = new Map<string, number>();
    for (const row of assignments) {
      countMap.set(row.mentor_profile, (countMap.get(row.mentor_profile) ?? 0) + 1);
    }

    return NextResponse.json({
      data: profiles.map((row) => ({
        ...row,
        current_student_count: countMap.get(row.name) ?? 0,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mentors" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const branch = String(body.branch || auth.default_company || "").trim();
    const employee = String(body.employee || "").trim();
    const userId = String(body.user_id || "").trim();
    const mentorName = String(body.mentor_name || "").trim();
    const remarks = String(body.remarks || "").trim();
    const maxStudentLimit = Number(body.max_student_limit || 100);

    if (!branch || !employee || !userId || !mentorName) {
      return NextResponse.json({ error: "branch, employee, user_id and mentor_name are required" }, { status: 400 });
    }
    if (!canAccessBranch(auth, branch)) {
      return NextResponse.json({ error: "Access denied for this branch" }, { status: 403 });
    }

    const employeeDoc = await frappeAdminGet(`resource/Employee/${encodeURIComponent(employee)}`, {
      fields: JSON.stringify(["name", "company", "user_id", "employee_name"]),
    });
    const employeeBranch = String(employeeDoc.data?.company || "");
    if (normalize(employeeBranch) !== normalize(branch)) {
      return NextResponse.json({ error: "Employee does not belong to this branch" }, { status: 400 });
    }
    if (String(employeeDoc.data?.user_id || "").trim() !== userId) {
      return NextResponse.json({ error: "Employee is not linked to the selected user" }, { status: 400 });
    }

    const existing = await frappeAdminGet("resource/Mentor Profile", {
      fields: JSON.stringify(["name"]),
      filters: JSON.stringify([["employee", "=", employee], ["branch", "=", branch]]),
      limit_page_length: "1",
    });
    if ((existing.data ?? []).length > 0) {
      return NextResponse.json({ error: "Mentor profile already exists for this employee" }, { status: 409 });
    }

    await ensureMentorRole(userId);

    const created = await frappeAdminPost("resource/Mentor Profile", {
      mentor_name: mentorName,
      employee,
      user_id: userId,
      branch,
      status: "Active",
      max_student_limit: Number.isFinite(maxStudentLimit) && maxStudentLimit > 0 ? maxStudentLimit : 100,
      current_student_count: 0,
      remarks: remarks || undefined,
    });

    return NextResponse.json({ data: created.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create mentor" },
      { status: 500 },
    );
  }
}
