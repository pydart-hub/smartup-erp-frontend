import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseClass,
  type CrashCourseDashboardStats,
  type CrashCourseBranchCardData,
} from "@/lib/types/crashCourse";

function getBranchConfig(branchNameOrCompany: string) {
  const clean = branchNameOrCompany.toLowerCase().trim();
  return CRASH_COURSE_BRANCHES.find(
    (b) =>
      b.company.toLowerCase() === clean ||
      b.label.toLowerCase() === clean ||
      clean.includes(b.label.toLowerCase()) ||
      b.company.toLowerCase().includes(clean)
  );
}

function detectClassLevel(programName?: string, batchName?: string): CrashCourseClass {
  const p = (programName || "").toLowerCase();
  const b = (batchName || "").toUpperCase();

  if (b.includes("-9-") || p.includes("9th")) return "9th";
  if (b.includes("-P1-") || p.includes("11th") || p.includes("plus one")) return "Plus One";
  if (b.includes("-P2-") || p.includes("12th") || p.includes("plus two")) return "Plus Two";
  return "10th";
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    // 1. Fetch Crash Course Program Enrollments
    const peRes = await frappeAdminGet("resource/Program Enrollment", {
      fields: JSON.stringify([
        "name",
        "student",
        "student_name",
        "program",
        "academic_year",
        "student_category",
        "docstatus",
        "enrollment_date",
      ]),
      filters: JSON.stringify([
        ["student_category", "=", "Crash Course"],
        ["academic_year", "=", "2026-2027"],
      ]),
      limit_page_length: "500",
    }).catch(() => ({ data: [] }));

    const programEnrollments = (peRes.data || []) as Array<{
      name: string;
      student: string;
      student_name: string;
      program?: string;
      academic_year?: string;
      docstatus: number;
    }>;

    // 2. Fetch Crash Course Student Groups (Batches)
    const sgRes = await frappeAdminGet("resource/Student Group", {
      fields: JSON.stringify([
        "name",
        "student_group_name",
        "custom_branch",
        "program",
        "academic_year",
        "max_strength",
      ]),
      filters: JSON.stringify([
        ["academic_year", "=", "2026-2027"],
      ]),
      limit_page_length: "200",
    }).catch(() => ({ data: [] }));

    const rawGroups = (sgRes.data || []) as Array<{
      name: string;
      student_group_name: string;
      custom_branch?: string;
      program?: string;
      max_strength?: number;
    }>;

    const ccGroups = rawGroups.filter(
      (g) =>
        g.name.startsWith("CC-2026-") ||
        (g.student_group_name &&
          g.student_group_name.toLowerCase().includes("crash course"))
    );

    // Fetch detailed group members
    const batchDetails = await Promise.all(
      ccGroups.map(async (g) => {
        try {
          const detailRes = await frappeAdminGet(
            `resource/Student Group/${encodeURIComponent(g.name)}`
          );
          const students = (detailRes.data?.students || []) as Array<{
            student: string;
            student_name?: string;
            active?: number;
          }>;
          const classLevel = detectClassLevel(g.program, g.name);
          return {
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            custom_branch: g.custom_branch || "",
            program: g.program || "",
            class_level: classLevel,
            enrolled_count: students.length,
            max_capacity: g.max_strength || 50,
            students,
          };
        } catch {
          const classLevel = detectClassLevel(g.program, g.name);
          return {
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            custom_branch: g.custom_branch || "",
            program: g.program || "",
            class_level: classLevel,
            enrolled_count: 0,
            max_capacity: g.max_strength || 50,
            students: [],
          };
        }
      })
    );

    // Collect all unique student IDs from Program Enrollments and Student Groups
    const studentIdSet = new Set<string>();
    programEnrollments.forEach((pe) => studentIdSet.add(pe.student));
    batchDetails.forEach((b) => {
      b.students.forEach((s) => studentIdSet.add(s.student));
    });

    const studentIds = Array.from(studentIdSet);

    // 3. Fetch details for these students (branch, customer, srr_id)
    const studentInfoMap = new Map<
      string,
      {
        name: string;
        custom_branch: string;
        custom_srr_id: string;
        customer?: string;
        student_name: string;
      }
    >();

    await Promise.all(
      studentIds.map(async (stuId) => {
        try {
          const sRes = await frappeAdminGet(
            `resource/Student/${encodeURIComponent(stuId)}`
          );
          if (sRes.data) {
            studentInfoMap.set(stuId, {
              name: sRes.data.name,
              custom_branch: sRes.data.custom_branch || "",
              custom_srr_id: sRes.data.custom_srr_id || "",
              customer: sRes.data.customer,
              student_name:
                sRes.data.first_name +
                (sRes.data.last_name ? ` ${sRes.data.last_name}` : ""),
            });
          }
        } catch {
          // ignore individual fetch errors
        }
      })
    );

    // 4. Fetch Invoices for these students / customers
    const customerList = Array.from(studentInfoMap.values())
      .map((s) => s.customer)
      .filter(Boolean) as string[];

    let invoices: Array<{
      name: string;
      customer: string;
      company: string;
      grand_total: number;
      outstanding_amount: number;
      status: string;
    }> = [];

    // Query invoices for the customers of Crash Course students
    if (customerList.length > 0) {
      try {
        const invRes = await frappeAdminGet("resource/Sales Invoice", {
          fields: JSON.stringify([
            "name",
            "customer",
            "company",
            "grand_total",
            "outstanding_amount",
            "status",
            "docstatus",
          ]),
          filters: JSON.stringify([
            ["customer", "in", customerList],
            ["docstatus", "!=", 2],
          ]),
          limit_page_length: "500",
        });
        invoices = invRes.data || [];
      } catch {
        invoices = [];
      }
    }

    // Map invoices by customer for quick lookup
    const customerInvoiceMap = new Map<string, typeof invoices[0]>();
    invoices.forEach((inv) => {
      customerInvoiceMap.set(inv.customer, inv);
    });

    // 5. Aggregate metrics
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalDue = 0;

    invoices.forEach((inv) => {
      const grandTotal = Number(inv.grand_total) || 0;
      const outstanding = Number(inv.outstanding_amount) || 0;
      totalInvoiced += grandTotal;
      totalDue += outstanding;
      totalCollected += Math.max(0, grandTotal - outstanding);
    });

    const classCounts: Record<CrashCourseClass, number> = {
      "9th": 0,
      "10th": 0,
      "Plus One": 0,
      "Plus Two": 0,
    };

    let activeStudents = 0;
    let discontinuedStudents = 0;

    // Student -> Batch mapping
    const studentBatchMap = new Map<string, string>();
    batchDetails.forEach((b) => {
      b.students.forEach((s) => {
        studentBatchMap.set(s.student, b.name);
      });
    });

    studentIds.forEach((stuId) => {
      const pe = programEnrollments.find((p) => p.student === stuId);
      const batchName = studentBatchMap.get(stuId);
      const cls = detectClassLevel(pe?.program, batchName);
      classCounts[cls] = (classCounts[cls] || 0) + 1;

      if (pe && pe.docstatus === 2) {
        discontinuedStudents += 1;
      } else {
        activeStudents += 1;
      }
    });

    // Count Sunday languages from invoices / pricing
    // Each Sunday language add-on is approx ₹999 / ₹2499 total, or inferred from grand_total > mandatory fee
    let sundayLanguagesCount = 0;
    invoices.forEach((inv) => {
      if (Number(inv.grand_total) > 6000) {
        sundayLanguagesCount += 1;
      }
    });

    // 6. Aggregate Branch Cards (Palluruthy, Thoppumpady, Fort Kochi)
    const branchCards: CrashCourseBranchCardData[] = CRASH_COURSE_BRANCHES.map(
      (cfg) => {
        // Collect students for this branch
        const branchStudents = studentIds.filter((stuId) => {
          const sInfo = studentInfoMap.get(stuId);
          if (!sInfo) return false;
          return (
            sInfo.custom_branch.toLowerCase() === cfg.company.toLowerCase() ||
            sInfo.custom_branch.toLowerCase().includes(cfg.label.toLowerCase())
          );
        });

        // Filter batches for this branch
        const branchBatches = batchDetails.filter(
          (b) =>
            b.custom_branch.toLowerCase() === cfg.company.toLowerCase() ||
            b.custom_branch.toLowerCase().includes(cfg.label.toLowerCase()) ||
            b.name.toUpperCase().includes(`-${cfg.abbr}-`)
        );

        // Branch financials
        let branchBilled = 0;
        let branchCollected = 0;
        let branchDue = 0;

        invoices
          .filter(
            (inv) =>
              inv.company.toLowerCase() === cfg.company.toLowerCase() ||
              inv.company.toLowerCase().includes(cfg.label.toLowerCase())
          )
          .forEach((inv) => {
            const gt = Number(inv.grand_total) || 0;
            const out = Number(inv.outstanding_amount) || 0;
            branchBilled += gt;
            branchDue += out;
            branchCollected += Math.max(0, gt - out);
          });

        const branchClassCounts: Record<CrashCourseClass, number> = {
          "9th": 0,
          "10th": 0,
          "Plus One": 0,
          "Plus Two": 0,
        };

        branchStudents.forEach((stuId) => {
          const pe = programEnrollments.find((p) => p.student === stuId);
          const bName = studentBatchMap.get(stuId);
          const cls = detectClassLevel(pe?.program, bName);
          branchClassCounts[cls] = (branchClassCounts[cls] || 0) + 1;
        });

        return {
          branchName: cfg.company,
          shortName: cfg.label,
          abbr: cfg.abbr,
          activeStudents: branchStudents.length,
          targetStudents: cfg.recTarget,
          totalBilled: branchBilled,
          totalCollected: branchCollected,
          totalDue: branchDue,
          classCounts: branchClassCounts,
          batches: branchBatches.map((b) => ({
            name: b.name,
            class_level: b.class_level,
            enrolled_count: b.enrolled_count,
            max_capacity: b.max_capacity,
          })),
        };
      }
    );

    const stats: CrashCourseDashboardStats = {
      totalStudents: studentIds.length,
      activeStudents,
      discontinuedStudents,
      totalInvoiced,
      totalCollected,
      totalDue,
      classCounts,
      sundayLanguagesCount,
      branches: branchCards,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    console.error("[crash-course/dashboard] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to load Crash Course dashboard metrics",
      },
      { status: 500 }
    );
  }
}
