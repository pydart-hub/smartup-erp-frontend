const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

function getAuthHeader() {
  return `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
}

function getBaseUrl() {
  if (!FRAPPE_URL) throw new Error("NEXT_PUBLIC_FRAPPE_URL is not configured");
  return FRAPPE_URL;
}

async function parseResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frappe ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function frappeAdminGet(path: string, params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : "";
  const res = await fetch(`${getBaseUrl()}/api/${path}${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function frappeAdminPost(path: string, body: unknown) {
  const res = await fetch(`${getBaseUrl()}/api/${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function frappeAdminPut(path: string, body: unknown) {
  const res = await fetch(`${getBaseUrl()}/api/${path}`, {
    method: "PUT",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function frappeAdminDelete(path: string) {
  const res = await fetch(`${getBaseUrl()}/api/${path}`, {
    method: "DELETE",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return parseResponse(res);
}
