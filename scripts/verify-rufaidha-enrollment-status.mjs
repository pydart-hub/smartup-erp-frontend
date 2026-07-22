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
  const studentId = "STU-SU ERV-26-204";
  console.log(`🔍 VERIFYING ENROLLMENT DOCS FOR ${studentId}...`);
  
  const peList = await apiCall(
    "GET",
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([["student", "=", studentId]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log("\n=== PROGRAM ENROLLMENTS ===");
  console.log(JSON.stringify(peList, null, 2));

  const ceList = await apiCall(
    "GET",
    `/api/resource/Course Enrollment?filters=${encodeURIComponent(JSON.stringify([["student", "=", studentId]]))}&fields=${encodeURIComponent(JSON.stringify(["*"]))}`
  );
  console.log("\n=== COURSE ENROLLMENTS ===");
  console.log(JSON.stringify(ceList, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
