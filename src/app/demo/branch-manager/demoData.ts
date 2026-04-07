// ── Demo sample data for Branch Manager Portal ──────────────────
// All data is static/fake. No API calls.

export const DEMO_MANAGER = {
  name: "Priya Menon",
  email: "priya.menon@smartup.com",
  phone: "+91 94567 12345",
  branch: "Smart Up Chullickal",
  branchAbbr: "CHL",
  role: "Branch Manager",
};

// ── Students ──

export interface DemoStudent {
  id: string;
  name: string;
  class: string;
  batch: string;
  guardian: string;
  guardianPhone: string;
  joinDate: string;
  enabled: boolean;
  attendancePct: number;
  outstandingFee: number;
}

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: "STU-CHL-001", name: "Akhil Kumar",     class: "10th Grade", batch: "CHL-10A", guardian: "Ramesh Kumar",    guardianPhone: "+91 98765 43210", joinDate: "2025-06-01", enabled: true,  attendancePct: 94, outstandingFee: 6000  },
  { id: "STU-CHL-002", name: "Sneha Kumar",     class: "7th Grade",  batch: "CHL-7A",  guardian: "Ramesh Kumar",    guardianPhone: "+91 98765 43210", joinDate: "2025-06-15", enabled: true,  attendancePct: 92, outstandingFee: 0     },
  { id: "STU-CHL-003", name: "Arun Nair",       class: "10th Grade", batch: "CHL-10A", guardian: "Suresh Nair",     guardianPhone: "+91 94432 78901", joinDate: "2025-06-01", enabled: true,  attendancePct: 88, outstandingFee: 12000 },
  { id: "STU-CHL-004", name: "Meera Das",       class: "8th Grade",  batch: "CHL-8A",  guardian: "Rajesh Das",      guardianPhone: "+91 97654 32100", joinDate: "2025-06-10", enabled: true,  attendancePct: 96, outstandingFee: 0     },
  { id: "STU-CHL-005", name: "Vishnu M",        class: "10th Grade", batch: "CHL-10A", guardian: "Mohan M",         guardianPhone: "+91 99876 54321", joinDate: "2025-06-01", enabled: true,  attendancePct: 78, outstandingFee: 18000 },
  { id: "STU-CHL-006", name: "Lakshmi Pillai",  class: "9th Grade",  batch: "CHL-9A",  guardian: "Anand Pillai",    guardianPhone: "+91 94456 78012", joinDate: "2025-06-05", enabled: true,  attendancePct: 91, outstandingFee: 6000  },
  { id: "STU-CHL-007", name: "Rohan Thomas",    class: "8th Grade",  batch: "CHL-8A",  guardian: "Thomas K",        guardianPhone: "+91 98812 34567", joinDate: "2025-06-12", enabled: true,  attendancePct: 95, outstandingFee: 0     },
  { id: "STU-CHL-008", name: "Anjali Raj",      class: "7th Grade",  batch: "CHL-7A",  guardian: "Rajesh R",        guardianPhone: "+91 91234 56789", joinDate: "2025-06-20", enabled: true,  attendancePct: 89, outstandingFee: 6000  },
  { id: "STU-CHL-009", name: "Deepak S",        class: "9th Grade",  batch: "CHL-9A",  guardian: "Sunil S",         guardianPhone: "+91 93456 78901", joinDate: "2025-06-08", enabled: true,  attendancePct: 84, outstandingFee: 12000 },
  { id: "STU-CHL-010", name: "Kavya Menon",     class: "10th Grade", batch: "CHL-10A", guardian: "Anil Menon",      guardianPhone: "+91 95678 90123", joinDate: "2025-06-01", enabled: true,  attendancePct: 97, outstandingFee: 0     },
  { id: "STU-CHL-011", name: "Sanjay P",        class: "8th Grade",  batch: "CHL-8A",  guardian: "Prakash P",       guardianPhone: "+91 92345 67890", joinDate: "2025-06-15", enabled: true,  attendancePct: 90, outstandingFee: 6000  },
  { id: "STU-CHL-012", name: "Nithya Varma",    class: "7th Grade",  batch: "CHL-7A",  guardian: "Suresh Varma",    guardianPhone: "+91 96789 01234", joinDate: "2025-07-01", enabled: false, attendancePct: 0,  outstandingFee: 0     },
];

