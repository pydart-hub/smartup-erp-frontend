/**
 * setup-gm-video-doctypes.mjs
 *
 * One-time setup script: creates two custom Frappe doctypes needed for
 * the Group-Wise Video Classes feature.
 *
 * Run: node scripts/setup-gm-video-doctypes.mjs
 *
 * Doctypes created:
 *   1. GM Video Subject  — subject under a Program (e.g. Mathematics under 10th State)
 *   2. GM Video Chapter  — chapter under a Subject (with video URL)
 */

import "dotenv/config";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL ?? "https://smartup.m.frappe.cloud";
const API_KEY    = process.env.FRAPPE_API_KEY    ?? "03330270e330d49";
const API_SECRET = process.env.FRAPPE_API_SECRET ?? "9c2261ae11ac2d2";
const AUTH       = `token ${API_KEY}:${API_SECRET}`;

async function frappePost(path, body) {
  const res = await fetch(`${FRAPPE_URL}/api/${path}`, {
    method: "POST",
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // 409 = already exists — that's fine
    if (res.status === 409 || text.includes("DuplicateEntryError") || text.includes("already exists")) {
      console.log(`  ⚠  Already exists (${res.status}) — skipping`);
      return null;
    }
    throw new Error(`Frappe ${res.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

async function ensureDoctype(name, fields) {
  console.log(`\n📦 Creating doctype: ${name}`);
  try {
    const result = await frappePost("resource/DocType", {
      doctype: "DocType",
      name,
      module: "Education",
      custom: 1,
      is_submittable: 0,
      track_changes: 0,
      fields,
    });
    if (result) {
      console.log(`  ✅ Created: ${name}`);
    }
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
  }
}

// ── GM Video Subject ─────────────────────────────────────────────────────────
await ensureDoctype("GM Video Subject", [
  {
    fieldname: "program",
    fieldtype: "Link",
    options: "Program",
    label: "Program",
    reqd: 1,
    in_list_view: 1,
    in_standard_filter: 1,
    search_index: 1,
  },
  {
    fieldname: "subject_name",
    fieldtype: "Data",
    label: "Subject Name",
    reqd: 1,
    in_list_view: 1,
  },
  {
    fieldname: "icon_emoji",
    fieldtype: "Data",
    label: "Icon Emoji",
    default: "📚",
    length: 10,
  },
  {
    fieldname: "sort_order",
    fieldtype: "Int",
    label: "Sort Order",
    default: 0,
    in_list_view: 1,
  },
]);

// ── GM Video Chapter ─────────────────────────────────────────────────────────
await ensureDoctype("GM Video Chapter", [
  {
    fieldname: "subject",
    fieldtype: "Link",
    options: "GM Video Subject",
    label: "Subject",
    reqd: 1,
    in_list_view: 1,
    in_standard_filter: 1,
    search_index: 1,
  },
  {
    fieldname: "chapter_name",
    fieldtype: "Data",
    label: "Chapter Name",
    reqd: 1,
    in_list_view: 1,
  },
  {
    fieldname: "video_url",
    fieldtype: "Data",
    label: "Video URL",
    in_list_view: 1,
  },
  {
    fieldname: "description",
    fieldtype: "Small Text",
    label: "Description",
  },
  {
    fieldname: "sort_order",
    fieldtype: "Int",
    label: "Sort Order",
    default: 0,
    in_list_view: 1,
  },
]);

console.log("\n✅ Setup complete. Frappe doctypes are ready.\n");
