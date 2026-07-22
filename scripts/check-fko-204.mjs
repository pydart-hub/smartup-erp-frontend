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
  const fkoStudent = await apiCall("GET", `/api/resource/Student/STU-SU FKO-26-204`);
  console.log("FKO Student:", fkoStudent.name, fkoStudent.student_name, fkoStudent.custom_branch);
  
  const fkoPE = await apiCall("GET", `/api/resource/Program Enrollment/PEN-8th-Eraveli 26-27-204`);
  console.log("FKO PE current batch:", fkoPE.student_batch_name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
