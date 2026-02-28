import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * POST /api/admin/remove-accounts-permission
 *
 * Removes Accounts-related permissions from ALL users who have the Instructor role.
 *
 * For each Instructor user it:
 *   1. Removes accounting roles: "Accounts User", "Accounts Manager", "Auditor"
 *   2. Adds "Accounts" to their block_modules list (blocks the module in sidebar)
 *
 * Body (optional):
 *   { company?: string }  — only process instructors whose linked Employee is in this company
 *
 * GET  — returns current status (how many instructor users still have accounts roles)
 * POST — performs the bulk removal
 */

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

// Roles to strip from instructor users
const ACCOUNTS_ROLES = ["Accounts User", "Accounts Manager", "Auditor"];

// Module to block
const ACCOUNTS_MODULE = "Accounts";

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

interface UserRoleEntry {
  role: string;
}

interface UserBlockModule {
  module: string;
}

interface UserResult {
  user: string;
  full_name: string;
  roles_removed: string[];
  module_blocked: boolean;
  status: "updated" | "already_clean" | "error";
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Remove accounts permissions from instructor users
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
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
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Parse optional company from body
    let company: string | undefined;
    try {
      const body = await request.json();
      company = body.company;
    } catch {
      // No body
    }

    // Branch Manager restriction — scope to their branch
    if (!isAdmin) {
      if (!company) {
        company = sessionDefaultCompany || allowedCompanies[0];
      }
      if (company && allowedCompanies.length > 0 && !allowedCompanies.includes(company)) {
        return NextResponse.json(
          { error: `Access denied. You can only manage employees in: ${allowedCompanies.join(", ")}` },
          { status: 403 }
        );
      }
    }

    // Step 1: Get all instructor users (via Employee → Instructor chain, scoped to company)
    const instructorUsers = await getInstructorUsers(headers, company);

    if (instructorUsers.length === 0) {
      return NextResponse.json({
        message: "No instructor users found.",
        results: [],
        summary: { total: 0, updated: 0, already_clean: 0, errors: 0, roles_removed: 0, modules_blocked: 0 },
      });
    }

    // Step 2: Process each user — remove accounts roles + block accounts module
    const results: UserResult[] = [];
    let updated = 0;
    let alreadyClean = 0;
    let errors = 0;
    let totalRolesRemoved = 0;
    let totalModulesBlocked = 0;