// ── Batches ──

export interface DemoBatch {
  name: string;
  program: string;
  enrolled: number;
  maxStrength: number;
}

export const DEMO_BATCHES: DemoBatch[] = [
  { name: "CHL-10A", program: "Class 10 — CBSE",  enrolled: 4, maxStrength: 30 },
  { name: "CHL-9A",  program: "Class 9 — CBSE",   enrolled: 2, maxStrength: 30 },
  { name: "CHL-8A",  program: "Class 8 — CBSE",   enrolled: 3, maxStrength: 30 },
  { name: "CHL-7A",  program: "Class 7 — CBSE",   enrolled: 3, maxStrength: 30 },
];

// ── Staff ──

export interface DemoStaff {
  id: string;
  name: string;
  role: string;
  subject?: string;
  phone: string;
  presentToday: boolean;
}

export const DEMO_STAFF: DemoStaff[] = [
  { id: "EMP-001", name: "Mr. Arjun Nair",   role: "Teacher",      subject: "Mathematics",    phone: "+91 90123 45678", presentToday: true  },
  { id: "EMP-002", name: "Mrs. Deepa Menon", role: "Teacher",      subject: "Science",        phone: "+91 90234 56789", presentToday: true  },
  { id: "EMP-003", name: "Ms. Priya Thomas", role: "Teacher",      subject: "English",        phone: "+91 90345 67890", presentToday: true  },
  { id: "EMP-004", name: "Mr. Rajan K",      role: "Teacher",      subject: "Social Science", phone: "+91 90456 78901", presentToday: true  },
  { id: "EMP-005", name: "Mr. Sujith M",     role: "Teacher",      subject: "Computer Sc.",   phone: "+91 90567 89012", presentToday: false },
  { id: "EMP-006", name: "Mrs. Rekha S",     role: "Teacher",      subject: "Hindi",          phone: "+91 90678 90123", presentToday: true  },
  { id: "EMP-007", name: "Mr. Binu R",       role: "Lab Assistant",                            phone: "+91 90789 01234", presentToday: true  },
  { id: "EMP-008", name: "Mrs. Anitha J",    role: "Receptionist",                             phone: "+91 90890 12345", presentToday: true  },
];

// ── Fee Collection ──

export interface DemoFeeCollection {
  totalOrders: number;
  totalBilled: number;
  totalCollected: number;
  outstanding: number;
  collectionRate: number;
}

export const DEMO_FEE_COLLECTION: DemoFeeCollection = {
  totalOrders: 12,
  totalBilled: 288000,
  totalCollected: 222000,
  outstanding: 66000,
  collectionRate: 77,
};

export interface DemoPayment {
  id: string;
  student: string;
  amount: number;
  date: string;
  mode: "Online" | "UPI" | "Cash";
  reference: string;
  instalment: string;
}

export const DEMO_RECENT_PAYMENTS: DemoPayment[] = [
  { id: "PAY-001", student: "Sneha Kumar",    amount: 6000,  date: "2026-04-06", mode: "Online", reference: "RZP-201", instalment: "Q4" },
  { id: "PAY-002", student: "Meera Das",      amount: 6000,  date: "2026-04-05", mode: "UPI",    reference: "UPI-202", instalment: "Q4" },
  { id: "PAY-003", student: "Rohan Thomas",   amount: 6000,  date: "2026-04-04", mode: "Cash",   reference: "CASH-203", instalment: "Q4" },
  { id: "PAY-004", student: "Kavya Menon",    amount: 6000,  date: "2026-04-03", mode: "Online", reference: "RZP-204", instalment: "Q4" },
  { id: "PAY-005", student: "Akhil Kumar",    amount: 6000,  date: "2026-03-28", mode: "UPI",    reference: "UPI-205", instalment: "Q3" },
  { id: "PAY-006", student: "Lakshmi Pillai", amount: 6000,  date: "2026-03-25", mode: "Cash",   reference: "CASH-206", instalment: "Q3" },
];

