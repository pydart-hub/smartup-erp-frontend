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
const DOCTYPE_NAME = "Employee Daily Checklist";

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function fixAutoname() {
  const url = `${BASE}/api/resource/DocType/${encodeURIComponent(DOCTYPE_NAME)}`;
  const payload = {
    autoname: "format:EDC-{YYYY}-{MM}-#####",
  };

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Body:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error("Failed to update autoname");
  }
  console.log("Successfully updated autoname to format:EDC-{YYYY}-{MM}-#####");
}

fixAutoname();
