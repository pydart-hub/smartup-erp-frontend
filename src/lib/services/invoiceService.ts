/**
 * Core invoice generation logic shared between /api/admission/create-invoices
 * and /api/admission/convert-to-regular.
 *
 * Calling this directly in-process eliminates HTTP loopback failure/timeout risks.
 */

import { generateToken } from "@/lib/utils/invoiceToken";
import { sendTemplate } from "@/lib/utils/whatsapp";
import { buildInvoiceGenerated } from "@/lib/utils/whatsappTemplates";
import { getPublicAppUrl } from "@/lib/utils/constants";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const APP_BASE_URL = getPublicAppUrl();

async function fetchRetry(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: unknown) {
      const isRetryable =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_SOCKET" ||
        (err as { cause?: { code?: string } })?.cause?.code === "UND_ERR_SOCKET";
      if (!isRetryable || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

export interface ScheduleEntry {
  amount: number;
  dueDate: string;
  label: string;
  discountApplied?: number;
  discountRemark?: string;
}

export interface NormalizedScheduleEntry extends ScheduleEntry {
  amount: number;
}

export interface CreatedInstalmentSummary {
  label: string;
  amount: number;
  dueDate: string;
}

export interface FailedInstalment {
  index: number;
  label: string;
  error: string;
  draftInvoiceName?: string;
}

export interface GenerateInvoicesResult {
  success: boolean;
  invoices: string[];
  drafts?: string[];
  failed?: FailedInstalment[];
  absorbed?: Array<{ label: string; dueDate: string; discountApplied: number; discountRemark?: string }>;
  whatsappSent?: boolean;
  whatsappError?: string;
  whatsappWarning?: string;
  error?: string;
}

export async function executeCreateInvoices(
  salesOrderName: string,
  schedule: ScheduleEntry[],
): Promise<GenerateInvoicesResult> {
  if (!salesOrderName || !schedule?.length) {
    return { success: false, invoices: [], error: "salesOrderName and schedule are required" };
  }

  const normalizedSchedule: NormalizedScheduleEntry[] = schedule.map((entry) => ({
    ...entry,
    amount: Number.isFinite(entry.amount)
      ? Math.max(0, Math.round(entry.amount * 100) / 100)
      : 0,
  }));
  const billableSchedule = normalizedSchedule.filter((entry) => entry.amount > 0);
  const absorbedSchedule = normalizedSchedule
    .filter((entry) => entry.amount <= 0)
    .map((entry) => ({
      label: entry.label,
      dueDate: entry.dueDate,
      discountApplied: entry.discountApplied ?? 0,
      discountRemark: entry.discountRemark,
    }));

  if (billableSchedule.length === 0) {
    return {
      success: false,
      invoices: [],
      error: "No billable invoices remain after applying credits/discounts",
      absorbed: absorbedSchedule,
    };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };

  // 1. Fetch the SO to get customer, company, items, etc.
  const soRes = await fetchRetry(
    `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`,
    { headers },
  );
  if (!soRes.ok) {
    return { success: false, invoices: [], error: `Failed to fetch SO: ${soRes.statusText}` };
  }
  const soData = (await soRes.json()).data;

  if (soData.docstatus !== 1) {
    return {
      success: false,
      invoices: [],
      error: `Sales Order ${salesOrderName} is not submitted (docstatus=${soData.docstatus}).`,
    };
  }

  const soItem = soData.items?.[0];
  if (!soItem) {
    return { success: false, invoices: [], error: "Sales Order has no items" };
  }

  let academicYear: string | undefined = soData.custom_academic_year || undefined;
  if (!academicYear) {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const ayFilters = encodeURIComponent(
        JSON.stringify([["year_start_date", "<=", todayStr], ["year_end_date", ">=", todayStr]]),
      );
      const ayFields = encodeURIComponent(JSON.stringify(["name"]));
      const ayRes = await fetchRetry(
        `${FRAPPE_URL}/api/resource/Academic Year?filters=${ayFilters}&fields=${ayFields}&limit=1`,
        { headers },
      );
      if (ayRes.ok) {
        const ayData = await ayRes.json();
        academicYear = ayData.data?.[0]?.name as string | undefined;
      }
    } catch {
      // Non-fatal
    }
  }

  const createdInvoices: string[] = [];
  const createdInstalments: CreatedInstalmentSummary[] = [];
  const draftInvoices: string[] = [];
  const failedInstalments: FailedInstalment[] = [];

  const today = new Date().toISOString().split("T")[0];

  // Poll until the newly-submitted SO is ready
  for (let soCheck = 0; soCheck < 8; soCheck++) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const soCheckRes = await fetchRetry(
        `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}?fields=["billing_status","docstatus"]`,
        { headers },
      );
      if (soCheckRes.ok) {
        const soCheckData = (await soCheckRes.json()).data;
        if (soCheckData?.billing_status === "Not Billed" && soCheckData?.docstatus === 1) {
          break;
        }
      }
    } catch {
      // Keep polling
    }
  }

  for (let i = 0; i < billableSchedule.length; i++) {
    const inst = billableSchedule[i];
    const effectiveDate = inst.dueDate < today ? today : inst.dueDate;

    const invoicePayload = {
      doctype: "Sales Invoice",
      customer: soData.customer,
      company: soData.company,
      posting_date: effectiveDate,
      due_date: effectiveDate,
      student: soData.student,
      custom_academic_year: academicYear,
      items: [
        {
          item_code: soItem.item_code,
          item_name: soItem.item_name,
          description: `${inst.label} — ${soItem.item_name}${inst.discountApplied ? ` | Admission discount: -₹${inst.discountApplied.toLocaleString("en-IN")}${inst.discountRemark ? ` (${inst.discountRemark})` : ""}` : ""}`,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: salesOrderName,
          so_detail: soItem.name,
        },
      ],
    };

    const createRes = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Invoice`, {
      method: "POST",
      headers,
      body: JSON.stringify(invoicePayload),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.error(`[create-invoices] Failed to create invoice ${i + 1}:`, errBody);
      failedInstalments.push({ index: i, label: inst.label, error: errBody });
      continue;
    }

    const created = (await createRes.json()).data;
    const invName = created.name;

    const submitRes = await fetchRetry(
      `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invName)}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ docstatus: 1 }),
      },
    );

    if (!submitRes.ok) {
      const submitErr = await submitRes.text().catch(() => "");
      console.error(`[create-invoices] Failed to submit invoice ${invName}:`, submitErr);
      draftInvoices.push(invName);
      failedInstalments.push({
        index: i,
        label: inst.label,
        error: `Created as draft but submission failed: ${submitErr}`,
        draftInvoiceName: invName,
      });
    } else {
      createdInvoices.push(invName);
      createdInstalments.push({
        label: inst.label,
        amount: inst.amount,
        dueDate: effectiveDate,
      });
    }
  }

  // Retry any failed instalments once
  if (failedInstalments.length > 0) {
    await new Promise((r) => setTimeout(r, 2000));
    const stillFailed: typeof failedInstalments = [];
    for (const failed of failedInstalments) {
      const inst = billableSchedule[failed.index];
      const effectiveDate = inst.dueDate < today ? today : inst.dueDate;
      if (failed.draftInvoiceName) {
        const retrySubmit = await fetchRetry(
          `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(failed.draftInvoiceName)}`,
          { method: "PUT", headers, body: JSON.stringify({ docstatus: 1 }) },
        );
        if (!retrySubmit.ok) {
          const submitErr = await retrySubmit.text().catch(() => "");
          stillFailed.push({
            ...failed,
            error: `Draft invoice submission failed after retry: ${submitErr}`,
          });
        } else {
          createdInvoices.push(failed.draftInvoiceName);
          createdInstalments.push({
            label: inst.label,
            amount: inst.amount,
            dueDate: effectiveDate,
          });
        }
        continue;
      }

      const retryPayload = {
        doctype: "Sales Invoice",
        customer: soData.customer,
        company: soData.company,
        posting_date: effectiveDate,
        due_date: effectiveDate,
        student: soData.student,
        custom_academic_year: academicYear,
        items: [
          {
            item_code: soItem.item_code,
            item_name: soItem.item_name,
            description: `${inst.label} — ${soItem.item_name}${inst.discountApplied ? ` | Admission discount: -₹${inst.discountApplied.toLocaleString("en-IN")}${inst.discountRemark ? ` (${inst.discountRemark})` : ""}` : ""}`,
            qty: 1,
            rate: inst.amount,
            amount: inst.amount,
            sales_order: salesOrderName,
            so_detail: soItem.name,
          },
        ],
      };

      const retryCreate = await fetchRetry(`${FRAPPE_URL}/api/resource/Sales Invoice`, {
        method: "POST",
        headers,
        body: JSON.stringify(retryPayload),
      });

      if (!retryCreate.ok) {
        const errBody = await retryCreate.text();
        stillFailed.push({ index: failed.index, label: inst.label, error: errBody });
        continue;
      }

      const retryData = (await retryCreate.json()).data;
      const retryName = retryData.name;

      const retrySubmit = await fetchRetry(
        `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(retryName)}`,
        { method: "PUT", headers, body: JSON.stringify({ docstatus: 1 }) },
      );

      if (!retrySubmit.ok) {
        const submitErr = await retrySubmit.text().catch(() => "");
        draftInvoices.push(retryName);
        stillFailed.push({
          index: failed.index,
          label: inst.label,
          error: `Created as draft on retry: ${submitErr}`,
          draftInvoiceName: retryName,
        });
      } else {
        createdInvoices.push(retryName);
        createdInstalments.push({
          label: inst.label,
          amount: inst.amount,
          dueDate: effectiveDate,
        });
      }
    }
  }

  // WhatsApp Notification
  let whatsappSent = false;
  let whatsappError: string | undefined;
  let whatsappWarning: string | undefined;

  if (createdInvoices.length > 0) {
    try {
      const studentId: string | undefined = soData.student;
      let guardianMobile: string | undefined;
      let guardianName: string | undefined;
      let studentName: string = soData.customer;
      let programName: string | undefined;
      let branchName: string | undefined = soData.company;

      if (studentId) {
        const studentRes = await fetchRetry(
          `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
          { headers },
        );
        if (studentRes.ok) {
          const studentDoc = (await studentRes.json()).data;
          studentName = studentDoc.student_name || studentName;
          branchName = studentDoc.custom_branch || branchName;

          const guardianRow = studentDoc.guardians?.[0];
          if (guardianRow?.guardian) {
            const guardianRes = await fetchRetry(
              `${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianRow.guardian)}`,
              { headers },
            );
            if (guardianRes.ok) {
              const guardianDoc = (await guardianRes.json()).data;
              guardianMobile = guardianDoc.mobile_number || undefined;
              guardianName = guardianDoc.guardian_name || undefined;
            }
          }
          if (!guardianMobile && studentDoc.student_mobile_number) {
            guardianMobile = studentDoc.student_mobile_number;
          }
        }

        const peFilters = encodeURIComponent(
          JSON.stringify([["student", "=", studentId], ["docstatus", "=", 1]]),
        );
        const peFields = encodeURIComponent(JSON.stringify(["program"]));
        const peRes = await fetchRetry(
          `${FRAPPE_URL}/api/resource/Program Enrollment?filters=${peFilters}&fields=${peFields}&order_by=creation+desc&limit=1`,
          { headers },
        );
        if (peRes.ok) {
          const peData = await peRes.json();
          programName = peData.data?.[0]?.program;
        }
      }

      if (guardianMobile) {
        const scheduleForMessage = createdInstalments.length > 0 ? createdInstalments : billableSchedule;
        const totalAmount = scheduleForMessage.reduce((s: number, inst) => s + inst.amount, 0);

        const instalmentSummary = scheduleForMessage.length === 1
          ? `Full payment — ₹${scheduleForMessage[0].amount.toLocaleString("en-IN")}`
          : scheduleForMessage
            .map((inst, i: number) => {
              const mon = new Date(inst.dueDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
              return `${i + 1}. ₹${inst.amount.toLocaleString("en-IN")} (${mon})`;
            })
            .join(", ");

        const token = generateToken(salesOrderName);
        const payUrl = `${APP_BASE_URL}/pay/${token}`;

        const templateOpts = buildInvoiceGenerated(guardianMobile, {
          guardianName: guardianName || "Parent",
          studentName,
          programName: programName || "Your Program",
          branchName: branchName || "SmartUp",
          academicYear: academicYear || "2026-2027",
          totalAmount,
          instalmentSummary,
        }, payUrl);

        await sendTemplate(templateOpts);
        whatsappSent = true;
      } else {
        whatsappWarning = "No guardian mobile number found — WhatsApp not sent";
      }
    } catch (notifErr) {
      whatsappError = notifErr instanceof Error ? notifErr.message : String(notifErr);
    }
  }

  return {
    success: createdInvoices.length > 0,
    invoices: createdInvoices,
    ...(draftInvoices.length > 0 && { drafts: draftInvoices }),
    ...(failedInstalments.length > 0 && { failed: failedInstalments }),
    ...(absorbedSchedule.length > 0 && { absorbed: absorbedSchedule }),
    whatsappSent,
    ...(whatsappError && { whatsappError }),
    ...(whatsappWarning && { whatsappWarning }),
  };
}
