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
  const students = await apiCall(
    "GET",
    `/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["student_name", "like", "%ASHNA%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name", "student_name", "customer", "custom_branch"]))}`
  );
  console.log("ASHNA search results:", JSON.stringify(students, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
