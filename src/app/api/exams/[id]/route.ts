import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get("smartup_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const examId = decodeURIComponent(id || "");
    if (!examId) {
      return NextResponse.json({ error: "Exam id is required" }, { status: 400 });
    }

    const auth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
    const headers = { Authorization: auth, Accept: "application/json" };

    const planRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(examId)}`,
      { headers, cache: "no-store" }
    );
    if (!planRes.ok) {
      return NextResponse.json({ error: "Assessment Plan not found" }, { status: 404 });
    }
    const plan = (await planRes.json()).data as { name: string; docstatus?: number };

    const resultsRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Result?${new URLSearchParams({
        filters: JSON.stringify([
          ["assessment_plan", "=", examId],
          ["docstatus", "!=", 2],
        ]),
        fields: JSON.stringify(["name", "docstatus"]),
        limit_page_length: "500",
      })}`,
      { headers, cache: "no-store" }
    );

    if (!resultsRes.ok) {
      const text = await resultsRes.text();
      return NextResponse.json(
        { error: `Failed to verify existing results: ${text.slice(0, 200)}` },
        { status: resultsRes.status }
      );
    }

    const existingResults = ((await resultsRes.json()).data ?? []) as Array<{ name: string; docstatus: number }>;
    if (existingResults.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete this exam because marks/results already exist. Remove the results first." },
        { status: 409 }
      );
    }

    if ((plan.docstatus ?? 0) === 1) {
      const cancelRes = await fetch(
        `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(examId)}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ docstatus: 2 }),
          cache: "no-store",
        }
      );

      if (!cancelRes.ok) {
        const text = await cancelRes.text();
        return NextResponse.json(
          { error: `Failed to cancel exam before delete: ${text.slice(0, 200)}` },
          { status: cancelRes.status }
        );
      }
    }

    const deleteRes = await fetch(
      `${FRAPPE_URL}/api/resource/Assessment%20Plan/${encodeURIComponent(examId)}`,
      {
        method: "DELETE",
        headers,
        cache: "no-store",
      }
    );

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return NextResponse.json(
        { error: `Failed to delete exam: ${text.slice(0, 200)}` },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[exams/delete] Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
