/**
 * create-subject-groups.mjs
 *
 * Creates all 40 subject-wise Student Groups across all eligible branches.
 * Run AFTER the custom_subject field has been added to the Student Group doctype in Frappe.
 *
 * Usage:
 *   node scripts/create-subject-groups.mjs
 *   node scripts/create-subject-groups.mjs --dry-run    (preview without creating)
 *   node scripts/create-subject-groups.mjs --branch "Smart Up Kadavanthara"  (single branch)
 */

import https from "https";

const API_BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const DRY_RUN = process.argv.includes("--dry-run");
const BRANCH_FILTER = (() => {
  const idx = process.argv.indexOf("--branch");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ── HTTP helpers ─────────────────────────────────────────────────────────────

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
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, data: d });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (path) => request("GET", path, null);
const post = (path, body) => request("POST", path, body);

// ── Group definitions ─────────────────────────────────────────────────────────
//
// Derived from live Frappe data (node scripts/study-branch-groups.mjs):
//   - Kadavanthara → CBSE programs only
//   - All others   → State programs only
//   - Moolamkuzhi  → no HSS programs → excluded
//
// From feeSchedule.ts SUBJECT_BY_BRANCH + BRANCH_MAP:
//   - Tier 1 branches (Chullickal, Fortkochi, Palluruthy): Phy-Chem only
//   - Thoppumpady: Phy-Chem only
//   - Eraveli: Phy-Chem only
//   - Kadavanthara: Physics, Chemistry, Maths
//   - Vennala: Physics, Chemistry, Maths, Phy-Chem, Phy-Maths, Chem-Maths
//   - Edapally: Physics, Chemistry, Maths, Phy-Chem, Phy-Maths, Chem-Maths

