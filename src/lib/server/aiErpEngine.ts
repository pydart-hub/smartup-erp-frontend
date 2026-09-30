import { NextRequest, NextResponse } from "next/server";
import { getAllBranchesSummary } from "@/app/api/director/report-summary/route";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY || "03330270e330d49";
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";
const AI_AGENT_SECRET_KEY = process.env.AI_AGENT_SECRET_KEY || "smartup-ai-agent-key-2026";

const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ai-agent-key",
};

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function verifyAiAccess(request: NextRequest): { authorized: boolean; identity: string } {
  // 1. Check Query parameter (?key= or ?api_key=)
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("api_key") || searchParams.get("key");
  if (queryKey && queryKey === AI_AGENT_SECRET_KEY) {
    return { authorized: true, identity: "ai_agent_query_param" };
  }

  // 2. Check Authorization Header / Custom Header
  const authHeader = request.headers.get("authorization");
  const agentKey = request.headers.get("x-ai-agent-key");

  if (agentKey && agentKey === AI_AGENT_SECRET_KEY) {
    return { authorized: true, identity: "ai_agent_header" };
  }

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === AI_AGENT_SECRET_KEY) {
      return { authorized: true, identity: "ai_agent_bearer" };
    }
  }

  // 3. Check Director Session Cookie
  const sessionCookie = request.cookies.get("smartup_session");
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      ) as { email?: string; roles?: string[] };
      const roles = sessionData.roles || [];
      const isDirector =
        roles.includes("Administrator") ||
        roles.includes("Director") ||
        roles.includes("Management") ||
        roles.includes("General Manager");

      if (isDirector) {
        return { authorized: true, identity: `user:${sessionData.email || "director"}` };
      }
    } catch {
      // ignore parse error
    }
  }

  return { authorized: false, identity: "unauthorized" };
}

