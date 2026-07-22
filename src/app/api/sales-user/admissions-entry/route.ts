import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

/**
 * Store Sales Admission Entry ONLY in Frappe Cloud ERP DocType: Sales Admission Entry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_name,
      class_name,
      plan,
      branch,
      admission_date,
      sales_user,
      sales_user_name,
      remarks,
    } = body;

    if (!student_name || !class_name || !plan || !branch || !admission_date) {
      return NextResponse.json(
        { message: "Missing required fields (student_name, class_name, plan, branch, admission_date)" },
        { status: 400 }
      );
    }

    const payload = {
      student_name,
      class_name,
      plan,
      branch,
      admission_date,
      sales_user: sales_user || "sales.user@smartup.in",
      sales_user_name: sales_user_name || sales_user || "Sales User",
      status: "Submitted",
      remarks: remarks || "",
    };

    // Post exclusively to Frappe ERP DocType
    const frappeRes = await fetch(`${FRAPPE_URL}/api/resource/Sales Admission Entry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ADMIN_AUTH,
      },
      body: JSON.stringify(payload),
    });

    const data = await frappeRes.json();

    if (!frappeRes.ok) {
      const errorMsg =
        data.exception ||
        data._server_messages ||
        data.message ||
        `Frappe error (${frappeRes.status})`;
      console.error("Frappe DocType post error:", errorMsg);
      return NextResponse.json(
        { success: false, message: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg) },
        { status: frappeRes.status }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    console.error("Error in POST /api/sales-user/admissions-entry:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Fetch Sales Admission Entry records exclusively from Frappe Cloud ERP DocType
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salesUserEmail = searchParams.get("sales_user");
    const branch = searchParams.get("branch");

    const filterList: any[] = [];
    if (salesUserEmail) {
      filterList.push(["sales_user", "=", salesUserEmail]);
    }
    if (branch && branch !== "ALL") {
      filterList.push(["branch", "=", branch]);
    }

    const filters = JSON.stringify(filterList);
    const fields = `["name","student_name","class_name","plan","branch","admission_date","sales_user","sales_user_name","status","remarks","creation"]`;
    const url = `${FRAPPE_URL}/api/resource/Sales Admission Entry?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&order_by=creation desc&limit_page_length=200`;

    const res = await fetch(url, {
      headers: {
        Authorization: ADMIN_AUTH,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data || [] });
  } catch (error: any) {
    console.error("Error in GET /api/sales-user/admissions-entry:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
