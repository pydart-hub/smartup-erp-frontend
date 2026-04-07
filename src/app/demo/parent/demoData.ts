// ── Demo sample data for Parent Portal ──────────────────────────
// All data is static/fake. No API calls.

export const DEMO_PARENT = {
  name: "Ramesh Kumar",
  email: "ramesh.kumar@example.com",
  phone: "+91 98765 43210",
};

export interface DemoChild {
  id: string;
  name: string;
  studentId: string;
  class: string;
  branch: string;
  branchAbbr: string;
  batch: string;
  academicYear: string;
  joiningDate: string;
  isSibling: boolean;
  feePlan: string;
  feeStructure: string;
  email: string;
  mobile: string;
}

export const DEMO_CHILDREN: DemoChild[] = [
  {
    id: "STU-SU-CHL-26-00101",
    name: "Akhil Kumar",
    studentId: "STU-SU-CHL-26-00101",
    class: "10th Grade",
    branch: "Smart Up Chullickal",
    branchAbbr: "CHL",
    batch: "CHL-26",
    academicYear: "2025-2026",
    joiningDate: "2025-06-01",
    isSibling: false,
    feePlan: "Quarterly",
    feeStructure: "10th Grade - CHL - Quarterly",
    email: "akhil.k@smartup.com",
    mobile: "+91 98765 43211",
  },
];

export interface DemoAttendanceRecord {
  date: string;
  status: "Present" | "Absent" | "Late";
  studentId: string;
}

function generateAttendance(studentId: string, seed: number): DemoAttendanceRecord[] {
  const records: DemoAttendanceRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Go back ~50 calendar days (~1.2 months of school days, skipping Sundays)
  const start = new Date(today);
  start.setDate(today.getDate() - 50);
  let dayIndex = 0;
  for (let cur = new Date(start); cur <= today; cur.setDate(cur.getDate() + 1)) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek === 0) continue; // skip Sundays
    const hash = (dayIndex * 7 + seed) % 20;
    let status: "Present" | "Absent" | "Late";
    if (hash < 18) status = "Present";
    else if (hash < 19) status = "Late";  // 1 slot in 20 → ~1 late over 1.2 months
    else status = "Absent"; // 1 slot in 20 → ~2 absences over 1.2 months
    records.push({
      date: cur.toISOString().split("T")[0],
      status,
      studentId,
    });
    dayIndex++;
  }
  return records;
}

export const DEMO_ATTENDANCE: Record<string, DemoAttendanceRecord[]> = {
  [DEMO_CHILDREN[0].id]: generateAttendance(DEMO_CHILDREN[0].id, 3),
};

export interface DemoFeeInstalment {
  id: string;
  label: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: "paid" | "partially-paid" | "overdue" | "upcoming";
}

export interface DemoFeeData {
  studentId: string;
  orderId: string;
  totalFee: number;
  totalPaid: number;
  instalments: DemoFeeInstalment[];
  payments: { date: string; amount: number; mode: string; reference: string }[];
}

export const DEMO_FEES: DemoFeeData[] = [
  {
    studentId: DEMO_CHILDREN[0].id,
    orderId: "SO-SU-2526-001",
    totalFee: 24000,
    totalPaid: 18000,
    instalments: [
      { id: "INV-001", label: "Q1 (Jun–Aug 2025)", dueDate: "2025-06-15", amount: 6000, paid: 6000, status: "paid" },
      { id: "INV-002", label: "Q2 (Sep–Nov 2025)", dueDate: "2025-09-15", amount: 6000, paid: 6000, status: "paid" },
      { id: "INV-003", label: "Q3 (Dec–Feb 2026)", dueDate: "2025-12-15", amount: 6000, paid: 6000, status: "paid" },
      { id: "INV-004", label: "Q4 (Mar–May 2026)", dueDate: "2026-03-15", amount: 6000, paid: 0, status: "overdue" },
    ],
    payments: [
      { date: "2025-06-14", amount: 6000, mode: "Online", reference: "RZP-001" },
      { date: "2025-09-12", amount: 6000, mode: "Online", reference: "RZP-002" },
      { date: "2025-12-14", amount: 6000, mode: "UPI",    reference: "UPI-003" },
    ],
  },
];

