import { NextRequest, NextResponse } from "next/server";

/**
 * /api/hr/leave-allocation
 *
 * Manages leave balance & annual allocations for the SmartUp HR module.
 *
 * Leave Policy:
 *   - 1.5 leaves per month = 18 leaves per year (Privilege Leave)
 *   - Unused leaves carry forward within the year (cumulative pool)
 *   - At year-end, remaining balance carries to next year allocation
 *
 * GET  ?company=X&year=YYYY
 *   → Returns per-employee leave balance summary for the given year
 *
 * POST { company, year, employee? }
 *   → Creates + submits annual Leave Allocations (18 leaves) for all active
 *     employees in the company who don't already have one for that year.
 *     Automatically computes & adds carry-forward from previous year.
 */

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const LEAVE_TYPE = "Privilege Leave";
const MONTHLY_ACCRUAL = 1.5;
const ANNUAL_ALLOCATION = 18; // 1.5 × 12

// ── helpers ────────────────────────────────────────────────────────────────

function getSession(request: NextRequest) {
  const cookie = request.cookies.get("smartup_session");
  if (!cookie) return null;
  try {
    const data = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    return {
      roles: (data.roles || []) as string[],
      defaultCompany: (data.default_company || "") as string,
      allowedCompanies: (data.allowed_companies || []) as string[],
    };
  } catch {
    return null;
  }
}

