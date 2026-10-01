import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/exams/marks
 *
 * Bulk create/update Assessment Results for an exam.
 * Body: { assessment_plan: string, marks: [{ student, score, diagnosed_level? }] }
 *
 * Strategy:
 *   - Only fetches existing results for the students being saved (not all 500)
 *   - Submitted + only diagnosed_level changed -> fast single PUT (no cancel/resubmit)
 *   - Submitted + score changed -> cancel -> create -> submit
 *   - Draft -> update in-place -> submit
 *   - No existing -> create -> submit
 *   - Nothing changed -> skip entirely
 *   - Parallel processing in batches of 5 for speed
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
      marks: { student: string; score: number; diagnosed_level?: string }[];
    };

    if (!assessment_plan || !marks?.length) {
      return NextResponse.json({ error: "Missing assessment_plan or marks array" }, { status: 400 });
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

    // Fetch grading scale
    const gsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Grading%20Scale/${encodeURIComponent(plan.grading_scale)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const gs = gsRes.ok ? (await gsRes.json()).data : null;
    const intervals: { grade_code: string; threshold: number }[] =
      gs?.intervals?.sort((a: { threshold: number }, b: { threshold: number }) => b.threshold - a.threshold) ?? [];

    function getGrade(percentage: number): string {
      for (const iv of intervals) {
        const threshold = iv.grade_code === "D" ? Math.min(iv.threshold, 30) : iv.threshold;
        if (percentage >= threshold) return iv.grade_code;
      }
      return intervals[intervals.length - 1]?.grade_code ?? "";
    }

    // Only fetch existing results for the students being saved (not all 500)
    const studentIds = marks.map((m) => m.student);
    const existingRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "=", assessment_plan],
          ["student", "in", studentIds],
          ["docstatus", "!=", 2],
        ]),
        fields: JSON.stringify(["name", "student", "docstatus", "total_score", "custom_diagnosed_level"]),
        limit_page_length: String(studentIds.length + 10),
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const existingResults: { name: string; student: string; docstatus: number; total_score?: number; custom_diagnosed_level?: string }[] =
      existingRes.ok ? ((await existingRes.json()).data ?? []) : [];
    const existingMap = new Map(existingResults.map((r) => [r.student, r]));

    let created = 0;
    const errors: string[] = [];

    // Process in parallel batches of 5 for speed
    const BATCH_SIZE = 5;
    for (let i = 0; i < marks.length; i += BATCH_SIZE) {
      const batch = marks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (mark) => {
          if (mark.score === null || mark.score === undefined) return "skipped";

          const maxScore = plan.maximum_assessment_score;
          const percentage = maxScore > 0 ? (mark.score / maxScore) * 100 : 0;
          const grade = getGrade(percentage);
          const criteriaName = plan.assessment_criteria?.[0]?.assessment_criteria || "Theory";
          const existing = existingMap.get(mark.student);

          // CASE A: Draft -> update in-place and submit
          if (existing && existing.docstatus === 0) {
            const updatePayload: Record<string, any> = {
              maximum_score: maxScore,
              total_score: mark.score,
              grade,
              details: [{ assessment_criteria: criteriaName, maximum_score: maxScore, score: mark.score, grade }],
            };
            if (mark.diagnosed_level) updatePayload.custom_diagnosed_level = mark.diagnosed_level;

            const upRes = await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(updatePayload), cache: "no-store" },
            );
            if (!upRes.ok) throw new Error(`update draft: ${(await upRes.text()).slice(0, 200)}`);

            const subRes = await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ docstatus: 1 }), cache: "no-store" },
            );
            if (!subRes.ok) throw new Error(`submit draft: ${(await subRes.text()).slice(0, 200)}`);
            return "done";
          }

          // CASE B: Submitted + score unchanged -> fast path for diagnosed_level only
          if (existing && existing.docstatus === 1 && Number(existing.total_score) === mark.score) {
            const levelChanged = mark.diagnosed_level && mark.diagnosed_level !== existing.custom_diagnosed_level;
            if (!levelChanged) return "skipped"; // Nothing changed

            const upRes = await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              {
                method: "PUT",
                headers: { Authorization: auth, "Content-Type": "application/json" },
                body: JSON.stringify({ custom_diagnosed_level: mark.diagnosed_level }),
                cache: "no-store",
              },
            );
            if (!upRes.ok) throw new Error(`update diagnosed_level: ${(await upRes.text()).slice(0, 200)}`);
            return "done";
          }

          // CASE C: Submitted + score changed -> cancel -> create -> submit -> delete old
          let cancelledDocName: string | null = null;
          if (existing && existing.docstatus === 1) {
            const cancelRes = await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(existing.name)}`,
              { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ docstatus: 2 }), cache: "no-store" },
            );
            if (!cancelRes.ok) throw new Error(`cancel: ${(await cancelRes.text()).slice(0, 200)}`);
            cancelledDocName = existing.name;
          }

          const resultData: Record<string, any> = {
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
            ...(mark.diagnosed_level ? { custom_diagnosed_level: mark.diagnosed_level } : {}),
            details: [{ assessment_criteria: criteriaName, maximum_score: maxScore, score: mark.score, grade }],
          };

          const createRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Result`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify(resultData),
            cache: "no-store",
          });
          if (!createRes.ok) throw new Error(`create: ${(await createRes.text()).slice(0, 200)}`);

          const createdResult = (await createRes.json()).data;
          const submitRes = await fetch(
            `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(createdResult.name)}`,
            { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ docstatus: 1 }), cache: "no-store" },
          );
          if (!submitRes.ok) throw new Error(`submit new: ${(await submitRes.text()).slice(0, 200)}`);

          // Delete old cancelled doc only after new is confirmed submitted
          if (cancelledDocName) {
            await fetch(
              `${FRAPPE_URL}/api/resource/Assessment%20Result/${encodeURIComponent(cancelledDocName)}`,
              { method: "DELETE", headers: { Authorization: auth }, cache: "no-store" },
            ).catch(() => {});
          }

          return "done";
        }),
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled" && r.value === "done") {
          created++;
        } else if (r.status === "rejected") {
          errors.push(`${batch[j].student}: ${(r.reason as Error)?.message ?? "Unknown error"}`);
        }
        // "skipped" -> nothing changed, no action needed
      }
    }

    if (created === 0 && errors.length > 0) {
      return NextResponse.json({ error: `Failed to save marks: ${errors[0]}`, created: 0, errors }, { status: 422 });
    }

    return NextResponse.json({ created, errors, hasErrors: errors.length > 0, totalRequested: marks.length });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/marks] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
