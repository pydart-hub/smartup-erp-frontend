import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCourseEnrollmentsForLatestPrograms,
  getActiveStudentSetsForBatches,
  getActiveStudentsByLatestProgram,
  normalizeProgramLabel,
} from "@/lib/server/analyticsEnrollment";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

type ProgramCourse = { course: string; course_name?: string; required?: number };
type InstructorListRow = { name: string; instructor_name?: string; employee?: string };
type InstructorLogRow = { program?: string; course?: string; custom_branch?: string };
type InstructorDoc = InstructorListRow & { instructor_log?: InstructorLogRow[] };

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getAcademicWindowUTC(today: Date) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const startYear = month >= 4 ? year : year - 1;
  return { start: `${startYear}-05-01`, end: formatDateUTC(today) };
}

function normalize(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * GET /api/analytics/subject-branches?program=X&subject=X
 *
 * Cross-branch comparison for a specific subject within a program.
 * Level 4 of the class-first hierarchy.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const program = request.nextUrl.searchParams.get("program");
    const subject = request.nextUrl.searchParams.get("subject");
    if (!program || !subject) {
      return NextResponse.json(
        { error: "program and subject params required" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const { start: fromDate, end: toDate } = getAcademicWindowUTC(new Date());

    const programRes = await fetch(
      `${FRAPPE_URL}/api/resource/Program/${encodeURIComponent(program)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const programDoc: { courses?: ProgramCourse[] } =
      programRes.ok ? (await programRes.json()).data ?? {} : {};
    const programCourses = new Set(
      (programDoc.courses ?? [])
        .map((item) => item.course?.trim())
        .filter((course): course is string => Boolean(course)),
    );

    if (programCourses.size > 0 && !programCourses.has(subject)) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, health_score: 0 },
      });
    }

    // 1. Get company name map
    const companiesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Company?${new URLSearchParams({
        filters: JSON.stringify([["is_group", "=", 0]]),
        fields: JSON.stringify(["name", "company_name"]),
        limit_page_length: "50",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const companies: { name: string; company_name: string }[] =
      companiesRes.ok ? (await companiesRes.json()).data ?? [] : [];
    const companyNameMap = new Map(companies.map((c) => [c.name, c.company_name]));

    // 2. Batches for this program
    const sgRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Group?${new URLSearchParams({
        filters: JSON.stringify([
          ["program", "=", program],
          ["group_based_on", "=", "Batch"],
          ["disabled", "=", 0],
        ]),
        fields: JSON.stringify(["name", "custom_branch", "batch"]),
        limit_page_length: "200",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const batches: { name: string; custom_branch: string; batch?: string }[] =
      sgRes.ok ? (await sgRes.json()).data ?? [] : [];

    if (batches.length === 0) {
      return NextResponse.json({
        program,
        subject,
        branches: [],
        overall: { total_students: 0, avg_attendance_pct: 0, avg_score_pct: 0, pass_rate: 0, health_score: 0 },
      });
    }

    const batchNames = batches.map((b) => b.name);
    const batchToBranch = new Map(batches.map((b) => [b.name, b.custom_branch]));
    const batchCodeToBranch = new Map(
      batches
        .filter((batch) => batch.batch?.trim() && batch.custom_branch)
        .map((batch) => [batch.batch!.trim(), batch.custom_branch] as const),
    );
    const validBranches = new Set(
      batches.map((batch) => normalize(batch.custom_branch)).filter(Boolean),
    );
    const [membership, activeCourseEnrollments, activeStudents] = await Promise.all([
      getActiveStudentSetsForBatches(auth, batchNames),
      getActiveCourseEnrollmentsForLatestPrograms(auth),
      getActiveStudentsByLatestProgram(auth),
    ]);
    const activeProgramStudents = activeStudents.filter(
      (student) => student.program === program || student.normalized_program === normalizeProgramLabel(program),
    );
    const activeProgramStudentsByBranch = new Map<string, Set<string>>();
    for (const student of activeProgramStudents) {
      const branch =
        batchCodeToBranch.get(student.batch_name?.trim() || "") ??
        student.branch?.trim();
      if (!branch) continue;
      if (!activeProgramStudentsByBranch.has(branch)) {
        activeProgramStudentsByBranch.set(branch, new Set());
      }
      activeProgramStudentsByBranch.get(branch)!.add(student.student);
    }
    const subjectEnrollments = activeCourseEnrollments.filter(
      (row) =>
        (row.program === program || row.normalized_program === normalizeProgramLabel(program)) &&
        row.course === subject,
    );
    const usesProgramPopulation = programCourses.has(subject);

    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["schedule_date", ">=", fromDate],
          ["schedule_date", "<=", toDate],
        ]),
        fields: JSON.stringify(["name", "student_group", "instructor", "instructor_name"]),
        limit_page_length: "5000",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const schedules: {
      name: string;
      student_group: string;
      instructor?: string;
      instructor_name?: string;
    }[] =
      schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];
    const scheduleToBranch = new Map(
      schedules.map((schedule) => [schedule.name, batchToBranch.get(schedule.student_group) ?? ""]),
    );
    const scheduleInstructorIds = [...new Set(
      schedules
        .map((schedule) => schedule.instructor?.trim())
        .filter((instructor): instructor is string => Boolean(instructor)),
    )];
    const instructorsRes = scheduleInstructorIds.length > 0
      ? await fetch(
          `${FRAPPE_URL}/api/resource/Instructor?${new URLSearchParams({
            filters: JSON.stringify([["name", "in", scheduleInstructorIds]]),
            fields: JSON.stringify(["name", "instructor_name", "employee"]),
            limit_page_length: "500",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        )
      : null;
    const instructors: InstructorListRow[] =
      instructorsRes?.ok ? (await instructorsRes.json()).data ?? [] : [];
    const employeeIds = [...new Set(
      instructors
        .map((instructor) => instructor.employee?.trim())
        .filter((employee): employee is string => Boolean(employee)),
    )];
    const employeesRes = employeeIds.length > 0
      ? await fetch(
          `${FRAPPE_URL}/api/resource/Employee?${new URLSearchParams({
            filters: JSON.stringify([["name", "in", employeeIds]]),
            fields: JSON.stringify(["name", "cell_number"]),
            limit_page_length: "500",
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        )
      : null;
    const employees: { name: string; cell_number?: string }[] =
      employeesRes?.ok ? (await employeesRes.json()).data ?? [] : [];
    const instructorMeta = new Map(
      instructors.map((instructor) => [instructor.name, instructor]),
    );
    const employeePhoneMap = new Map(
      employees.map((employee) => [employee.name, employee.cell_number?.trim() || ""]),
    );
    const allInstructorsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Instructor?${new URLSearchParams({
        fields: JSON.stringify(["name", "instructor_name", "employee"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const allInstructors: InstructorListRow[] =
      allInstructorsRes.ok ? (await allInstructorsRes.json()).data ?? [] : [];
    const instructorDocs = await Promise.all(
      allInstructors.map(async (instructor) => {
        const response = await fetch(
          `${FRAPPE_URL}/api/resource/Instructor/${encodeURIComponent(instructor.name)}?${new URLSearchParams({
            fields: JSON.stringify(["name", "instructor_name", "employee", "instructor_log"]),
          })}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (!response.ok) {
          return { ...instructor, instructor_log: [] } satisfies InstructorDoc;
        }
        const payload = await response.json();
        return (payload.data ?? { ...instructor, instructor_log: [] }) as InstructorDoc;
      }),
    );
    const fallbackTeacherAssignments = new Map<string, InstructorListRow[]>();
    for (const instructor of instructorDocs) {
      const logs = instructor.instructor_log ?? [];
      for (const log of logs) {
        if (
          normalize(log.custom_branch) === "" ||
          normalize(log.course) === "" ||
          normalize(log.program) === ""
        ) {
          continue;
        }
        if (
          !validBranches.has(normalize(log.custom_branch))
        ) {
          continue;
        }
        if (
          normalize(log.program) !== normalize(program) ||
          normalize(log.course) !== normalize(subject)
        ) {
          continue;
        }
        const key = normalize(log.custom_branch);
        const existing = fallbackTeacherAssignments.get(key) ?? [];
        if (!existing.some((row) => row.name === instructor.name)) {
          existing.push({
            name: instructor.name,
            instructor_name: instructor.instructor_name,
            employee: instructor.employee,
          });
          fallbackTeacherAssignments.set(key, existing);
        }
      }
    }

    const attendanceRes = await fetch(
      `${FRAPPE_URL}/api/resource/Student%20Attendance?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["date", ">=", fromDate],
          ["date", "<=", toDate],
        ]),
        fields: JSON.stringify(["student", "status", "course_schedule"]),
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const attendanceRecords: { student: string; status: string; course_schedule?: string }[] =
      attendanceRes.ok ? (await attendanceRes.json()).data ?? [] : [];

    // 3. Assessment plans for this subject in these batches
    const plansRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan?${new URLSearchParams({
        filters: JSON.stringify([
          ["student_group", "in", batchNames],
          ["course", "=", subject],
          ["docstatus", "=", 1],
        ]),
        fields: JSON.stringify(["name", "student_group"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const plans: { name: string; student_group: string }[] =
      plansRes.ok ? (await plansRes.json()).data ?? [] : [];

    const planNames = plans.map((p) => p.name);
    const planLookup = new Map(plans.map((p) => [p.name, p]));

    // 4. Results for this subject
    const results: {
      student: string;
      total_score: number;
      maximum_score: number;
      assessment_plan: string;
    }[] = planNames.length > 0
      ? await (async () => {
          const resultsRes = await fetch(
            `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
              filters: JSON.stringify([
                ["assessment_plan", "in", planNames],
                ["docstatus", "=", 1],
              ]),
              fields: JSON.stringify(["student", "total_score", "maximum_score", "assessment_plan"]),
              limit_page_length: "5000",
            })}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          return resultsRes.ok ? (await resultsRes.json()).data ?? [] : [];
        })()
      : [];

    // 5. Aggregate per branch
    const branchData = new Map<
      string,
      {
        scores: number[];
        maxs: number[];
        students: Set<string>;
        attendanceByStudent: Map<string, { p: number; t: number }>;
        teachers: Map<string, string>;
        teacherPhones: Map<string, string>;
      }
    >();
    for (const batch of batches) {
      const branch = batch.custom_branch;
      if (!branchData.has(branch)) {
        branchData.set(branch, {
          scores: [],
          maxs: [],
          students: new Set(),
          attendanceByStudent: new Map(),
          teachers: new Map(),
          teacherPhones: new Map(),
        });
      }
    }
    for (const enrollment of subjectEnrollments) {
      const branch = batchToBranch.get(enrollment.batch_group_name) ?? enrollment.branch;
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, {
          scores: [],
          maxs: [],
          students: new Set(),
          attendanceByStudent: new Map(),
          teachers: new Map(),
          teacherPhones: new Map(),
        });
      }
      branchData.get(branch)!.students.add(enrollment.student);
    }
    for (const schedule of schedules) {
      const branch = batchToBranch.get(schedule.student_group);
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, {
          scores: [],
          maxs: [],
          students: new Set(),
          attendanceByStudent: new Map(),
          teachers: new Map(),
          teacherPhones: new Map(),
        });
      }
      if (schedule.instructor) {
        const data = branchData.get(branch)!;
        const meta = instructorMeta.get(schedule.instructor);
        const instructorName =
          meta?.instructor_name?.trim() ||
          schedule.instructor_name?.trim() ||
          schedule.instructor;
        data.teachers.set(schedule.instructor, instructorName);
        if (meta?.employee) {
          const phone = employeePhoneMap.get(meta.employee) || "";
          if (phone) data.teacherPhones.set(schedule.instructor, phone);
        }
      }
    }
    for (const record of attendanceRecords) {
      const branch = record.course_schedule ? scheduleToBranch.get(record.course_schedule) : undefined;
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, {
          scores: [],
          maxs: [],
          students: new Set(),
          attendanceByStudent: new Map(),
          teachers: new Map(),
          teacherPhones: new Map(),
        });
      }
      const data = branchData.get(branch)!;
      if (!data.attendanceByStudent.has(record.student)) {
        data.attendanceByStudent.set(record.student, { p: 0, t: 0 });
      }
      const stats = data.attendanceByStudent.get(record.student)!;
      stats.t++;
      if (record.status === "Present" || record.status === "Late") stats.p++;
    }
    for (const r of results) {
      const plan = planLookup.get(r.assessment_plan);
      if (!plan) continue;
      const branch = batchToBranch.get(plan.student_group);
      if (!branch) continue;
      if (!branchData.has(branch)) {
        branchData.set(branch, {
          scores: [],
          maxs: [],
          students: new Set(),
          attendanceByStudent: new Map(),
          teachers: new Map(),
          teacherPhones: new Map(),
        });
      }
      branchData.get(branch)!.scores.push(r.total_score);
      branchData.get(branch)!.maxs.push(r.maximum_score);
      const batchStudents = membership.batchStudents.get(plan.student_group) ?? new Set<string>();
      for (const studentId of batchStudents) branchData.get(branch)!.students.add(studentId);
    }
    for (const [branch, data] of branchData.entries()) {
      if (data.teachers.size > 0) continue;
      const fallbackTeachers = fallbackTeacherAssignments.get(normalize(branch)) ?? [];
      for (const teacher of fallbackTeachers) {
        const instructorName = teacher.instructor_name?.trim() || teacher.name;
        data.teachers.set(teacher.name, instructorName);
        if (teacher.employee) {
          const phone = employeePhoneMap.get(teacher.employee) || "";
          if (phone) data.teacherPhones.set(teacher.name, phone);
        }
      }
    }

    const branchResults = Array.from(branchData.entries())
      .map(([branch, d]) => {
        const total = d.scores.length;
        const maxPossible = d.maxs.length > 0 ? Math.max(...d.maxs) : 0;
        const avgScore = total > 0 ? d.scores.reduce((a, b) => a + b, 0) / total : 0;
        const avgPct =
          maxPossible > 0 ? Math.round((avgScore / maxPossible) * 1000) / 10 : 0;
        const attendanceValues = Array.from(d.attendanceByStudent.values());
        const attendancePct =
          attendanceValues.length > 0
            ? Math.round(
                (attendanceValues.reduce((sum, value) => sum + (value.t > 0 ? (value.p / value.t) * 100 : 0), 0) /
                  attendanceValues.length) *
                  10,
              ) / 10
            : 0;
        const passed = d.scores.filter(
          (s, i) => d.maxs[i] > 0 && (s / d.maxs[i]) * 100 >= 33,
        ).length;
        const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
        const healthScore = Math.round(attendancePct * 0.4 + avgPct * 0.35 + passRate * 0.25);
        return {
          branch,
          branch_name: companyNameMap.get(branch) ?? branch,
          total_students: usesProgramPopulation
            ? (activeProgramStudentsByBranch.get(branch)?.size ?? d.students.size)
            : d.students.size,
          avg_attendance_pct: attendancePct,
          avg_score_pct: avgPct,
          pass_rate: passRate,
          avg_score: Math.round(avgScore * 10) / 10,
          maximum_possible: maxPossible,
          health_score: healthScore,
          teachers: Array.from(d.teachers.entries())
            .map(([instructor, instructor_name]) => ({
              instructor,
              instructor_name,
              employee: instructorMeta.get(instructor)?.employee,
              phone: d.teacherPhones.get(instructor) || undefined,
            }))
            .sort((a, b) => a.instructor_name.localeCompare(b.instructor_name)),
        };
      })
      .sort((a, b) => b.health_score - a.health_score || b.avg_score_pct - a.avg_score_pct);

    const allPcts = results
      .filter((r) => r.maximum_score > 0)
      .map((r) => (r.total_score / r.maximum_score) * 100);
    const allAttendancePcts = Array.from(branchData.values()).flatMap((data) =>
      Array.from(data.attendanceByStudent.values()).map((value) =>
        value.t > 0 ? (value.p / value.t) * 100 : 0,
      ),
    );
    const overallAttendance =
      allAttendancePcts.length > 0
        ? Math.round((allAttendancePcts.reduce((sum, value) => sum + value, 0) / allAttendancePcts.length) * 10) / 10
        : 0;
    const overallPassRate =
      allPcts.length > 0
        ? Math.round((allPcts.filter((p) => p >= 33).length / allPcts.length) * 1000) / 10
        : 0;
    const allSubjectStudents = new Set<string>();
    for (const enrollment of subjectEnrollments) allSubjectStudents.add(enrollment.student);
    const overall = {
      total_students: usesProgramPopulation ? activeProgramStudents.length : allSubjectStudents.size,
      avg_attendance_pct: overallAttendance,
      avg_score_pct:
        allPcts.length > 0
          ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
          : 0,
      pass_rate: overallPassRate,
      health_score: Math.round(overallAttendance * 0.4 + (allPcts.length > 0
        ? Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10
        : 0) * 0.35 + overallPassRate * 0.25),
    };

    return NextResponse.json({ program, subject, branches: branchResults, overall });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[analytics/subject-branches] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
