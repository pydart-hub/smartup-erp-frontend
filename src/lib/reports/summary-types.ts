// Shared types for the Director Analytics report system

export interface BranchRow {
  branch: string;
  totalStudents: number;
  active: number;
  inactive: number;
  discontinued: number;
  staff: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

export interface ClassRow {
  program: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  branchCount: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

export interface BranchDetailClassRow {
  program: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

export interface ClassDetailBranchRow {
  branch: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  staff: number;
  totalFee: number;
  collectedFee: number;
  pendingFee: number;
}

export interface BranchDetailData {
  summary: BranchRow;
  classes: BranchDetailClassRow[];
}

export interface ClassDetailData {
  summary: ClassRow;
  branches: ClassDetailBranchRow[];
}

// ── Students Report Types ──

export interface StudentsBranchRow {
  branch: string;
  totalStudents: number;
  active: number;
  inactive: number;
  discontinued: number;
  male: number;
  female: number;
  newThisMonth: number;
}

export interface StudentsClassRow {
  program: string;
  totalStudents: number;
  active: number;
  discontinued: number;
  branchCount: number;
  male: number;
  female: number;
  newThisMonth: number;
}

export interface StudentsBranchDetailRow {
  studentId: string;
  studentName: string;
  status: string;
  gender: string;
  phone: string;
  guardian: string;
  joiningDate: string;
  program: string;
  disabilities?: string;
}

export interface StudentsClassDetailRow {
  studentId: string;
  studentName: string;
  status: string;
  gender: string;
  phone: string;
  guardian: string;
  joiningDate: string;
  branch: string;
  disabilities?: string;
}

export interface StudentsBranchDetailData {
  summary: StudentsBranchRow;
  students: StudentsBranchDetailRow[];
}

export interface StudentsClassDetailData {
  summary: StudentsClassRow;
  students: StudentsClassDetailRow[];
}

// ── Fees Report Types ──

export interface FeesBranchRow {
  branch: string;
  totalFee: number;
  collected: number;
  pending: number;
  overdue: number;
  collectionPct: number;
  studentsWithDues: number;
}

export interface FeesClassRow {
  program: string;
  totalFee: number;
  collected: number;
  pending: number;
  overdue: number;
  collectionPct: number;
  studentsWithDues: number;
}

export interface FeesBranchDetailRow {
  studentId: string;
  studentName: string;
  invoiceName: string;
  amount: number;
  paid: number;
  outstanding: number;
  status: string;
  dueDate: string;
  disabilities?: string;
}

export interface FeesClassDetailRow {
  studentId: string;
  studentName: string;
  invoiceName: string;
  amount: number;
  paid: number;
  outstanding: number;
  status: string;
  dueDate: string;
  branch: string;
  disabilities?: string;
}

export interface FeesBranchDetailData {
  summary: FeesBranchRow;
  invoices: FeesBranchDetailRow[];
}

export interface FeesClassDetailData {
  summary: FeesClassRow;
  invoices: FeesClassDetailRow[];
}

// ── Attendance Report Types ──

export interface AttendanceBranchRow {
  branch: string;
  totalSessions: number;
  avgAttendancePct: number;
  present: number;
  absent: number;
  leave: number;
  students: number;
}

export interface AttendanceClassRow {
  program: string;
  totalSessions: number;
  avgAttendancePct: number;
  present: number;
  absent: number;
  leave: number;
  students: number;
}

export interface AttendanceBranchDetailRow {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  leave: number;
  attendancePct: number;
  lastAttended: string;
  disabilities?: string;
}

export interface AttendanceClassDetailRow {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  leave: number;
  attendancePct: number;
  lastAttended: string;
  branch: string;
  disabilities?: string;
}

export interface AttendanceBranchDetailData {
  summary: AttendanceBranchRow;
  students: AttendanceBranchDetailRow[];
}

export interface AttendanceClassDetailData {
  summary: AttendanceClassRow;
  students: AttendanceClassDetailRow[];
}
