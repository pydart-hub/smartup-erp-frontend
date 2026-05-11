/**
 * fix-all-conversions-v2.mjs
 *
 * Creates invoices for all 11 students with un-billed SOs using
 * PLAN-BASED unequal instalment amounts from fee_structure_parsed.json.
 *
 * Logic per student:
 *  - Look up FeeConfigEntry using: BRANCH_MAP[company] + plan + PROGRAM_MAP[program]
 *  - Build schedule with correct amounts:
 *      Quarterly (4):  [q1, q2, q3,   SO_total - q1-q2-q3]
 *      6-instalment:   [per×5,         SO_total - per×5]
 *      8-instalment:   [per×7,         SO_total - per×7]
 *      1 (OTP):        [SO_total]
 *  - Last instalment always absorbs rounding from credits/discounts
 *  - Due dates: enrollment offset from SO transaction_date
 *  - Past due dates → posting_date = today (Frappe rejects past posting dates)
 *  - custom_academic_year pulled from SO (default "2026-2027")
 *
 * Run dry-run first: node fix-all-conversions-v2.mjs --dry-run
 * Execute:           node fix-all-conversions-v2.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const FEE_CONFIG = JSON.parse(readFileSync(join(__dir, '../docs/fee_structure_parsed.json'), 'utf8'));

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('*** DRY RUN MODE — no changes will be made ***\n');

// ─── Branch / Program maps (mirrors feeSchedule.ts) ────────────────────────

const BRANCH_MAP = {
  'Smart Up Chullickal': 'Tier 1',
  'Smart Up Fortkochi':  'Tier 1',
  'Smart Up Eraveli':    'Eraveli',
  'Smart Up Palluruthy': 'Tier 1',
  'Smart Up Thopumpadi': 'Thoppumpady',
  'Smart Up Moolamkuzhi':'Moolamkuzhi',
  'Smart Up Kadavanthara':'Kadavanthara',
  'Smart Up Vennala':    'Vennala',
  'Smart Up Edappally':  'Edapally',
};

const PROGRAM_MAP = {
  '8th State':           '8 State',
  '8th CBSE':            '8 Cbse',
  '9th State':           '9 State',
  '9th CBSE':            '9 Cbse',
  '10th State':          '10 State',
  '10th CBSE':           '10 Cbse',
  '11th Science State':  'Plus One',
  '12th Science State':  'Plus Two',
};

// Month offsets per instalment count (mirrors getInstalmentOffsets)
const OFFSETS = {
  1: [0],
  4: [0, 3, 6, 9],
  6: [0, 2, 4, 6, 8, 10],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};

// ─── Date helpers ────────────────────────────────────────────────────────────

const TODAY = new Date();
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}-${String(TODAY.getDate()).padStart(2,'0')}`;

function addMonthsClamped(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const rawMonth = (m - 1) + months;
  const newYear  = y + Math.floor(rawMonth / 12);
  const newMonth = (rawMonth % 12) + 1;
  const daysInMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(d, daysInMonth);
  return `${newYear}-${String(newMonth).padStart(2,'0')}-${String(newDay).padStart(2,'0')}`;
}

// ─── Schedule builder ─────────────────────────────────────────────────────────

function buildPlanSchedule(config, n, soTotal, enrollmentDate) {
  const offsets = OFFSETS[n] || [];
  const raw = offsets.map(o => addMonthsClamped(enrollmentDate, o));

  // Clamp past dates to today (Frappe: posting_date cannot be in the past)
  const dueDates = raw.map(d => d < TODAY_STR ? TODAY_STR : d);

  let amounts;
  if (n === 1) {
    amounts = [soTotal];
  } else if (n === 4) {
    const others = config.q1 + config.q2 + config.q3;
    amounts = [config.q1, config.q2, config.q3, Math.round((soTotal - others) * 100) / 100];
  } else if (n === 6) {
    const others = config.inst6_per * 5;
    amounts = Array(5).fill(config.inst6_per).concat([Math.round((soTotal - others) * 100) / 100]);
  } else if (n === 8) {
    const others = config.inst8_per * 7;
    amounts = Array(7).fill(config.inst8_per).concat([Math.round((soTotal - others) * 100) / 100]);
  } else {
    throw new Error(`Unsupported instalment count: ${n}`);
  }

  // Verify total matches SO (should always be true by construction)
  const computedTotal = amounts.reduce((s, a) => s + a, 0);
  if (Math.abs(computedTotal - soTotal) > 0.01) {
    throw new Error(`Schedule total ${computedTotal} ≠ SO total ${soTotal}`);
  }

  const LABELS_4 = ['Q1', 'Q2', 'Q3', 'Q4'];
  return amounts.map((amount, i) => ({
    label: n === 1 ? 'Full Payment' : (n === 4 ? LABELS_4[i] : `Inst ${i + 1}`),
    amount,
    dueDate:     dueDates[i],
    postingDate: dueDates[i],
  }));
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers||{}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method||'GET'} ${url.replace(BASE,'')} → ${r.status}: ${t.slice(0,400)}`);
  }
  return r.json();
}

async function get(path)        { return (await fetchJSON(BASE + path)).data; }
async function post(path, body) { return (await fetchJSON(BASE + path, { method:'POST', body:JSON.stringify(body) })).data; }
async function put(path, body)  { return (await fetchJSON(BASE + path, { method:'PUT',  body:JSON.stringify(body) })).data; }

// ─── Invoice creation ─────────────────────────────────────────────────────────

async function createAndSubmitInvoices(so, schedule) {
  const created = [];

  for (const entry of schedule) {
    const payload = {
      doctype: 'Sales Invoice',
      customer: so.customer,
      company:  so.company,
      posting_date: entry.postingDate,
      due_date:     entry.dueDate,
      student: so.student || undefined,
      custom_academic_year: so.custom_academic_year || '2026-2027',
      disable_rounded_total: 1,
      items: [{
        item_code:   so.items[0].item_code,
        item_name:   so.items[0].item_name,
        description: `${entry.label} — ${so.items[0].item_name || so.items[0].item_code}`,
        qty:   1,
        rate:  entry.amount,
        amount: entry.amount,
        sales_order: so.name,
        so_detail:   so.items[0].name,
      }],
    };

    const inv = await post('/api/resource/Sales Invoice', payload);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
    created.push({ name: inv.name, amount: entry.amount, dueDate: entry.dueDate });
    console.log(`    ✓ ${inv.name} | ₹${entry.amount} | due ${entry.dueDate}`);
  }

  return created;
}

// ─── PE update via Server Script ──────────────────────────────────────────────

async function updatePEViaServerScript(peName, plan, instalments) {
  const scriptName = `fix-pe-${Date.now()}`;
  const pyCode = `
doc_name = frappe.form_dict.get("doc_name")
frappe.db.set_value("Program Enrollment", doc_name, {
    "custom_plan": ${JSON.stringify(plan)},
    "custom_no_of_instalments": ${JSON.stringify(String(instalments))},
    "student_category": ""
})
frappe.db.commit()
frappe.response["message"] = "OK"
`.trim();

  const ss = await post('/api/resource/Server Script', {
    name: scriptName, script_type: 'API', api_method: scriptName,
    allow_guest: 0, disabled: 0, script: pyCode,
  });
  const ssName = ss.name || scriptName;

  const r = await fetch(`${BASE}/api/method/${ssName}`, {
    method: 'POST', headers, body: JSON.stringify({ doc_name: peName }),
  });
  await fetch(`${BASE}/api/resource/Server Script/${encodeURIComponent(ssName)}`, { method:'DELETE', headers }).catch(()=>{});

  if (!r.ok) {
    const t = await r.text().catch(()=>'');
    throw new Error(`Server script for PE update failed: ${t.slice(0,200)}`);
  }
}

// ─── Main: per-student processing ────────────────────────────────────────────

async function processStudent(soName, peName, plan, updatePE) {
  // 1. Fetch SO with full item details
  const so = await get(`/api/resource/Sales Order/${encodeURIComponent(soName)}`);
  if (so.docstatus !== 1) throw new Error(`SO not submitted (docstatus=${so.docstatus})`);

  // 2. Check no invoices already exist — use SO billing_status (sales_order is a child-table field,
  //    cannot be used as a direct Sales Invoice filter via REST API)
  if (so.per_billed > 0) {
    console.log(`  ⚠ SO already partially/fully billed (per_billed=${so.per_billed}%). Skipping.`);
    return;
  }

  // 3. Look up fee config
  const branch   = BRANCH_MAP[so.company];
  const program  = so.custom_program || so.student_program;
  // For program, try multiple sources: PE, item_code inference, or SO field
  const itemCode = so.items?.[0]?.item_code || '';
  let feeClass;
  // Try to get program from PE
  if (peName) {
    const pe = await get(`/api/resource/Program Enrollment/${encodeURIComponent(peName)}`);
    feeClass = PROGRAM_MAP[pe.program];
  }
  if (!feeClass) {
    // Fallback: infer from item_code (e.g. "10th State Tuition Fee" → "10th State")
    const match = itemCode.match(/^(.+?)\s+Tuition Fee$/);
    if (match) feeClass = PROGRAM_MAP[match[1]] || match[1];
  }

  const feeKey = `${branch}|${plan}|${feeClass}`;
  const config = FEE_CONFIG[feeKey];
  if (!config) throw new Error(`Fee config not found for key "${feeKey}" (item: ${itemCode})`);

  const n = so.custom_no_of_instalments
    ? parseInt(so.custom_no_of_instalments, 10)
    : so.items?.[0]?.qty || 1;

  // 4. Build schedule
  const schedule = buildPlanSchedule(config, n, so.grand_total, so.transaction_date);
  const total = schedule.reduce((s, e) => s + e.amount, 0);
  console.log(`  Config: ${feeKey} | ${n} inst | total ₹${total.toFixed(2)} (SO: ₹${so.grand_total})`);
  schedule.forEach(e => console.log(`  ${e.label}: ₹${e.amount} | due=${e.dueDate}`));

  if (DRY_RUN) { console.log(`  [DRY RUN] Would create ${n} invoice(s)`); return; }

  // 5. Update PE if needed
  if (updatePE && peName) {
    await updatePEViaServerScript(peName, plan, n);
    console.log(`  ✓ PE updated: plan=${plan}, instalments=${n}`);
  }

  // 6. Create invoices
  console.log(`  Creating ${n} invoice(s)...`);
  await createAndSubmitInvoices(so, schedule);
  console.log(`  ✅ Done`);
}

// ─── Student list ─────────────────────────────────────────────────────────────

const STUDENTS = [
  // Group 1 — PE was updated by earlier run, no PE update needed (updatePE=false since already done)
  { name:'MIZHAB TT',          so:'SAL-ORD-2026-00950', pe:'PEN-10th-Fortkochi 26-27-094',     plan:'Basic',    updatePE:false },
  { name:'MOHAMMED AZUN VS',   so:'SAL-ORD-2026-00933', pe:'PEN-10th-Fortkochi 26-27-089',     plan:'Basic',    updatePE:false },
  { name:'MOHAMMED ZIYAN CS',  so:'SAL-ORD-2026-00937', pe:'PEN-10th-Fortkochi 26-27-090',     plan:'Basic',    updatePE:false },
  { name:'RIHAN VIJAY',        so:'SAL-ORD-2026-00951', pe:'PEN-12sc state-Fortkochi 26-27-078',plan:'Advanced', updatePE:false },
  { name:'SANA FATHIMA KA',    so:'SAL-ORD-2026-00954', pe:'PEN-8th-Fortkochi 26-27-088',      plan:'Basic',    updatePE:false },
  { name:'SHYAM JITH',         so:'SAL-ORD-2026-00953', pe:'PEN-12sc state-Fortkochi 26-27-076',plan:'Advanced', updatePE:false },
  { name:'YOHAN VIJAY',        so:'SAL-ORD-2026-00952', pe:'PEN-12sc state-Fortkochi 26-27-077',plan:'Advanced', updatePE:false },
  { name:'ADHIL P S',          so:'SAL-ORD-2026-00922', pe:'PEN-12sc state-Eraveli 26-27-153',  plan:'Basic',    updatePE:false },
  { name:'HANAN SUDHEER',      so:'SAL-ORD-2026-00860', pe:'PEN-10th-Fortkochi 26-27-099',     plan:'Basic',    updatePE:false },
  // Group 2 — single payment, PE already updated
  { name:'AMINA M S',          so:'SAL-ORD-2026-00737', pe:'PEN-10th-Chullickal 26-27-014',    plan:'Advanced', updatePE:false },
  { name:'Sana Fathima Ismail',so:'SAL-ORD-2026-00688', pe:'PEN-10th-Palluruthy 26-27-061',    plan:'Basic',    updatePE:false },
];

async function main() {
  const errors = [];
  let success = 0;

  for (const stu of STUDENTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`▶ ${stu.name} | ${stu.so}`);
    try {
      await processStudent(stu.so, stu.pe, stu.plan, stu.updatePE);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      errors.push({ student: stu.name, error: err.message });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done: ${success}/${STUDENTS.length} students processed`);
  if (errors.length) {
    console.log(`\nFailed:`);
    errors.forEach(e => console.log(`  ✗ ${e.student}: ${e.error}`));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