export interface DemoComplaint {
  id: string;
  subject: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Review" | "Resolved" | "Closed";
  description: string;
  student: string;
  studentName: string;
  createdAt: string;
  resolutionNotes?: string;
  resolvedBy?: string;
}

export const DEMO_COMPLAINTS: DemoComplaint[] = [
  {
    id: "CMP-001",
    subject: "Bus timing is inconsistent",
    category: "Transport",
    priority: "High",
    status: "In Review",
    description: "The school bus has been arriving 15-20 minutes late for the past week. My child has been missing the first class regularly.",
    student: DEMO_CHILDREN[0].id,
    studentName: DEMO_CHILDREN[0].name,
    createdAt: "2026-03-28",
  },
  {
    id: "CMP-002",
    subject: "Request for extra math classes",
    category: "Academic",
    priority: "Medium",
    status: "Resolved",
    description: "Akhil needs additional support in mathematics. Could you please arrange extra coaching sessions?",
    student: DEMO_CHILDREN[0].id,
    studentName: DEMO_CHILDREN[0].name,
    createdAt: "2026-02-15",
    resolutionNotes: "Extra math coaching has been arranged every Tuesday and Thursday after regular hours. Started from March 1st.",
    resolvedBy: "Mrs. Priya (Branch Manager)",
  },
];

// ── Helpers ──
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAttendanceStats(records: DemoAttendanceRecord[]) {
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const late = records.filter((r) => r.status === "Late").length;
  const total = records.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { present, absent, late, total, pct };
}

// ── Exam Marks ──────────────────────────────────────────────────

export interface DemoExamSubjectMark {
  subject: string;
  maxMarks: number;
  obtained: number;
}

export interface DemoExam {
  id: string;
  name: string;       // e.g. "Unit Test 1", "Mid Term"
  type: "Unit Test" | "Mid Term" | "Final";
  date: string;
  studentId: string;
  subjects: DemoExamSubjectMark[];
  totalMax: number;
  totalObtained: number;
  percentage: number;
  grade: string;
}

function calcGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}

function makeExam(
  id: string, name: string, type: DemoExam["type"], date: string,
  studentId: string, subjects: DemoExamSubjectMark[]
): DemoExam {
  const totalMax = subjects.reduce((s, sub) => s + sub.maxMarks, 0);
  const totalObtained = subjects.reduce((s, sub) => s + sub.obtained, 0);
  const percentage = Math.round((totalObtained / totalMax) * 100);
  return { id, name, type, date, studentId, subjects, totalMax, totalObtained, percentage, grade: calcGrade(percentage) };
}

// Akhil Kumar — 10th Grade (6 subjects)
const AKHIL_SUBJECTS_10 = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"];

