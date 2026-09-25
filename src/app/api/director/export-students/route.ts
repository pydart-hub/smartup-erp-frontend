import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ALLOWED_ROLES = ["Administrator", "Director", "Management", "General Manager", "Branch Manager"];

function parseSession(cookie: string): { roles?: string[] } | null {
  try {
    return JSON.parse(Buffer.from(cookie, "base64").toString());
  } catch {
    return null;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface StudentExportRow {
  name: string;
  student_name: string;
  custom_student_type?: string;
  custom_branch?: string;
  customer?: string;
  student_mobile_number?: string;
  joining_date?: string;
  enabled?: number;
  custom_discontinuation_date?: string;
  custom_parent_name?: string;
  guardian?: string;
  guardian_name?: string;
}

async function handleExport(request: NextRequest, isGet = false) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = parseSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const roles = session.roles ?? [];
  if (!ALLOWED_ROLES.some((r) => roles.includes(r))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let search: string | undefined;
  let statusFilter: string | undefined = "all";
  let branchFilter: string | undefined;
  let typeFilter: string | undefined = "all";
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  let format: "excel" | "pdf" = "excel";

  if (isGet) {
    const url = new URL(request.url);
    search = url.searchParams.get("search") || undefined;
    statusFilter = url.searchParams.get("statusFilter") || "all";
    branchFilter = url.searchParams.get("branchFilter") || undefined;
    typeFilter = url.searchParams.get("typeFilter") || "all";
    dateFrom = url.searchParams.get("dateFrom") || undefined;
    dateTo = url.searchParams.get("dateTo") || undefined;
    if (url.searchParams.get("format") === "pdf") {
      format = "pdf";
    }
  } else {
    try {
      const body = await request.json();
      search = body.search || undefined;
      statusFilter = body.statusFilter || "all";
      branchFilter = body.branchFilter || undefined;
      typeFilter = body.typeFilter || "all";
      dateFrom = body.dateFrom || undefined;
      dateTo = body.dateTo || undefined;
      if (body.format === "pdf") {
        format = "pdf";
      }
    } catch {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  try {
    // 1. Build Student Filters
    const studentFilters: (string | number | string[])[][] = [];
    if (statusFilter === "active") studentFilters.push(["enabled", "=", "1"]);
    else if (statusFilter === "inactive") studentFilters.push(["enabled", "=", "0"]);
    else if (statusFilter === "discontinued") {
      studentFilters.push(["enabled", "=", "0"]);
      studentFilters.push(["custom_discontinuation_date", "is", "set"]);
    }

    if (branchFilter) studentFilters.push(["custom_branch", "=", branchFilter]);
    if (typeFilter && typeFilter !== "all") studentFilters.push(["custom_student_type", "=", typeFilter]);
    if (dateFrom) studentFilters.push(["joining_date", ">=", dateFrom]);
    if (dateTo) studentFilters.push(["joining_date", "<=", dateTo]);
    if (search) studentFilters.push(["student_name", "like", `%${search}%`]);

    // 2. Parallel Data Fetching
    const [studentsRes, enrollmentsRes, guardiansRes, feesRes] = await Promise.all([
      // Fetch matching students with guardian child field
      fetch(`${FRAPPE_URL}/api/method/frappe.client.get_list`, {
        method: "POST",
        headers: {
          Authorization: adminAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          doctype: "Student",
          fields: [
            "name",
            "student_name",
            "custom_student_type",
            "custom_branch",
            "customer",
            "student_mobile_number",
            "joining_date",
            "enabled",
            "custom_discontinuation_date",
            "custom_parent_name",
            "guardians.guardian",
            "guardians.guardian_name",
          ],
          filters: studentFilters,
          order_by: "student_name asc",
          limit_page_length: 0,
        }),
        cache: "no-store",
      }).then(async (r) => (r.ok ? (await r.json()).message ?? [] : [])),

      // Fetch Program Enrollments (order by docstatus asc, enrollment_date desc so submitted enrollments take precedence, but cancelled enrollments are also retained for discontinued students)
      fetch(
        `${FRAPPE_URL}/api/resource/Program%20Enrollment?${new URLSearchParams({
          fields: JSON.stringify(["student", "program", "student_batch_name"]),
          order_by: "docstatus asc, enrollment_date desc",
          limit_page_length: "0",
        })}`,
        {
          headers: { Authorization: adminAuth, Accept: "application/json" },
          cache: "no-store",
        }
      ).then(async (r) => (r.ok ? (await r.json()).data ?? [] : [])),

      // Fetch Guardians (name, mobile_number, guardian_name)
      fetch(
        `${FRAPPE_URL}/api/resource/Guardian?${new URLSearchParams({
          fields: JSON.stringify(["name", "mobile_number", "guardian_name"]),
          limit_page_length: "0",
        })}`,
        {
          headers: { Authorization: adminAuth, Accept: "application/json" },
          cache: "no-store",
        }
      ).then(async (r) => (r.ok ? (await r.json()).data ?? [] : [])),

      // Fetch Aggregated Fees
      (() => {
        const feeFilters: (string | number | string[])[][] = [
          ["docstatus", "=", 1],
          ["is_return", "=", 0],
        ];
        if (branchFilter) feeFilters.push(["company", "=", branchFilter]);
        if (dateFrom) feeFilters.push(["posting_date", ">=", dateFrom]);
        if (dateTo) feeFilters.push(["posting_date", "<=", dateTo]);

        const feeParams = new URLSearchParams({
          fields: JSON.stringify([
            "customer",
            "sum(grand_total) as total_fee",
            "sum(outstanding_amount) as pending_fee",
          ]),
          filters: JSON.stringify(feeFilters),
          group_by: "customer",
          limit_page_length: "0",
        });

        return fetch(`${FRAPPE_URL}/api/resource/Sales%20Invoice?${feeParams.toString()}`, {
          headers: { Authorization: adminAuth, Accept: "application/json" },
          cache: "no-store",
        }).then(async (r) => (r.ok ? (await r.json()).data ?? [] : []));
      })(),
    ]);

    // 3. Process Lookups
    const enrollmentMap: Record<string, { program: string; batch: string }> = {};
    for (const e of enrollmentsRes) {
      if (e?.student && !enrollmentMap[e.student]) {
        enrollmentMap[e.student] = {
          program: e.program ?? "",
          batch: e.student_batch_name ?? "",
        };
      }
    }

    const guardianLookup: Record<string, { name: string; mobile: string }> = {};
    for (const g of guardiansRes) {
      if (g?.name) {
        guardianLookup[g.name] = {
          name: g.guardian_name ?? "",
          mobile: g.mobile_number ?? "",
        };
      }
    }

    const feeMap: Record<string, { total: number; pending: number }> = {};
    for (const f of feesRes) {
      if (f?.customer) {
        if (!feeMap[f.customer]) {
          feeMap[f.customer] = { total: 0, pending: 0 };
        }
        feeMap[f.customer].total += f.total_fee ?? 0;
        feeMap[f.customer].pending += f.pending_fee ?? 0;
      }
    }

    // 4. Deduplicate Students (in case multiple guardian child rows join)
    const seenStudents = new Map<string, StudentExportRow>();
    for (const s of (studentsRes as StudentExportRow[])) {
      if (!s?.name) continue;
      if (!seenStudents.has(s.name)) {
        seenStudents.set(s.name, s);
      } else {
        // If current seen doesn't have guardian info but next row has, update it
        const existing = seenStudents.get(s.name)!;
        if (!existing.guardian && s.guardian) {
          existing.guardian = s.guardian;
          existing.guardian_name = s.guardian_name;
        }
      }
    }

    const students = Array.from(seenStudents.values());

    // 5. Generate Output Format
    const nowStr = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Students");

      ws.columns = [
        { header: "Student Name", key: "name", width: 25 },
        { header: "Student ID", key: "id", width: 22 },
        { header: "Type", key: "type", width: 12 },
        { header: "Class", key: "class", width: 20 },
        { header: "Batch", key: "batch", width: 20 },
        { header: "Branch", key: "branch", width: 20 },
        { header: "Parent Name", key: "parent_name", width: 24 },
        { header: "Parent Mobile", key: "parent_mobile", width: 18 },
        { header: "Total Fee", key: "total_fee", width: 15 },
        { header: "Pending Fee", key: "pending_fee", width: 15 },
        { header: "Mobile", key: "mobile", width: 16 },
        { header: "Joined", key: "joined", width: 14 },
        { header: "Status", key: "status", width: 14 },
        { header: "Discontinuation Date", key: "discontinuation_date", width: 20 },
      ];

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F5F2" } };

      for (const s of students) {
        const enr = enrollmentMap[s.name];
        const fee = s.customer ? feeMap[s.customer] : undefined;
        const gInfo = s.guardian ? guardianLookup[s.guardian] : undefined;
        const parentName = s.guardian_name || gInfo?.name || s.custom_parent_name || "";
        const parentMobile = gInfo?.mobile || "";

        ws.addRow({
          name: s.student_name,
          id: s.name,
          type: s.custom_student_type ?? "",
          class: enr?.program ?? "",
          batch: enr?.batch ?? "",
          branch: (s.custom_branch ?? "").replace("Smart Up ", ""),
          parent_name: parentName,
          parent_mobile: parentMobile,
          total_fee: fee?.total ?? 0,
          pending_fee: fee?.pending ?? 0,
          mobile: s.student_mobile_number ?? "",
          joined: s.joining_date ?? "",
          status: s.enabled === 1 ? "Active" : s.custom_discontinuation_date ? "Discontinued" : "Inactive",
          discontinuation_date: s.enabled !== 1 && s.custom_discontinuation_date ? s.custom_discontinuation_date : "",
        });
      }

      ws.getColumn("total_fee").numFmt = "₹#,##0";
      ws.getColumn("pending_fee").numFmt = "₹#,##0";

      const buffer = await wb.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="SmartUp_Students_${nowStr}.xlsx"`,
        },
      });
    } else {
      // PDF export
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(16);
      doc.text("SmartUp — All Students", 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Exported: ${new Date().toLocaleDateString("en-IN")} | ${students.length} students`, 14, 21);

      const rows = students.map((s) => {
        const enr = enrollmentMap[s.name];
        const fee = s.customer ? feeMap[s.customer] : undefined;
        const gInfo = s.guardian ? guardianLookup[s.guardian] : undefined;
        const parentName = s.guardian_name || gInfo?.name || s.custom_parent_name || "";
        const parentMobile = gInfo?.mobile || "";

        return [
          s.student_name,
          enr?.program ?? "",
          (s.custom_branch ?? "").replace("Smart Up ", ""),
          parentName,
          parentMobile,
          fee?.total ? formatCurrency(fee.total) : "",
          fee?.pending ? (fee.pending > 0 ? formatCurrency(fee.pending) : "Paid") : "",
          s.enabled === 1 ? "Active" : s.custom_discontinuation_date ? "Disc." : "Inactive",
        ];
      });

      autoTable(doc, {
        startY: 25,
        head: [["Student", "Class", "Branch", "Parent Name", "Parent Mobile", "Total Fee", "Pending", "Status"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 158, 143], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
      });

      const pdfArrayBuffer = doc.output("arraybuffer");
      return new NextResponse(pdfArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="SmartUp_Students_${nowStr}.pdf"`,
        },
      });
    }
  } catch (err: unknown) {
    console.error("[export-students] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export students" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleExport(request, true);
}

export async function POST(request: NextRequest) {
  return handleExport(request, false);
}
