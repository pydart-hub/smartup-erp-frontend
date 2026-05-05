import { NextRequest, NextResponse } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const ALUMNI_DOCTYPE = process.env.FRAPPE_ALUMNI_DOCTYPE || "SmartUp Alumni";

const ALUMNI_FIELDS = [
  "name",
  "full_name",
  "phone",
  "address",
  "email",
  "passout_year",
  "current_position",
  "last_studied_institute",
  "qualification_level",
  "special_skills_remark",
  "creation",
  "modified",
  "owner",
  "modified_by",
];

function isMissingDoctypeError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("doesnotexisterror") || (lower.includes("doctype") && lower.includes("not found"));
}

function buildEmptyResponse(page: number, pageSize: number, warning?: string) {
  return {
    data: [],
    meta: {
      page,
      pageSize,
      total: 0,
      totalPages: 1,
      warning,
    },
    summary: {
      total: 0,
      currentYearPassouts: 0,
      ugCount: 0,
      pgCount: 0,
    },
  };
}

function parseSession(request: NextRequest): { roles: string[] } | null {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) return null;
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return { roles: sessionData.roles ?? [] };
  } catch {
    return null;
  }
}

function hasDirectorAccess(roles: string[]): boolean {
  return roles.includes("Administrator") || roles.includes("Director");
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

async function frappeGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAPPE_URL}/api/${path}?${qs}`, {
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe GET ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function frappeRequest(path: string, method: "POST", body: unknown) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method,
    headers: {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function getCount(filters: unknown[] = [], orFilters?: unknown[]): Promise<number> {
  const params: Record<string, string> = {
    fields: JSON.stringify(["count(name) as count"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  };

  if (orFilters && orFilters.length > 0) {
    params.or_filters = JSON.stringify(orFilters);
  }

  const payload = await frappeGet(`resource/${encodeURIComponent(ALUMNI_DOCTYPE)}`, params);

  const countRaw = payload?.data?.[0]?.count;
  const countNumber = Number(countRaw);
  return Number.isFinite(countNumber) ? countNumber : 0;
}

export async function GET(request: NextRequest) {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasDirectorAccess(session.roles)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = asPositiveNumber(searchParams.get("page"), 1);
  const pageSize = asPositiveNumber(searchParams.get("pageSize"), 25);

  try {

    const q = toSafeString(searchParams.get("q"));
    const passoutYear = toSafeString(searchParams.get("passout_year"));
    const qualificationLevel = toSafeString(searchParams.get("qualification_level"));

    const filters: unknown[] = [];
    if (passoutYear) {
      filters.push(["passout_year", "=", passoutYear]);
    }
    if (qualificationLevel) {
      filters.push(["qualification_level", "=", qualificationLevel]);
    }

    const listParams: Record<string, string> = {
      fields: JSON.stringify(ALUMNI_FIELDS),
      filters: JSON.stringify(filters),
      order_by: "creation desc",
      limit_page_length: String(pageSize),
      limit_start: String((page - 1) * pageSize),
    };

    let orFilters: unknown[] | undefined;

    if (q) {
      orFilters = [
        ["full_name", "like", `%${q}%`],
        ["phone", "like", `%${q}%`],
        ["email", "like", `%${q}%`],
        ["current_position", "like", `%${q}%`],
        ["last_studied_institute", "like", `%${q}%`],
      ];
      listParams.or_filters = JSON.stringify(orFilters);
    }

    const [listPayload, totalCount, currentYearPassouts, ugCount, pgCount] = await Promise.all([
      frappeGet(`resource/${encodeURIComponent(ALUMNI_DOCTYPE)}`, listParams),
      getCount(filters, orFilters),
      getCount([...filters, ["passout_year", "=", String(new Date().getFullYear())]], orFilters),
      getCount([...filters, ["qualification_level", "=", "UG"]], orFilters),
      getCount([...filters, ["qualification_level", "=", "PG"]], orFilters),
    ]);

    const data = (listPayload?.data ?? []) as unknown[];

    return NextResponse.json({
      data,
      meta: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
      summary: {
        total: totalCount,
        currentYearPassouts,
        ugCount,
        pgCount,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };

    if (err.message && isMissingDoctypeError(err.message)) {
      return NextResponse.json(
        buildEmptyResponse(
          page,
          pageSize,
          "Alumni backend setup is pending. Please create the configured Alumni DocType in Frappe.",
        ),
      );
    }

    return NextResponse.json({ error: err.message || "Failed to load alumni" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = parseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasDirectorAccess(session.roles)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const payload = {
      doctype: ALUMNI_DOCTYPE,
      full_name: toSafeString(body.full_name),
      phone: toSafeString(body.phone),
      address: toSafeString(body.address),
      email: toSafeString(body.email),
      passout_year: toSafeString(body.passout_year),
      current_position: toSafeString(body.current_position),
      last_studied_institute: toSafeString(body.last_studied_institute),
      qualification_level: toSafeString(body.qualification_level),
      special_skills_remark: toSafeString(body.special_skills_remark),
    };

    if (
      !payload.full_name ||
      !payload.phone ||
      !payload.address ||
      !payload.email ||
      !payload.passout_year ||
      !payload.current_position ||
      !payload.last_studied_institute ||
      !payload.qualification_level
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await frappeRequest(`resource/${encodeURIComponent(ALUMNI_DOCTYPE)}`, "POST", payload);

    return NextResponse.json({ data: created?.data ?? payload }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || "Failed to create alumni" }, { status: 500 });
  }
}