export async function frappeGet(
  doctype: string,
  fields: string[],
  filters: (string | number | string[])[][] = [],
  orderBy?: string,
  limitPageLength = 200,
  groupBy?: string,
  retries = 2
): Promise<Record<string, unknown>[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify(fields),
        filters: JSON.stringify(filters),
        limit_page_length: String(limitPageLength),
        ...(orderBy ? { order_by: orderBy } : {}),
        ...(groupBy ? { group_by: groupBy } : {}),
      });

      const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}?${params}`, {
        headers: { Authorization: adminAuth, Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.data || []) as Record<string, unknown>[];
    } catch {
      if (attempt === retries) return [];
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return [];
}

export async function getCount(
  doctype: string,
  filters?: (string | number | string[])[][]
): Promise<number> {
  try {
    const params = new URLSearchParams({ doctype });
    if (filters && filters.length > 0) {
      params.set("filters", JSON.stringify(filters));
    }
    const res = await fetch(`${FRAPPE_URL}/api/method/frappe.client.get_count?${params}`, {
      headers: { Authorization: adminAuth, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json.message || 0);
  } catch {
    return 0;
  }
}

export interface LiveBranchStat {
  branch: string;
  short_name: string;
  total_students: number;
  active_students: number;
  discontinued_students: number;
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: string;
  invoice_count: number;
  staff?: number;
}

export async function fetchLiveBranchData(): Promise<{
  liveBranchList: LiveBranchStat[];
  admissionTypes: Record<string, number>;
  totalBatches: number;
  totalPrograms: number;
  totalStaff: number;
}> {
  const [directorSummary, studentTypeRows, totalBatchesCount, totalProgramsCount] =
    await Promise.all([
      getAllBranchesSummary(),
      frappeGet(
        "Student",
        ["custom_student_type", "count(name) as type_count"],
        [],
        undefined,
        50,
        "custom_student_type"
      ),
      getCount("Student Group", [["disabled", "=", 0]]),
      getCount("Program", []),
    ]);

  const liveBranchList: LiveBranchStat[] = directorSummary
    .map((r) => {
      const branchName = r.branch;
      const shortName = branchName.replace(/^Smart\s*Up\s*/i, "").trim() || branchName;
      const collectionRate =
        r.totalFee > 0 ? `${((r.collectedFee / r.totalFee) * 100).toFixed(1)}%` : "0.0%";

      return {
        branch: branchName,
        short_name: shortName,
        total_students: r.totalStudents,
        active_students: r.active,
        discontinued_students: r.discontinued,
        total_invoiced: r.totalFee,
        total_collected: r.collectedFee,
        total_outstanding: r.pendingFee,
        collection_rate: collectionRate,
        invoice_count: 0,
        staff: r.staff,
      };
    })
    .sort((a, b) => a.branch.localeCompare(b.branch));

  const admissionTypes: Record<string, number> = {};
  for (const row of studentTypeRows) {
    const typeKey = String(row.custom_student_type || "unspecified").toLowerCase();
    admissionTypes[typeKey] = Number(row.type_count || 0);
  }

  const totalStaff = directorSummary.reduce((sum, r) => sum + r.staff, 0);

  return {
    liveBranchList,
    admissionTypes,
    totalBatches: totalBatchesCount,
    totalPrograms: totalProgramsCount,
    totalStaff,
  };
}

export function matchBranchInList(
  input: string | null | undefined,
  list: LiveBranchStat[]
): LiveBranchStat | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase().replace(/[-_]/g, " ");
  return list.find((b) => {
    const bName = b.branch.toLowerCase();
    const sName = b.short_name.toLowerCase();
    return bName === clean || sName === clean || clean.includes(sName) || bName.includes(clean);
  });
}

// ── LIVE OVERDUE DUES (MATCHING DIRECTOR PORTAL EXACTLY) ──
export async function getLiveOverdueDues(branchName?: string) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Fetch discontinued customer IDs
  const discFilters: (string | number | string[])[][] = [
    ["enabled", "=", 0],
    ["custom_discontinuation_date", "is", "set"],
  ];
  if (branchName) {
    discFilters.push(["custom_branch", "=", branchName]);
  }
  const discRes = await frappeGet("Student", ["customer"], discFilters, undefined, 500);
  const discCustomers = discRes.map((s) => String(s.customer || "")).filter(Boolean);

  const invFilters: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["outstanding_amount", ">", 0],
    ["due_date", "<=", todayStr],
  ];
  if (discCustomers.length > 0) {
    invFilters.push(["customer", "not in", discCustomers]);
  }
  if (branchName) {
    invFilters.push(["company", "=", branchName]);
  }

  const [branchRows, totalRows] = await Promise.all([
    frappeGet(
      "Sales Invoice",
      [
        "company",
        "sum(outstanding_amount) as total_dues",
        "count(name) as invoice_count",
        "count(distinct customer) as student_count",
      ],
      invFilters,
      "total_dues desc",
      100,
      "company"
    ),
    frappeGet(
      "Sales Invoice",
      [
        "sum(outstanding_amount) as total_dues",
        "count(name) as invoice_count",
        "count(distinct customer) as student_count",
      ],
      invFilters,
      undefined,
      1
    ),
  ]);

  const totalRow = totalRows[0] || {};
  const totalOverdue = Math.round(Number(totalRow.total_dues || 0));
  const studentCount = Number(totalRow.student_count || 0);
  const invoiceCount = Number(totalRow.invoice_count || 0);

  const branchBreakdown = branchRows.map((r) => ({
    branch: String(r.company || "Unknown"),
    total_overdue: Math.round(Number(r.total_dues || 0)),
    student_count: Number(r.student_count || 0),
    invoice_count: Number(r.invoice_count || 0),
  }));

  return {
    as_of_date: todayStr,
    scope: branchName || "All Branches (Consolidated)",
    total_overdue: totalOverdue,
    students_with_overdue: studentCount,
    overdue_invoices_count: invoiceCount,
    branch_breakdown: branchBreakdown,
  };
}

// ── LIVE FEES ──
export async function getLiveFeesData(
  branchName?: string,
  limit = 50,
  date?: string,
  fromDate?: string,
  toDate?: string
) {
  const invFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  if (branchName) invFilters.push(["company", "=", branchName]);

  const peFilters: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["payment_type", "=", "Receive"],
  ];
  if (branchName) peFilters.push(["company", "=", branchName]);

  const hasDateFilter = Boolean(date || fromDate || toDate);
  const targetDateFrom = fromDate || date;
  const targetDateTo = toDate || date;

  if (targetDateFrom && targetDateTo) {
    peFilters.push(["posting_date", ">=", targetDateFrom]);
    peFilters.push(["posting_date", "<=", targetDateTo]);
  }

  const [recentInvoices, recentPayments, feeStructures, branchMeta, dailyCollections, overdueData] =
    await Promise.all([
      frappeGet(
        "Sales Invoice",
        [
          "name",
          "customer",
          "customer_name",
          "company",
          "grand_total",
          "outstanding_amount",
          "status",
          "posting_date",
          "due_date",
        ],
        invFilters,
        "posting_date desc",
        limit
      ),
      frappeGet(
        "Payment Entry",
        [
          "name",
          "party",
          "party_name",
          "company",
          "paid_amount",
          "received_amount",
          "posting_date",
          "mode_of_payment",
          "reference_no",
        ],
        peFilters,
        "posting_date desc",
        hasDateFilter ? 500 : limit
      ),
      frappeGet(
        "Fee Structure",
        ["name", "academic_year", "company", "total_amount", "program"],
        branchName ? [["company", "=", branchName]] : [],
        "creation desc",
        30
      ),
      fetchLiveBranchData(),
      hasDateFilter ? getLiveDailyCollections(date, fromDate, toDate, branchName) : null,
      getLiveOverdueDues(branchName),
    ]);

  const matched = matchBranchInList(branchName, branchMeta.liveBranchList);

  const systemTotalInvoiced = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_invoiced, 0);
  const systemTotalOutstanding = branchMeta.liveBranchList.reduce(
    (sum, b) => sum + b.total_outstanding,
    0
  );
  const systemTotalCollected = branchMeta.liveBranchList.reduce(
    (sum, b) => sum + b.total_collected,
    0
  );
  const systemCollectionRate =
    systemTotalInvoiced > 0
      ? `${((systemTotalCollected / systemTotalInvoiced) * 100).toFixed(1)}%`
      : "0.0%";

  return {
    summary: {
      scope: matched ? matched.branch : "All Branches (Consolidated)",
      total_invoiced: matched ? matched.total_invoiced : systemTotalInvoiced,
      total_collected: matched ? matched.total_collected : systemTotalCollected,
      total_outstanding: matched ? matched.total_outstanding : systemTotalOutstanding,
      collection_rate: matched ? matched.collection_rate : systemCollectionRate,
      total_overdue: overdueData.total_overdue,
      students_with_overdue: overdueData.students_with_overdue,
      overdue_invoices_count: overdueData.overdue_invoices_count,
    },
    overdue_summary: overdueData,
    branch_breakdown: matched ? [matched] : branchMeta.liveBranchList,
    overdue_by_branch: overdueData.branch_breakdown,
    recent_invoices_sample: recentInvoices.slice(0, 20),
    recent_payments: recentPayments,
    fee_structures_count: feeStructures.length,
    daily_collections: dailyCollections,
    period_collections: dailyCollections
      ? {
          from_date: targetDateFrom,
          to_date: targetDateTo,
          total_collected: dailyCollections.grand_total_collections,
          payment_count: dailyCollections.payment_count,
          branch_breakdown: dailyCollections.branch_breakdown,
          payment_modes: dailyCollections.mode_of_payment_breakdown,
        }
      : null,
  };
}

// ── DAILY COLLECTIONS BY EXACT DATE ──
export async function getLiveDailyCollections(
  date?: string,
  fromDate?: string,
  toDate?: string,
  branchName?: string
) {
  const targetFrom = fromDate || date || new Date().toISOString().slice(0, 10);
  const targetTo = toDate || date || new Date().toISOString().slice(0, 10);

  const filters: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["payment_type", "=", "Receive"],
    ["posting_date", ">=", targetFrom],
    ["posting_date", "<=", targetTo],
  ];

  if (branchName) {
    filters.push(["company", "=", branchName]);
  }

  const payments = await frappeGet(
    "Payment Entry",
    [
      "name",
      "party",
      "party_name",
      "company",
      "posting_date",
      "paid_amount",
      "mode_of_payment",
      "reference_no",
    ],
    filters,
    "posting_date desc",
    1000
  );

  const grandTotal = payments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

  const branchMap: Record<string, { branch: string; total: number; count: number }> = {};
  const modeMap: Record<string, { mode: string; total: number; count: number }> = {};

  for (const p of payments) {
    const bName = String(p.company || "Unknown");
    const mName = String(p.mode_of_payment || "Unspecified");
    const amt = Number(p.paid_amount || 0);

    if (!branchMap[bName]) branchMap[bName] = { branch: bName, total: 0, count: 0 };
    branchMap[bName].total += amt;
    branchMap[bName].count += 1;

    if (!modeMap[mName]) modeMap[mName] = { mode: mName, total: 0, count: 0 };
    modeMap[mName].total += amt;
    modeMap[mName].count += 1;
  }

  return {
    date_range: { from: targetFrom, to: targetTo },
    grand_total_collections: grandTotal,
    payment_count: payments.length,
    branch_breakdown: Object.values(branchMap).sort((a, b) => b.total - a.total),
    mode_of_payment_breakdown: Object.values(modeMap).sort((a, b) => b.total - a.total),
    payments: payments.map((p) => ({
      payment_id: p.name,
      student_id: p.party,
      student_name: p.party_name,
      branch: p.company,
      amount: p.paid_amount,
      mode: p.mode_of_payment,
      reference_no: p.reference_no,
      date: p.posting_date,
    })),
  };
}

// ── EXPENSES BY DATE & BRANCH ──
export async function getLiveExpensesData(
  date?: string,
  fromDate?: string,
  toDate?: string,
  branchName?: string
) {
  const targetFrom = fromDate || date || new Date().toISOString().slice(0, 10);
  const targetTo = toDate || date || new Date().toISOString().slice(0, 10);

  // 1. Fetch non-group expense accounts
  const expenseAccounts = await frappeGet(
    "Account",
    ["name", "company", "account_name"],
    [
      ["root_type", "=", "Expense"],
      ["is_group", "=", 0],
    ],
    undefined,
    1000
  );

  const expAccountSet = new Set(expenseAccounts.map((a) => String(a.name)));
  const expAccountNameMap = new Map(expenseAccounts.map((a) => [String(a.name), String(a.account_name)]));

  // 2. Fetch GL Entries
  const glFilters: (string | number | string[])[][] = [
    ["is_cancelled", "=", 0],
    ["debit", ">", 0],
    ["posting_date", ">=", targetFrom],
    ["posting_date", "<=", targetTo],
  ];

  if (branchName) {
    glFilters.push(["company", "=", branchName]);
  }

  const rawEntries = await frappeGet(
    "GL Entry",
    ["name", "posting_date", "account", "debit", "voucher_type", "voucher_no", "remarks", "company"],
    glFilters,
    "posting_date desc",
    1000
  );

  const expenseEntries = rawEntries.filter((e) => expAccountSet.has(String(e.account)));
  const totalExpense = expenseEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);

  const branchMap: Record<string, { branch: string; total: number; count: number }> = {};
  const categoryMap: Record<string, { category: string; total: number; count: number }> = {};

  for (const e of expenseEntries) {
    const bName = String(e.company || "Unknown");
    const catName = expAccountNameMap.get(String(e.account)) || String(e.account);
    const amt = Number(e.debit || 0);

    if (!branchMap[bName]) branchMap[bName] = { branch: bName, total: 0, count: 0 };
    branchMap[bName].total += amt;
    branchMap[bName].count += 1;

    if (!categoryMap[catName]) categoryMap[catName] = { category: catName, total: 0, count: 0 };
    categoryMap[catName].total += amt;
    categoryMap[catName].count += 1;
  }

  return {
    date_range: { from: targetFrom, to: targetTo },
    total_expense: totalExpense,
    entries_count: expenseEntries.length,
    branch_breakdown: Object.values(branchMap).sort((a, b) => b.total - a.total),
    category_breakdown: Object.values(categoryMap).sort((a, b) => b.total - a.total),
    transactions: expenseEntries.map((e) => ({
      gl_entry: e.name,
      date: e.posting_date,
      account: expAccountNameMap.get(String(e.account)) || e.account,
      branch: e.company,
      amount: e.debit,
      voucher_type: e.voucher_type,
      voucher_no: e.voucher_no,
      remarks: e.remarks,
    })),
  };
}

// ── EXAM PERFORMANCE & RANKING ENGINE ──
export async function getLiveExamPerformance(
  examGroup?: string,
  branchName?: string,
  limit = 15
) {
  // 1. Fetch Assessment Plans (both CWC-specific and general plans)
  const isCwcExplicit = examGroup && examGroup.toLowerCase().includes("cwc");
  const cwcFilter: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["assessment_group", "like", "%CWC%"],
  ];
  const generalFilter: (string | number | string[])[][] = [["docstatus", "=", 1]];
  if (examGroup && examGroup.toLowerCase() !== "all" && !isCwcExplicit) {
    generalFilter.push(["assessment_group", "like", `%${examGroup}%`]);
  }

  const [cwcPlans, allPlans, results] = await Promise.all([
    frappeGet(
      "Assessment Plan",
      ["name", "assessment_group", "assessment_name", "student_group", "course", "maximum_assessment_score"],
      cwcFilter,
      "creation desc",
      500
    ),
    frappeGet(
      "Assessment Plan",
      ["name", "assessment_group", "assessment_name", "student_group", "course", "maximum_assessment_score"],
      generalFilter,
      "creation desc",
      1000
    ),
    frappeGet(
      "Assessment Result",
      ["name", "student", "student_name", "assessment_plan", "total_score", "maximum_score"],
      [["docstatus", "=", 1]],
      "total_score desc",
      2500
    ),
  ]);

  const planMap = new Map<string, Record<string, unknown>>();
  for (const p of allPlans) planMap.set(String(p.name), p);
  for (const p of cwcPlans) planMap.set(String(p.name), p);

  function resolveBranch(studentId: string, studentGroup?: unknown) {
    const sId = String(studentId || "");
    if (sId.includes("CHL")) return "Smart Up Chullickal";
    if (sId.includes("PLR")) return "Smart Up Palluruthy";
    if (sId.includes("ERV")) return "Smart Up Eraveli";
    if (sId.includes("FTK") || sId.includes("FKO")) return "Smart Up Fortkochi";
    if (sId.includes("THP")) return "Smart Up Thopumpadi";
    if (sId.includes("VNL") || sId.includes("VYT")) return "Smart Up Vennala";
    if (sId.includes("MMK") || sId.includes("MKZ")) return "Smart Up Moolamkuzhi";
    if (sId.includes("EDPLY") || sId.includes("EDP")) return "Smart Up Edappally";
    if (sId.includes("KDV")) return "Smart Up Kadavanthara";
    if (studentGroup) {
      const g = String(studentGroup).split("-")[0];
      if (g) return `Smart Up ${g}`;
    }
    return "Smart Up General";
  }

  const examAgg = new Map<
    string,
    {
      exam_name: string;
      course: string;
      group: string;
      attempts: number;
      total_score: number;
      total_max_score: number;
      pass_count: number;
      top_score: number;
      top_student: string;
      top_student_branch: string;
    }
  >();

  const studentAgg = new Map<
    string,
    {
      student_id: string;
      student_name: string;
      branch: string;
      exams_taken: number;
      total_score: number;
      total_max_score: number;
      best_exam: string;
      best_score: number;
      best_percentage: number;
      is_cwc_participant: boolean;
    }
  >();

  for (const r of results) {
    const plan = planMap.get(String(r.assessment_plan));
    if (examGroup && examGroup.toLowerCase() !== "all" && !plan) {
      continue;
    }

    const examName = String(plan?.assessment_name || plan?.assessment_group || "General Assessment");
    const group = String(plan?.assessment_group || "Assessment");
    const course = String(plan?.course || "General");
    const maxScore = Number(r.maximum_score || plan?.maximum_assessment_score || 100);
    const score = Number(r.total_score || 0);
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const branch = resolveBranch(String(r.student || ""), plan?.student_group);

    if (branchName) {
      const cleanBranch = branchName.toLowerCase().replace(/[-_]/g, " ");
      if (!branch.toLowerCase().includes(cleanBranch)) continue;
    }

    // Exam aggregator
    if (!examAgg.has(examName)) {
      examAgg.set(examName, {
        exam_name: examName,
        course,
        group,
        attempts: 0,
        total_score: 0,
        total_max_score: 0,
        pass_count: 0,
        top_score: 0,
        top_student: "",
        top_student_branch: "",
      });
    }
    const ea = examAgg.get(examName)!;
    ea.attempts++;
    ea.total_score += score;
    ea.total_max_score += maxScore;
    if (pct >= 40) ea.pass_count++;
    if (score > ea.top_score) {
      ea.top_score = score;
      ea.top_student = String(r.student_name || r.student);
      ea.top_student_branch = branch;
    }

    // Student aggregator
    const sId = String(r.student || "");
    if (!studentAgg.has(sId)) {
      studentAgg.set(sId, {
        student_id: sId,
        student_name: String(r.student_name || sId),
        branch,
        exams_taken: 0,
        total_score: 0,
        total_max_score: 0,
        best_exam: examName,
        best_score: score,
        best_percentage: pct,
        is_cwc_participant: group.toLowerCase().includes("cwc"),
      });
    }
    const sa = studentAgg.get(sId)!;
    sa.exams_taken++;
    sa.total_score += score;
    sa.total_max_score += maxScore;
    if (group.toLowerCase().includes("cwc")) sa.is_cwc_participant = true;
    if (score > sa.best_score || (score === sa.best_score && pct > sa.best_percentage)) {
      sa.best_score = score;
      sa.best_percentage = Number(pct.toFixed(1));
      sa.best_exam = examName;
    }
  }

  // Format best performing exams
  const bestExams = Array.from(examAgg.values())
    .map((e) => ({
      exam_name: e.exam_name,
      course: e.course,
      group: e.group,
      student_attempts: e.attempts,
      average_percentage:
        e.total_max_score > 0 ? Number(((e.total_score / e.total_max_score) * 100).toFixed(1)) : 0,
      pass_rate: e.attempts > 0 ? `${((e.pass_count / e.attempts) * 100).toFixed(1)}%` : "0%",
      top_performer: e.top_student,
      top_score: e.top_score,
      top_performer_branch: e.top_student_branch,
    }))
    .filter((e) => e.student_attempts >= 3)
    .sort((a, b) => b.average_percentage - a.average_percentage);

  // Format top students
  const topStudents = Array.from(studentAgg.values())
    .map((s) => ({
      student_id: s.student_id,
      student_name: s.student_name,
      branch: s.branch,
      exams_taken: s.exams_taken,
      total_score: s.total_score,
      total_max_score: s.total_max_score,
      overall_percentage:
        s.total_max_score > 0 ? Number(((s.total_score / s.total_max_score) * 100).toFixed(1)) : 0,
      best_exam: s.best_exam,
      best_score: s.best_score,
      best_percentage: s.best_percentage,
      is_cwc: s.is_cwc_participant,
    }))
    .sort((a, b) => b.overall_percentage - a.overall_percentage);

  // CWC Toppers by Branch
  const cwcStudents = topStudents.filter((s) => s.is_cwc);
  const branchCwcToppers: Record<string, typeof topStudents> = {};
  for (const s of cwcStudents) {
    if (!branchCwcToppers[s.branch]) branchCwcToppers[s.branch] = [];
    if (branchCwcToppers[s.branch].length < 5) {
      branchCwcToppers[s.branch].push(s);
    }
  }

  return {
    filter_exam_group: examGroup || "All Exams",
    filter_branch: branchName || "All Branches",
    summary: {
      total_evaluated_students: topStudents.length,
      total_exams_evaluated: bestExams.length,
      total_cwc_participants: cwcStudents.length,
      best_performing_exam: bestExams[0]?.exam_name || "N/A",
      best_exam_avg_score: bestExams[0]?.average_percentage ? `${bestExams[0].average_percentage}%` : "N/A",
      top_student_overall: topStudents[0]?.student_name || "N/A",
      top_student_percentage: topStudents[0]?.overall_percentage ? `${topStudents[0].overall_percentage}%` : "N/A",
      top_student_branch: topStudents[0]?.branch || "N/A",
    },
    best_performing_exams: bestExams.slice(0, limit),
    best_performing_students: topStudents.slice(0, limit),
    cwc_exam_toppers_by_branch: branchCwcToppers,
  };
}

// ── CWC & REGULAR EXAM TOPPERS ──
export async function getLiveExamToppers(
  examType = "cwc",
  branchName?: string,
  limit = 10
) {
  const perf = await getLiveExamPerformance(examType, branchName, limit);
  return {
    exam_type: examType,
    summary: perf.summary,
    total_evaluated_students: perf.summary.total_evaluated_students,
    overall_top_students: perf.best_performing_students,
    toppers_by_branch: perf.cwc_exam_toppers_by_branch,
    best_performing_exams: perf.best_performing_exams,
  };
}

// ── STUDENTS WITH UNPAID / ZERO FEE PAYMENTS ──
export async function getLiveFeeDefaulters(
  branchName?: string,
  minDue = 0,
  zeroPaidOnly = true,
  limit = 50
) {
  const invFilters: (string | number | string[])[][] = [
    ["docstatus", "=", 1],
    ["outstanding_amount", ">", minDue],
  ];

  if (branchName) {
    invFilters.push(["company", "=", branchName]);
  }

  const invoices = await frappeGet(
    "Sales Invoice",
    [
      "name",
      "customer",
      "customer_name",
      "company",
      "grand_total",
      "outstanding_amount",
      "posting_date",
      "due_date",
    ],
    invFilters,
    "outstanding_amount desc",
    500
  );

  const filtered = zeroPaidOnly
    ? invoices.filter(
        (inv) => Math.abs(Number(inv.outstanding_amount || 0) - Number(inv.grand_total || 0)) < 1
      )
    : invoices;

  const totalUnpaid = filtered.reduce((s, i) => s + Number(i.outstanding_amount || 0), 0);

  const studentMap: Record<
    string,
    {
      student_name: string;
      branch: string;
      total_invoiced: number;
      total_unpaid: number;
      invoice_count: number;
      invoices: string[];
      oldest_due_date: string;
    }
  > = {};

  for (const inv of filtered) {
    const cust = String(inv.customer_name || inv.customer || "Unknown");
    const amt = Number(inv.outstanding_amount || 0);
    const total = Number(inv.grand_total || 0);
    const invName = String(inv.name);
    const dueDate = String(inv.due_date || inv.posting_date || "");

    if (!studentMap[cust]) {
      studentMap[cust] = {
        student_name: cust,
        branch: String(inv.company || "Unknown"),
        total_invoiced: 0,
        total_unpaid: 0,
        invoice_count: 0,
        invoices: [],
        oldest_due_date: dueDate,
      };
    }

    studentMap[cust].total_invoiced += total;
    studentMap[cust].total_unpaid += amt;
    studentMap[cust].invoice_count += 1;
    studentMap[cust].invoices.push(invName);
    if (dueDate && dueDate < studentMap[cust].oldest_due_date) {
      studentMap[cust].oldest_due_date = dueDate;
    }
  }

  const defaultersList = Object.values(studentMap)
    .sort((a, b) => b.total_unpaid - a.total_unpaid)
    .slice(0, limit);

  return {
    filter_zero_paid_only: zeroPaidOnly,
    defaulters_count: Object.keys(studentMap).length,
    total_unpaid_amount: Math.round(totalUnpaid),
    branch: branchName || "All Branches",
    students_with_unpaid_fees: defaultersList,
  };
}

// ── LIVE STUDENTS & ACADEMICS ──
export async function getLiveStudentsData(branchName?: string, limit = 50) {
  const studentFilters: (string | number | string[])[][] = [["enabled", "=", 1]];
  if (branchName) studentFilters.push(["custom_branch", "=", branchName]);

  const batchFilters: (string | number | string[])[][] = [["disabled", "=", 0]];
  if (branchName) batchFilters.push(["custom_branch", "=", branchName]);

  const [recentStudents, batches, branchMeta] = await Promise.all([
    frappeGet(
      "Student",
      ["name", "first_name", "last_name", "student_name", "custom_branch", "student_email_id", "joining_date", "enabled", "customer"],
      studentFilters,
      "creation desc",
      limit
    ),
    frappeGet(
      "Student Group",
      ["name", "student_group_name", "program", "custom_branch", "max_strength"],
      batchFilters,
      "creation desc",
      50
    ),
    fetchLiveBranchData(),
  ]);

  const matched = matchBranchInList(branchName, branchMeta.liveBranchList);

  const systemTotalStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.total_students, 0);
  const systemActiveStudents = branchMeta.liveBranchList.reduce((sum, b) => sum + b.active_students, 0);
  const systemDiscontinuedStudents = branchMeta.liveBranchList.reduce(
    (sum, b) => sum + b.discontinued_students,
    0
  );

  return {
    summary: {
      scope: matched ? matched.branch : "All Branches (Consolidated)",
      total_students: matched ? matched.total_students : systemTotalStudents,
      active_students: matched ? matched.active_students : systemActiveStudents,
      discontinued_students: matched ? matched.discontinued_students : systemDiscontinuedStudents,
      active_batches_count: branchMeta.totalBatches,
      programs_count: branchMeta.totalPrograms,
    },
    admission_types_live: branchMeta.admissionTypes,
    branch_breakdown: matched ? [matched] : branchMeta.liveBranchList,
    active_batches_sample: batches.slice(0, 25),
    recent_enrolled_students: recentStudents.slice(0, 20),
  };
}

// ── LIVE SALES ORDERS ──
export async function getLiveOrdersData(branchName?: string, limit = 50) {
  const filters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  if (branchName) filters.push(["company", "=", branchName]);

  const [orders, count] = await Promise.all([
    frappeGet(
      "Sales Order",
      ["name", "customer", "customer_name", "company", "grand_total", "status", "transaction_date"],
      filters,
      "transaction_date desc",
      limit
    ),
    getCount("Sales Order", filters),
  ]);

  const totalValue = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);

  return {
    summary: {
      total_orders_count: count,
      recent_sample_total_value: Math.round(totalValue),
    },
    recent_orders: orders,
  };
}

// ── LIVE ATTENDANCE ──
export async function getLiveAttendanceData(branchName?: string, limit = 50) {
  const attFilters: (string | number | string[])[][] = [["docstatus", "=", 1]];
  const [studentAttendance, staffAttendance] = await Promise.all([
    frappeGet(
      "Student Attendance",
      ["name", "student", "student_name", "date", "status", "student_group"],
      attFilters,
      "date desc",
      limit
    ),
    frappeGet(
      "Attendance",
      ["name", "employee", "employee_name", "attendance_date", "status", "company"],
      branchName ? [["company", "=", branchName]] : [],
      "attendance_date desc",
      30
    ),
  ]);

  const absentCount = studentAttendance.filter((a) => a.status === "Absent").length;
  const presentCount = studentAttendance.filter((a) => a.status === "Present").length;

  return {
    summary: {
      records_evaluated: studentAttendance.length,
      present_count: presentCount,
      absent_count: absentCount,
      sample_absenteeism_rate: studentAttendance.length
        ? `${((absentCount / studentAttendance.length) * 100).toFixed(1)}%`
        : "0%",
    },
    recent_student_absences: studentAttendance.filter((a) => a.status === "Absent").slice(0, 20),
    recent_staff_attendance: staffAttendance.slice(0, 15),
  };
}

// ── LIVE STAFF & INSTRUCTORS ──
export async function getLiveStaffData() {
  const [employeeCount, instructorCount, instructors] = await Promise.all([
    getCount("Employee"),
    getCount("Instructor"),
    frappeGet(
      "Instructor",
      ["name", "instructor_name", "department", "employee"],
      [],
      "creation desc",
      25
    ),
  ]);

  return {
    summary: {
      total_employees: employeeCount,
      total_instructors: instructorCount,
    },
    instructors_sample: instructors,
  };
}

// ── LIVE ISSUES & COMPLAINTS ──
export async function getLiveIssuesData(branchName?: string) {
  const filters: (string | number | string[])[][] = [];
  if (branchName) filters.push(["branch", "=", branchName]);

  const complaints = await frappeGet(
    "SmartUp Complaint",
    [
      "name",
      "subject",
      "category",
      "priority",
      "status",
      "description",
      "student_name",
      "branch",
      "creation",
    ],
    filters,
    "creation desc",
    50
  );

  const openComplaints = complaints.filter(
    (c) => String(c.status).toLowerCase() !== "resolved" && String(c.status).toLowerCase() !== "closed"
  );
  const highPriority = openComplaints.filter(
    (c) => String(c.priority).toLowerCase() === "high" || String(c.priority).toLowerCase() === "urgent"
  );

  return {
    summary: {
      open_complaints_count: openComplaints.length,
      urgent_complaints_count: highPriority.length,
      total_complaints_recorded: complaints.length,
    },
    urgent_open_complaints: highPriority,
    recent_open_complaints: openComplaints.slice(0, 15),
  };
}

// ── 360° STUDENT LOOKUP ──
export async function lookupStudent360(query: string) {
  const studentFields = [
    "name",
    "first_name",
    "last_name",
    "student_name",
    "custom_branch",
    "student_email_id",
    "joining_date",
    "enabled",
    "customer",
    "custom_student_type",
  ];

  let matchedStudents = await frappeGet(
    "Student",
    studentFields,
    [["name", "like", `%${query}%`]],
    "creation desc",
    10
  );

  if (matchedStudents.length === 0) {
    matchedStudents = await frappeGet(
      "Student",
      studentFields,
      [["student_name", "like", `%${query}%`]],
      "creation desc",
      10
    );
  }

  if (matchedStudents.length === 0) {
    return {
      query,
      found: false,
      message: `No student found matching "${query}".`,
    };
  }

  const topStudent = matchedStudents[0];
  const studentCustomer = String(topStudent.customer || topStudent.student_name || topStudent.name);

  const [invoices, payments, attendance, orders, complaints, enrollments, examResults] =
    await Promise.all([
      frappeGet(
        "Sales Invoice",
        [
          "name",
          "customer",
          "customer_name",
          "company",
          "grand_total",
          "outstanding_amount",
          "status",
          "posting_date",
          "due_date",
        ],
        [["customer", "=", studentCustomer]],
        "posting_date desc",
        20
      ),
      frappeGet(
        "Payment Entry",
        ["name", "party", "party_name", "paid_amount", "received_amount", "posting_date", "mode_of_payment"],
        [["party", "=", studentCustomer]],
        "posting_date desc",
        20
      ),
      frappeGet(
        "Student Attendance",
        ["name", "student", "student_name", "date", "status", "student_group"],
        [["student", "=", String(topStudent.name)]],
        "date desc",
        20
      ),
      frappeGet(
        "Sales Order",
        ["name", "customer", "customer_name", "grand_total", "status", "transaction_date"],
        [["customer", "=", studentCustomer]],
        "transaction_date desc",
        10
      ),
      frappeGet(
        "SmartUp Complaint",
        ["name", "subject", "category", "priority", "status", "description", "creation"],
        [["student_name", "=", studentCustomer]],
        "creation desc",
        10
      ),
      frappeGet(
        "Program Enrollment",
        ["name", "program", "academic_year", "student_batch_name", "enrollment_date"],
        [["student", "=", String(topStudent.name)]],
        "creation desc",
        5
      ),
      frappeGet(
        "Assessment Result",
        ["name", "assessment_plan", "total_score", "maximum_score", "creation"],
        [["student", "=", String(topStudent.name)], ["docstatus", "=", 1]],
        "creation desc",
        20
      ),
    ]);

  const totalBilled = invoices.reduce((s, i) => s + Number(i.grand_total || 0), 0);
  const totalPaid = payments.reduce(
    (s, p) => s + Number(p.paid_amount || p.received_amount || 0),
    0
  );
  const outstanding = invoices.reduce((s, i) => s + Number(i.outstanding_amount || 0), 0);

  return {
    query,
    found: true,
    student: topStudent,
    financial_summary: {
      total_billed: Math.round(totalBilled),
      total_paid: Math.round(totalPaid),
      outstanding: Math.round(outstanding),
    },
    invoices,
    payments,
    sales_orders: orders,
    attendance,
    complaints,
    program_enrollments: enrollments,
    exam_results: examResults.map((r) => ({
      result_id: r.name,
      plan: r.assessment_plan,
      total_score: r.total_score,
      maximum_score: r.maximum_score,
      percentage:
        Number(r.maximum_score || 0) > 0
          ? `${(((Number(r.total_score || 0)) / Number(r.maximum_score)) * 100).toFixed(1)}%`
          : "N/A",
      date: r.creation,
    })),
    other_matches: matchedStudents.slice(1),
  };
}