// ── Today's Attendance ──

export interface DemoBatchAttendance {
  batch: string;
  total: number;
  present: number;
  absent: number;
  late: number;
}

export const DEMO_TODAY_ATTENDANCE: DemoBatchAttendance[] = [
  { batch: "CHL-10A (10th Grade)", total: 4,  present: 3, absent: 1, late: 0 },
  { batch: "CHL-9A (9th Grade)",   total: 2,  present: 2, absent: 0, late: 0 },
  { batch: "CHL-8A (8th Grade)",   total: 3,  present: 3, absent: 0, late: 0 },
  { batch: "CHL-7A (7th Grade)",   total: 2,  present: 2, absent: 0, late: 0 },
];

// ── Complaints ──

export interface DemoBMComplaint {
  id: string;
  subject: string;
  student: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Review" | "Resolved" | "Closed";
  createdAt: string;
  description: string;
  resolution?: string;
}

export const DEMO_BM_COMPLAINTS: DemoBMComplaint[] = [
  { id: "CMP-001", subject: "Bus timing is inconsistent",          student: "Akhil Kumar",  category: "Transport", priority: "High",   status: "In Review", createdAt: "2026-03-28", description: "The school bus has been arriving 15-20 minutes late for the past week." },
  { id: "CMP-002", subject: "Extra math coaching request",         student: "Arun Nair",    category: "Academic",  priority: "Medium", status: "Open",      createdAt: "2026-04-02", description: "Parent requested additional math support for the student." },
  { id: "CMP-003", subject: "Water cooler not working",            student: "Meera Das",    category: "Facility",  priority: "Low",    status: "Resolved",  createdAt: "2026-03-10", description: "The water cooler on the 2nd floor has not been working for two days.", resolution: "Repaired on Mar 12 by maintenance team." },
  { id: "CMP-004", subject: "Classroom projector malfunction",     student: "Lakshmi Pillai", category: "Facility", priority: "Medium", status: "Closed",  createdAt: "2026-02-20", description: "Projector in 9th grade classroom stopped working.", resolution: "Replaced with new projector on Feb 25." },
];

// ── Recent Activity ──

export interface DemoActivity {
  id: string;
  type: "admission" | "payment" | "complaint" | "attendance";
  message: string;
  time: string;
}

export const DEMO_RECENT_ACTIVITY: DemoActivity[] = [
  { id: "ACT-001", type: "payment",    message: "Sneha Kumar paid ₹6,000 for Q4 fees",         time: "Today, 10:30 AM" },
  { id: "ACT-002", type: "attendance",  message: "Attendance marked for CHL-10A — 3/4 present", time: "Today, 9:15 AM"  },
  { id: "ACT-003", type: "complaint",   message: "New complaint from Arun Nair's parent",       time: "Yesterday, 4:00 PM" },
  { id: "ACT-004", type: "payment",     message: "Meera Das paid ₹6,000 via UPI",               time: "Apr 5, 11:00 AM" },
  { id: "ACT-005", type: "admission",   message: "Nithya Varma admission withdrawn",            time: "Apr 3, 2:30 PM"  },
  { id: "ACT-006", type: "payment",     message: "Rohan Thomas paid ₹6,000 in cash",            time: "Apr 4, 12:00 PM" },
];

// ── Student-wise fee status (for fee collection detail page) ──

export interface DemoStudentFee {
  studentId: string;
  student: string;
  class: string;
  batch: string;
  totalFee: number;
  paid: number;
  outstanding: number;
  lastPaymentDate: string | null;
  status: "paid" | "partial" | "overdue";
}

