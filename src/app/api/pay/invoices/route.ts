import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/invoiceToken";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/pay/invoices
 *
 * Token-authenticated endpoint. Returns all Sales Invoices linked to
 * the Sales Order encoded in the token, along with guardian info.
 *
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: adminAuth };

    // 1. Fetch the Sales Order to get customer & student
    const soRes = await fetch(
      `${FRAPPE_URL}/api/resource/Sales Order/${encodeURIComponent(payload.so)}?fields=["name","customer","student","grand_total","custom_academic_year","custom_branch","status"]`,
      { headers },
    );
    if (!soRes.ok) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }
    const so = (await soRes.json()).data;

    // 2. Fetch student details
    let studentName = "";
    let programName = "";
    let guardianName = "";
    let discontinued = false;
    if (so.student) {
      const stuRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(so.student)}?fields=["first_name","last_name","student_name","enabled","custom_discontinuation_date"]`,
        { headers },
      );
      if (stuRes.ok) {
        const stu = (await stuRes.json()).data;
        studentName = stu.student_name || `${stu.first_name || ""} ${stu.last_name || ""}`.trim();
        discontinued = stu.enabled === 0 && !!stu.custom_discontinuation_date;
      }

      // Fetch program enrollment
      const peRes = await fetch(
        `${FRAPPE_URL}/api/resource/Program Enrollment?filters=[["student","=","${encodeURIComponent(so.student)}"]]&fields=["program"]&order_by=creation desc&limit_page_length=1`,
        { headers },
      );
      if (peRes.ok) {
        const peData = await peRes.json();
        if (peData.data?.length) {
          programName = peData.data[0].program;
        }
      }

      // Fetch guardian name from Student doctype's guardians child table
      const guardRes = await fetch(
        `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(so.student)}?fields=["guardians"]`,
        { headers },
      );
      if (guardRes.ok) {
        const guardData = (await guardRes.json()).data;
        if (guardData?.guardians?.length) {
          guardianName = guardData.guardians[0].guardian_name || "";
        }
      }
    }

    // 3. Fetch all Sales Invoices against this Sales Order
    const invFilters = JSON.stringify([
      ["Sales Invoice Item", "sales_order", "=", payload.so],
      ["docstatus", "=", 1],
    ]);
    const invFields = JSON.stringify([
      "name", "posting_date", "due_date", "grand_total",
      "outstanding_amount", "status",
    ]);
    const invRes = await fetch(
      `${FRAPPE_URL}/api/resource/Sales Invoice?filters=${encodeURIComponent(invFilters)}&fields=${encodeURIComponent(invFields)}&order_by=due_date asc&limit_page_length=50`,
      { headers },
    );

    interface InvoiceItem {
      item_name: string;
      qty: number;
      rate: number;
      amount: number;
    }

    let invoices: Array<{
      name: string;
      posting_date: string;
      due_date: string;
      grand_total: number;
      outstanding_amount: number;
      status: string;
      label: string;
      items: InvoiceItem[];
    }> = [];

    if (invRes.ok) {
      const invData = await invRes.json();
      const sorted = (invData.data || []) as Record<string, unknown>[];

      // Fetch items for each invoice in parallel
      const invoicesWithItems = await Promise.all(
        sorted.map(async (inv, idx) => {
          let label: string;
          if (sorted.length === 1) label = "Full Payment";
          else if (sorted.length === 4) label = `Q${idx + 1}`;
          else label = `Instalment ${idx + 1}`;

          // Fetch the full invoice document to get items
          let items: InvoiceItem[] = [];
          try {
            const detailRes = await fetch(
              `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(inv.name as string)}?fields=["items"]`,
              { headers },
            );
            if (detailRes.ok) {
              const detailData = (await detailRes.json()).data;
              items = (detailData?.items || []).map((item: Record<string, unknown>) => ({
                item_name: item.item_name as string,
                qty: item.qty as number,
                rate: item.rate as number,
                amount: item.amount as number,
              }));
            }
          } catch {
            // If items fetch fails, continue with empty items
          }

          return {
            name: inv.name as string,
            posting_date: inv.posting_date as string,
            due_date: inv.due_date as string,
            grand_total: inv.grand_total as number,
            outstanding_amount: inv.outstanding_amount as number,
            status: inv.status as string,
            label,
            items,
          };
        }),
      );
      invoices = invoicesWithItems;
    }

    return NextResponse.json({
      salesOrder: payload.so,
      customer: so.customer,
      studentName,
      programName,
      guardianName,
      academicYear: so.custom_academic_year,
      branch: so.custom_branch,
      grandTotal: so.grand_total,
      discontinued,
      invoices,
    });
  } catch (error: unknown) {
    console.error("[pay/invoices] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