export const DEMO_EXAMS: DemoExam[] = [
  // ── Akhil Kumar — 10th Grade ──
  makeExam("EX-001", "Unit Test 1", "Unit Test", "2025-07-25", DEMO_CHILDREN[0].id, [
    { subject: "Mathematics", maxMarks: 50, obtained: 42 },
    { subject: "Science", maxMarks: 50, obtained: 38 },
    { subject: "English", maxMarks: 50, obtained: 44 },
    { subject: "Hindi", maxMarks: 50, obtained: 35 },
    { subject: "Social Science", maxMarks: 50, obtained: 40 },
    { subject: "Computer Science", maxMarks: 50, obtained: 46 },
  ]),
  makeExam("EX-002", "Unit Test 2", "Unit Test", "2025-09-20", DEMO_CHILDREN[0].id, [
    { subject: "Mathematics", maxMarks: 50, obtained: 44 },
    { subject: "Science", maxMarks: 50, obtained: 41 },
    { subject: "English", maxMarks: 50, obtained: 43 },
    { subject: "Hindi", maxMarks: 50, obtained: 37 },
    { subject: "Social Science", maxMarks: 50, obtained: 42 },
    { subject: "Computer Science", maxMarks: 50, obtained: 48 },
  ]),
  makeExam("EX-003", "Mid Term", "Mid Term", "2025-11-15", DEMO_CHILDREN[0].id, [
    { subject: "Mathematics", maxMarks: 100, obtained: 82 },
    { subject: "Science", maxMarks: 100, obtained: 76 },
    { subject: "English", maxMarks: 100, obtained: 88 },
    { subject: "Hindi", maxMarks: 100, obtained: 65 },
    { subject: "Social Science", maxMarks: 100, obtained: 78 },
    { subject: "Computer Science", maxMarks: 100, obtained: 92 },
  ]),
  makeExam("EX-004", "Unit Test 3", "Unit Test", "2026-01-22", DEMO_CHILDREN[0].id, [
    { subject: "Mathematics", maxMarks: 50, obtained: 46 },
    { subject: "Science", maxMarks: 50, obtained: 43 },
    { subject: "English", maxMarks: 50, obtained: 45 },
    { subject: "Hindi", maxMarks: 50, obtained: 39 },
    { subject: "Social Science", maxMarks: 50, obtained: 44 },
    { subject: "Computer Science", maxMarks: 50, obtained: 49 },
  ]),
  makeExam("EX-005", "Final Exam", "Final", "2026-03-18", DEMO_CHILDREN[0].id, [
    { subject: "Mathematics", maxMarks: 100, obtained: 88 },
    { subject: "Science", maxMarks: 100, obtained: 80 },
    { subject: "English", maxMarks: 100, obtained: 91 },
    { subject: "Hindi", maxMarks: 100, obtained: 70 },
    { subject: "Social Science", maxMarks: 100, obtained: 82 },
    { subject: "Computer Science", maxMarks: 100, obtained: 95 },
  ]),

];

// ── Performance helpers ──

export function getExamsForStudent(studentId: string) {
  return DEMO_EXAMS.filter((e) => e.studentId === studentId);
}

export function getOverallAvgPercent(studentId: string) {
  const exams = getExamsForStudent(studentId);
  if (exams.length === 0) return 0;
  return Math.round(exams.reduce((s, e) => s + e.percentage, 0) / exams.length);
}

export function getSubjectAverages(studentId: string) {
  const exams = getExamsForStudent(studentId);
  const subjectMap: Record<string, { total: number; max: number; count: number }> = {};
  for (const exam of exams) {
    for (const sub of exam.subjects) {
      if (!subjectMap[sub.subject]) subjectMap[sub.subject] = { total: 0, max: 0, count: 0 };
      subjectMap[sub.subject].total += sub.obtained;
      subjectMap[sub.subject].max += sub.maxMarks;
      subjectMap[sub.subject].count += 1;
    }
  }
  return Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    avgPercent: Math.round((data.total / data.max) * 100),
    totalObtained: data.total,
    totalMax: data.max,
    examsCount: data.count,
  }));
}

export function getPerformanceRating(attendancePct: number, examAvgPct: number): { label: string; color: string; description: string } {
  const score = attendancePct * 0.3 + examAvgPct * 0.7;
  if (score >= 85) return { label: "Excellent", color: "text-success", description: "Outstanding performance across attendance and academics" };
  if (score >= 70) return { label: "Good", color: "text-primary", description: "Strong performance with room for improvement" };
  if (score >= 55) return { label: "Average", color: "text-warning", description: "Needs focus on improving attendance or academics" };
  return { label: "Needs Improvement", color: "text-error", description: "Requires attention in both attendance and academics" };
}