export const DEMO_STUDENT_FEES: DemoStudentFee[] = [
  { studentId: "STU-CHL-001", student: "Akhil Kumar",    class: "10th Grade", batch: "CHL-10A", totalFee: 24000, paid: 18000, outstanding: 6000,  lastPaymentDate: "2026-03-28", status: "partial"  },
  { studentId: "STU-CHL-002", student: "Sneha Kumar",    class: "7th Grade",  batch: "CHL-7A",  totalFee: 24000, paid: 24000, outstanding: 0,     lastPaymentDate: "2026-04-06", status: "paid"     },
  { studentId: "STU-CHL-003", student: "Arun Nair",      class: "10th Grade", batch: "CHL-10A", totalFee: 24000, paid: 12000, outstanding: 12000, lastPaymentDate: "2025-12-14", status: "overdue"  },
  { studentId: "STU-CHL-004", student: "Meera Das",      class: "8th Grade",  batch: "CHL-8A",  totalFee: 24000, paid: 24000, outstanding: 0,     lastPaymentDate: "2026-04-05", status: "paid"     },
  { studentId: "STU-CHL-005", student: "Vishnu M",       class: "10th Grade", batch: "CHL-10A", totalFee: 24000, paid: 6000,  outstanding: 18000, lastPaymentDate: "2025-09-12", status: "overdue"  },
  { studentId: "STU-CHL-006", student: "Lakshmi Pillai", class: "9th Grade",  batch: "CHL-9A",  totalFee: 24000, paid: 18000, outstanding: 6000,  lastPaymentDate: "2026-03-25", status: "partial"  },
  { studentId: "STU-CHL-007", student: "Rohan Thomas",   class: "8th Grade",  batch: "CHL-8A",  totalFee: 24000, paid: 24000, outstanding: 0,     lastPaymentDate: "2026-04-04", status: "paid"     },
  { studentId: "STU-CHL-008", student: "Anjali Raj",     class: "7th Grade",  batch: "CHL-7A",  totalFee: 24000, paid: 18000, outstanding: 6000,  lastPaymentDate: "2026-03-20", status: "partial"  },
  { studentId: "STU-CHL-009", student: "Deepak S",       class: "9th Grade",  batch: "CHL-9A",  totalFee: 24000, paid: 12000, outstanding: 12000, lastPaymentDate: "2025-12-10", status: "overdue"  },
  { studentId: "STU-CHL-010", student: "Kavya Menon",    class: "10th Grade", batch: "CHL-10A", totalFee: 24000, paid: 24000, outstanding: 0,     lastPaymentDate: "2026-04-03", status: "paid"     },
  { studentId: "STU-CHL-011", student: "Sanjay P",       class: "8th Grade",  batch: "CHL-8A",  totalFee: 24000, paid: 18000, outstanding: 6000,  lastPaymentDate: "2026-03-15", status: "partial"  },
];

// ── Exam Performance ──

export interface DemoExamSubjectMark {
  subject: string;
  maxMarks: number;
  obtained: number;
}

