import { NextRequest, NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/utils/apiAuth";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const ADMIN_HEADERS: Record<string, string> = {
  Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
};

/**
 * POST /api/admin/guardian-mobiles
 *
 * Accepts { studentIds: string[] } and returns a map of
 * studentId -> { parentName, parentMobile }.
 *
 * Approach: Fetch all Guardian docs (with name, guardian_name, mobile_number),
 * then for each student, fetch the student doc to read the `guardians` child
 * table. Map guardian link → guardian name + mobile.
 *
 * We can't query `Student Guardian` child table directly (Frappe returns 403).
 */
export async function POST(request: NextRequest) {
  const authResult = requireRole(request, STAFF_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const studentIds: string[] = body.studentIds;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({});
  }

  const ids = studentIds.slice(0, 500);

  try {
    // Step 1: Fetch ALL guardians (small table) with name, guardian_name, mobile_number
    const gParams = new URLSearchParams({
      fields: JSON.stringify(["name", "guardian_name", "mobile_number"]),
      limit_page_length: "0",
    });
    const gRes = await fetch(
      `${FRAPPE_URL}/api/resource/Guardian?${gParams}`,
      { headers: ADMIN_HEADERS, cache: "no-store" },
    );
    const guardianLookup: Record<string, { name: string; mobile: string }> = {};
    if (gRes.ok) {
      const gData = await gRes.json();
      for (const g of gData.data ?? []) {
        guardianLookup[g.name] = {
          name: g.guardian_name ?? "",
          mobile: g.mobile_number ?? "",
        };
      }
    }

    // Step 2: For each student, fetch the doc to get the guardians child table
    // Use Promise.allSettled with batches to avoid hammering the server
    const result: Record<string, { parentName: string; parentMobile: string }> = {};

    const batchSize = 20;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const promises = batch.map(async (studentId) => {
        const res = await fetch(
          `${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(studentId)}`,
          { headers: ADMIN_HEADERS, cache: "no-store" },
        );
        if (!res.ok) return;
        const doc = (await res.json()).data;
        const guardians: { guardian: string; guardian_name: string }[] =
          doc?.guardians ?? [];
        if (guardians.length > 0) {
          const first = guardians[0];
          const gInfo = guardianLookup[first.guardian];
          result[studentId] = {
            parentName: first.guardian_name || gInfo?.name || "",
            parentMobile: gInfo?.mobile || "",
          };
        }
      });
      await Promise.allSettled(promises);
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
