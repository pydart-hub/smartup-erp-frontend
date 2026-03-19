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
