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
  const studentId = "STU-SU CHL-26-275";
  console.log("Checking Item lookup for '12th Science State'...");
  
  const itemFields = JSON.stringify([
    "name", "item_code", "item_name", "item_group", "standard_rate", "stock_uom",
  ]);

  const exactCode = "12th Science State Tuition Fee";
  const exactParams = new URLSearchParams({
    fields: itemFields,
    filters: JSON.stringify([
      ["item_code", "=", exactCode],
      ["is_sales_item", "=", 1],
      ["disabled", "=", 0],
    ]),
    limit_page_length: "1",
  });
  
  try {
    const res = await get(`/api/resource/Item?${exactParams}`);
    console.log("Item query result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Item query error:", err.message);
  }
}

main().catch(console.error);
