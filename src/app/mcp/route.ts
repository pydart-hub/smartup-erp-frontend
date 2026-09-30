import { NextRequest } from "next/server";
import { GET as handleGet, POST as handlePost, OPTIONS as handleOptions } from "../api/mcp/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleGet(req);
}

export async function POST(req: NextRequest) {
  return handlePost(req);
}

export async function OPTIONS() {
  return handleOptions();
}
