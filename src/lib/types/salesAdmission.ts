export interface SalesAdmissionEntry {
  name?: string;
  student_name: string;
  class_name: string;
  plan: "Basic" | "Intermediate" | "Advanced" | string;
  branch: string;
  admission_date: string;
  sales_user: string;
  sales_user_name?: string;
  status?: "Submitted" | "Verified" | "Enrolled" | "Cancelled";
  remarks?: string;
  creation?: string;
  modified?: string;
}

export interface SalesAdmissionFormValues {
  student_name: string;
  class_name: string;
  plan: string;
  branch: string;
  admission_date: string;
  remarks?: string;
}

export interface SalesAdmissionStats {
  today_count: number;
  this_month_count: number;
  total_count: number;
}
