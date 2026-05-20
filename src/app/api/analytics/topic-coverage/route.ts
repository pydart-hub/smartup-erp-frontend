import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export interface TopicItem {
  schedule: string;
  topic: string;
  covered: boolean;
  date: string;
}

export interface SubjectSummary {
  course: string;
  total_with_topic: number;
  covered: number;
  coverage_pct: number;
  topics: TopicItem[];
}

export interface BatchSummary {
  student_group: string;
  total_with_topic: number;
  covered: number;
  coverage_pct: number;
  subjects: SubjectSummary[];
}

export interface ClassSummary {
  program: string;
  total_with_topic: number;
  covered: number;
  coverage_pct: number;
  batches: BatchSummary[];
}

export interface TopicCoverageResponse {
  branch: string;
  classes: ClassSummary[];
}

/**
 * GET /api/analytics/topic-coverage?branch=
 *
 * Returns full topic coverage hierarchy for a branch:
 *   class (program) → batch (student_group) → subject (course) → topic sessions
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");
    if (!branch) {
      return NextResponse.json({ error: "branch is required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

    // Fetch ALL course schedules for this branch (no limit)
    const schedulesRes = await fetch(
      `${FRAPPE_URL}/api/resource/Course%20Schedule?${new URLSearchParams({
        filters: JSON.stringify([
          ["custom_branch", "=", branch],
          ["custom_topic", "!=", ""],
          ["custom_topic", "is", "set"],
        ]),
        fields: JSON.stringify([
          "name", "course", "student_group", "program",
          "schedule_date", "custom_topic", "custom_topic_covered",
          "custom_event_type",
        ]),
        order_by: "schedule_date asc, from_time asc",
        limit_page_length: "0",
      })}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );

    const rawSchedules: {
      name: string;
      course: string;
      student_group: string;
      program: string;
      schedule_date: string;
      custom_topic: string;
      custom_topic_covered: 0 | 1;
      custom_event_type: string | null;
    }[] = schedulesRes.ok ? (await schedulesRes.json()).data ?? [] : [];

    // Only class sessions (not events), only those with a topic assigned
    const schedules = rawSchedules.filter(
      (s) => !s.custom_event_type && s.custom_topic,
    );

    // Build: program → student_group → course → TopicItem[]
    type CourseMap = Map<string, TopicItem[]>;
    type BatchMap = Map<string, CourseMap>;
    type ProgramMap = Map<string, BatchMap>;

    const programMap: ProgramMap = new Map();

    for (const s of schedules) {
      const prog = s.program || "Uncategorized";
      const batch = s.student_group || "Unknown";
      const course = s.course || "Unknown";

      if (!programMap.has(prog)) programMap.set(prog, new Map());
      const batchMap = programMap.get(prog)!;
      if (!batchMap.has(batch)) batchMap.set(batch, new Map());
      const courseMap = batchMap.get(batch)!;
      if (!courseMap.has(course)) courseMap.set(course, []);
      courseMap.get(course)!.push({
        schedule: s.name,
        topic: s.custom_topic,
        covered: s.custom_topic_covered === 1,
        date: s.schedule_date,
      });
    }

    // Assemble response
    const classes: ClassSummary[] = Array.from(programMap.entries()).map(
      ([program, batchMap]) => {
        const batches: BatchSummary[] = Array.from(batchMap.entries()).map(
          ([student_group, courseMap]) => {
            const subjects: SubjectSummary[] = Array.from(courseMap.entries()).map(
              ([course, topics]) => {
                const covered = topics.filter((t) => t.covered).length;
                return {
                  course,
                  total_with_topic: topics.length,
                  covered,
                  coverage_pct:
                    topics.length > 0
                      ? Math.round((covered / topics.length) * 1000) / 10
                      : 0,
                  topics,
                };
              },
            ).sort((a, b) => b.total_with_topic - a.total_with_topic);

            const batchTotal = subjects.reduce((s, x) => s + x.total_with_topic, 0);
            const batchCovered = subjects.reduce((s, x) => s + x.covered, 0);
            return {
              student_group,
              total_with_topic: batchTotal,
              covered: batchCovered,
              coverage_pct:
                batchTotal > 0
                  ? Math.round((batchCovered / batchTotal) * 1000) / 10
                  : 0,
              subjects,
            };
          },
        ).sort((a, b) => b.total_with_topic - a.total_with_topic);

        const classTotal = batches.reduce((s, x) => s + x.total_with_topic, 0);
        const classCovered = batches.reduce((s, x) => s + x.covered, 0);
        return {
          program,
          total_with_topic: classTotal,
          covered: classCovered,
          coverage_pct:
            classTotal > 0
              ? Math.round((classCovered / classTotal) * 1000) / 10
              : 0,
          batches,
        };
      },
    ).sort((a, b) => b.total_with_topic - a.total_with_topic);

    const response: TopicCoverageResponse = { branch, classes };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[topic-coverage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
