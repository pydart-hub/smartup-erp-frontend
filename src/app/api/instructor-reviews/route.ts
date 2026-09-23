import { NextRequest, NextResponse } from "next/server";
import { parseSession } from "@/lib/utils/apiAuth";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";

/**
 * GET /api/instructor-reviews
 * Scoped query:
 *  - Instructors see only their own reviews (with anonymous reviews masked)
 *  - Branch Managers see reviews in their branch
 *  - Director / GM / Admin see all
 *
 * POST /api/instructor-reviews
 * Submit a new student review for an instructor
 */

export async function GET(request: NextRequest) {
  try {
    const session = parseSession(request);
    const { searchParams } = new URL(request.url);
    const instructorParam = searchParams.get("instructor");
    const branchParam = searchParams.get("branch");
    const studentParam = searchParams.get("student");

    const filters: unknown[][] = [["status", "!=", "Hidden"]];

    const roles = session?.roles || [];
    const isInstructor = !!session?.instructor_name;
    const isBM = roles.includes("Branch Manager");
    const isSuperUser =
      roles.includes("Administrator") ||
      roles.includes("Director") ||
      roles.includes("General Manager") ||
      roles.includes("System Manager");

    if (studentParam) {
      filters.push(["student", "=", studentParam]);
    }

    if (isInstructor && !isSuperUser && !isBM) {
      // Force instructor filter
      filters.push(["instructor", "=", session?.instructor_name]);
    } else if (instructorParam) {
      filters.push(["instructor", "=", instructorParam]);
    }

    if (isBM && !isSuperUser) {
      if (session?.default_company) {
        filters.push(["branch", "=", session.default_company]);
      }
    } else if (branchParam && branchParam !== "All") {
      filters.push(["branch", "=", branchParam]);
    }

    const res = await frappeAdminGet("resource/Instructor Feedback", {
      fields: JSON.stringify([
        "name",
        "instructor",
        "instructor_name",
        "branch",
        "course",
        "program",
        "student",
        "student_name",
        "student_phone",
        "is_anonymous",
        "rating",
        "strengths",
        "weaknesses",
        "detailed_feedback",
        "suggestions",
        "review_date",
        "status",
        "creation",
      ]),
      filters: JSON.stringify(filters),
      limit_page_length: "500",
      order_by: "creation desc",
    });

    let reviews = res?.data ?? [];

    // Privacy masking for anonymous reviews & rating normalization (max 5)
    reviews = reviews.map((r: any) => {
      const rawRating = Number(r.rating) || 0;
      // If legacy 10-star rating was entered (> 5), scale down (e.g. 8 -> 4, 9 -> 4.5) or cap
      const normalizedRating = rawRating > 5 ? Math.round((rawRating / 2) * 10) / 10 : Math.max(1, rawRating || 5);
      const isAnon = Number(r.is_anonymous) === 1 || r.is_anonymous === true;
      if (isAnon) {
        return {
          ...r,
          rating: normalizedRating,
          student: undefined,
          student_name: "Anonymous Student",
          student_phone: undefined,
        };
      }
      return {
        ...r,
        rating: normalizedRating,
      };
    });

    // Compute basic analytics
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Number(
            (
              reviews.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 0), 0) /
              totalReviews
            ).toFixed(1)
          )
        : 0;

    // Strength counts
    const strengthCount: Record<string, number> = {};
    const weaknessCount: Record<string, number> = {};

    reviews.forEach((r: any) => {
      if (r.strengths) {
        const items = r.strengths.split(",").map((s: string) => s.trim()).filter(Boolean);
        items.forEach((item: string) => {
          strengthCount[item] = (strengthCount[item] || 0) + 1;
        });
      }
      if (r.weaknesses) {
        const items = r.weaknesses.split(",").map((w: string) => w.trim()).filter(Boolean);
        items.forEach((item: string) => {
          weaknessCount[item] = (weaknessCount[item] || 0) + 1;
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: reviews,
      metrics: {
        totalReviews,
        avgRating,
        strengthCount,
        weaknessCount,
      },
    });
  } catch (error: any) {
    console.error("[api/instructor-reviews GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch instructor reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if submitting an array of reviews or a single review
    const reviewItems = Array.isArray(body?.reviews)
      ? body.reviews
      : [body];

    // Check monthly limit PER INSTRUCTOR for this student
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

    for (const item of reviewItems) {
      const studentIdentifier = item.student;
      const studentNameIdentifier = item.student_name;
      const instructorIdentifier = item.instructor;

      if (instructorIdentifier && (studentIdentifier || studentNameIdentifier)) {
        try {
          const monthFilters: unknown[][] = [
            ["review_date", "like", `${currentMonthPrefix}%`],
            ["instructor", "=", instructorIdentifier],
          ];
          if (studentIdentifier) {
            monthFilters.push(["student", "=", studentIdentifier]);
          } else if (studentNameIdentifier) {
            monthFilters.push(["student_name", "=", studentNameIdentifier]);
          }

          const existingReview = await frappeAdminGet("resource/Instructor Feedback", {
            fields: JSON.stringify(["name", "instructor_name", "review_date"]),
            filters: JSON.stringify(monthFilters),
            limit_page_length: "1",
          });

          if (existingReview?.data && existingReview.data.length > 0) {
            const instName = existingReview.data[0]?.instructor_name || item.instructor_name || "this instructor";
            return NextResponse.json(
              {
                error: `You have already reviewed ${instName} for ${monthName}. Each teacher can only be reviewed once per month.`,
              },
              { status: 429 }
            );
          }
        } catch (checkErr) {
          console.warn("[api/instructor-reviews POST] Monthly check warning:", checkErr);
        }
      }
    }

    const createdRecords = [];

    for (const item of reviewItems) {
      const {
        instructor,
        instructor_name,
        branch,
        course,
        program,
        student,
        student_name,
        student_phone,
        is_anonymous,
        rating,
        strengths,
        weaknesses,
        detailed_feedback,
        suggestions,
      } = item;

      if (!instructor) {
        return NextResponse.json({ error: "Instructor is required for each review" }, { status: 400 });
      }
      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
      }
      if (!student_name) {
        return NextResponse.json({ error: "Student name is required" }, { status: 400 });
      }
      if (!branch) {
        return NextResponse.json({ error: "Branch is required" }, { status: 400 });
      }

      const payload = {
        doctype: "Instructor Feedback",
        instructor,
        instructor_name: instructor_name || instructor,
        branch,
        course: course || "",
        program: program || "",
        student: student || undefined,
        student_name: is_anonymous ? "Anonymous Student" : student_name,
        student_phone: is_anonymous ? undefined : (student_phone || undefined),
        is_anonymous: is_anonymous ? 1 : 0,
        rating: Math.round(Number(rating)),
        strengths: Array.isArray(strengths) ? strengths.join(", ") : (strengths || ""),
        weaknesses: Array.isArray(weaknesses) ? weaknesses.join(", ") : (weaknesses || ""),
        detailed_feedback: detailed_feedback || "",
        suggestions: suggestions || "",
        review_date: new Date().toISOString().split("T")[0],
        status: "Published",
      };

      const res = await frappeAdminPost("resource/Instructor Feedback", payload);
      createdRecords.push(res?.data);
    }

    return NextResponse.json({
      success: true,
      message: `${createdRecords.length} review(s) submitted successfully`,
      data: createdRecords,
    });
  } catch (error: any) {
    console.error("[api/instructor-reviews POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit reviews" },
      { status: 500 }
    );
  }
}
