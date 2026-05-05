import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const BASE = env.NEXT_PUBLIC_FRAPPE_URL;
const KEY = env.FRAPPE_API_KEY;
const SEC = env.FRAPPE_API_SECRET;
const DT = env.FRAPPE_ALUMNI_DOCTYPE || "SmartUp Alumni";
const h = {
  Authorization: `token ${KEY}:${SEC}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// 1. Fetch the full DocType doc so we can patch the phone field in-place
const r = await fetch(`${BASE}/api/resource/DocType/${encodeURIComponent(DT)}`, { headers: h });
if (!r.ok) throw new Error(`GET DocType failed: ${r.status} ${await r.text()}`);
const doc = (await r.json()).data;

const fields = doc.fields ?? [];
const phoneField = fields.find((f) => f.fieldname === "phone");
console.log("Current phone field:", JSON.stringify(phoneField));

if (!phoneField) throw new Error("phone field not found in doctype");

if (phoneField.fieldtype === "Data") {
  console.log("Already Data type — nothing to do.");
  process.exit(0);
}

// 2. Patch fieldtype to Data and remove Phone-specific options
phoneField.fieldtype = "Data";
delete phoneField.options; // Phone fieldtype uses options for country codes

// 3. PUT the updated DocType back
const up = await fetch(`${BASE}/api/resource/DocType/${encodeURIComponent(DT)}`, {
  method: "PUT",
  headers: h,
  body: JSON.stringify({ fields }),
});

if (!up.ok) {
  const t = await up.text();
  throw new Error(`PUT DocType failed: ${up.status} ${t.slice(0, 500)}`);
}

console.log("SUCCESS: phone field updated to Data type");

// 4. Verify list endpoint still works
const vr = await fetch(
  `${BASE}/api/resource/${encodeURIComponent(DT)}?fields=${encodeURIComponent('["name","phone"]')}&limit_page_length=1`,
  { headers: h }
);
console.log("List verify status:", vr.status);