const GROUPS = [
  // ── Smart Up Kadavanthara (CBSE) ─────────────────────────────────────────
  { name: "Kadavanthara-Physics-11-A",    branch: "Smart Up Kadavanthara", program: "11th Science CBSE", batch: "Kadavanthara 26-27", subject: "Physics" },
  { name: "Kadavanthara-Chemistry-11-A",  branch: "Smart Up Kadavanthara", program: "11th Science CBSE", batch: "Kadavanthara 26-27", subject: "Chemistry" },
  { name: "Kadavanthara-Maths-11-A",      branch: "Smart Up Kadavanthara", program: "11th Science CBSE", batch: "Kadavanthara 26-27", subject: "Maths" },
  { name: "Kadavanthara-Physics-12-A",    branch: "Smart Up Kadavanthara", program: "12th Science CBSE", batch: "Kadavanthara 26-27", subject: "Physics" },
  { name: "Kadavanthara-Chemistry-12-A",  branch: "Smart Up Kadavanthara", program: "12th Science CBSE", batch: "Kadavanthara 26-27", subject: "Chemistry" },
  { name: "Kadavanthara-Maths-12-A",      branch: "Smart Up Kadavanthara", program: "12th Science CBSE", batch: "Kadavanthara 26-27", subject: "Maths" },

  // ── Smart Up Vennala (State) ──────────────────────────────────────────────
  { name: "Vennala-Physics-11-A",         branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Physics" },
  { name: "Vennala-Chemistry-11-A",       branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Chemistry" },
  { name: "Vennala-Maths-11-A",           branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Maths" },
  { name: "Vennala-Phy-Chem-11-A",        branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Phy-Chem" },
  { name: "Vennala-Phy-Maths-11-A",       branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Phy-Maths" },
  { name: "Vennala-Chem-Maths-11-A",      branch: "Smart Up Vennala", program: "11th Science State", batch: "Vennala 26-27", subject: "Chem-Maths" },
  { name: "Vennala-Physics-12-A",         branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Physics" },
  { name: "Vennala-Chemistry-12-A",       branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Chemistry" },
  { name: "Vennala-Maths-12-A",           branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Maths" },
  { name: "Vennala-Phy-Chem-12-A",        branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Phy-Chem" },
  { name: "Vennala-Phy-Maths-12-A",       branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Phy-Maths" },
  { name: "Vennala-Chem-Maths-12-A",      branch: "Smart Up Vennala", program: "12th Science State", batch: "Vennala 26-27", subject: "Chem-Maths" },

  // ── Smart Up Edappally (State) ────────────────────────────────────────────
  { name: "Edappally-Physics-11-A",       branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Physics" },
  { name: "Edappally-Chemistry-11-A",     branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Chemistry" },
  { name: "Edappally-Maths-11-A",         branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Maths" },
  { name: "Edappally-Phy-Chem-11-A",      branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Phy-Chem" },
  { name: "Edappally-Phy-Maths-11-A",     branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Phy-Maths" },
  { name: "Edappally-Chem-Maths-11-A",    branch: "Smart Up Edappally", program: "11th Science State", batch: "Edappally 26-27", subject: "Chem-Maths" },
  { name: "Edappally-Physics-12-A",       branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Physics" },
  { name: "Edappally-Chemistry-12-A",     branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Chemistry" },
  { name: "Edappally-Maths-12-A",         branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Maths" },
  { name: "Edappally-Phy-Chem-12-A",      branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Phy-Chem" },
  { name: "Edappally-Phy-Maths-12-A",     branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Phy-Maths" },
  { name: "Edappally-Chem-Maths-12-A",    branch: "Smart Up Edappally", program: "12th Science State", batch: "Edappally 26-27", subject: "Chem-Maths" },

  // ── Smart Up Thopumpadi (State) ───────────────────────────────────────────
  { name: "Thopumpadi-Phy-Chem-11-A",     branch: "Smart Up Thopumpadi", program: "11th Science State", batch: "Thopumpadi 26-27", subject: "Phy-Chem" },
  { name: "Thopumpadi-Phy-Chem-12-A",     branch: "Smart Up Thopumpadi", program: "12th Science State", batch: "Thopumpadi 26-27", subject: "Phy-Chem" },

  // ── Smart Up Chullickal (State) ───────────────────────────────────────────
  { name: "Chullickal-Phy-Chem-11-A",     branch: "Smart Up Chullickal", program: "11th Science State", batch: "Chullickal 26-27", subject: "Phy-Chem" },
  { name: "Chullickal-Phy-Chem-12-A",     branch: "Smart Up Chullickal", program: "12th Science State", batch: "Chullickal 26-27", subject: "Phy-Chem" },

  // ── Smart Up Fortkochi (State) ────────────────────────────────────────────
  { name: "Fortkochi-Phy-Chem-11-A",      branch: "Smart Up Fortkochi", program: "11th Science State", batch: "Fortkochi 26-27", subject: "Phy-Chem" },
  { name: "Fortkochi-Phy-Chem-12-A",      branch: "Smart Up Fortkochi", program: "12th Science State", batch: "Fortkochi 26-27", subject: "Phy-Chem" },

  // ── Smart Up Palluruthy (State) ───────────────────────────────────────────
  { name: "Palluruthy-Phy-Chem-11-A",     branch: "Smart Up Palluruthy", program: "11th Science State", batch: "Palluruthy 26-27", subject: "Phy-Chem" },
  { name: "Palluruthy-Phy-Chem-12-A",     branch: "Smart Up Palluruthy", program: "12th Science State", batch: "Palluruthy 26-27", subject: "Phy-Chem" },

  // ── Smart Up Eraveli (State) ──────────────────────────────────────────────
  { name: "Eraveli-Phy-Chem-11-A",        branch: "Smart Up Eraveli", program: "11th Science State", batch: "Eraveli 26-27", subject: "Phy-Chem" },
  { name: "Eraveli-Phy-Chem-12-A",        branch: "Smart Up Eraveli", program: "12th Science State", batch: "Eraveli 26-27", subject: "Phy-Chem" },
];

// ── Fetch existing groups to skip duplicates ──────────────────────────────────

async function getExistingNames() {
  const fields = encodeURIComponent(JSON.stringify(["name"]));
  const filters = encodeURIComponent(JSON.stringify([["group_based_on", "=", "Batch"]]));
  const res = await get(
    `/api/resource/Student%20Group?fields=${fields}&filters=${filters}&limit_page_length=500`
  );
  return new Set((res.data.data || []).map((g) => g.name));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const filtered = BRANCH_FILTER
    ? GROUPS.filter((g) => g.branch === BRANCH_FILTER)
    : GROUPS;

  if (BRANCH_FILTER && filtered.length === 0) {
    console.error(`No groups found for branch: "${BRANCH_FILTER}"`);
    console.error("Available branches:", [...new Set(GROUPS.map((g) => g.branch))].join(", "));
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Subject-Wise Group Creator`);
  console.log(`${"=".repeat(60)}`);
  if (DRY_RUN) console.log(" MODE: DRY RUN — nothing will be created");
  if (BRANCH_FILTER) console.log(` FILTER: ${BRANCH_FILTER}`);
  console.log(` Total to process: ${filtered.length} groups`);
  console.log(`${"=".repeat(60)}\n`);

  console.log("Fetching existing groups...");
  const existing = DRY_RUN ? new Set() : await getExistingNames();
  console.log(`Found ${existing.size} existing groups in Frappe.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  // Group output by branch for readability
  const byBranch = {};
  for (const g of filtered) {
    if (!byBranch[g.branch]) byBranch[g.branch] = [];
    byBranch[g.branch].push(g);
  }

  for (const [branch, groups] of Object.entries(byBranch)) {
    console.log(`\n--- ${branch} (${groups.length} groups) ---`);

    for (const g of groups) {
      if (!DRY_RUN && existing.has(g.name)) {
        console.log(`  SKIP  ${g.name}  (already exists)`);
        skipped++;
        continue;
      }

      const payload = {
        student_group_name: g.name,
        group_based_on: "Batch",
        program: g.program,
        batch: g.batch,
        academic_year: "2026-2027",
        custom_branch: g.branch,
        custom_subject: g.subject,
      };

      if (DRY_RUN) {
        console.log(`  DRY   ${g.name}`);
        console.log(`        program=${g.program} | batch=${g.batch} | subject=${g.subject}`);
        created++;
        continue;
      }

      try {
        const res = await post("/api/resource/Student%20Group", payload);
        if (res.status === 200 || res.status === 201) {
          console.log(`  ✓ OK  ${g.name}`);
          created++;
        } else {
          // Extract Frappe error message
          let errMsg = `HTTP ${res.status}`;
          try {
            const serverMsg = res.data?._server_messages;
            if (serverMsg) {
              const parsed = JSON.parse(serverMsg);
              errMsg = parsed[0]?.message?.replace(/<[^>]+>/g, "") || errMsg;
            } else if (res.data?.exception) {
              errMsg = res.data.exception;
            }
          } catch { /* use default */ }
          console.log(`  ✗ ERR ${g.name}  → ${errMsg}`);
          failed++;
        }
      } catch (err) {
        console.log(`  ✗ ERR ${g.name}  → ${err.message}`);
        failed++;
      }

      // Small delay to avoid hammering the API
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (DRY_RUN) {
    console.log(` DRY RUN complete. Would create: ${created} groups`);
  } else {
    console.log(` Done.  Created: ${created}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
    if (failed > 0) {
      console.log(" Re-run the script to retry failed groups.");
    }
    if (skipped > 0) {
      console.log(" Skipped groups already existed — no duplicates created.");
    }
  }
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
