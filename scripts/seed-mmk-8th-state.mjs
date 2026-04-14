/**
 * Seed script: Create 8th State records for Moolamkuzhi branch
 * 
 * Creates:
 *   1 Student Group:  Moolamkuzhi-8th State-A
 *   12 Fee Structures: SU MMK-8th State-{Plan}-{1,4,6,8}
 * 
 * Fee amounts derived from docs/fee_structure_2026_27.json
 * Mapping formula verified against existing CHL & MMK backend data:
 *   -1 variant: tuition = one_time_payment - 1000
 *   -4 variant: tuition = quarterly.total_after_5pct_discount - 1000
 *   -6 variant: tuition = 6_installment.total_after_2_5pct_discount - 1000
 *   -8 variant: tuition = 8_installment.total - 1000
 *   Admission Fee = 1000 (constant)
 */

const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json',
};

const COMPANY = 'Smart Up Moolamkuzhi';
const BRANCH_ABBR = 'SU MMK';
const PROGRAM = '8th State';
const ACADEMIC_YEAR = '2026-2027';
const BATCH = 'Moolamkuzhi 26-27';
const ADMISSION_FEE = 1000;
const FEE_CATEGORY = '8th State Tuition Fee';

// ── Fee amounts from fee_structure_2026_27.json (Moolamkuzhi) ──
// Tuition = plan_total - 1000 (admission fee)
const FEE_DATA = {
  Basic: {
    1: 14100 - ADMISSION_FEE,   // OTP=14100 → tuition=13100
    4: 14600 - ADMISSION_FEE,   // Q total=14600 → tuition=13600
    6: 15000 - ADMISSION_FEE,   // 6-inst total=15000 → tuition=14000
    8: 15400 - ADMISSION_FEE,   // 8-inst total=15400 → tuition=14400
  },
  Intermediate: {
    1: 21200 - ADMISSION_FEE,   // OTP=21200 → tuition=20200
    4: 21900 - ADMISSION_FEE,   // Q total=21900 → tuition=20900
    6: 22400 - ADMISSION_FEE,   // 6-inst total=22400 → tuition=21400
    8: 23000 - ADMISSION_FEE,   // 8-inst total=23000 → tuition=22000
  },
  Advanced: {
    1: 22900 - ADMISSION_FEE,   // OTP=22900 → tuition=21900
    4: 23700 - ADMISSION_FEE,   // Q total=23700 → tuition=22700
    6: 24400 - ADMISSION_FEE,   // 6-inst total=24400 → tuition=23400
    8: 25000 - ADMISSION_FEE,   // 8-inst total=25000 → tuition=24000
  },
};

const DRY_RUN = process.argv.includes('--dry-run');

async function apiPost(endpoint, body) {
  const r = await fetch(BASE + endpoint, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`POST ${endpoint} → ${r.status}: ${JSON.stringify(json)}`);
  return json.data;
}

async function apiPut(endpoint, body) {
  const r = await fetch(BASE + endpoint, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`PUT ${endpoint} → ${r.status}: ${JSON.stringify(json)}`);
  return json.data;
}

async function apiGet(endpoint) {
  const r = await fetch(BASE + endpoint, { headers: HEADERS });
  const json = await r.json();
  return json.data;
}

// ── Check if record already exists ──
async function exists(doctype, name) {
  try {
    const r = await fetch(BASE + `/api/resource/${doctype}/${encodeURIComponent(name)}`, { headers: HEADERS });
    return r.ok;
  } catch { return false; }
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no records will be created\n' : '🚀 LIVE RUN — creating records\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Create Student Group
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sgName = `Moolamkuzhi-${PROGRAM}-A`;
  console.log(`── Student Group: ${sgName} ──`);

  if (await exists('Student Group', sgName)) {
    console.log('  ✓ Already exists, skipping');
  } else {
    const sgPayload = {
      doctype: 'Student Group',
      name: sgName,
      student_group_name: sgName,
      group_based_on: 'Batch',
      program: PROGRAM,
      batch: BATCH,
      academic_year: ACADEMIC_YEAR,
      max_strength: 50,
      custom_branch: COMPANY,
    };

    if (DRY_RUN) {
      console.log('  Would create:', JSON.stringify(sgPayload, null, 4));
    } else {
      try {
        const result = await apiPost('/api/resource/Student Group', sgPayload);
        console.log(`  ✓ Created: ${result.name}`);
      } catch (e) {
        console.error(`  ✗ Failed: ${e.message}`);
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Create 12 Fee Structures
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(`\n── Fee Structures (12) ──`);

  let created = 0, skipped = 0, failed = 0;

  for (const [plan, installments] of Object.entries(FEE_DATA)) {
    for (const [instCount, tuitionFee] of Object.entries(installments)) {
      const fsName = `${BRANCH_ABBR}-${PROGRAM}-${plan}-${instCount}`;
      const total = tuitionFee + ADMISSION_FEE;

      if (await exists('Fee Structure', fsName)) {
        console.log(`  ✓ ${fsName} — already exists`);
        skipped++;
        continue;
      }

      const fsPayload = {
        doctype: 'Fee Structure',
        name: fsName,
        naming_series: '', // manual name
        program: PROGRAM,
        academic_year: ACADEMIC_YEAR,
        company: COMPANY,
        custom_plan: plan,
        custom_no_of_instalments: String(instCount),
        custom_branch_abbr: BRANCH_ABBR,
        components: [
          {
            doctype: 'Fee Component',
            fees_category: FEE_CATEGORY,
            amount: tuitionFee,
          },
          {
            doctype: 'Fee Component',
            fees_category: 'Admission Fee',
            amount: ADMISSION_FEE,
          },
        ],
      };

      if (DRY_RUN) {
        console.log(`  Would create: ${fsName} | ${plan}-${instCount} | tuition=₹${tuitionFee} + admission=₹${ADMISSION_FEE} = ₹${total}`);
      } else {
        try {
          // Create as Draft
          const result = await apiPost('/api/resource/Fee Structure', fsPayload);
          console.log(`  ✓ Created (draft): ${result.name} | ₹${total}`);

          // Submit (docstatus → 1)
          await apiPut(`/api/resource/Fee Structure/${encodeURIComponent(result.name)}`, { docstatus: 1 });
          console.log(`    ✓ Submitted: ${result.name}`);
          created++;
        } catch (e) {
          console.error(`  ✗ ${fsName}: ${e.message}`);
          failed++;
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n══ Summary ══');
  console.log(`Student Group: ${sgName}`);
  console.log(`Fee Structures: ${created} created, ${skipped} skipped, ${failed} failed`);
  if (DRY_RUN) console.log('\nRe-run without --dry-run to create records.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
