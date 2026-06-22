import type {
  MentorFeedback,
  MentorProfile,
  MentorStudentAssignment,
  MentorStudentDetail,
  MentorStudentSummary,
  SystemMentorSummary,
} from "@/lib/types/mentor";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

type StudentRow = {
  name: string;
  student_name: string;
  custom_branch?: string;
  student_mobile_number?: string;
  student_email_id?: string;
  custom_parent_name?: string;
  joining_date?: string;
  custom_student_type?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  customer?: string;
};

type ProgramEnrollmentRow = {
  name?: string;
  student: string;
  program?: string;
  academic_year?: string;
  student_batch_name?: string;
  custom_fee_structure?: string;
  custom_plan?: string;
};

type GuardianLinkRow = {
  name: string;
  guardian?: string;
  guardian_name?: string;
  relation?: string;
};

type GuardianRow = {
  name: string;
  guardian_name?: string;
  mobile_number?: string;
  email_address?: string;
};

type InvoiceRow = {
  name: string;
  customer?: string;
  due_date?: string;
  posting_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
};

type StudentLeaveApplicationRow = {
  name: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  reason?: string;
  docstatus?: number;
};

export function normalize(value?: string): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function fetchMentorProfiles(branch?: string): Promise<MentorProfile[]> {
  const filters: unknown[] = [];
  if (branch) filters.push(["branch", "=", branch]);
  const res = await frappeAdminGet("resource/Mentor Profile", {
    fields: JSON.stringify([
      "name",
      "mentor_name",
      "employee",
      "user_id",
      "branch",
      "status",
      "max_student_limit",
      "remarks",
      "creation",
      "modified",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: "500",
    order_by: "mentor_name asc",
  });
  return (res.data ?? []) as MentorProfile[];
}

export async function fetchMentorAssignments(params?: {
  branch?: string;
  mentorUser?: string;
  student?: string;
  status?: string;
}): Promise<MentorStudentAssignment[]> {
  const filters: unknown[] = [];
  if (params?.branch) filters.push(["branch", "=", params.branch]);
  if (params?.mentorUser) filters.push(["mentor_user", "=", params.mentorUser]);
  if (params?.status) filters.push(["status", "=", params.status]);

  const res = await frappeAdminGet("resource/Mentor Student Assignment", {
    fields: JSON.stringify([
      "name",
      "mentor_profile",
      "mentor_user",
      "branch",
      "assigned_by",
      "assigned_on",
      "status",
      "notes",
      "creation",
      "modified",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: "1000",
    order_by: "modified desc",
  });

  const parents = (res.data ?? []) as Array<{
    name: string;
    mentor_profile: string;
    mentor_user: string;
    branch: string;
    assigned_by: string;
    assigned_on?: string;
    status: string;
    notes?: string;
    creation: string;
    modified: string;
  }>;
  if (parents.length === 0) return [];

  // Fetch full parent documents in parallel to get their child tables
  const parentDetails = await Promise.all(
    parents.map((p) => frappeAdminGet(`resource/Mentor Student Assignment/${encodeURIComponent(p.name)}`))
  );

  const flattened: MentorStudentAssignment[] = [];
  for (const detail of parentDetails) {
    const doc = detail.data as {
      name: string;
      mentor_profile: string;
      mentor_user: string;
      branch: string;
      assigned_by: string;
      assigned_on?: string;
      status: string;
      notes?: string;
      creation: string;
      modified: string;
      students?: Array<{
        name: string;
        student: string;
        status: string;
        assigned_on?: string;
        notes?: string;
      }>;
    } | undefined;
    if (!doc) continue;

    const students = doc.students || [];
    for (const c of students) {
      if (params?.student && c.student !== params.student) continue;
      if (params?.status && c.status !== params.status) continue;

      flattened.push({
        name: c.name,
        student: c.student,
        student_name: "",
        mentor_profile: doc.mentor_profile,
        mentor_user: doc.mentor_user,
        branch: doc.branch,
        assigned_by: doc.assigned_by,
        assigned_on: c.assigned_on || doc.assigned_on,
        status: (c.status === "Active" && doc.status === "Active") ? "Active" : "Inactive",
        notes: c.notes || doc.notes,
        creation: doc.creation,
        modified: doc.modified,
      });
    }
  }

  return flattened;
}

export async function fetchMentorFeedback(params?: {
  branch?: string;
  mentorUser?: string;
  student?: string;
}): Promise<MentorFeedback[]> {
  const filters: unknown[] = [];
  if (params?.branch) filters.push(["branch", "=", params.branch]);
  if (params?.mentorUser) filters.push(["mentor_user", "=", params.mentorUser]);
  if (params?.student) filters.push(["student", "=", params.student]);
  const res = await frappeAdminGet("resource/Mentor Feedback", {
    fields: JSON.stringify([
      "name",
      "student",
      "mentor_profile",
      "mentor_user",
      "branch",
      "contact_person",
      "contact_number",
      "call_datetime",
      "call_status",
      "discussion_category",
      "academic_notes",
      "fee_notes",
      "contact_notes",
      "overall_feedback",
      "next_followup_date",
      "priority",
      "action_required",
      "creation",
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: "1000",
    order_by: "call_datetime desc, creation desc",
  });

  const feedbackList = (res.data ?? []) as MentorFeedback[];
  if (!feedbackList.length) return [];

  const studentIds = [...new Set(feedbackList.map((f) => f.student).filter(Boolean))];
  const mentorProfileIds = [...new Set(feedbackList.map((f) => f.mentor_profile).filter(Boolean))];
  const studentRes = await frappeAdminGet("resource/Student", {
    fields: JSON.stringify(["name", "student_name", "custom_student_type"]),
    filters: JSON.stringify([["name", "in", studentIds]]),
    limit_page_length: String(studentIds.length + 10),
  });
  const students = (studentRes.data ?? []) as Array<{ name: string; student_name: string; custom_student_type?: string }>;
  const studentMap = new Map(students.map((s) => [s.name, s]));

  const mentorProfileMap = new Map<string, { mentor_name?: string; user_id?: string }>();
  if (mentorProfileIds.length) {
    const mentorRes = await frappeAdminGet("resource/Mentor Profile", {
      fields: JSON.stringify(["name", "mentor_name", "user_id"]),
      filters: JSON.stringify([["name", "in", mentorProfileIds]]),
      limit_page_length: String(mentorProfileIds.length + 10),
    });

    for (const row of (mentorRes.data ?? []) as Array<{ name: string; mentor_name?: string; user_id?: string }>) {
      if (row.name) {
        mentorProfileMap.set(row.name, row);
      }
    }
  }

  const programRes = await frappeAdminGet("resource/Program Enrollment", {
    fields: JSON.stringify(["student", "program", "custom_plan"]),
    filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
    limit_page_length: String(studentIds.length * 3),
    order_by: "enrollment_date desc, creation desc",
  });
  const programMap = new Map<string, { program?: string; custom_plan?: string }>();
  for (const row of (programRes.data ?? []) as Array<{ student: string; program?: string; custom_plan?: string }>) {
    if (row.student && !programMap.has(row.student)) {
      programMap.set(row.student, row);
    }
  }

  const studentAttendanceMap = new Map<string, { present: number; total: number }>();
  if (studentIds.length > 0) {
    const attendanceRes = await frappeAdminGet("resource/Student Attendance", {
      fields: JSON.stringify(["student", "status"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
      limit_page_length: String(studentIds.length * 100),
    });

    for (const row of (attendanceRes.data ?? []) as Array<{ student: string; status: string }>) {
      if (!row.student) continue;
      const stats = studentAttendanceMap.get(row.student) ?? { present: 0, total: 0 };
      stats.total++;
      if (row.status === "Present" || row.status === "Late") {
        stats.present++;
      }
      studentAttendanceMap.set(row.student, stats);
    }
  }

  const studentScoreMap = new Map<string, { totalScore: number; totalMax: number }>();
  if (studentIds.length > 0) {
    const assessmentRes = await frappeAdminGet("resource/Assessment Result", {
      fields: JSON.stringify(["student", "total_score", "maximum_score"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
      limit_page_length: String(studentIds.length * 100),
    });

    for (const row of (assessmentRes.data ?? []) as Array<{ student: string; total_score: number; maximum_score: number }>) {
      if (!row.student) continue;
      const stats = studentScoreMap.get(row.student) ?? { totalScore: 0, totalMax: 0 };
      stats.totalScore += Number(row.total_score || 0);
      stats.totalMax += Number(row.maximum_score || 0);
      studentScoreMap.set(row.student, stats);
    }
  }

  return feedbackList.map((f) => {
    const student = studentMap.get(f.student);
    const prog = programMap.get(f.student);
    const mentor = mentorProfileMap.get(f.mentor_profile);
    const attendance = studentAttendanceMap.get(f.student);
    const score = studentScoreMap.get(f.student);
    return {
      ...f,
      student_name: student?.student_name || f.student,
      mentor_name: mentor?.mentor_name,
      student_type: student?.custom_student_type,
      program: prog?.program,
      custom_plan: prog?.custom_plan,
      attendance_pct: !attendance || attendance.total === 0 ? null : Math.round((attendance.present / attendance.total) * 100),
      average_score: !score || score.totalMax === 0 ? null : Math.round((score.totalScore / score.totalMax) * 100),
    };
  });
}

export async function buildMentorStudentSummaries(
  assignments: MentorStudentAssignment[],
): Promise<MentorStudentSummary[]> {
  if (!assignments.length) return [];

  const studentIds = [...new Set(assignments.map((row) => row.student).filter(Boolean))];
  const studentRes = await frappeAdminGet("resource/Student", {
    fields: JSON.stringify([
      "name",
      "student_name",
      "custom_branch",
      "student_mobile_number",
      "student_email_id",
      "custom_parent_name",
      "joining_date",
      "custom_student_type",
      "address_line_1",
      "city",
      "state",
      "pincode",
      "customer",
    ]),
    filters: JSON.stringify([["name", "in", studentIds]]),
    limit_page_length: String(studentIds.length + 10),
  });
  const students = (studentRes.data ?? []) as StudentRow[];
  const studentMap = new Map(students.map((row) => [row.name, row]));

  const guardianLinkRes = await frappeAdminGet("resource/Student", {
    fields: JSON.stringify(["name", "guardians.guardian", "guardians.guardian_name", "guardians.relation"]),
    filters: JSON.stringify([["name", "in", studentIds]]),
    limit_page_length: String(studentIds.length * 3),
  });
  const guardianLinks = (guardianLinkRes.data ?? []) as GuardianLinkRow[];
  const studentGuardianMap = new Map<string, GuardianLinkRow>();
  const guardianIds: string[] = [];
  for (const row of guardianLinks) {
    if (!row.name || !row.guardian || studentGuardianMap.has(row.name)) continue;
    studentGuardianMap.set(row.name, row);
    guardianIds.push(row.guardian);
  }

  const guardianMap = new Map<string, GuardianRow>();
  if (guardianIds.length > 0) {
    const guardianRes = await frappeAdminGet("resource/Guardian", {
      fields: JSON.stringify(["name", "guardian_name", "mobile_number", "email_address"]),
      filters: JSON.stringify([["name", "in", guardianIds]]),
      limit_page_length: String(guardianIds.length + 5),
    });
    for (const row of (guardianRes.data ?? []) as GuardianRow[]) {
      guardianMap.set(row.name, row);
    }
  }

  const programRes = await frappeAdminGet("resource/Program Enrollment", {
    fields: JSON.stringify(["student", "program", "academic_year", "student_batch_name", "custom_fee_structure", "custom_plan"]),
    filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
    limit_page_length: String(studentIds.length * 3),
    order_by: "enrollment_date desc, creation desc",
  });
  const programMap = new Map<string, ProgramEnrollmentRow>();
  for (const row of (programRes.data ?? []) as ProgramEnrollmentRow[]) {
    if (row.student && !programMap.has(row.student)) {
      programMap.set(row.student, row);
    }
  }

  const customers = [...new Set(students.map((row) => row.customer).filter(Boolean))] as string[];
  const invoiceMap = new Map<string, InvoiceRow[]>();
  if (customers.length > 0) {
    const invoiceRes = await frappeAdminGet("resource/Sales Invoice", {
      fields: JSON.stringify(["name", "customer", "due_date", "posting_date", "grand_total", "outstanding_amount", "status"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["customer", "in", customers]]),
      limit_page_length: String(customers.length * 20),
      order_by: "due_date asc, creation asc",
    });
    for (const row of (invoiceRes.data ?? []) as InvoiceRow[]) {
      const customer = row.customer || "";
      if (!customer) continue;
      const list = invoiceMap.get(customer) ?? [];
      list.push(row);
      invoiceMap.set(customer, list);
    }
  }

  const feedback = await fetchMentorFeedback({});
  const latestFeedbackMap = new Map<string, MentorFeedback>();
  for (const row of feedback) {
    if (row.student && !latestFeedbackMap.has(row.student)) {
      latestFeedbackMap.set(row.student, row);
    }
  }

  // Fetch Student Attendance for these students to calculate attendance percentage
  const studentAttendanceMap = new Map<string, { present: number; total: number }>();
  if (studentIds.length > 0) {
    const attendanceRes = await frappeAdminGet("resource/Student Attendance", {
      fields: JSON.stringify(["student", "status"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
      limit_page_length: String(studentIds.length * 100),
    });
    for (const row of (attendanceRes.data ?? []) as Array<{ student: string; status: string }>) {
      if (!row.student) continue;
      const stats = studentAttendanceMap.get(row.student) ?? { present: 0, total: 0 };
      stats.total++;
      if (row.status === "Present" || row.status === "Late") {
        stats.present++;
      }
      studentAttendanceMap.set(row.student, stats);
    }
  }

  // Fetch Assessment Results for these students to calculate average score percentage
  const studentScoreMap = new Map<string, { totalScore: number; totalMax: number }>();
  if (studentIds.length > 0) {
    const assessmentRes = await frappeAdminGet("resource/Assessment Result", {
      fields: JSON.stringify(["student", "total_score", "maximum_score"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["student", "in", studentIds]]),
      limit_page_length: String(studentIds.length * 100),
    });
    for (const row of (assessmentRes.data ?? []) as Array<{ student: string; total_score: number; maximum_score: number }>) {
      if (!row.student) continue;
      const stats = studentScoreMap.get(row.student) ?? { totalScore: 0, totalMax: 0 };
      stats.totalScore += Number(row.total_score || 0);
      stats.totalMax += Number(row.maximum_score || 0);
      studentScoreMap.set(row.student, stats);
    }
  }

  return assignments.map((assignment) => {
    const student = studentMap.get(assignment.student);
    const guardianLink = studentGuardianMap.get(assignment.student);
    const guardian = guardianLink?.guardian ? guardianMap.get(guardianLink.guardian) : undefined;
    const program = programMap.get(assignment.student);
    const invoices = invoiceMap.get(student?.customer || "") ?? [];
    const totalInvoiced = invoices.reduce((sum, row) => sum + Number(row.grand_total ?? 0), 0);
    const outstanding = invoices.reduce((sum, row) => sum + Number(row.outstanding_amount ?? 0), 0);

    return {
      assignment,
      student: {
        id: assignment.student,
        name: student?.student_name || assignment.student_name,
        branch: student?.custom_branch || assignment.branch,
        mobile: student?.student_mobile_number,
        email: student?.student_email_id,
        parent_name: guardian?.guardian_name || guardianLink?.guardian_name || student?.custom_parent_name,
        parent_mobile: guardian?.mobile_number,
        address: [student?.address_line_1, student?.city, student?.state, student?.pincode].filter(Boolean).join(", "),
        joining_date: student?.joining_date,
        student_type: student?.custom_student_type,
      },
      academic: {
        program: program?.program,
        academic_year: program?.academic_year,
        batch: program?.student_batch_name,
        program_enrollment: program?.name,
        average_score: (() => {
          const score = studentScoreMap.get(assignment.student);
          if (!score || score.totalMax === 0) return null;
          return Math.round((score.totalScore / score.totalMax) * 100);
        })(),
        attendance_pct: (() => {
          const att = studentAttendanceMap.get(assignment.student);
          if (!att || att.total === 0) return null;
          return Math.round((att.present / att.total) * 100);
        })(),
      },
      fees: {
        custom_plan: program?.custom_plan,
        fee_structure: program?.custom_fee_structure,
        total_invoiced: totalInvoiced,
        outstanding,
        invoice_count: invoices.length,
      },
      latest_feedback: latestFeedbackMap.get(assignment.student) ?? null,
    };
  });
}

export async function buildMentorStudentDetail(
  assignment: MentorStudentAssignment,
): Promise<MentorStudentDetail> {
  const [summary] = await buildMentorStudentSummaries([assignment]);
  const studentRes = await frappeAdminGet(`resource/Student/${encodeURIComponent(assignment.student)}`);
  const studentDoc = (studentRes.data ?? {}) as {
    guardians?: Array<{ guardian?: string; guardian_name?: string; relation?: string }>;
    customer?: string;
  };

  const guardianIds = (studentDoc.guardians ?? []).map((row) => row.guardian).filter(Boolean) as string[];
  const guardianMap = new Map<string, GuardianRow>();
  if (guardianIds.length > 0) {
    const guardianRes = await frappeAdminGet("resource/Guardian", {
      fields: JSON.stringify(["name", "guardian_name", "mobile_number", "email_address"]),
      filters: JSON.stringify([["name", "in", guardianIds]]),
      limit_page_length: String(guardianIds.length + 5),
    });
    for (const row of (guardianRes.data ?? []) as GuardianRow[]) {
      guardianMap.set(row.name, row);
    }
  }

  const invoiceRes = studentDoc.customer
    ? await frappeAdminGet("resource/Sales Invoice", {
        fields: JSON.stringify(["name", "due_date", "posting_date", "grand_total", "outstanding_amount", "status"]),
        filters: JSON.stringify([["docstatus", "=", 1], ["customer", "=", studentDoc.customer]]),
        limit_page_length: "100",
        order_by: "due_date asc, creation asc",
      })
    : { data: [] };

  const feedback = await fetchMentorFeedback({ student: assignment.student });

  const leaveApplicationsRes = await frappeAdminGet("resource/Student Leave Application", {
    fields: JSON.stringify(["name", "from_date", "to_date", "total_leave_days", "reason", "docstatus"]),
    filters: JSON.stringify([["student", "=", assignment.student], ["docstatus", "!=", 2]]),
    limit_page_length: "100",
    order_by: "from_date desc, creation desc",
  });

  // Fetch Attendance Records
  const attendanceRes = await frappeAdminGet("resource/Student Attendance", {
    fields: JSON.stringify(["name", "status", "date", "student_group"]),
    filters: JSON.stringify([["student", "=", assignment.student], ["docstatus", "=", 1]]),
    limit_page_length: "1000",
    order_by: "date desc",
  });
  const attendance = (attendanceRes.data ?? []).map((row: any) => ({
    name: row.name,
    status: row.status,
    date: row.date,
    student_group: row.student_group,
  }));

  // Fetch Assessment Results
  const examsRes = await frappeAdminGet("resource/Assessment Result", {
    fields: JSON.stringify(["name", "course", "assessment_plan", "total_score", "maximum_score", "grade", "assessment_group"]),
    filters: JSON.stringify([["student", "=", assignment.student], ["docstatus", "=", 1]]),
    limit_page_length: "100",
    order_by: "creation desc",
  });
  const rawExams = (examsRes.data ?? []) as any[];

  // Enrich Assessment Plans
  const planNames = [...new Set(rawExams.map((r) => r.assessment_plan).filter(Boolean))];
  const planDataMap = new Map<string, { schedule_date?: string; assessment_name?: string }>();
  if (planNames.length > 0) {
    const plansRes = await frappeAdminGet("resource/Assessment Plan", {
      fields: JSON.stringify(["name", "schedule_date", "assessment_name"]),
      filters: JSON.stringify([["name", "in", planNames]]),
      limit_page_length: String(planNames.length + 5),
    });
    for (const p of (plansRes.data ?? []) as any[]) {
      planDataMap.set(p.name, p);
    }
  }

  const exams = rawExams.map((r) => {
    const plan = planDataMap.get(r.assessment_plan);
    return {
      name: r.name,
      course: r.course,
      assessment_plan: r.assessment_plan,
      total_score: Number(r.total_score || 0),
      maximum_score: Number(r.maximum_score || 0),
      grade: r.grade,
      assessment_group: r.assessment_group,
      schedule_date: plan?.schedule_date,
      assessment_name: plan?.assessment_name,
    };
  });

  return {
    ...summary,
    guardians: (studentDoc.guardians ?? []).map((row) => {
      const guardian = row.guardian ? guardianMap.get(row.guardian) : undefined;
      return {
        guardian: row.guardian,
        guardian_name: guardian?.guardian_name || row.guardian_name,
        relation: row.relation,
        mobile_number: guardian?.mobile_number,
        email_address: guardian?.email_address,
      };
    }),
    invoices: (invoiceRes.data ?? []).map((row: InvoiceRow) => ({
      name: row.name,
      due_date: row.due_date,
      posting_date: row.posting_date,
      grand_total: Number(row.grand_total ?? 0),
      outstanding_amount: Number(row.outstanding_amount ?? 0),
      status: row.status,
    })),
    leave_applications: (leaveApplicationsRes.data ?? []).map((row: StudentLeaveApplicationRow) => ({
      name: row.name,
      from_date: row.from_date,
      to_date: row.to_date,
      total_leave_days: Number(row.total_leave_days ?? 0),
      reason: row.reason,
      status: row.docstatus === 1 ? "Approved" : "Draft",
    })),
    feedback,
    exams,
    attendance,
  };
}

export async function buildMentorSummary(branch?: string): Promise<SystemMentorSummary> {
  const [mentors, assignments, feedback, studentCountRes] = await Promise.all([
    fetchMentorProfiles(branch),
    fetchMentorAssignments(branch ? { branch, status: "Active" } : { status: "Active" }),
    fetchMentorFeedback(branch ? { branch } : {}),
    frappeAdminGet("method/frappe.client.get_count", {
      doctype: "Student",
      filters: branch ? JSON.stringify({ custom_branch: branch, enabled: "1" }) : JSON.stringify({ enabled: "1" }),
    }),
  ]);

  const totalActiveStudents = Number(studentCountRes?.message ?? 0);
  const activeMentors = mentors.filter((m) => m.status === "Active");
  
  const nowStr = new Date().toISOString().slice(0, 10);
  let pendingFollowUps = 0;
  
  // To find students without recent logs, we need to know the latest feedback date per student
  const latestFeedbackMap = new Map<string, string>();
  for (const f of feedback) {
    if (f.student) {
      if (!latestFeedbackMap.has(f.student)) {
        latestFeedbackMap.set(f.student, f.call_datetime);
      } else {
        const existing = latestFeedbackMap.get(f.student)!;
        if (f.call_datetime > existing) {
          latestFeedbackMap.set(f.student, f.call_datetime);
        }
      }
    }
    if (f.next_followup_date && f.next_followup_date <= nowStr) {
      // Need to count per student or per feedback? Pending followups are usually per student.
      // But multiple feedbacks might have a pending followup date. We can just check the latest feedback.
    }
  }

  // Proper pending followups calculation: based on the latest feedback of active assignments
  let studentsWithoutRecentLog = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const assignmentFeedbackMap = new Map<string, MentorFeedback>();
  for (const f of feedback) {
    if (f.student && !assignmentFeedbackMap.has(f.student)) {
      assignmentFeedbackMap.set(f.student, f);
    }
  }

  for (const a of assignments) {
    const fb = assignmentFeedbackMap.get(a.student);
    if (!fb) {
      studentsWithoutRecentLog++;
    } else {
      if (fb.call_datetime < thirtyDaysAgoStr) {
        studentsWithoutRecentLog++;
      }
      if (fb.next_followup_date && fb.next_followup_date <= nowStr) {
        pendingFollowUps++;
      }
    }
  }

  const studentsWithoutMentor = Math.max(0, totalActiveStudents - assignments.length);

  // Aggregations
  const branchMap = new Map<string, { mentorCount: number; assignedCount: number }>();
  for (const m of activeMentors) {
    const b = m.branch || "Unknown";
    const current = branchMap.get(b) || { mentorCount: 0, assignedCount: 0 };
    current.mentorCount++;
    branchMap.set(b, current);
  }
  for (const a of assignments) {
    const b = a.branch || "Unknown";
    const current = branchMap.get(b) || { mentorCount: 0, assignedCount: 0 };
    current.assignedCount++;
    branchMap.set(b, current);
  }

  const branchWiseSummary = Array.from(branchMap.entries()).map(([bName, stats]) => ({
    branch: bName,
    mentorCount: stats.mentorCount,
    assignedCount: stats.assignedCount,
    averageLoad: stats.mentorCount > 0 ? Math.round(stats.assignedCount / stats.mentorCount) : 0,
  }));

  const mentorLoadComparison = activeMentors.map((m) => {
    const mAssignments = assignments.filter((a) => a.mentor_profile === m.name).length;
    const mFeedbackCount = feedback.filter((f) => f.mentor_profile === m.name).length;
    let mPending = 0;
    
    // Calculate pending followups for this specific mentor
    const mStudents = assignments.filter((a) => a.mentor_profile === m.name).map((a) => a.student);
    for (const sid of mStudents) {
      const fb = assignmentFeedbackMap.get(sid);
      if (fb && fb.mentor_profile === m.name && fb.next_followup_date && fb.next_followup_date <= nowStr) {
        mPending++;
      }
    }

    return {
      mentorName: m.mentor_name,
      branch: m.branch,
      assignedStudents: mAssignments,
      capacity: m.max_student_limit || 100,
      pendingFollowUps: mPending,
      feedbackCount: mFeedbackCount,
    };
  });

  return {
    totalMentors: activeMentors.length,
    totalAssignedStudents: assignments.length,
    averageStudentsPerMentor: activeMentors.length > 0 ? Math.round(assignments.length / activeMentors.length) : 0,
    pendingFollowUps,
    studentsWithoutMentor,
    studentsWithoutRecentLog,
    branchWiseSummary,
    mentorLoadComparison,
  };
}
