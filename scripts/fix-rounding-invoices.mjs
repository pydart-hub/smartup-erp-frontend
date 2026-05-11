/**
 * fix-rounding-invoices.mjs
 *
 * Cancels the 3 fractional invoices that got rounding_adjustment applied,
 * and recreates them with disable_rounded_total: 1.
 *
 * Dry run: node fix-rounding-invoices.mjs --dry-run
 * Execute: node fix-rounding-invoices.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY_RUN = process.argv.includes('--dry-run');
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

if (DRY_RUN) console.log('*** DRY RUN MODE ***\n');

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${url.replace(BASE, '')} → ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

async function get(path) { return (await fetchJSON(BASE + path)).data; }
async function post(path, body) { return (await fetchJSON(BASE + path, { method: 'POST', body: JSON.stringify(body) })).data; }
async function put(path, body) { return (await fetchJSON(BASE + path, { method: 'PUT', body: JSON.stringify(body) })).data; }

// The 3 last invoices that have rounding_adjustment (outstanding > grand_total)
const FIXES = [
  {
    student: 'RIHAN VIJAY',
    badInvoice: 'ACC-SINV-2026-07201',
    soName: 'SAL-ORD-2026-00951',
    amount: 460.98,
    dueDate: '2027-03-11',
  },
  {
    student: 'YOHAN VIJAY',
    badInvoice: 'ACC-SINV-2026-07219',
    soName: 'SAL-ORD-2026-00952',
    amount: 460.98,
    dueDate: '2027-03-11',
  },
  {
    student: 'SHYAM JITH',
    badInvoice: 'ACC-SINV-2026-07213',
    soName: 'SAL-ORD-2026-00953',
    amount: 1400.96,
    dueDate: '2026-12-11',
  },
];

async function main() {
  for (const fix of FIXES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`▶ ${fix.student} | ${fix.badInvoice} → ₹${fix.amount}`);

    try {
      if (!DRY_RUN) {
        // 1. Cancel
        const r = await fetch(BASE + '/api/method/frappe.client.cancel', {
          method: 'POST', headers, body: JSON.stringify({ doctype: 'Sales Invoice', name: fix.badInvoice }),
        });
        if (!r.ok) throw new Error(`Cancel failed: ${(await r.text()).slice(0, 200)}`);
        console.log(`  ✓ Cancelled ${fix.badInvoice}`);

        // 2. Delete
        const r2 = await fetch(BASE + `/api/resource/Sales Invoice/${encodeURIComponent(fix.badInvoice)}`, { method: 'DELETE', headers });
        if (!r2.ok) throw new Error(`Delete failed: ${(await r2.text()).slice(0, 200)}`);
        console.log(`  ✓ Deleted ${fix.badInvoice}`);

        // 3. Fetch SO for item details
        const so = await get(`/api/resource/Sales Order/${encodeURIComponent(fix.soName)}`);

        // 4. Recreate with disable_rounded_total: 1
        const payload = {
          doctype: 'Sales Invoice',
          customer: so.customer,
          company: so.company,
          posting_date: fix.dueDate,
          due_date: fix.dueDate,
          student: so.student || undefined,
          custom_academic_year: so.custom_academic_year || '2026-2027',
          disable_rounded_total: 1,
          items: [{
            item_code: so.items[0].item_code,
            item_name: so.items[0].item_name,
            description: `Last Instalment — ${so.items[0].item_name || so.items[0].item_code}`,
            qty: 1,
            rate: fix.amount,
            amount: fix.amount,
            sales_order: so.name,
            so_detail: so.items[0].name,
          }],
        };

        const inv = await post('/api/resource/Sales Invoice', payload);
        await put(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`, { docstatus: 1 });
        console.log(`  ✓ Created ${inv.name} | ₹${fix.amount} | due=${fix.dueDate} | disable_rounded_total=1`);

        // 5. Verify - fetch and check
        const saved = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
        console.log(`  → grand_total=${saved.grand_total} | outstanding=${saved.outstanding_amount} | rounding=${saved.rounding_adjustment}`);
        if (saved.outstanding_amount <= saved.grand_total) {
          console.log(`  ✅ outstanding (${saved.outstanding_amount}) ≤ grand_total (${saved.grand_total}) — no rounding issue`);
        } else {
          console.log(`  ⚠ outstanding (${saved.outstanding_amount}) > grand_total (${saved.grand_total}) — rounding still applied!`);
        }
      } else {
        console.log(`  [DRY RUN] Would cancel ${fix.badInvoice} and recreate ₹${fix.amount} with disable_rounded_total=1`);
      }
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
    }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