function adminHeaders() {
  return {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

/** Frappe REST GET helper */
async function frappeGet(path: string) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Frappe GET ${path} → ${res.status}`);
  return res.json();
}

/** Frappe REST POST helper */
async function frappePost(path: string, body: object) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Frappe POST ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

/** Frappe REST PUT helper */
async function frappePut(path: string, body: object) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Frappe PUT ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

/** ISO date string for first/last day of year */
function yearRange(year: number) {
  return {
    from_date: `${year}-01-01`,
    to_date: `${year}-12-31`,
  };
}

/**
 * Compute months elapsed from startDate to today (including partial month).
 * Returns a float, e.g. 3.9 for ~4 months.
 */
function monthsElapsed(startDate: Date, endDate: Date): number {
  if (endDate <= startDate) return 0;
  const y = endDate.getFullYear() - startDate.getFullYear();
  const m = endDate.getMonth() - startDate.getMonth();
  const totalMonths = y * 12 + m;
  const daysInEndMonth = new Date(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    0
  ).getDate();
  const partialMonth = endDate.getDate() / daysInEndMonth;
  return Math.max(0, totalMonths + partialMonth);
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { roles, defaultCompany } = session;
  const isAdmin = roles.includes("Administrator");
  const isHR = roles.includes("HR Manager");
  const isBM = roles.includes("Branch Manager");

  if (!isAdmin && !isHR && !isBM) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const url = new URL(request.url);
  const company = url.searchParams.get("company") || defaultCompany || "";
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);

  const { from_date, to_date } = yearRange(year);
  const prevYear = yearRange(year - 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // 1. Fetch all active employees (optionally filtered by company)
    const empFilters: (string | string[])[][] = [["status", "=", "Active"]];
    if (company) empFilters.push(["company", "=", company]);

    const empQuery = new URLSearchParams({
      fields: JSON.stringify(["name", "employee_name", "department", "designation", "date_of_joining", "status", "company"]),
      filters: JSON.stringify(empFilters),
      limit_page_length: "500",
      order_by: "company asc, employee_name asc",
    });
    const empRes = await frappeGet(`resource/Employee?${empQuery}`);
    const employees: {
      name: string; employee_name: string; department: string;
      designation: string; date_of_joining: string; status: string; company: string;
    }[] = empRes.data ?? [];

    if (employees.length === 0) {
      return NextResponse.json({ employees: [], year, company });
    }

    const employeeIds = employees.map((e) => e.name);

    // 2. Fetch current year Leave Allocations (submitted only)
    const allocQuery = new URLSearchParams({
      fields: JSON.stringify([
        "name", "employee", "employee_name", "leave_type",
        "from_date", "to_date", "new_leaves_allocated",
        "carry_forwarded_leaves_count", "total_leaves_allocated", "docstatus",
      ]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["from_date", ">=", from_date],
        ["to_date", "<=", to_date],
        ["docstatus", "=", "1"],
      ]),
      limit_page_length: "500",
    });
    const allocRes = await frappeGet(`resource/Leave Allocation?${allocQuery}`);
    const allocations: {
      name: string; employee: string; new_leaves_allocated: number;
      carry_forwarded_leaves_count: number; total_leaves_allocated: number;
    }[] = allocRes.data ?? [];

    // 3. Fetch previous year allocations (for carry-forward display)
    const prevAllocQuery = new URLSearchParams({
      fields: JSON.stringify([
        "employee", "new_leaves_allocated",
        "carry_forwarded_leaves_count", "total_leaves_allocated",
      ]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["from_date", ">=", prevYear.from_date],
        ["to_date", "<=", prevYear.to_date],
        ["docstatus", "=", "1"],
      ]),
      limit_page_length: "500",
    });
    const prevAllocRes = await frappeGet(`resource/Leave Allocation?${prevAllocQuery}`);
    const prevAllocations: { employee: string; total_leaves_allocated: number }[] =
      prevAllocRes.data ?? [];

    // 4. Fetch approved Leave Applications for current year (Privilege Leave)
    const leaveAppQuery = new URLSearchParams({
      fields: JSON.stringify(["employee", "total_leave_days", "from_date", "to_date", "status"]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["status", "=", "Approved"],
        ["from_date", ">=", from_date],
        ["to_date", "<=", to_date],
      ]),
      limit_page_length: "1000",
    });
    const leaveAppRes = await frappeGet(`resource/Leave Application?${leaveAppQuery}`);
    const leaveApps: { employee: string; total_leave_days: number }[] =
      leaveAppRes.data ?? [];

    // 5. Fetch previous year approved applications (for carry-forward calc)
    const prevAppQuery = new URLSearchParams({
      fields: JSON.stringify(["employee", "total_leave_days"]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["status", "=", "Approved"],
        ["from_date", ">=", prevYear.from_date],
        ["to_date", "<=", prevYear.to_date],
      ]),
      limit_page_length: "1000",
    });
    const prevAppRes = await frappeGet(`resource/Leave Application?${prevAppQuery}`);
    const prevApps: { employee: string; total_leave_days: number }[] =
      prevAppRes.data ?? [];

    // 6. Build lookup maps
    const allocByEmployee = new Map<string, number>();
    const carryFwdByEmployee = new Map<string, number>();
    for (const a of allocations) {
      allocByEmployee.set(a.employee, (allocByEmployee.get(a.employee) ?? 0) + a.total_leaves_allocated);
      carryFwdByEmployee.set(a.employee, (carryFwdByEmployee.get(a.employee) ?? 0) + a.carry_forwarded_leaves_count);
    }

    const usedByEmployee = new Map<string, number>();
    for (const app of leaveApps) {
      usedByEmployee.set(app.employee, (usedByEmployee.get(app.employee) ?? 0) + app.total_leave_days);
    }

    const prevAllocByEmployee = new Map<string, number>();
    for (const a of prevAllocations) {
      prevAllocByEmployee.set(a.employee, (prevAllocByEmployee.get(a.employee) ?? 0) + a.total_leaves_allocated);
    }

    const prevUsedByEmployee = new Map<string, number>();
    for (const app of prevApps) {
      prevUsedByEmployee.set(app.employee, (prevUsedByEmployee.get(app.employee) ?? 0) + app.total_leave_days);
    }

    // 7. Compute per-employee balance
    const yearStart = new Date(year, 0, 1); // Jan 1 of the year

    const result = employees.map((emp) => {
      const joinDate = emp.date_of_joining ? new Date(emp.date_of_joining) : yearStart;
      const effectiveStart = joinDate > yearStart ? joinDate : yearStart;
      const effectiveEnd = today < new Date(year, 11, 31) ? today : new Date(year, 11, 31);

      const months = Math.min(monthsElapsed(effectiveStart, effectiveEnd), 12);
      const accrued_to_date = Math.round(months * MONTHLY_ACCRUAL * 10) / 10;

      const total_allocated = allocByEmployee.get(emp.name) ?? 0;
      const carry_forward_from_prev = carryFwdByEmployee.get(emp.name) ?? 0;
      const new_leaves = total_allocated - carry_forward_from_prev;
      const used = usedByEmployee.get(emp.name) ?? 0;
      const available = Math.max(0, total_allocated - used);
      const has_allocation = allocByEmployee.has(emp.name);

      // Compute carry-forward that WOULD be created for next year
      const prev_allocated = prevAllocByEmployee.get(emp.name) ?? 0;
      const prev_used = prevUsedByEmployee.get(emp.name) ?? 0;
      const prev_balance = Math.max(0, prev_allocated - prev_used);

      return {
        employee: emp.name,
        employee_name: emp.employee_name,
        department: emp.department || "—",
        designation: emp.designation || "—",
        company: emp.company || "",
        date_of_joining: emp.date_of_joining,
        // Allocation info
        has_allocation,
        total_allocated,
        new_leaves_this_year: Math.round(new_leaves * 10) / 10,
        carry_forward_from_prev_year: Math.round(carry_forward_from_prev * 10) / 10,
        // Usage
        used: Math.round(used * 10) / 10,
        available: Math.round(available * 10) / 10,
        // Accrual
        accrued_to_date,
        months_elapsed: Math.round(months * 10) / 10,
        // Over-used (applied more than accrued)
        over_used: Math.max(0, Math.round((used - accrued_to_date) * 10) / 10),
        // What carry-forward they'd get if allocated next year today
        projected_carry_forward: Math.round(prev_balance * 10) / 10,
      };
    });

    return NextResponse.json({ employees: result, year, company, leave_type: LEAVE_TYPE });
  } catch (err) {
    console.error("[leave-allocation GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

// ── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { roles, defaultCompany } = session;
  const isAdmin = roles.includes("Administrator");
  const isHR = roles.includes("HR Manager");
  const isBM = roles.includes("Branch Manager");

  if (!isAdmin && !isHR && !isBM) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  let body: { company?: string; year?: number; employee?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const company = body.company || defaultCompany || "";
  const year = body.year || new Date().getFullYear();
  const targetEmployee = body.employee;

  const { from_date, to_date } = yearRange(year);
  const prevYear = yearRange(year - 1);

  try {
    // 1. Fetch active employees (optionally filtered by company)
    const empFilters: (string | string[])[][] = [["status", "=", "Active"]];
    if (company) empFilters.push(["company", "=", company]);
    if (targetEmployee) empFilters.push(["name", "=", targetEmployee]);

    const empQuery = new URLSearchParams({
      fields: JSON.stringify(["name", "employee_name", "date_of_joining"]),
      filters: JSON.stringify(empFilters),
      limit_page_length: "500",
    });
    const empRes = await frappeGet(`resource/Employee?${empQuery}`);
    const employees: { name: string; employee_name: string; date_of_joining: string }[] =
      empRes.data ?? [];

    if (employees.length === 0) {
      return NextResponse.json({ message: "No active employees found", created: 0, skipped: 0 });
    }

    const employeeIds = employees.map((e) => e.name);

    // 2. Find which employees already have an allocation for this year
    const existingQuery = new URLSearchParams({
      fields: JSON.stringify(["employee"]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["from_date", ">=", from_date],
        ["to_date", "<=", to_date],
        ["docstatus", "in", ["0", "1"]],
      ]),
      limit_page_length: "500",
    });
    const existingRes = await frappeGet(`resource/Leave Allocation?${existingQuery}`);
    const existing: { employee: string }[] = existingRes.data ?? [];
    const alreadyAllocated = new Set(existing.map((e) => e.employee));

    // 3. Fetch previous year allocations for carry-forward calculation
    const prevAllocQuery = new URLSearchParams({
      fields: JSON.stringify(["employee", "total_leaves_allocated"]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["from_date", ">=", prevYear.from_date],
        ["to_date", "<=", prevYear.to_date],
        ["docstatus", "=", "1"],
      ]),
      limit_page_length: "500",
    });
    const prevAllocRes = await frappeGet(`resource/Leave Allocation?${prevAllocQuery}`);
    const prevAllocs: { employee: string; total_leaves_allocated: number }[] =
      prevAllocRes.data ?? [];

    const prevAllocMap = new Map<string, number>();
    for (const a of prevAllocs) {
      prevAllocMap.set(a.employee, (prevAllocMap.get(a.employee) ?? 0) + a.total_leaves_allocated);
    }

    // 4. Fetch previous year used leaves
    const prevAppQuery = new URLSearchParams({
      fields: JSON.stringify(["employee", "total_leave_days"]),
      filters: JSON.stringify([
        ["employee", "in", employeeIds],
        ["leave_type", "=", LEAVE_TYPE],
        ["status", "=", "Approved"],
        ["from_date", ">=", prevYear.from_date],
        ["to_date", "<=", prevYear.to_date],
      ]),
      limit_page_length: "1000",
    });
    const prevAppRes = await frappeGet(`resource/Leave Application?${prevAppQuery}`);
    const prevApps: { employee: string; total_leave_days: number }[] =
      prevAppRes.data ?? [];

    const prevUsedMap = new Map<string, number>();
    for (const app of prevApps) {
      prevUsedMap.set(app.employee, (prevUsedMap.get(app.employee) ?? 0) + app.total_leave_days);
    }

    // 5. Create + submit allocations for employees without one
    const results: {
      employee: string;
      employee_name: string;
      status: "created" | "skipped" | "error";
      allocation_name?: string;
      carry_forward?: number;
      message?: string;
    }[] = [];

    for (const emp of employees) {
      if (alreadyAllocated.has(emp.name)) {
        results.push({ employee: emp.name, employee_name: emp.employee_name, status: "skipped" });
        continue;
      }

      const prevAlloc = prevAllocMap.get(emp.name) ?? 0;
      const prevUsed = prevUsedMap.get(emp.name) ?? 0;
      const carry_forward = Math.max(0, Math.round((prevAlloc - prevUsed) * 10) / 10);

      try {
        // Create draft allocation
        const created = await frappePost("resource/Leave Allocation", {
          employee: emp.name,
          leave_type: LEAVE_TYPE,
          from_date,
          to_date,
          new_leaves_allocated: ANNUAL_ALLOCATION,
          carry_forwarded_leaves_count: carry_forward,
          docstatus: 0,
        });

        const allocName: string = created?.data?.name;
        if (!allocName) throw new Error("No allocation name returned");

        // Submit the allocation
        await frappePut(`resource/Leave Allocation/${encodeURIComponent(allocName)}`, {
          docstatus: 1,
        });

        results.push({
          employee: emp.name,
          employee_name: emp.employee_name,
          status: "created",
          allocation_name: allocName,
          carry_forward,
        });
      } catch (err) {
        results.push({
          employee: emp.name,
          employee_name: emp.employee_name,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      message: `Allocation complete: ${created} created, ${skipped} already had allocation, ${errors} errors`,
      created,
      skipped,
      errors,
      year,
      company,
      leave_type: LEAVE_TYPE,
      results,
    });
  } catch (err) {
    console.error("[leave-allocation POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
