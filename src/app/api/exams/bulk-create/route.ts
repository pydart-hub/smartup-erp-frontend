import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

/**
 * POST /api/exams/bulk-create
 *
 * Creates Assessment Plans (exams) across multiple student groups in one operation.
 * Supports distinct courses per student group (e.g. 10th Physics for 10th, 9th Physics for 9th).
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      student_groups,
      course, // default fallback course if provided
      group_courses = {}, // mapping student_group -> course
      group_topics = {}, // mapping student_group -> custom_topic
      assessment_group,
      schedule_date,
      from_time,
      to_time,
      maximum_assessment_score,
      examiner,
      room,
      custom_topic,
    } = body;

    if (
      !Array.isArray(student_groups) ||
      student_groups.length === 0 ||
      !assessment_group ||
      !schedule_date ||
      !from_time ||
      !to_time ||
      !maximum_assessment_score
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: student_groups (array), assessment_group, schedule_date, from_time, to_time, maximum_assessment_score",
        },
        { status: 400 },
      );
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Helper to ensure criteria exists
    const ensuredCriteria = new Set<string>();
    async function ensureCriteria(courseName: string, topicName?: string) {
      const normalizedTopic = typeof topicName === "string" ? topicName.trim() : "";
      const criteriaParts = [
        "Theory",
        courseName,
        assessment_group,
        normalizedTopic || schedule_date,
        normalizedTopic ? undefined : from_time,
      ].filter(Boolean);
      const criteriaName = criteriaParts.join(" - ").slice(0, 140);
      if (ensuredCriteria.has(criteriaName)) return criteriaName;

      try {
        const criteriaCheckRes = await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Criteria/${encodeURIComponent(criteriaName)}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (!criteriaCheckRes.ok) {
          await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Criteria`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ assessment_criteria: criteriaName }),
            cache: "no-store",
          });
        }
        ensuredCriteria.add(criteriaName);
      } catch (critErr) {
        console.warn("[exams/bulk-create] Criteria ensure error:", critErr);
      }
      return criteriaName;
    }

    const created: Array<{
      student_group: string;
      plan_name: string;
      assessment_name: string;
      custom_branch: string;
      course: string;
    }> = [];
    const failed: Array<{
      student_group: string;
      reason: string;
    }> = [];

    // 2. Iterate through each student group
    for (const student_group of student_groups) {
      try {
        const groupCourse = group_courses[student_group] || course;
        const groupTopic = group_topics[student_group] || custom_topic || "";
        const normalizedTopic = typeof groupTopic === "string" ? groupTopic.trim() : "";

        if (!groupCourse) {
          failed.push({
            student_group,
            reason: "No subject selected for this class",
          });
          continue;
        }

        // Fetch Student Group
        const sgRes = await fetch(
          `${FRAPPE_URL}/api/resource/Student%20Group/${encodeURIComponent(student_group)}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (!sgRes.ok) {
          failed.push({ student_group, reason: "Class / Student Group not found in Frappe" });
          continue;
        }
        const sg = (await sgRes.json()).data;

        // Pre-flight: check for conflicting Course Schedules
        const csFilters = JSON.stringify([
          ["student_group", "=", student_group],
          ["schedule_date", "=", schedule_date],
          ["from_time", "<", to_time],
          ["to_time", ">", from_time],
          ["docstatus", "!=", 2],
        ]);
        const csFields = JSON.stringify(["name", "course", "from_time", "to_time"]);
        const csRes = await fetch(
          `${FRAPPE_URL}/api/resource/Course%20Schedule?filters=${encodeURIComponent(csFilters)}&fields=${encodeURIComponent(csFields)}&limit_page_length=5`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (csRes.ok) {
          const csData = (await csRes.json()).data ?? [];
          if (csData.length > 0) {
            const conflicts = csData
              .map(
                (c: { course: string; from_time: string; to_time: string }) =>
                  `${c.course} (${c.from_time.slice(0, 5)}–${c.to_time.slice(0, 5)})`,
              )
              .join(", ");
            failed.push({
              student_group,
              reason: `Schedule conflict with class: ${conflicts}`,
            });
            continue;
          }
        }

        // Pre-flight: check for conflicting Assessment Plans
        const apFilters = JSON.stringify([
          ["student_group", "=", student_group],
          ["schedule_date", "=", schedule_date],
          ["from_time", "<", to_time],
          ["to_time", ">", from_time],
          ["docstatus", "!=", 2],
        ]);
        const apFields = JSON.stringify(["name", "assessment_name", "from_time", "to_time"]);
        const apRes = await fetch(
          `${FRAPPE_URL}/api/resource/Assessment%20Plan?filters=${encodeURIComponent(apFilters)}&fields=${encodeURIComponent(apFields)}&limit_page_length=5`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (apRes.ok) {
          const apData = (await apRes.json()).data ?? [];
          if (apData.length > 0) {
            const conflicts = apData
              .map(
                (a: { assessment_name: string; from_time: string; to_time: string }) =>
                  `${a.assessment_name} (${a.from_time.slice(0, 5)}–${a.to_time.slice(0, 5)})`,
              )
              .join(", ");
            failed.push({
              student_group,
              reason: `Overlaps with existing exam: ${conflicts}`,
            });
            continue;
          }
        }

        const criteriaName = await ensureCriteria(groupCourse, normalizedTopic);

        // Plan Payload
        const planData = {
          student_group,
          course: groupCourse,
          assessment_group,
          assessment_name: `${groupCourse} - ${assessment_group}${normalizedTopic ? ` (${normalizedTopic})` : ""}`,
          grading_scale: "SmartUp Grading Scale",
          program: sg.program || "",
          academic_year: sg.academic_year || "",
          custom_branch: sg.custom_branch || "",
          schedule_date,
          from_time,
          to_time,
          maximum_assessment_score: Number(maximum_assessment_score),
          examiner: examiner || "",
          ...(normalizedTopic ? { custom_topic: normalizedTopic } : {}),
          ...(room ? { room } : {}),
          assessment_criteria: [
            {
              assessment_criteria: criteriaName,
              maximum_score: Number(maximum_assessment_score),
            },
          ],
        };

        // Create the Assessment Plan
        const createRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment%20Plan`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(planData),
          cache: "no-store",
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          let msg = "Failed to create exam";
          try {
            const errJson = JSON.parse(errText);
            if (errJson._server_messages) {
              const msgs = JSON.parse(errJson._server_messages);
              const parsed = JSON.parse(msgs[0]);
              if (parsed.message) msg = parsed.message;
            } else if (errJson.exception) {
              const parts = errJson.exception.split(": ");
              if (parts.length > 1) msg = parts.slice(1).join(": ");
            }
          } catch {
            // fallback
          }
          failed.push({ student_group, reason: msg });
          continue;
        }

        const createdPlan = (await createRes.json()).data;

        // Submit the plan (docstatus=1)
        try {
          const submitRes = await fetch(
            `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(createdPlan.name)}`,
            {
              method: "PUT",
              headers: { Authorization: auth, "Content-Type": "application/json" },
              body: JSON.stringify({ docstatus: 1 }),
              cache: "no-store",
            },
          );
          if (submitRes.ok) {
            const submitJson = await submitRes.json();
            if (submitJson.data && !submitJson.exc) {
              created.push({
                student_group,
                plan_name: createdPlan.name,
                assessment_name: planData.assessment_name,
                custom_branch: sg.custom_branch || "",
                course: groupCourse,
              });
              continue;
            }
          }
        } catch {
          // If submit fails, keep created draft
        }

        created.push({
          student_group,
          plan_name: createdPlan.name,
          assessment_name: planData.assessment_name,
          custom_branch: sg.custom_branch || "",
          course: groupCourse,
        });
      } catch (loopErr: unknown) {
        const err = loopErr as { message?: string };
        failed.push({ student_group, reason: err.message || "Unknown error occurred" });
      }
    }

    return NextResponse.json({
      success: created.length > 0,
      total: student_groups.length,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/bulk-create] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
