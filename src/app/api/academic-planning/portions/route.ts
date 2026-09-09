import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";
import { parseSession } from "@/lib/utils/apiAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/academic-planning/portions
 * Returns all Academic Portions along with branch completion counts & status breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classLevel = searchParams.get("class_level");
    const course = searchParams.get("course");

    const filters: (string | number)[][] = [];
    if (classLevel && classLevel !== "all") {
      filters.push(["class_level", "=", classLevel]);
    }
    if (course && course !== "all") {
      filters.push(["course", "=", course]);
    }

    // 1. Fetch Academic Portions
    const portionsRes = await frappeAdminGet("resource/Academic Portion", {
      fields: JSON.stringify([
        "name",
        "class_level",
        "course",
        "portion_title",
        "target_date",
        "academic_year",
        "description",
        "creation",
      ]),
      filters: JSON.stringify(filters),
      order_by: "target_date asc, creation desc",
      limit_page_length: "500",
    });

    const portions: any[] = portionsRes?.data ?? [];

    if (portions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch all Branch Portion Status records
    const statusesRes = await frappeAdminGet("resource/Branch Portion Status", {
      fields: JSON.stringify([
        "name",
        "portion_ref",
        "branch",
        "student_group",
        "class_level",
        "course",
        "status",
        "completed_on",
        "completed_by",
      ]),
      limit_page_length: "2000",
    });

    const statuses: any[] = statusesRes?.data ?? [];

    // 3. Aggregate branch statuses per portion
    const statusByPortion: Record<string, any[]> = {};
    for (const st of statuses) {
      if (!statusByPortion[st.portion_ref]) {
        statusByPortion[st.portion_ref] = [];
      }
      statusByPortion[st.portion_ref].push(st);
    }

    const enrichedPortions = portions.map((p) => {
      const branchStatuses = statusByPortion[p.name] ?? [];
      const totalBranches = branchStatuses.length;
      const completedBranches = branchStatuses.filter((b) => b.status === "Completed").length;
      const pendingBranches = totalBranches - completedBranches;
      const completionRate = totalBranches > 0 ? Math.round((completedBranches / totalBranches) * 100) : 0;

      return {
        ...p,
        totalBranches,
        completedBranches,
        pendingBranches,
        completionRate,
        branchStatuses,
      };
    });

    return NextResponse.json({ data: enrichedPortions });
  } catch (error: any) {
    console.error("Error in GET /api/academic-planning/portions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/academic-planning/portions
 * Creates an Academic Portion and automatically creates Branch Portion Status
 * entries for ALL branches running that program/class.
 */
export async function POST(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { class_level, course, portion_title, target_date, academic_year, description } = body;

    if (!class_level || !course || !portion_title || !target_date) {
      return NextResponse.json(
        { error: "Missing required fields: class_level, course, portion_title, target_date" },
        { status: 400 }
      );
    }

    // 1. Create Academic Portion Master Doc
    const portionRes = await frappeAdminPost("resource/Academic Portion", {
      class_level,
      course,
      portion_title,
      target_date,
      academic_year: academic_year || undefined,
      description: description || undefined,
    });

    const createdPortion = portionRes?.data;
    if (!createdPortion?.name) {
      throw new Error("Failed to create Academic Portion record in Frappe");
    }

    // 2. Query all active Student Groups matching this class/program
    const studentGroupsRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify(["name", "student_group_name", "custom_branch", "program"]),
      filters: JSON.stringify([
        ["program", "=", class_level],
        ["group_based_on", "=", "Batch"],
        ["disabled", "=", 0],
      ]),
      limit_page_length: "500",
    });

    const groups: any[] = studentGroupsRes?.data ?? [];

    let branchStatusPromises: Promise<any>[] = [];

    if (groups.length > 0) {
      // Create a status entry per student group / branch
      branchStatusPromises = groups.map((g) => {
        const branchName = g.custom_branch || "Smart Up";
        return frappeAdminPost("resource/Branch Portion Status", {
          portion_ref: createdPortion.name,
          branch: branchName,
          student_group: g.name,
          class_level,
          course,
          portion_title,
          target_date,
          status: "Pending",
        }).catch((err) => {
          console.error(`Failed to create Branch Portion Status for ${g.name}:`, err);
          return null;
        });
      });
    } else {
      // Fallback: If no batch student groups exist for this class, assign across all active branches
      const companiesRes = await frappeAdminGet("resource/Company", {
        fields: JSON.stringify(["name"]),
        limit_page_length: "50",
      });
      const companies: any[] = companiesRes?.data ?? [];
      branchStatusPromises = companies.map((c) => {
        return frappeAdminPost("resource/Branch Portion Status", {
          portion_ref: createdPortion.name,
          branch: c.name,
          student_group: `${c.name} - Batch`,
          class_level,
          course,
          portion_title,
          target_date,
          status: "Pending",
        }).catch((err) => {
          console.error(`Failed to create fallback Branch Portion Status for ${c.name}:`, err);
          return null;
        });
      });
    }

    await Promise.all(branchStatusPromises);

    return NextResponse.json({
      success: true,
      data: createdPortion,
      assignedGroupsCount: groups.length,
    });
  } catch (error: any) {
    console.error("Error in POST /api/academic-planning/portions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