    for (const instrUser of instructorUsers) {
      const result: UserResult = {
        user: instrUser.user_id,
        full_name: instrUser.full_name,
        roles_removed: [],
        module_blocked: false,
        status: "already_clean",
      };

      try {
        // Fetch the full User doc (roles + block_modules)
        const userRes = await axios.get(
          `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(instrUser.user_id)}`,
          { headers }
        );
        const userData = userRes.data?.data;
        if (!userData) {
          result.status = "error";
          result.message = "User not found";
          errors++;
          results.push(result);
          continue;
        }

        const currentRoles: UserRoleEntry[] = userData.roles ?? [];
        const currentBlockModules: UserBlockModule[] = userData.block_modules ?? [];

        // 2a. Remove accounts-related roles
        const rolesToRemove = currentRoles.filter((r) =>
          ACCOUNTS_ROLES.includes(r.role)
        );
        const filteredRoles = currentRoles
          .filter((r) => !ACCOUNTS_ROLES.includes(r.role))
          .map((r) => ({ role: r.role }));

        // 2b. Add "Accounts" to block_modules if not already there
        const alreadyBlocked = currentBlockModules.some(
          (m) => m.module === ACCOUNTS_MODULE
        );
        const updatedBlockModules = alreadyBlocked
          ? currentBlockModules.map((m) => ({ module: m.module }))
          : [...currentBlockModules.map((m) => ({ module: m.module })), { module: ACCOUNTS_MODULE }];

        // Determine if any changes are needed
        const needsUpdate = rolesToRemove.length > 0 || !alreadyBlocked;

        if (needsUpdate) {
          // Update the User doc
          await axios.put(
            `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(instrUser.user_id)}`,
            {
              roles: filteredRoles,
              block_modules: updatedBlockModules,
            },
            { headers }
          );

          result.roles_removed = rolesToRemove.map((r) => r.role);
          result.module_blocked = !alreadyBlocked;
          result.status = "updated";
          updated++;
          totalRolesRemoved += rolesToRemove.length;
          if (!alreadyBlocked) totalModulesBlocked++;
        } else {
          alreadyClean++;
        }
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { message?: string } }; message?: string };
        result.status = "error";
        result.message = axErr.response?.data?.message || axErr.message || "Unknown error";
        errors++;
      }

      results.push(result);
    }

    return NextResponse.json({
      message: `Processed ${instructorUsers.length} instructor users. Updated ${updated}, ${alreadyClean} already clean, ${errors} errors. Removed ${totalRolesRemoved} account roles, blocked ${totalModulesBlocked} modules.`,
      results,
      summary: {
        total: instructorUsers.length,
        updated,
        already_clean: alreadyClean,
        errors,
        roles_removed: totalRolesRemoved,
        modules_blocked: totalModulesBlocked,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[remove-accounts-permission] Error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to remove accounts permissions" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Status: which instructor users still have accounts roles
// ─────────────────────────────────────────────────────────────────────────────

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
    const headers = { Authorization: adminAuth, "Content-Type": "application/json" };

    // Branch Manager restriction
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

    // Get instructor users scoped to company
    const instructorUsers = await getInstructorUsers(headers, company);

    // For each, check if they have accounts roles
    const usersWithAccounts: {
      user: string;
      full_name: string;
      employee: string;
      accounts_roles: string[];
      accounts_blocked: boolean;
    }[] = [];

    let totalInstructorUsers = instructorUsers.length;
    let withAccountsRoles = 0;
    let withoutModuleBlock = 0;

    for (const instrUser of instructorUsers) {
      try {
        const userRes = await axios.get(
          `${FRAPPE_URL}/api/resource/User/${encodeURIComponent(instrUser.user_id)}`,
          {
            params: {
              fields: JSON.stringify(["name", "full_name", "roles", "block_modules"]),
            },
            headers,
          }
        );
        const userData = userRes.data?.data;
        if (!userData) continue;

        const userRoles: UserRoleEntry[] = userData.roles ?? [];
        const blockModules: UserBlockModule[] = userData.block_modules ?? [];
        const accountsRoles = userRoles
          .filter((r) => ACCOUNTS_ROLES.includes(r.role))
          .map((r) => r.role);
        const isBlocked = blockModules.some((m) => m.module === ACCOUNTS_MODULE);

        if (accountsRoles.length > 0 || !isBlocked) {
          usersWithAccounts.push({
            user: instrUser.user_id,
            full_name: instrUser.full_name,
            employee: instrUser.employee,
            accounts_roles: accountsRoles,
            accounts_blocked: isBlocked,
          });
          if (accountsRoles.length > 0) withAccountsRoles++;
          if (!isBlocked) withoutModuleBlock++;
        }
      } catch {
        // Skip users we can't fetch
      }
    }

    return NextResponse.json({
      total_instructor_users: totalInstructorUsers,
      users_with_accounts_access: usersWithAccounts.length,
      users_with_accounts_roles: withAccountsRoles,
      users_without_module_block: withoutModuleBlock,
      users: usersWithAccounts,
      scoped_company: company || null,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[remove-accounts-permission] GET Error:", error);
    return NextResponse.json(
      { error: err.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get instructor-linked users (Employee → Instructor → User)
// ─────────────────────────────────────────────────────────────────────────────

async function getInstructorUsers(
  headers: Record<string, string>,
  company?: string
): Promise<{ user_id: string; full_name: string; employee: string }[]> {
  // 1. Get employees (scoped to company if provided)
  const empFilters: string[][] = [["status", "=", "Active"]];
  if (company) empFilters.push(["company", "=", company]);

  const empRes = await axios.get(`${FRAPPE_URL}/api/resource/Employee`, {
    params: {
      filters: JSON.stringify(empFilters),
      fields: JSON.stringify(["name", "employee_name", "user_id"]),
      limit_page_length: 0,
    },
    headers,
  });
  const employees: { name: string; employee_name: string; user_id?: string }[] =
    empRes.data?.data ?? [];

  // Only employees with a user_id
  const employeesWithUser = employees.filter((e) => e.user_id);
  if (employeesWithUser.length === 0) return [];

  // 2. Get all instructors
  const instrRes = await axios.get(`${FRAPPE_URL}/api/resource/Instructor`, {
    params: {
      fields: JSON.stringify(["name", "employee"]),
      limit_page_length: 0,
    },
    headers,
  });
  const instructors: { name: string; employee: string }[] = instrRes.data?.data ?? [];
  const instructorEmployeeSet = new Set(instructors.map((i) => i.employee));

  // 3. Return employees that are instructors AND have a user_id
  return employeesWithUser
    .filter((e) => instructorEmployeeSet.has(e.name))
    .map((e) => ({
      user_id: e.user_id!,
      full_name: e.employee_name,
      employee: e.name,
    }));
}
