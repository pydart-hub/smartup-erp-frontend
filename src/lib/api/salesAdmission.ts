import axios from "axios";
import type { SalesAdmissionEntry, SalesAdmissionFormValues, SalesAdmissionStats } from "../types/salesAdmission";

const API_ENDPOINT = "/api/sales-user/admissions-entry";

/**
 * Creates a new Sales Admission Entry record.
 */
export async function createSalesAdmissionEntry(
  data: SalesAdmissionFormValues,
  salesUser: { email: string; name?: string }
): Promise<SalesAdmissionEntry> {
  const payload = {
    student_name: data.student_name,
    class_name: data.class_name,
    plan: data.plan,
    branch: data.branch,
    admission_date: data.admission_date,
    sales_user: salesUser.email,
    sales_user_name: salesUser.name || salesUser.email,
    status: "Submitted",
    remarks: data.remarks || "",
  };

  const response = await axios.post(API_ENDPOINT, payload);
  if (!response.data.success && response.data.message) {
    throw new Error(response.data.message);
  }
  return response.data.data;
}

/**
 * Retrieves admissions submitted by a sales user or filtered by branch.
 */
export async function getSalesUserAdmissions(
  salesUserEmail?: string,
  branch?: string
): Promise<SalesAdmissionEntry[]> {
  try {
    const response = await axios.get(API_ENDPOINT, {
      params: {
        sales_user: salesUserEmail || "",
        branch: branch && branch !== "ALL" ? branch : "",
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.warn("Failed to fetch Sales Admission Entries:", error);
    return [];
  }
}

/**
 * Computes stats for admissions.
 */
export async function getSalesAdmissionStats(
  salesUserEmail?: string,
  branch?: string
): Promise<SalesAdmissionStats> {
  const admissions = await getSalesUserAdmissions(salesUserEmail, branch);
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const today_count = admissions.filter(
    (a) => a.admission_date === todayStr || (a.creation && a.creation.startsWith(todayStr))
  ).length;

  const this_month_count = admissions.filter(
    (a) =>
      a.admission_date.startsWith(currentMonthStr) ||
      (a.creation && a.creation.startsWith(currentMonthStr))
  ).length;

  return {
    today_count,
    this_month_count,
    total_count: admissions.length,
  };
}
