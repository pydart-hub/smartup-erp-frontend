/**
 * fix-farsana-invoices.mjs
 *
 * Cancels the equal split invoices for FARSANA A (SBT-00010)
 * and recreates them using the fee structure JSON logic.
 *
 * Execute: node scripts/fix-farsana-invoices.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const FEE_CONFIG = JSON.parse(readFileSync(join(__dir, '../docs/fee_structure_parsed.json'), 'utf8'));

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

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

async function cancelInvoice(name) {
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

const OFFSETS = { 8: [0, 1, 2, 3, 4, 5, 6, 7] };
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

async function main() {
  const SO_REF = 'SAL-ORD-2026-01704';
  const STUDENT = 'STU-SU ERV-26-200';
  const ENROLLMENT_DATE = '2026-08-04'; // transfer date
  const NUM_INSTALMENTS = 8;
  const SO_TOTAL = 15700;
  const FEE_KEY = 'Tier 1|Basic|10 State';
  
  const config = FEE_CONFIG[FEE_KEY];
  if (!config) throw new Error(`Fee config not found for key: ${FEE_KEY}`);

  console.log(`\n[1] Fetching incorrect invoices for student ${STUDENT}...`);
  const allInvoices = await get(`/api/resource/Sales Invoice?filters=[["student","=","${STUDENT}"]]&limit=50&fields=["name","docstatus"]`);
  
  let targetInvoices = [];
  for (const invSummary of allInvoices) {
    const inv = await get(`/api/resource/Sales Invoice/${invSummary.name}`);
    if (inv.items && inv.items[0] && inv.items[0].sales_order === SO_REF) {
      targetInvoices.push(inv);
    }
  }

  console.log(`Found ${targetInvoices.length} invoices linked to SO ${SO_REF}.`);

  console.log(`\n[2] Cancelling and deleting old invoices...`);
  for (const inv of targetInvoices) {
    if (inv.docstatus === 1) {
      await cancelInvoice(inv.name);
    }
    await deleteInvoice(inv.name);
  }

  console.log(`\n[3] Fetching Sales Order details...`);
  const soDoc = await get(`/api/resource/Sales Order/${SO_REF}`);
  
  console.log(`\n[4] Building correct schedule from JSON...`);
  
  const others = config.inst8_per * 7;
  const amounts = [...Array(7).fill(config.inst8_per), Math.round((SO_TOTAL - others) * 100) / 100];
  
  const dueDates = OFFSETS[NUM_INSTALMENTS].map(o => {
    const d = addMonthsClamped(ENROLLMENT_DATE, o);
    return d < TODAY_STR ? TODAY_STR : d;
  });

  const schedule = amounts.map((amount, i) => ({
    label: `Inst ${i + 1}`,
    amount,
    dueDate: dueDates[i],
    postingDate: dueDates[i],
  }));

  const total = schedule.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(total - SO_TOTAL) > 0.01) {
    throw new Error(`Total mismatch: schedule ${total} vs SO ${SO_TOTAL}`);
  }

  console.log(`Schedule:`, schedule.map(s => `${s.label}: ₹${s.amount}`).join(', '));

  console.log(`\n[5] Creating ${NUM_INSTALMENTS} new invoices...`);
  for (const entry of schedule) {
    const payload = {
      doctype: 'Sales Invoice',
      customer: soDoc.customer,
      company: soDoc.company,
      posting_date: entry.postingDate,
      due_date: entry.dueDate,
      student: soDoc.student || undefined,
      custom_academic_year: soDoc.custom_academic_year || '2026-2027',
      disable_rounded_total: 1,
      items: [{
        item_code: soDoc.items[0].item_code,
        item_name: soDoc.items[0].item_name,
        description: `${entry.label} — Transfer from Smart Up Eraveli`,
        qty: 1,
        rate: entry.amount,
        amount: entry.amount,
        sales_order: soDoc.name,
        so_detail: soDoc.items[0].name,
      }],
    };
    const inv = await post('/api/resource/Sales Invoice', payload);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
    console.log(`    ✓ Created & submitted ${inv.name} | ₹${entry.amount} | due=${entry.dueDate}`);
  }

  console.log('\nDone!');
}

main().catch(e => console.error(e));
