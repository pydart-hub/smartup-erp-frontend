import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet, frappeAdminPost } from "@/lib/server/frappeAdmin";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  // Basic security: ensure they are logged in at least
  const cookieStore = await cookies();
  const session = cookieStore.get("smartup_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { path, method = "GET", payload } = await req.json();

    if (method === "GET") {
      const res = await frappeAdminGet(path, payload);
      return NextResponse.json(res);
    } else {
      const res = await frappeAdminPost(path, payload);
      return NextResponse.json(res);
    }
  } catch (error: any) {
    console.error("Admin Proxy Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
