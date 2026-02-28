import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * POST /api/admin/assign-instructor-role
 *
 * Bulk-assigns the Instructor role to ALL active employees:
 *   1. Fetches all active Employees
 *   2. For each employee, checks if an Instructor doc already exists
 *   3. If not, creates a new Instructor doc linked to that employee
 *   4. For employees with a user_id, adds the "Instructor" role to their User doc
 *
 * Body (optional):
 *   { company?: string }   — filter employees by company (branch)
 *
 * Requires admin session (Branch Manager / Administrator).
 */

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

interface ResultItem {
  employee: string;
  employee_name: string;
  status: "created" | "already_exists" | "role_added" | "error";
  instructor_name?: string;
  message?: string;
}

/** Helper: parse session and extract role + allowed companies */
function getSessionInfo(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    return {
      roles: (sessionData.roles || []) as string[],
      allowedCompanies: (sessionData.allowed_companies || []) as string[],
      defaultCompany: (sessionData.default_company || "") as string,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──
    const session = getSessionInfo(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { roles, allowedCompanies, defaultCompany: sessionDefaultCompany } = session;
    const isAdmin = roles.includes("Administrator");
    const isBranchManager = roles.includes("Branch Manager");

    if (!isAdmin && !isBranchManager) {
      return NextResponse.json(
        { error: "Permission denied. Only Administrator or Branch Manager can perform this action." },
        { status: 403 }
      );
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    // ── Parse optional body ──
    let company: string | undefined;
    try {
      const body = await request.json();
      company = body.company;
    } catch {
      // No body
    }

    // ── Branch Manager restriction ──
    // Branch Managers can ONLY operate on employees in their allowed companies.
    // If no company is specified, default to their branch.
    if (!isAdmin) {
      if (!company) {
        // Force to their default company
        company = sessionDefaultCompany || allowedCompanies[0];
      }
      // Validate the requested company is in their allowed list
      if (company && allowedCompanies.length > 0 && !allowedCompanies.includes(company)) {
        return NextResponse.json(
          { error: `Access denied. You can only manage employees in: ${allowedCompanies.join(", ")}` },
          { status: 403 }
        );
      }
    }

    // ── Step 1: Fetch all active employees (scoped to company) ──
    const empFilters: string[][] = [["status", "=", "Active"]];
    if (company) empFilters.push(["company", "=", company]);

    const empRes = await axios.get(`${FRAPPE_URL}/api/resource/Employee`, {
      params: {
        filters: JSON.stringify(empFilters),
        fields: JSON.stringify(["name", "employee_name", "user_id", "company", "department"]),
        limit_page_length: 0, // all
        order_by: "employee_name asc",
      },
      headers,
    });
    const employees: {
      name: string;
      employee_name: string;
      user_id?: string;
      company?: string;
      department?: string;
    }[] = empRes.data?.data ?? [];

    if (employees.length === 0) {
      return NextResponse.json({
        message: "No active employees found.",
        results: [],
        summary: { total: 0, created: 0, already_exists: 0, role_added: 0, errors: 0 },
      });
    }

    // ── Step 2: Fetch all existing instructors ──
    const instrRes = await axios.get(`${FRAPPE_URL}/api/resource/Instructor`, {
      params: {
        fields: JSON.stringify(["name", "instructor_name", "employee"]),
        limit_page_length: 0,
      },
      headers,
    });
    const existingInstructors: { name: string; instructor_name: string; employee: string }[] =
      instrRes.data?.data ?? [];
    const existingEmployeeSet = new Set(existingInstructors.map((i) => i.employee));

    // ── Step 3: Process each employee ──
    const results: ResultItem[] = [];
    let created = 0;
    let alreadyExists = 0;
    let roleAdded = 0;
    let errors = 0;

    for (const emp of employees) {
      const result: ResultItem = {
        employee: emp.name,
        employee_name: emp.employee_name,
        status: "already_exists",
      };

      try {
        // 3a. Create Instructor doc if it doesn't exist
        if (!existingEmployeeSet.has(emp.name)) {
          const createRes = await axios.post(
            `${FRAPPE_URL}/api/resource/Instructor`,
            {
              instructor_name: emp.employee_name,
              employee: emp.name,
              department: emp.department || undefined,
            },
            { headers }
          );
          result.status = "created";
          result.instructor_name = createRes.data?.data?.name;
          created++;
        } else {
          const existing = existingInstructors.find((i) => i.employee === emp.name);
          result.instructor_name = existing?.name;
          alreadyExists++;
        }

        // 3b. Add "Instructor" role to the User doc if user_id exists
        if (emp.user_id) {
          try {
            // Fetch current roles for this user
            const userRes = await axios.get(
              `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(emp.user_id)}`,
              {
                params: { fields: JSON.stringify(["name", "roles"]) },
                headers,
              }
            );
            const userRoles: { role: string }[] = userRes.data?.data?.roles ?? [];
            const hasInstructorRole = userRoles.some((r) => r.role === "Instructor");

            if (!hasInstructorRole) {
              // Add Instructor role to the user's roles table
              const updatedRoles = [...userRoles.map((r) => ({ role: r.role })), { role: "Instructor" }];
              await axios.put(
                `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(emp.user_id)}`,
                { roles: updatedRoles },
                { headers }
              );
              if (result.status !== "created") {
                result.status = "role_added";
              }
              roleAdded++;
            }
          } catch (roleErr) {
            console.warn(`[assign-instructor] Failed to add role for ${emp.user_id}:`, roleErr);
            // Don't fail the whole operation — instructor doc was still created
          }
        }
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { exc_type?: string; message?: string } }; message?: string };
        result.status = "error";
        result.message = axErr.response?.data?.message || axErr.message || "Unknown error";
        errors++;
      }

      results.push(result);
    }

    return NextResponse.json({
      message: `Processed ${employees.length} employees. Created ${created} new instructors, ${roleAdded} roles added, ${alreadyExists} already existed, ${errors} errors.`,
      results,
      summary: {
        total: employees.length,
        created,
        already_exists: alreadyExists,
        role_added: roleAdded,
        errors,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[assign-instructor-role] Error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to assign instructor roles" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/assign-instructor-role
 *
 * Returns current status: how many employees have instructor docs,
 * how many are missing, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionInfo(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { roles, allowedCompanies, defaultCompany: sessionDefaultCompany } = session;
    const isAdmin = roles.includes("Administrator");
    const isBranchManager = roles.includes("Branch Manager");

    if (!isAdmin && !isBranchManager) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = {
      Authorization: adminAuth,
      "Content-Type": "application/json",
    };

    // ── Branch Manager restriction: scope to their allowed companies ──
    const url = new URL(request.url);
    let company = url.searchParams.get("company") || undefined;

    if (!isAdmin) {
      if (!company) {
        company = sessionDefaultCompany || allowedCompanies[0];
      }
      if (company && allowedCompanies.length > 0 && !allowedCompanies.includes(company)) {
        return NextResponse.json(
          { error: `Access denied. You can only view employees in: ${allowedCompanies.join(", ")}` },
          { status: 403 }
        );
      }
    }

    // Build employee filters (scoped to company for Branch Manager)
    const empCountFilters: string[][] = [["status", "=", "Active"]];
    if (company) empCountFilters.push(["company", "=", company]);

    // Fetch counts — scoped to the allowed company
    const [empCountRes, instrCountRes] = await Promise.all([
      axios.get(`${FRAPPE_URL}/api/method/frappe.client.get_count`, {
        params: {
          doctype: "Employee",
          filters: JSON.stringify(empCountFilters),
        },
        headers,
      }),
      // For instructors, we'll compute the scoped count below
      axios.get(`${FRAPPE_URL}/api/resource/Instructor`, {
        params: {
          fields: JSON.stringify(["name", "employee"]),
          limit_page_length: 0,
        },
        headers,
      }),
    ]);

    const totalEmployees = empCountRes.data?.message ?? 0;

    // Fetch employees (scoped)
    const empRes = await axios.get(`${FRAPPE_URL}/api/resource/Employee`, {
      params: {
        filters: JSON.stringify(empCountFilters),
        fields: JSON.stringify(["name", "employee_name", "company", "user_id"]),
        limit_page_length: 0,
      },
      headers,
    });
    const allEmployees: { name: string; employee_name: string; company: string; user_id?: string }[] =
      empRes.data?.data ?? [];

    // Use the already-fetched instructor list from instrCountRes
    const allInstructors: { name: string; employee: string }[] = instrCountRes.data?.data ?? [];
    const linkedEmployees = new Set(allInstructors.map((i) => i.employee));

    // Scoped: only count instructors whose employee is in the scoped employee list
    const scopedEmployeeSet = new Set(allEmployees.map((e) => e.name));
    const scopedInstructorCount = allInstructors.filter((i) => scopedEmployeeSet.has(i.employee)).length;

    const missing = allEmployees.filter((e) => !linkedEmployees.has(e.name));

    return NextResponse.json({
      total_employees: totalEmployees,
      total_instructors: scopedInstructorCount,
      employees_without_instructor: missing.length,
      missing_employees: missing.map((e) => ({
        name: e.name,
        employee_name: e.employee_name,
        company: e.company,
        user_id: e.user_id,
      })),
      scoped_company: company || null,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[assign-instructor-role] GET Error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}
