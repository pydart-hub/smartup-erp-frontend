import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);

async function main() {
  console.log("Fetching program enrollments for '12th Science State' at Chullickal...");
  const enrollments = await get(
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["program", "=", "12th Science State"],
      ["custom_plan", "=", "Basic"],
      ["custom_no_of_instalments", "=", "8"],
      ["docstatus", "=", 1]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "student", "name"
    ]))}&limit_page_length=20`
  );

  console.log(`Found ${enrollments.length} enrollments. Fetching their Sales Orders...`);

  for (const enr of enrollments) {
    const student = await get(`/api/resource/Student/${encodeURIComponent(enr.student)}`);
    if (student.custom_branch !== "Smart Up Chullickal") continue;

    console.log(`\nStudent: ${student.student_name} (${student.name})`);
    const salesOrders = await get(
      `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
        ["student", "=", student.name]
      ]))}&fields=${encodeURIComponent(JSON.stringify([
        "name", "grand_total", "docstatus"
      ]))}`
    );
    console.log("Sales Orders:", salesOrders);
    
    const invoices = await get(
      `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
        ["student", "=", student.name]
      ]))}&fields=${encodeURIComponent(JSON.stringify([
        "name", "grand_total", "due_date"
      ]))}`
    );
    console.log("Invoices:", invoices);
  }
}

main().catch(console.error);
