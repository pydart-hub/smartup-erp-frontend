import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const res = await frappeAdminGet("resource/User", {
      fields: JSON.stringify(["name"]),
      limit_page_length: "1000",
      filters: JSON.stringify([["Has Role", "role", "=", "Mentor"]]),
    });
    
    const userIds = (res.data || []).map((u: { name: string }) => u.name);
    return NextResponse.json({ data: userIds });
  } catch (error: any) {
    console.error("[Mentor Users API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
