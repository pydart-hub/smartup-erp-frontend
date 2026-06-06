import type { NextRequest } from "next/server";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const LEVEL_EXAM_METHOD_PREFIX = process.env.FRAPPE_LEVEL_EXAM_METHOD_PREFIX || "level_exam.api.methods";

function getAdminHeaders() {
  if (!FRAPPE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    throw new Error("Frappe environment is not configured");
  }

  return {
    Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

export function requireSmartupSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("smartup_session");
  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }
}

export async function callLevelExamMethod<T>(
  methodName: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const headers = getAdminHeaders();
  const res = await fetch(`${FRAPPE_URL}/api/method/${LEVEL_EXAM_METHOD_PREFIX}.${methodName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    const message =
      (typeof json.message === "string" && json.message) ||
      (typeof json.exc === "string" && json.exc) ||
      text ||
      `Level exam method ${methodName} failed`;
    throw new Error(message);
  }

  return ((json.message ?? json.data ?? json) as T);
}
