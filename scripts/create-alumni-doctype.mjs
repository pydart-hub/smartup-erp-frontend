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
const DOCTYPE_NAME = env.FRAPPE_ALUMNI_DOCTYPE || "SmartUp Alumni";

const headers = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function ensureDocType() {
  const checkUrl = `${BASE}/api/resource/DocType/${encodeURIComponent(DOCTYPE_NAME)}?fields=${encodeURIComponent('["name"]')}`;
  const existing = await fetch(checkUrl, { headers });

  if (existing.ok) {
    console.log(`DocType already exists: ${DOCTYPE_NAME}`);
    return;
  }

  const payload = {
    doctype: "DocType",
    name: DOCTYPE_NAME,
    module: "Education",
    custom: 1,
    is_submittable: 0,
    track_changes: 1,
    fields: [
      { fieldname: "full_name", fieldtype: "Data", label: "Full Name", reqd: 1, in_list_view: 1 },
      { fieldname: "phone", fieldtype: "Phone", label: "Phone", reqd: 1, in_list_view: 1 },
      { fieldname: "email", fieldtype: "Data", label: "Email", options: "Email", reqd: 1, in_list_view: 1 },
      { fieldname: "passout_year", fieldtype: "Data", label: "Passout Year", reqd: 1, in_list_view: 1 },
      { fieldname: "qualification_level", fieldtype: "Select", label: "Qualification Level", options: "UG\nPG", reqd: 1, in_list_view: 1 },
      { fieldname: "section_break_1", fieldtype: "Section Break", label: "Career" },
      { fieldname: "current_position", fieldtype: "Data", label: "Current Position", reqd: 1, in_list_view: 1 },
      { fieldname: "last_studied_institute", fieldtype: "Data", label: "Last Studied Institute", reqd: 1, in_list_view: 1 },
      { fieldname: "special_skills_remark", fieldtype: "Small Text", label: "Special Skills Remark" },
      { fieldname: "section_break_2", fieldtype: "Section Break", label: "Address" },
      { fieldname: "address", fieldtype: "Small Text", label: "Address", reqd: 1 },
    ],
    permissions: [
      { role: "Director", read: 1, write: 1, create: 1, delete: 0 },
      { role: "System Manager", read: 1, write: 1, create: 1, delete: 0 },
    ],
  };

  const res = await fetch(`${BASE}/api/resource/DocType`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create ${DOCTYPE_NAME}: ${res.status} ${text.slice(0, 500)}`);
  }

  console.log(`Created DocType: ${DOCTYPE_NAME}`);
}

async function verifyList() {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "full_name", "phone", "email", "passout_year"]),
    limit_page_length: "1",
  });

  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(DOCTYPE_NAME)}?${params.toString()}`, {
    headers,
  });

  const text = await res.text();
  console.log(`List check status: ${res.status}`);
  console.log(text.slice(0, 300));

  if (!res.ok) {
    throw new Error("DocType exists but list query failed");
  }
}

await ensureDocType();
await verifyList();
