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

async function main() {
  const students = await api("GET", `/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([
    ["custom_branch", "=", "Smart Up Palluruthy"],
    ["joining_date", ">=", "2026-05-01"],
    ["joining_date", "<=", "2026-05-31"]
  ]))}&fields=${encodeURIComponent(JSON.stringify(["name", "student_name", "joining_date"]))}`);
  
  console.log("May Joiners in PLR:", students);

  for (const stud of students) {
    const pen = await api("GET", `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", stud.name]
    ]))}&fields=${encodeURIComponent(JSON.stringify(["name", "custom_no_of_instalments", "custom_fee_structure"]))}`);
    if (pen && pen.length > 0 && pen[0].custom_no_of_instalments === "4") {
      console.log(`\nQuarterly Student: ${stud.student_name} (${stud.name})`);
      const invoices = await api("GET", `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
        ["student", "=", stud.name],
        ["docstatus", "!=", 2]
      ]))}&fields=${encodeURIComponent(JSON.stringify(["name", "due_date", "posting_date", "grand_total"]))}&order_by=due_date asc`);
      console.log("Invoices:", invoices);
    }
  }
}

main().catch(console.error);
