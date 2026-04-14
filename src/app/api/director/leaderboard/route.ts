import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

// ── Auth ──

function parseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString()) as {
      default_company?: string;
      allowed_companies?: string[];
      roles?: string[];
    };
  } catch {
    return null;
  }
}

function isDirectorRole(roles: string[]): boolean {
  return roles.includes("Director") || roles.includes("Management") || roles.includes("Administrator");
}

// ── Frappe helper ──

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][],
  orderBy?: string,
  limitPageLength = 0,
): Promise<Record<string, unknown>[]> {
  const pageSize = 500;
  const maxRecords = limitPageLength > 0 ? limitPageLength : 10000;
  let allData: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    const currentLimit = Math.min(pageSize, maxRecords - offset);
    const params = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit_page_length: String(currentLimit),
      limit_start: String(offset),
      ...(orderBy ? { order_by: orderBy } : {}),
    });

    const res = await fetch(
      `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`,
      { headers: { Authorization: adminAuth, Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe ${doctype} ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const page: Record<string, unknown>[] = json?.data ?? [];
    allData = allData.concat(page);
    if (page.length < currentLimit) break;
    offset += pageSize;
  }

  return allData;
}

// ── GET handler ──

export async function GET(request: NextRequest) {
  const session = parseSession(request);
  if (!session?.roles || !isDirectorRole(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "all"; // month | quarter | year | all

  try {
    // Step 1 — Get branches (exclude HQ)
    const companies = await frappeGet(
      "Company",
      ["name", "company_name", "abbr"],
      [],
      "name asc",
    );
    const branches = companies.filter((c) => c.name !== "Smart Up");

    // Step 2 — Period boundaries
    const today = new Date();
    let fromDate: string | null = null;
    if (period === "month") {
      fromDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (period === "quarter") {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      fromDate = `${today.getFullYear()}-${String(qMonth + 1).padStart(2, "0")}-01`;
    } else if (period === "year") {
      // Indian financial year: April to March
      const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      fromDate = `${fy}-04-01`;
    }
    const todayStr = today.toISOString().slice(0, 10);

    // Step 3 — Fetch all data in parallel
    const studentFilters: (string | number | string[])[][] = [];
    const invoiceFilters: (string | number | string[])[][] = [
      ["docstatus", "=", 1],
    ];
    const salesOrderFilters: (string | number | string[])[][] = [
      ["docstatus", "=", 1],
    ];

    const [students, invoices, salesOrders, studentGroups, employees, dueInvoices] =
      await Promise.all([
        // All students
        frappeGet(
          "Student",
          ["name", "custom_branch", "enabled", "joining_date"],
          studentFilters,
        ),
        // All submitted invoices
        frappeGet(
          "Sales Invoice",
          ["name", "company", "grand_total", "outstanding_amount"],
          invoiceFilters,
        ),
        // All submitted sales orders (for plan info)
        frappeGet(
          "Sales Order",
          ["name", "company", "grand_total", "advance_paid"],
          salesOrderFilters,
        ),
        // All active student groups (batches)
        frappeGet(
          "Student Group",
          ["name", "custom_branch"],
          [["disabled", "=", 0]],
        ),
        // All active employees (staff)
        frappeGet(
          "Employee",
          ["name", "company"],
          [["status", "=", "Active"]],
        ),
        // Overdue invoices (due_date <= today, outstanding > 0)
        frappeGet(
          "Sales Invoice",
          ["name", "company", "outstanding_amount", "student"],
          [
            ["docstatus", "=", 1],
            ["outstanding_amount", ">", 0],
            ["due_date", "<=", todayStr],
          ],
        ),
      ]);

    // Step 4 — Aggregate per branch
    const result = branches.map((b) => {
      const branchName = b.name as string;
      const shortName = (branchName).replace("Smart Up ", "");

      // Students — count all enrolled (matching dashboard behaviour)
      const branchStudents = students.filter((s) => s.custom_branch === branchName);
      const activeStudents = branchStudents.length;

      // New admissions in period
      let newAdmissions = 0;
      if (fromDate) {
        newAdmissions = branchStudents.filter((s) => {
          const jd = s.joining_date as string | null;
          return jd && jd >= fromDate! && jd <= todayStr;
        }).length;
      } else {
        // "all" → all students are "admissions"
        newAdmissions = branchStudents.length;
      }

      // Invoices
      const branchInvoices = invoices.filter((i) => i.company === branchName);
      const totalBilled = branchInvoices.reduce(
        (sum, i) => sum + (i.grand_total as number || 0),
        0,
      );
      const totalPending = branchInvoices.reduce(
        (sum, i) => sum + (i.outstanding_amount as number || 0),
        0,
      );
      const totalCollected = totalBilled - totalPending;

      // Sales orders (for total revenue reference)
      const branchSO = salesOrders.filter((so) => so.company === branchName);
      const totalRevenue = branchSO.reduce(
        (sum, so) => sum + (so.grand_total as number || 0),
        0,
      );

      // Overdue
      const branchOverdue = dueInvoices.filter((i) => i.company === branchName);
      const overdueAmount = branchOverdue.reduce(
        (sum, i) => sum + (i.outstanding_amount as number || 0),
        0,
      );
      const overdueStudents = new Set(branchOverdue.map((i) => i.student)).size;

      // Batches
      const batchCount = studentGroups.filter(
        (g) => g.custom_branch === branchName,
      ).length;

      // Staff
      const staffCount = employees.filter((e) => e.company === branchName).length;

      // Collection rate
      const collectionRate = totalBilled > 0
        ? Math.round((totalCollected / totalBilled) * 100)
        : 0;

      return {
        branch: branchName,
        branchShort: shortName,
        activeStudents,
        newAdmissions,
        totalBilled,
        totalCollected,
        pendingFees: totalPending,
        overdueAmount,
        studentsWithDues: overdueStudents,
        collectionRate,
        batchCount,
        staffCount,
        totalRevenue,
        overallScore: 0,        // computed below
        scoreAdmissions: 0,     // component scores (0-100 each)
        scoreCollectedAmt: 0,
        scoreCollectionRate: 0,
      };
    });

    // ── Composite "Overall" score ──
    // Weights: Admissions 40% + Collection Amount 35% + Collection Rate 25%
    // Admission target is 400 per branch (absolute target).
    // Collection amount is normalised against the best branch so size differences don't distort.
    const admissionTarget = 400; // per-branch annual target
    const maxCollected  = Math.max(...result.map((r) => r.totalCollected), 1);

    result.forEach((r) => {
      const admissionScore        = Math.min(100, (r.newAdmissions / admissionTarget) * 100);
      const collectionAmountScore = (r.totalCollected / maxCollected) * 100;
      const collectionRateScore   = r.collectionRate; // already 0-100
      r.scoreAdmissions     = Math.round(admissionScore);
      r.scoreCollectedAmt   = Math.round(collectionAmountScore);
      r.scoreCollectionRate = Math.round(collectionRateScore);
      r.overallScore = Math.round(
        admissionScore        * 0.40 +
        collectionAmountScore * 0.35 +
        collectionRateScore   * 0.25,
      );
    });

    // Sort by overallScore descending (default view)
    result.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json({ data: result, period, admissionTarget });
  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
