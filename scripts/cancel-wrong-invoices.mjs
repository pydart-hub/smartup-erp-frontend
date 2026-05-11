/**
 * cancel-wrong-invoices.mjs
 *
 * Cancels the equal-split invoices for MIZHAB, AZUN, and RIHAN,
 * then creates correct plan-based invoices.
 *
 * Run dry-run first: node cancel-wrong-invoices.mjs --dry-run
 * Execute:           node cancel-wrong-invoices.mjs
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

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${t.slice(0, 400)}`);
  }
  return r.json();
}

async function get(path) { return (await fetchJSON(BASE + path)).data; }
async function post(path, body) { return (await fetchJSON(BASE + path, { method: 'POST', body: JSON.stringify(body) })).data; }
async function put(path, body) { return (await fetchJSON(BASE + path, { method: 'PUT', body: JSON.stringify(body) })).data; }

// ─── Cancel a Sales Invoice (cancel then delete) ──────────────────────────────

async function cancelInvoice(name) {
  // Step 1: Cancel (docstatus → 2)
  const r = await fetch(BASE + `/api/method/frappe.client.cancel`, {
    method: 'POST', headers, body: JSON.stringify({ doctype: 'Sales Invoice', name }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Cancel ${name} failed: ${t.slice(0, 300)}`);
  }
  console.log(`    ✓ Cancelled ${name}`);
}

async function deleteInvoice(name) {
  const r = await fetch(BASE + `/api/resource/Sales Invoice/${encodeURIComponent(name)}`, {
    method: 'DELETE', headers,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Delete ${name} failed: ${t.slice(0, 300)}`);
  }
  console.log(`    ✓ Deleted ${name}`);
}

// ─── Schedule builder (same as fix-all-conversions-v2.mjs) ───────────────────

const OFFSETS = { 1: [0], 4: [0, 3, 6, 9], 6: [0, 2, 4, 6, 8, 10], 8: [0, 1, 2, 3, 4, 5, 6, 7] };

const TODAY = new Date();
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}-${String(TODAY.getDate()).padStart(2,'0')}`;

function addMonthsClamped(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const rawMonth = (m - 1) + months;
  const newYear = y + Math.floor(rawMonth / 12);
  const newMonth = (rawMonth % 12) + 1;
  const daysInMonth = new Date(newYear, newMonth, 0).getDate();
  return `${newYear}-${String(newMonth).padStart(2,'0')}-${String(Math.min(d, daysInMonth)).padStart(2,'0')}`;
}

function buildPlanSchedule(config, n, soTotal, enrollmentDate) {
  const offsets = OFFSETS[n];
  const dueDates = offsets.map(o => {
    const d = addMonthsClamped(enrollmentDate, o);
    return d < TODAY_STR ? TODAY_STR : d;
  });

  let amounts;
  if (n === 1) {
    amounts = [soTotal];
  } else if (n === 4) {
    const others = config.q1 + config.q2 + config.q3;
    amounts = [config.q1, config.q2, config.q3, Math.round((soTotal - others) * 100) / 100];
  } else if (n === 6) {
    const others = config.inst6_per * 5;
    amounts = [...Array(5).fill(config.inst6_per), Math.round((soTotal - others) * 100) / 100];
  } else if (n === 8) {
    const others = config.inst8_per * 7;
    amounts = [...Array(7).fill(config.inst8_per), Math.round((soTotal - others) * 100) / 100];
  }

  const total = amounts.reduce((s, a) => s + a, 0);
  if (Math.abs(total - soTotal) > 0.01) throw new Error(`Schedule total ${total} ≠ SO total ${soTotal}`);

  const LABELS_4 = ['Q1', 'Q2', 'Q3', 'Q4'];
  return amounts.map((amount, i) => ({
    label: n === 1 ? 'Full Payment' : (n === 4 ? LABELS_4[i] : `Inst ${i + 1}`),
    amount,
    dueDate: dueDates[i],
    postingDate: dueDates[i],
  }));
}

async function createAndSubmitInvoices(so, schedule) {
  for (const entry of schedule) {
    const payload = {
      doctype: 'Sales Invoice',
      customer: so.customer,
      company: so.company,
      posting_date: entry.postingDate,
      due_date: entry.dueDate,
      student: so.student || undefined,
      custom_academic_year: so.custom_academic_year || '2026-2027',
      disable_rounded_total: 1,
      items: [{
        item_code: so.items[0].item_code,
        item_name: so.items[0].item_name,
        description: `${entry.label} — ${so.items[0].item_name || so.items[0].item_code}`,
        qty: 1,
        rate: entry.amount,
        amount: entry.amount,
        sales_order: so.name,
        so_detail: so.items[0].name,
      }],
    };
    const inv = await post('/api/resource/Sales Invoice', payload);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
    console.log(`    ✓ ${inv.name} | ₹${entry.amount} | due=${entry.dueDate}`);
  }
}

// ─── Students needing cancel + recreate ───────────────────────────────────────

const FIXES = [
  {
    name: 'MIZHAB TT',
    so: 'SAL-ORD-2026-00950',
    feeKey: 'Tier 1|Basic|10 State',
    n: 4,
    soTotal: 16401,
    txnDate: '2026-05-11',
    badInvoices: ['ACC-SINV-2026-07174', 'ACC-SINV-2026-07175', 'ACC-SINV-2026-07176', 'ACC-SINV-2026-07177'],
  },
  {
    name: 'MOHAMMED AZUN VS',
    so: 'SAL-ORD-2026-00933',
    feeKey: 'Tier 1|Basic|10 State',
    n: 4,
    soTotal: 16401,
    txnDate: '2026-05-08',
    badInvoices: ['ACC-SINV-2026-07178', 'ACC-SINV-2026-07179', 'ACC-SINV-2026-07180', 'ACC-SINV-2026-07181'],
  },
  {
    name: 'RIHAN VIJAY',
    so: 'SAL-ORD-2026-00951',
    feeKey: 'Tier 1|Advanced|Plus Two',
    n: 6,
    soTotal: 21460.98,
    txnDate: '2026-05-11',
    badInvoices: ['ACC-SINV-2026-07183', 'ACC-SINV-2026-07184', 'ACC-SINV-2026-07185', 'ACC-SINV-2026-07186', 'ACC-SINV-2026-07187'],
  },
];

async function main() {
  const errors = [];
  let success = 0;

  for (const fix of FIXES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`▶ ${fix.name} | ${fix.so}`);

    try {
      const config = FEE_CONFIG[fix.feeKey];
      if (!config) throw new Error(`Fee config not found: ${fix.feeKey}`);

      const schedule = buildPlanSchedule(config, fix.n, fix.soTotal, fix.txnDate);
      console.log(`  Plan: ${fix.feeKey} | ${fix.n} inst | total ₹${fix.soTotal}`);
      schedule.forEach(e => console.log(`    ${e.label}: ₹${e.amount} | due=${e.dueDate}`));

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would cancel ${fix.badInvoices.length} equal-split invoices + create ${fix.n} plan-based`);
        success++;
        continue;
      }

      // 1. Cancel equal-split invoices
      console.log(`  Cancelling ${fix.badInvoices.length} equal-split invoice(s)...`);
      for (const inv of fix.badInvoices) {
        await cancelInvoice(inv);
      }

      // 2. Delete cancelled invoices (optional, keeps ledger clean)
      console.log(`  Deleting cancelled invoice(s)...`);
      for (const inv of fix.badInvoices) {
        await deleteInvoice(inv);
      }

      // 3. Fetch the SO fresh (per_billed should now be 0)
      const so = await get(`/api/resource/Sales Order/${encodeURIComponent(fix.so)}`);
      console.log(`  SO per_billed after cancel: ${so.per_billed}%`);

      // 4. Create correct invoices
      console.log(`  Creating ${fix.n} plan-based invoice(s)...`);
      await createAndSubmitInvoices(so, schedule);

      console.log(`  ✅ Done`);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      errors.push({ student: fix.name, error: err.message });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done: ${success}/${FIXES.length} students fixed`);
  if (errors.length) {
    console.log('\nFailed:');
    errors.forEach(e => console.log(`  ✗ ${e.student}: ${e.error}`));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
