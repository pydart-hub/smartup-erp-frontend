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
  const fsName = "SU CHL-12th Science State-Basic-8";
  console.log(`Checking Fee Structure: ${fsName}`);
  try {
    const fs = await get(`/api/resource/Fee Structure/${encodeURIComponent(fsName)}`);
    console.log("FOUND Fee Structure:", JSON.stringify(fs, null, 2));
  } catch (err) {
    console.error("ERROR Fetching Fee Structure:", err.message);
  }
}

main().catch(console.error);
