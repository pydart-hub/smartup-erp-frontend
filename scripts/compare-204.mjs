import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function apiCall(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

async function main() {
  const s1 = await apiCall("GET", `/api/resource/Student/STU-SU ERV-26-204`);
  console.log("=== STU-SU ERV-26-204 ===");
  console.log("Name:", s1.student_name, "| Created:", s1.creation, "| Customer:", s1.customer);

  const s2 = await apiCall("GET", `/api/resource/Student/STU-SU FKO-26-204`);
  console.log("=== STU-SU FKO-26-204 ===");
  console.log("Name:", s2.student_name, "| Created:", s2.creation, "| Customer:", s2.customer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
