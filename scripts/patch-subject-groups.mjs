/**
 * patch-subject-groups.mjs
 *
 * Backfills the custom_subject field on all 40 subject-wise Student Groups.
 * Run AFTER adding the custom_subject (Data) field to Student Group in Frappe.
 *
 * Usage:
 *   node scripts/patch-subject-groups.mjs
 *   node scripts/patch-subject-groups.mjs --dry-run
 */

import https from "https";

const API_BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const DRY_RUN = process.argv.includes("--dry-run");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: AUTH,
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, data: d }); }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (path) => request("GET", path, null);
const put = (path, body) => request("PUT", path, body);

// Map of group name → subject value to patch
const SUBJECT_MAP = {
  "Kadavanthara-Physics-11-A":    "Physics",
  "Kadavanthara-Chemistry-11-A":  "Chemistry",
  "Kadavanthara-Maths-11-A":      "Maths",
  "Kadavanthara-Physics-12-A":    "Physics",
  "Kadavanthara-Chemistry-12-A":  "Chemistry",
  "Kadavanthara-Maths-12-A":      "Maths",

  "Vennala-Physics-11-A":         "Physics",
  "Vennala-Chemistry-11-A":       "Chemistry",
  "Vennala-Maths-11-A":           "Maths",
  "Vennala-Phy-Chem-11-A":        "Phy-Chem",
  "Vennala-Phy-Maths-11-A":       "Phy-Maths",
  "Vennala-Chem-Maths-11-A":      "Chem-Maths",
  "Vennala-Physics-12-A":         "Physics",
  "Vennala-Chemistry-12-A":       "Chemistry",
  "Vennala-Maths-12-A":           "Maths",
  "Vennala-Phy-Chem-12-A":        "Phy-Chem",
  "Vennala-Phy-Maths-12-A":       "Phy-Maths",
  "Vennala-Chem-Maths-12-A":      "Chem-Maths",

  "Edappally-Physics-11-A":       "Physics",
  "Edappally-Chemistry-11-A":     "Chemistry",
  "Edappally-Maths-11-A":         "Maths",
  "Edappally-Phy-Chem-11-A":      "Phy-Chem",
  "Edappally-Phy-Maths-11-A":     "Phy-Maths",
  "Edappally-Chem-Maths-11-A":    "Chem-Maths",
  "Edappally-Physics-12-A":       "Physics",
  "Edappally-Chemistry-12-A":     "Chemistry",
  "Edappally-Maths-12-A":         "Maths",
  "Edappally-Phy-Chem-12-A":      "Phy-Chem",
  "Edappally-Phy-Maths-12-A":     "Phy-Maths",
  "Edappally-Chem-Maths-12-A":    "Chem-Maths",

  "Thopumpadi-Phy-Chem-11-A":     "Phy-Chem",
  "Thopumpadi-Phy-Chem-12-A":     "Phy-Chem",

  "Chullickal-Phy-Chem-11-A":     "Phy-Chem",
  "Chullickal-Phy-Chem-12-A":     "Phy-Chem",

  "Fortkochi-Phy-Chem-11-A":      "Phy-Chem",
  "Fortkochi-Phy-Chem-12-A":      "Phy-Chem",

  "Palluruthy-Phy-Chem-11-A":     "Phy-Chem",
  "Palluruthy-Phy-Chem-12-A":     "Phy-Chem",

  "Eraveli-Phy-Chem-11-A":        "Phy-Chem",
  "Eraveli-Phy-Chem-12-A":        "Phy-Chem",
};

async function verifyFieldExists() {
  // Fetch one group and check if custom_subject key is present in the document
  const res = await get("/api/resource/Student%20Group/Kadavanthara-Physics-11-A");
  // Frappe single-doc response: { data: { name: ..., custom_subject: ... } }
  return "custom_subject" in (res.data?.data ?? {});
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` Subject Group Patcher — backfill custom_subject`);
  console.log(`${"=".repeat(60)}`);
  if (DRY_RUN) console.log(" MODE: DRY RUN");
  console.log(` Total groups to patch: ${Object.keys(SUBJECT_MAP).length}`);
  console.log(`${"=".repeat(60)}\n`);

  if (!DRY_RUN) {
    console.log("Verifying custom_subject field exists in Frappe...");
    const fieldExists = await verifyFieldExists();
    if (!fieldExists) {
      console.error("\n✗ BLOCKED: custom_subject field not found on Student Group doctype.");
      console.error("  Add it first:");
      console.error("  1. Frappe admin → Customize Form → Student Group");
      console.error("  2. Add field: Label=Subject, Field Name=custom_subject, Type=Data");
      console.error("  3. Click Update");
      console.error("  4. Re-run this script\n");
      process.exit(1);
    }
    console.log("✓ Field exists. Proceeding with patch...\n");
  }

  let patched = 0;
  let alreadySet = 0;
  let failed = 0;

  for (const [groupName, subject] of Object.entries(SUBJECT_MAP)) {
    if (DRY_RUN) {
      console.log(`  DRY   ${groupName}  →  custom_subject = "${subject}"`);
      patched++;
      continue;
    }

    try {
      // Fetch current doc to check if already set
      const current = await get(
        `/api/resource/Student%20Group/${encodeURIComponent(groupName)}`
      );
      const doc = current.data;

      if (doc?.custom_subject === subject) {
        console.log(`  SKIP  ${groupName}  (already "${subject}")`);
        alreadySet++;
        continue;
      }

      const res = await put(
        `/api/resource/Student%20Group/${encodeURIComponent(groupName)}`,
        { custom_subject: subject }
      );

      if (res.status === 200) {
        console.log(`  ✓ OK  ${groupName}  →  "${subject}"`);
        patched++;
      } else {
        let errMsg = `HTTP ${res.status}`;
        try {
          const sm = res.data?._server_messages;
          if (sm) errMsg = JSON.parse(sm)[0]?.message?.replace(/<[^>]+>/g, "") || errMsg;
        } catch { /* use default */ }
        console.log(`  ✗ ERR ${groupName}  →  ${errMsg}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ ERR ${groupName}  →  ${err.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n${"=".repeat(60)}`);
  if (DRY_RUN) {
    console.log(` DRY RUN complete. Would patch: ${patched} groups`);
  } else {
    console.log(` Done.  Patched: ${patched}  |  Already set: ${alreadySet}  |  Failed: ${failed}`);
    if (failed > 0) console.log(" Re-run to retry failed groups.");
  }
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
