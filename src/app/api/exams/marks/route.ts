import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/exams/marks
 *
 * Bulk create/update Assessment Results for an exam.
 * Body: { assessment_plan: string, marks: [{ student, score }] }
 *
 * For each student:
 *   - Checks for existing result → updates if exists, creates if new
 *   - Auto-calculates grade from grading scale
 *   - Submits (docstatus=1)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_plan, marks } = body as {
      assessment_plan: string;
      marks: { student: string; score: number }[];
    };

    if (!assessment_plan || !marks?.length) {
      return NextResponse.json(
        { error: "Missing assessment_plan or marks array" },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Fetch the Assessment Plan to get metadata
    const planRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(assessment_plan)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    if (!planRes.ok) {
      return NextResponse.json({ error: "Assessment Plan not found" }, { status: 404 });
    }
    const plan = (await planRes.json()).data;

    // Fetch grading scale intervals for grade calculation
    const gsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Grading%20Scale/${encodeURIComponent(plan.grading_scale)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const gs = gsRes.ok ? (await gsRes.json()).data : null;
    const intervals: { grade_code: string; threshold: number }[] =
      gs?.intervals?.sort((a: { threshold: number }, b: { threshold: number }) => b.threshold - a.threshold) ?? [];

    function getGrade(percentage: number): string {
      for (const iv of intervals) {
        if (percentage >= iv.threshold) return iv.grade_code;
      }
      return intervals[intervals.length - 1]?.grade_code ?? "";
    }

    // Fetch existing results for this plan to check for duplicates
    const existingRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([["assessment_plan", "=", assessment_plan], ["docstatus", "!=", 2]]),
        fields: JSON.stringify(["name", "student", "docstatus"]),
        limit_page_length: "500",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const existingResults: { name: string; student: string; docstatus: number }[] =
      existingRes.ok ? ((await existingRes.json()).data ?? []) : [];
    const existingMap = new Map(existingResults.map((r) => [r.student, r]));

    let created = 0;
    const errors: string[] = [];

    for (const mark of marks) {
      if (mark.score === null || mark.score === undefined) continue;

      const maxScore = plan.maximum_assessment_score;
      const percentage = maxScore > 0 ? (mark.score / maxScore) * 100 : 0;
      const grade = getGrade(percentage);

      const existing = existingMap.get(mark.student);

      try {
        if (existing) {
          // If submitted, amend (cancel then re-create)
          if (existing.docstatus === 1) {
            // Cancel existing
            await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              {
                method: "PUT",
                headers: { Authorization: auth, "Content-Type": "application/json" },
                body: JSON.stringify({ docstatus: 2 }),
                cache: "no-store",
              },
            );
          } else {
            // Delete draft
            await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              {
                method: "DELETE",
                headers: { Authorization: auth },
                cache: "no-store",
              },
            );
          }
        }

        // Create new result
        const criteriaName = plan.assessment_criteria?.[0]?.assessment_criteria || "Theory";
        const resultData = {
          assessment_plan,
          student: mark.student,
          student_group: plan.student_group,
          program: plan.program,
          course: plan.course,
          academic_year: plan.academic_year,
          assessment_group: plan.assessment_group,
          grading_scale: plan.grading_scale,
          custom_branch: plan.custom_branch,
          maximum_score: maxScore,
          total_score: mark.score,
          grade,
          details: [
            {
              assessment_criteria: criteriaName,
              maximum_score: maxScore,
              score: mark.score,
              grade,
            },
          ],
        };

        const createRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Result`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(resultData),
          cache: "no-store",
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          errors.push(`${mark.student}: ${errText.slice(0, 200)}`);
          continue;
        }

        const createdResult = (await createRes.json()).data;

        // Submit the result
        await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(createdResult.name)}`,
          {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ docstatus: 1 }),
            cache: "no-store",
          },
        );

        created++;
      } catch (e: unknown) {
        const errMsg = (e as { message?: string }).message ?? "Unknown error";
        errors.push(`${mark.student}: ${errMsg}`);
      }
    }

    return NextResponse.json({ created, errors });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/marks] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
