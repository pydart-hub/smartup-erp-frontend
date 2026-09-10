import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

export const dynamic = "force-dynamic";

export interface SubjectMarkDetail {
  course: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  grade?: string;
}

export interface StudentExamAggregate {
  exam_key: string;
  exam_title: string;
  assessment_group: string;
  schedule_date: string;
  total_score: number;
  maximum_score: number;
  percentage: number;
  grade?: string;
  subject_count: number;
  subjects: SubjectMarkDetail[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const studentId = decodeURIComponent(id);

  if (!studentId) {
    return NextResponse.json({ error: "Student ID required" }, { status: 400 });
  }

  try {
    // 1. Fetch all submitted Assessment Results for this student
    const resultsRes = await frappeAdminGet("resource/Assessment Result", {
      fields: JSON.stringify([
        "name",
        "student",
        "student_name",
        "course",
        "assessment_plan",
        "assessment_group",
        "total_score",
        "maximum_score",
        "grade",
        "docstatus",
        "creation",
      ]),
      filters: JSON.stringify([
        ["student", "=", studentId],
        ["docstatus", "=", 1],
      ]),
      order_by: "creation desc",
      limit_page_length: "200",
    });

    const rawResults = (resultsRes.data ?? []) as Array<{
      name: string;
      student: string;
      student_name?: string;
      course: string;
      assessment_plan: string;
      assessment_group: string;
      total_score: number;
      maximum_score: number;
      grade?: string;
      creation?: string;
    }>;

    if (rawResults.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch associated Assessment Plans to get schedule_date, assessment_name & accurate max score
    const planNames = [...new Set(rawResults.map((r) => r.assessment_plan).filter(Boolean))];
    const planMap = new Map<
      string,
      { schedule_date?: string; assessment_name?: string; assessment_group?: string; maximum_assessment_score?: number }
    >();

    if (planNames.length > 0) {
      const plansRes = await frappeAdminGet("resource/Assessment Plan", {
        fields: JSON.stringify(["name", "schedule_date", "assessment_name", "assessment_group", "maximum_assessment_score"]),
        filters: JSON.stringify([["name", "in", planNames]]),
        limit_page_length: String(planNames.length + 10),
      });

      for (const p of (plansRes.data ?? []) as Array<{
        name: string;
        schedule_date?: string;
        assessment_name?: string;
        assessment_group?: string;
        maximum_assessment_score?: number;
      }>) {
        planMap.set(p.name, p);
      }
    }

    // 3. Group by Exam Event (assessment_group / assessment_name)
    // For example: "Onam Exam", "CWC Exam 1", "Weekly Exam #2", "Unit Test 1"
    // Multiple subjects belonging to the same exam session roll up into ONE overall exam entry.
    const examMap = new Map<
      string,
      {
        exam_key: string;
        exam_title: string;
        assessment_group: string;
        schedule_date: string;
        subjectMap: Map<string, SubjectMarkDetail>;
      }
    >();

    for (const r of rawResults) {
      const plan = planMap.get(r.assessment_plan);
      const group = r.assessment_group || plan?.assessment_group || "Other";
      const planTitle = plan?.assessment_name || "";
      const date = plan?.schedule_date || r.creation?.split(" ")[0] || "";

      // Normalize exam key: if plan has specific exam event title (e.g. "Onam Exam 2026", "CWC Exam 1")
      // or group name ("Weekly Exam" with date / plan title)
      let examTitle = group;
      if (planTitle && !planTitle.toLowerCase().includes(r.course.toLowerCase())) {
        examTitle = planTitle;
      } else if (group.toLowerCase().includes("weekly")) {
        examTitle = planTitle || `${group} (${date})`;
      }

      const examKey = `${group}::${examTitle}`;

      if (!examMap.has(examKey)) {
        examMap.set(examKey, {
          exam_key: examKey,
          exam_title: examTitle,
          assessment_group: group,
          schedule_date: date,
          subjectMap: new Map(),
        });
      }

      const examObj = examMap.get(examKey)!;
      // If earlier date found, keep earliest date of that exam
      if (date && (!examObj.schedule_date || date < examObj.schedule_date)) {
        examObj.schedule_date = date;
      }

      const maxScore = Number(r.maximum_score || plan?.maximum_assessment_score || 100);
      const score = Number(r.total_score || 0);
      const pct = maxScore > 0 ? Math.round((score / maxScore) * 100 * 10) / 10 : 0;

      const courseName = r.course || "General";
      const existing = examObj.subjectMap.get(courseName);
      if (existing) {
        existing.total_score += score;
        existing.maximum_score += maxScore;
        existing.percentage =
          existing.maximum_score > 0
            ? Math.round((existing.total_score / existing.maximum_score) * 100 * 10) / 10
            : 0;
      } else {
        examObj.subjectMap.set(courseName, {
          course: courseName,
          total_score: score,
          maximum_score: maxScore,
          percentage: pct,
          grade: r.grade || undefined,
        });
      }
    }

    // 4. Compute overall aggregates for each exam
    function calculateGrade(pct: number): string {
      if (pct >= 90) return "A+";
      if (pct >= 80) return "A";
      if (pct >= 70) return "B+";
      if (pct >= 60) return "B";
      if (pct >= 50) return "C+";
      if (pct >= 40) return "C";
      return "F";
    }

    const aggregatedExams: StudentExamAggregate[] = Array.from(examMap.values()).map((e) => {
      const subjects = Array.from(e.subjectMap.values());
      const totalScore = subjects.reduce((sum, s) => sum + s.total_score, 0);
      const totalMax = subjects.reduce((sum, s) => sum + s.maximum_score, 0);
      const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 0;

      return {
        exam_key: e.exam_key,
        exam_title: e.exam_title,
        assessment_group: e.assessment_group,
        schedule_date: e.schedule_date,
        total_score: totalScore,
        maximum_score: totalMax,
        percentage: overallPct,
        grade: calculateGrade(overallPct),
        subject_count: subjects.length,
        subjects,
      };
    });

    // 5. Sort chronologically (oldest to newest for the timeline graph)
    aggregatedExams.sort((a, b) => {
      const dateA = a.schedule_date || "";
      const dateB = b.schedule_date || "";
      return dateA.localeCompare(dateB);
    });

    return NextResponse.json({ data: aggregatedExams });
  } catch (error) {
    console.error("Failed to fetch aggregated exam performance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch aggregated exam performance" },
      { status: 500 },
    );
  }
}
