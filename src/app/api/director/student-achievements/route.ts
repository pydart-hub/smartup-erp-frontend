import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function frappeGet(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${FRAPPE_URL}${path}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, { headers: ADMIN_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Frappe ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.data ?? j.message ?? [];
}

async function frappePost(path: string, body: unknown) {
  const url = `${FRAPPE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Frappe ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.data ?? j.message;
}

// ─── GET /api/director/student-achievements ───────────────────────────────────
// ?mode=dashboard&year=2025-2026
// ?mode=list&year=...&branch=...&grade=...&search=...&page=0&limit=20
// ?mode=years  → list Academic Year names
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") ?? "list";

  try {
    // ── Academic Years list ──
    if (mode === "years") {
      const years = await frappeGet("/api/resource/Academic Year", {
        fields: JSON.stringify(["name", "year_start_date", "year_end_date"]),
        limit_page_length: "30",
        order_by: "year_start_date desc",
      });
      return NextResponse.json({ years });
    }

    // ── Dashboard aggregates ──
    if (mode === "dashboard") {
      const year = sp.get("year") ?? "";
      const baseFilters: string[][] = [];
      if (year) baseFilters.push(["academic_year", "=", year]);

      // Fetch all parent records (basic fields)
      const allRecords: { name: string; branch: string }[] =
        await frappeGet("/api/resource/SU Student Achievement", {
          filters: JSON.stringify(baseFilters),
          fields: JSON.stringify(["name", "branch"]),
          limit_page_length: "2000",
        });

      // Fetch full docs in parallel to get subject_grades
      const fullDocs = await Promise.all(
        allRecords.map((r) =>
          frappeGet(`/api/resource/SU Student Achievement/${encodeURIComponent(r.name)}`)
        )
      );

      // Aggregate across all subject grades
      const gradeOrder = ["A+", "A", "B+", "B", "C", "D", "Pass", "Fail"];
      const gradeCounts: Record<string, number> = {};
      // subjectMap: subject → { grade → count }
      const subjectMap = new Map<string, Record<string, number>>();
      // branchMap: branch → { total students, aplus subject count }
      const branchMap = new Map<string, { total: number; aplus: number }>();
      // aplusCountDist: number of A+ subjects → student count
      const aplusCountDist: Record<number, number> = {};

      let totalSubjectEntries = 0;
      let fullAplusCount = 0; // students where every subject is A+

      for (let i = 0; i < allRecords.length; i++) {
        const rec = allRecords[i];
        const doc = fullDocs[i];
        const sgs: { subject: string; grade: string }[] = doc?.subject_grades ?? [];

        const branch = rec.branch || "Unknown";
        if (!branchMap.has(branch)) branchMap.set(branch, { total: 0, aplus: 0 });
        branchMap.get(branch)!.total += 1;

        // Count A+ subjects for this student
        const studentAplusCount = sgs.filter(sg => sg.grade === "A+").length;
        if (sgs.length > 0 && studentAplusCount === sgs.length) fullAplusCount += 1;

        // A+ count distribution: how many students got exactly N A+ subjects
        if (sgs.length > 0) {
          aplusCountDist[studentAplusCount] = (aplusCountDist[studentAplusCount] ?? 0) + 1;
        }

        for (const sg of sgs) {
          const g = sg.grade || "Unknown";
          gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
          totalSubjectEntries += 1;
          if (g === "A+") branchMap.get(branch)!.aplus += 1;

          const subj = sg.subject || "Unknown";
          if (!subjectMap.has(subj)) subjectMap.set(subj, {});
          const sm = subjectMap.get(subj)!;
          sm[g] = (sm[g] ?? 0) + 1;
        }
      }

      const total = allRecords.length;
      const aplustotal = gradeCounts["A+"] ?? 0;
      const failTotal = gradeCounts["Fail"] ?? 0;
      const passRate = totalSubjectEntries > 0
        ? ((totalSubjectEntries - failTotal) / totalSubjectEntries) * 100
        : 0;

      const gradeDistribution = gradeOrder
        .filter((g) => gradeCounts[g])
        .map((g) => ({
          grade: g,
          count: gradeCounts[g]!,
          pct: totalSubjectEntries > 0 ? (gradeCounts[g]! / totalSubjectEntries) * 100 : 0,
        }));

      // A+ count distribution sorted descending (Full A+ first, then 9, 8, ...)
      const aplusDistribution = Object.entries(aplusCountDist)
        .map(([count, students]) => ({ count: parseInt(count), students }))
        .sort((a, b) => b.count - a.count);

      // Per-subject breakdown sorted by total entries desc
      const subjectBreakdown = Array.from(subjectMap.entries())
        .map(([subject, grades]) => ({
          subject,
          total: Object.values(grades).reduce((s, c) => s + c, 0),
          aplus: grades["A+"] ?? 0,
          grades: gradeOrder.filter(g => grades[g]).map(g => ({ grade: g, count: grades[g]! })),
        }))
        .sort((a, b) => b.total - a.total);

      const branchBreakdown = Array.from(branchMap.entries())
        .map(([branch, d]) => ({
          branch,
          total: d.total,
          aplus: d.aplus,
          apluspct: d.total > 0 ? (d.aplus / d.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({
        total,
        totalSubjectEntries,
        aplustotal,
        fullAplusCount,
        passRate,
        gradeDistribution,
        aplusDistribution,
        subjectBreakdown,
        branchBreakdown,
      });
    }

    // ── List / table view ──
    const year = sp.get("year") ?? "";
    const branch = sp.get("branch") ?? "";
    const grade = sp.get("grade") ?? "";
    const search = sp.get("search") ?? "";
    const page = parseInt(sp.get("page") ?? "0", 10);
    const limit = parseInt(sp.get("limit") ?? "20", 10);

    const filters: (string | string[])[][] = [];
    if (year) filters.push(["academic_year", "=", year]);
    if (branch) filters.push(["branch", "=", branch]);
    if (grade) filters.push(["overall_grade", "=", grade]);
    if (search) filters.push(["student_name", "like", `%${search}%`]);

    const records = await frappeGet("/api/resource/SU Student Achievement", {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        "name", "student_name", "date_of_birth", "gender", "phone", "email",
        "address", "city", "state", "school", "program", "branch",
        "academic_year", "overall_grade", "total_score", "max_total", "rank", "remarks",
      ]),
      limit_page_length: String(limit),
      limit_start: String(page * limit),
      order_by: "creation desc",
    });

    // Fetch subject grades for each record
    const withSubjects = await Promise.all(
      (records as { name: string }[]).map(async (r) => {
        const subjects = await frappeGet(
          `/api/resource/SU Student Achievement/${encodeURIComponent(r.name)}`,
        );
        return { ...r, subject_grades: subjects?.subject_grades ?? [] };
      }),
    );

    return NextResponse.json({ records: withSubjects, page, limit });
  } catch (err: unknown) {
    console.error("[student-achievements GET]", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST /api/director/student-achievements ──────────────────────────────────
// Body: { student_name, academic_year, branch, program, school, address, overall_grade, remarks, subject_grades }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      student_name, date_of_birth, gender, phone, email,
      address, city, state, school, program, branch,
      academic_year, overall_grade, total_score, max_total, rank, remarks,
      subject_grades = [],
    } = body;

    if (!student_name || !academic_year) {
      return NextResponse.json({ error: "student_name and academic_year are required" }, { status: 400 });
    }

    const record = await frappePost("/api/resource/SU Student Achievement", {
      student_name, academic_year,
      date_of_birth: date_of_birth || "",
      gender: gender || "",
      phone: phone || "",
      email: email || "",
      address: address || "",
      city: city || "",
      state: state || "",
      school: school || "",
      program: program || "",
      branch: branch || "",
      overall_grade: overall_grade || "",
      total_score: total_score ?? 0,
      max_total: max_total ?? 500,
      rank: rank ?? 0,
      remarks: remarks || "",
      subject_grades: subject_grades.map((sg: { subject: string; score: number; max_score: number; grade: string }) => ({
        subject: sg.subject,
        score: sg.score ?? 0,
        max_score: sg.max_score ?? 100,
        grade: sg.grade ?? "",
      })),
    });

    return NextResponse.json({ name: record?.name, ok: true });
  } catch (err: unknown) {
    console.error("[student-achievements POST]", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── PUT /api/director/student-achievements ───────────────────────────────────
// Body: { name, ...all fields }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      student_name, date_of_birth, gender, phone, email,
      address, city, state, school, program, branch,
      academic_year, overall_grade, rank, remarks,
      subject_grades = [],
    } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const url = `${FRAPPE_URL}/api/resource/SU Student Achievement/${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        student_name, academic_year,
        date_of_birth: date_of_birth || "",
        gender: gender || "",
        phone: phone || "",
        email: email || "",
        address: address || "",
        city: city || "",
        state: state || "",
        school: school || "",
        program: program || "",
        branch: branch || "",
        overall_grade: overall_grade || "",
        rank: rank ?? 0,
        remarks: remarks || "",
        subject_grades: subject_grades.map((sg: { subject: string; score: number; max_score: number; grade: string }) => ({
          subject: sg.subject,
          score: sg.score ?? 0,
          max_score: sg.max_score ?? 0,
          grade: sg.grade ?? "",
        })),
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Frappe ${res.status}: ${await res.text()}`);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[student-achievements PUT]", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── DELETE /api/director/student-achievements?name=... ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const url = `${FRAPPE_URL}/api/resource/SU Student Achievement/${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: "DELETE", headers: ADMIN_HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`Frappe ${res.status}: ${await res.text()}`);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[student-achievements DELETE]", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