export interface DemoExam {
  id: string;
  name: string;
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

// Subjects by class
const SUBJECTS_10 = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"];
const SUBJECTS_9  = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"];
const SUBJECTS_8  = ["Mathematics", "Science", "English", "Hindi", "Social Science"];
const SUBJECTS_7  = ["Mathematics", "Science", "English", "Hindi", "Social Science"];

function subjectsForClass(cls: string) {
  if (cls.includes("10")) return SUBJECTS_10;
  if (cls.includes("9")) return SUBJECTS_9;
  if (cls.includes("8")) return SUBJECTS_8;
  return SUBJECTS_7;
}

// Deterministic marks generator
function genMarks(subjects: string[], max: number, seed: number): DemoExamSubjectMark[] {
  return subjects.map((subject, i) => {
    const base = 55 + ((seed * 7 + i * 13) % 40); // 55–94 range
    const obtained = Math.min(max, Math.round((base / 100) * max));
    return { subject, maxMarks: max, obtained };
  });
}

// Generate exams for all active students
const examDefs: { name: string; type: DemoExam["type"]; date: string; max: number }[] = [
  { name: "Unit Test 1", type: "Unit Test", date: "2025-07-25", max: 50 },
  { name: "Unit Test 2", type: "Unit Test", date: "2025-09-20", max: 50 },
  { name: "Mid Term",    type: "Mid Term",  date: "2025-11-15", max: 100 },
  { name: "Unit Test 3", type: "Unit Test", date: "2026-01-22", max: 50 },
  { name: "Final Exam",  type: "Final",     date: "2026-03-18", max: 100 },
];

export const DEMO_EXAMS: DemoExam[] = (() => {
  const exams: DemoExam[] = [];
  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled);
  let counter = 1;
  for (const student of activeStudents) {
    const subjects = subjectsForClass(student.class);
    for (let ei = 0; ei < examDefs.length; ei++) {
      const def = examDefs[ei];
      const seed = parseInt(student.id.replace(/\D/g, ""), 10) + ei * 3;
      exams.push(
        makeExam(
          `EX-${String(counter).padStart(3, "0")}`,
          def.name,
          def.type,
          def.date,
          student.id,
          genMarks(subjects, def.max, seed),
        )
      );
      counter++;
    }
  }
  return exams;
})();

// ── Performance helpers ──

export function getExamsForStudent(studentId: string) {
  return DEMO_EXAMS.filter((e) => e.studentId === studentId);
}

export function getStudentAvgPercent(studentId: string) {
  const exams = getExamsForStudent(studentId);
  if (exams.length === 0) return 0;
  return Math.round(exams.reduce((s, e) => s + e.percentage, 0) / exams.length);
}

export function getSubjectAverages(studentId: string) {
  const exams = getExamsForStudent(studentId);
  const map: Record<string, { total: number; max: number; count: number }> = {};
  for (const exam of exams) {
    for (const sub of exam.subjects) {
      if (!map[sub.subject]) map[sub.subject] = { total: 0, max: 0, count: 0 };
      map[sub.subject].total += sub.obtained;
      map[sub.subject].max += sub.maxMarks;
      map[sub.subject].count += 1;
    }
  }
  return Object.entries(map).map(([subject, data]) => ({
    subject,
    avgPercent: Math.round((data.total / data.max) * 100),
  }));
}

export function getBranchSubjectAverages() {
  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled);
  const map: Record<string, { total: number; max: number }> = {};
  for (const student of activeStudents) {
    const exams = getExamsForStudent(student.id);
    for (const exam of exams) {
      for (const sub of exam.subjects) {
        if (!map[sub.subject]) map[sub.subject] = { total: 0, max: 0 };
        map[sub.subject].total += sub.obtained;
        map[sub.subject].max += sub.maxMarks;
      }
    }
  }
  return Object.entries(map)
    .map(([subject, d]) => ({ subject, avgPercent: Math.round((d.total / d.max) * 100) }))
    .sort((a, b) => b.avgPercent - a.avgPercent);
}

export function getBatchAverages() {
  return DEMO_BATCHES.map((batch) => {
    const students = DEMO_STUDENTS.filter((s) => s.batch === batch.name && s.enabled);
    if (students.length === 0) return { batch: batch.name, program: batch.program, avgPercent: 0, count: 0 };
    const avg = Math.round(students.reduce((s, st) => s + getStudentAvgPercent(st.id), 0) / students.length);
    return { batch: batch.name, program: batch.program, avgPercent: avg, count: students.length };
  });
}

export function getPerformanceRating(pct: number): { label: string; color: string } {
  if (pct >= 85) return { label: "Excellent", color: "text-success" };
  if (pct >= 70) return { label: "Good", color: "text-primary" };
  if (pct >= 55) return { label: "Average", color: "text-warning" };
  return { label: "Needs Improvement", color: "text-error" };
}

// ── Helpers ──

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
