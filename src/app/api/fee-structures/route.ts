import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { getSalesUserBranches } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;
const ADMIN_AUTH = `token ${API_KEY}:${API_SECRET}`;

const ALLOWED_ROLES = [
  "Sales User",
  "Branch Manager",
  "Administrator",
  "Director",
  "Management",
  "General Manager",
  "System Manager",
];

function hasAllowedRole(roles: string[]): boolean {
  return roles.some((role) => ALLOWED_ROLES.includes(role));
}

function getScopedCompanies(session: { roles?: string[]; allowed_companies?: string[]; email: string }) {
  const roles = session.roles ?? [];
  if (roles.includes("Sales User")) {
    const mapped = getSalesUserBranches(session.email);
    return mapped.length > 0 ? mapped : (session.allowed_companies ?? []);
  }
  return session.allowed_companies ?? [];
}

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!hasAllowedRole(session.roles ?? [])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const program = searchParams.get("program");
    const academicYear = searchParams.get("academic_year");
    const company = searchParams.get("company");
    const customPlan = searchParams.get("custom_plan");
    const instalments = searchParams.get("custom_no_of_instalments");
    const docstatus = searchParams.get("docstatus");

    const filters: (string | number | string[])[][] = [];
    if (program) filters.push(["program", "=", program]);
    if (academicYear) filters.push(["academic_year", "=", academicYear]);
    if (company) filters.push(["company", "=", company]);
    if (customPlan) filters.push(["custom_plan", "=", customPlan]);
    if (instalments) filters.push(["custom_no_of_instalments", "=", instalments]);
    if (docstatus) filters.push(["docstatus", "=", Number(docstatus)]);

    const scopedCompanies = getScopedCompanies(session);
    const roles = session.roles ?? [];
    if ((roles.includes("Sales User") || roles.includes("Branch Manager")) && scopedCompanies.length > 0) {
      if (company && !scopedCompanies.includes(company)) {
        return NextResponse.json({ error: "Access denied to this branch" }, { status: 403 });
      }
      if (!company) filters.push(["company", "in", scopedCompanies]);
    }

    const qs = new URLSearchParams({
      fields: JSON.stringify([
        "name", "program", "academic_year", "academic_term",
        "total_amount", "company", "receivable_account",
        "custom_plan", "custom_no_of_instalments", "custom_branch_abbr", "docstatus",
      ]),
      limit_page_length: "200",
      order_by: "modified desc",
      ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
    });

    const res = await fetch(`${FRAPPE_URL}/api/resource/${encodeURIComponent("Fee Structure")}?${qs.toString()}` , {
      headers: { Authorization: ADMIN_AUTH, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Frappe GET Fee Structure ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch (error) {
    console.error("[fee-structures GET]", error);
    return NextResponse.json({ error: "Failed to fetch fee structures" }, { status: 500 });
  }
}

