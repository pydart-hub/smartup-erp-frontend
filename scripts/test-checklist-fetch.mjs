import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return idx === -1 ? ["", ""] : [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const BASE = env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = env.FRAPPE_API_KEY;
const API_SECRET = env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
};

async function testFetch() {
  const url = `${BASE}/api/resource/Employee Daily Checklist?limit_page_length=5&fields=["*"]`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log("Checklist Data:", JSON.stringify(data, null, 2));
}

testFetch();
