import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseClass,
  type CrashCourseBatchSummary,
} from "@/lib/types/crashCourse";
import {
  MIN_BATCH_CAPACITY,
  MAX_BATCH_CAPACITY,
  WARN_BATCH_CAPACITY,
} from "@/lib/utils/crashCoursePricing";

const CLASS_ABBR_MAP: Record<CrashCourseClass, string> = {
  "9th": "9",
  "10th": "10",
  "Plus One": "P1",
  "Plus Two": "P2",
};

const PROGRAM_MAP: Record<CrashCourseClass, string> = {
  "9th": "9th State",
  "10th": "10th State",
  "Plus One": "11th Science State",
  "Plus Two": "12th Science State",
};

function getBranchConfig(branchNameOrCompany: string) {
  return CRASH_COURSE_BRANCHES.find(
    (b) =>
      b.company.toLowerCase() === branchNameOrCompany.toLowerCase() ||
      b.label.toLowerCase() === branchNameOrCompany.toLowerCase()
  );
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get("branch");
    const classParam = searchParams.get("class_level") as CrashCourseClass | null;

    // 1. Fetch Student Groups matching Crash Course pattern
    const filters: string[][] = [
      ["academic_year", "=", "2026-2027"],
    ];

    if (branchParam) {
      const cfg = getBranchConfig(branchParam);
      if (cfg) {
        filters.push(["custom_branch", "=", cfg.company]);
      }
    }

    const groupsRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify([
        "name",
        "student_group_name",
        "custom_branch",
        "program",
        "academic_year",
      ]),
      filters: JSON.stringify(filters),
      limit_page_length: "200",
    }).catch(() => ({ data: [] }));

    const rawGroups = (groupsRes.data || []) as Array<{
      name: string;
      student_group_name: string;
      custom_branch?: string;
      program?: string;
    }>;

    // Filter to crash course batches (named CC-2026-* or contains Crash Course)
    const ccGroups = rawGroups.filter(
      (g) =>
        g.name.startsWith("CC-2026-") ||
        (g.student_group_name &&
          g.student_group_name.toLowerCase().includes("crash course"))
    );

    // Fetch details for each group to get student count
    const batchSummaries: CrashCourseBatchSummary[] = await Promise.all(
      ccGroups.map(async (g) => {
        try {
          const detailRes = await frappeAdminGet(
            `resource/Student Group/${encodeURIComponent(g.name)}`
          );
          const students = detailRes.data?.students || [];
          const count = students.length;

          // Determine class level from name or program
          let classLevel: CrashCourseClass = "10th";
          if (g.name.includes("-9-") || (g.program && g.program.includes("9th"))) {
            classLevel = "9th";
          } else if (
            g.name.includes("-10-") ||
            (g.program && g.program.includes("10th"))
          ) {
            classLevel = "10th";
          } else if (
            g.name.includes("-P1-") ||
            (g.program && (g.program.includes("11th") || g.program.includes("Plus One")))
          ) {
            classLevel = "Plus One";
          } else if (
            g.name.includes("-P2-") ||
            (g.program && (g.program.includes("12th") || g.program.includes("Plus Two")))
          ) {
            classLevel = "Plus Two";
          }

          const isFull = count >= MAX_BATCH_CAPACITY;
          const isNear = count >= WARN_BATCH_CAPACITY;

          return {
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            class_level: classLevel,
            branch: g.custom_branch || "",
            enrolled_count: count,
            min_capacity: MIN_BATCH_CAPACITY,
            max_capacity: MAX_BATCH_CAPACITY,
            is_full: isFull,
            is_near_capacity: isNear,
            seats_remaining: Math.max(0, MAX_BATCH_CAPACITY - count),
          };
        } catch {
          return {
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            class_level: "10th",
            branch: g.custom_branch || "",
            enrolled_count: 0,
            min_capacity: MIN_BATCH_CAPACITY,
            max_capacity: MAX_BATCH_CAPACITY,
            is_full: false,
            is_near_capacity: false,
            seats_remaining: MAX_BATCH_CAPACITY,
          };
        }
      })
    );

    // Filter by class level if requested
    let filteredSummaries = batchSummaries;
    if (classParam) {
      filteredSummaries = filteredSummaries.filter(
        (b) => b.class_level === classParam
      );
    }

    // If no batch exists for requested branch + class, offer default Batch 1 suggestion
    if (filteredSummaries.length === 0 && branchParam && classParam) {
      const cfg = getBranchConfig(branchParam);
      const branchAbbr = cfg?.abbr || "BR";
      const classAbbr = CLASS_ABBR_MAP[classParam] || "10";
      const defaultName = `CC-2026-${classAbbr}-${branchAbbr}-B1`;

      filteredSummaries.push({
        name: defaultName,
        student_group_name: `Crash Course ${classParam} ${cfg?.label || branchParam} - Batch 1`,
        class_level: classParam,
        branch: cfg?.company || branchParam,
        enrolled_count: 0,
        min_capacity: MIN_BATCH_CAPACITY,
        max_capacity: MAX_BATCH_CAPACITY,
        is_full: false,
        is_near_capacity: false,
        seats_remaining: MAX_BATCH_CAPACITY,
      });
    }

    return NextResponse.json({ batches: filteredSummaries });
  } catch (err) {
    console.error("[crash-course/batches] GET Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { branch, class_level, batch_number = 1 } = body as {
      branch: string;
      class_level: CrashCourseClass;
      batch_number?: number;
    };

    if (!branch || !class_level) {
      return NextResponse.json(
        { error: "branch and class_level are required" },
        { status: 400 }
      );
    }

    const cfg = getBranchConfig(branch);
    const branchAbbr = cfg?.abbr || "BR";
    const classAbbr = CLASS_ABBR_MAP[class_level] || "10";
    const batchName = `CC-2026-${classAbbr}-${branchAbbr}-B${batch_number}`;
    const displayName = `Crash Course ${class_level} ${cfg?.label || branch} - Batch ${batch_number}`;
    const programName = PROGRAM_MAP[class_level] || "10th State";

    // Create the Student Group doc in Frappe
    const payload = {
      name: batchName,
      student_group_name: displayName,
      group_based_on: "Batch",
      program: programName,
      academic_year: "2026-2027",
      custom_branch: cfg?.company || branch,
      max_strength: MAX_BATCH_CAPACITY,
      students: [],
    };

    let result;
    try {
      result = await frappeAdminPost("resource/Student Group", payload);
    } catch (err: unknown) {
      // If already exists, fetch it
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Duplicate") || msg.includes("already exists")) {
        result = await frappeAdminGet(
          `resource/Student Group/${encodeURIComponent(batchName)}`
        );
      } else {
        throw err;
      }
    }

    const created: CrashCourseBatchSummary = {
      name: batchName,
      student_group_name: displayName,
      class_level,
      branch: cfg?.company || branch,
      enrolled_count: 0,
      min_capacity: MIN_BATCH_CAPACITY,
      max_capacity: MAX_BATCH_CAPACITY,
      is_full: false,
      is_near_capacity: false,
      seats_remaining: MAX_BATCH_CAPACITY,
    };

    return NextResponse.json({ batch: created, doc: result?.data });
  } catch (err) {
    console.error("[crash-course/batches] POST Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create batch" },
      { status: 500 }
    );
  }
}
