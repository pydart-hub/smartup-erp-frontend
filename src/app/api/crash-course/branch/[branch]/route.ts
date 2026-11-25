import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";
import {
  CRASH_COURSE_BRANCHES,
  type CrashCourseClass,
  type CrashCourseBranchDetailData,
  type CrashCourseStudentRosterItem,
} from "@/lib/types/crashCourse";

function getBranchConfig(branchNameOrCompany: string) {
  const clean = branchNameOrCompany.toLowerCase().trim();
  return (
    CRASH_COURSE_BRANCHES.find(
      (b) =>
        b.company.toLowerCase() === clean ||
        b.label.toLowerCase() === clean ||
        clean.includes(b.label.toLowerCase()) ||
        b.company.toLowerCase().includes(clean)
    ) || {
      label: branchNameOrCompany.replace("Smart Up ", "").trim(),
      company: branchNameOrCompany.startsWith("Smart Up")
        ? branchNameOrCompany
        : `Smart Up ${branchNameOrCompany}`,
      abbr: branchNameOrCompany.substring(0, 3).toUpperCase(),
      minTarget: 80,
      recTarget: 150,
    }
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branch: string }> | { branch: string } }
) {
  try {
    const authResult = requireRole(request, STAFF_ROLES);
    if (authResult instanceof NextResponse) return authResult;

    const resolvedParams = await params;
    const branchParam = decodeURIComponent(resolvedParams.branch || "");
    const branchCfg = getBranchConfig(branchParam);

    // 1. Fetch Student Groups for this branch
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

    // Filter to Crash Course batches for this branch
    const branchGroups = rawGroups.filter((g) => {
      const isCC =
        g.name.startsWith("CC-2026-") ||
        (g.student_group_name &&
          g.student_group_name.toLowerCase().includes("crash course"));
      if (!isCC) return false;

      const branchMatch =
        (g.custom_branch &&
          (g.custom_branch.toLowerCase() === branchCfg.company.toLowerCase() ||
            g.custom_branch.toLowerCase().includes(branchCfg.label.toLowerCase()))) ||
        g.name.toUpperCase().includes(`-${branchCfg.abbr}-`);
      return branchMatch;
    });

    // Fetch details of each student group
    const batchDetails = await Promise.all(
      branchGroups.map(async (g) => {
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
            custom_branch: g.custom_branch || branchCfg.company,
            program: g.program || "10th State",
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
            custom_branch: g.custom_branch || branchCfg.company,
            program: g.program || "10th State",
            class_level: classLevel,
            enrolled_count: 0,
            max_capacity: g.max_strength || 50,
            students: [],
          };
        }
      })
    );

    // Also fetch Program Enrollments with student_category = "Crash Course"
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
      enrollment_date?: string;
    }>;

    // Collect all unique student IDs in these batches
    const studentBatchMap = new Map<string, string>();
    const studentIdSet = new Set<string>();

    batchDetails.forEach((b) => {
      b.students.forEach((s) => {
        studentIdSet.add(s.student);
        studentBatchMap.set(s.student, b.name);
      });
    });

    // Also check students from Program Enrollment whose branch matches
    // Fetch details for student IDs
    const studentList: CrashCourseStudentRosterItem[] = [];

    // Also query Student records for this branch that have Crash Course enrollment
    const stuIds = Array.from(studentIdSet);

    // In parallel, fetch student details
    const studentDocs = await Promise.all(
      stuIds.map(async (stuId) => {
        try {
          const sRes = await frappeAdminGet(
            `resource/Student/${encodeURIComponent(stuId)}`
          );
          return sRes.data;
        } catch {
          return null;
        }
      })
    );

    // Fetch invoices for these customers
    const customerList = studentDocs
      .filter(Boolean)
      .map((s) => s.customer)
      .filter(Boolean) as string[];

    let invoices: Array<{
      name: string;
      customer: string;
      company: string;
      grand_total: number;
      outstanding_amount: number;
      status: string;
      posting_date?: string;
    }> = [];

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
            "posting_date",
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

    const customerInvoiceMap = new Map<string, typeof invoices[0]>();
    invoices.forEach((inv) => {
      customerInvoiceMap.set(inv.customer, inv);
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;

    studentDocs.filter(Boolean).forEach((doc: any) => {
      const pe = programEnrollments.find((p) => p.student === doc.name);
      const batchName = studentBatchMap.get(doc.name) || "";
      const classLevel = detectClassLevel(pe?.program, batchName);
      const inv = doc.customer ? customerInvoiceMap.get(doc.customer) : undefined;

      const billed = inv ? Number(inv.grand_total) || 0 : 0;
      const due = inv ? Number(inv.outstanding_amount) || 0 : 0;
      const paid = Math.max(0, billed - due);

      totalBilled += billed;
      totalDue += due;
      totalCollected += paid;

      let paymentStatus: "Paid" | "Partly Paid" | "Unpaid" = "Unpaid";
      if (billed > 0) {
        if (due <= 0) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partly Paid";
      }

      studentList.push({
        id: doc.name,
        srrId: doc.custom_srr_id || "—",
        name:
          doc.first_name + (doc.last_name ? ` ${doc.last_name}` : "") ||
          doc.student_name ||
          doc.name,
        phone: doc.student_mobile_number,
        email: doc.student_email_id,
        branch: branchCfg.company,
        classLevel,
        program: pe?.program || `${classLevel} State`,
        batchName,
        invoiceName: inv?.name,
        amountBilled: billed,
        amountPaid: paid,
        amountDue: due,
        paymentStatus,
        enrollmentDate: pe?.enrollment_date || doc.joining_date,
      });
    });

    // Group by Program
    const programMap = new Map<
      string,
      {
        program: string;
        classLevel: CrashCourseClass;
        students: CrashCourseStudentRosterItem[];
        batches: typeof batchDetails;
      }
    >();

    const knownPrograms: Array<{ program: string; classLevel: CrashCourseClass }> = [
      { program: "10th State", classLevel: "10th" },
      { program: "9th State", classLevel: "9th" },
      { program: "11th Science State", classLevel: "Plus One" },
      { program: "12th Science State", classLevel: "Plus Two" },
    ];

    knownPrograms.forEach((kp) => {
      programMap.set(kp.program, {
        program: kp.program,
        classLevel: kp.classLevel,
        students: [],
        batches: batchDetails.filter((b) => b.class_level === kp.classLevel),
      });
    });

    studentList.forEach((stu) => {
      let entry = programMap.get(stu.program);
      if (!entry) {
        entry = programMap.get(`${stu.classLevel} State`);
      }
      if (entry) {
        entry.students.push(stu);
      }
    });

    const programSummaries = Array.from(programMap.values()).map((p) => {
      let progBilled = 0;
      let progCollected = 0;
      let progDue = 0;

      p.students.forEach((s) => {
        progBilled += s.amountBilled;
        progCollected += s.amountPaid;
        progDue += s.amountDue;
      });

      return {
        program: p.program,
        classLevel: p.classLevel,
        studentCount: p.students.length,
        totalBilled: progBilled,
        totalCollected: progCollected,
        totalDue: progDue,
        batches: p.batches.map((b) => ({
          name: b.name,
          student_group_name: b.student_group_name,
          enrolled_count: b.enrolled_count,
          max_capacity: b.max_capacity,
        })),
      };
    });

    const result: CrashCourseBranchDetailData = {
      branchName: branchCfg.company,
      shortName: branchCfg.label,
      abbr: branchCfg.abbr,
      totalStudents: studentList.length,
      activeStudents: studentList.length,
      totalBilled,
      totalCollected,
      totalDue,
      activeBatchesCount: batchDetails.length,
      programsCount: programSummaries.filter((p) => p.studentCount > 0 || p.batches.length > 0).length,
      programs: programSummaries,
      students: studentList,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[crash-course/branch] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to load branch Crash Course details",
      },
      { status: 500 }
    );
  }
}
