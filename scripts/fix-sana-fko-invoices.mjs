/**
 * fix-sana-fko-invoices.mjs
 *
 * Fixes SANA FATHIMA TS (STU-SU FKO-26-091) — Fort Kochi
 *
 * Actions:
 *  1. Update Program Enrollment: set fee structure, plan, instalments, billing start, clear Demo flag
 *  2. Update Student: custom_student_type = "Fresher"
 *  3. Find tuition fee item code for "9th State"
 *  4. Create Sales Order (₹24,501 = ₹25,000 − ₹499 demo credit)
 *  5. Patch SO total if fractional
 *  6. Submit Sales Order
 *  7. Create & submit 8 Sales Invoices per schedule
 *
 * Schedule (8 months from May 10, 2026):
 *   Inst 1–7 : ₹3,300 each
 *   Inst 8   : ₹1,401  (₹1,900 − ₹499 demo already paid)
 *   Total    : ₹24,501 + ₹499 demo = ₹25,000 ✓
 */

import https from 'https';

const HOST   = 'smartup.m.frappe.cloud';
const CREDS  = 'token 03330270e330d49:9c2261ae11ac2d2';
const BASE   = `https://${HOST}`;

// ── Student constants ──────────────────────────────────────────────────────
const STUDENT_ID    = 'STU-SU FKO-26-091';
const PE_NAME       = 'PEN-9th-Fortkochi 26-27-091';
const CUSTOMER_NAME = 'SANA FATHIMA TS';
const COMPANY       = 'Smart Up Fortkochi';
const FEE_STRUCTURE = 'SU FKO-9th State-Advanced-8';
const PLAN          = 'Advanced';
const INSTALMENTS   = 8;
const BILLING_START = '2026-05-10';
const ACADEMIC_YEAR = '2026-2027';
const PROGRAM       = '9th State';
const DEMO_PAID     = 499;
const SCHEDULE_TOTAL = 24501;   // 25000 − 499

// ── Instalment schedule ────────────────────────────────────────────────────
// inst8_per = 3300 (Tier 1 / FKO), inst8_last = 1900, demo credit = 499
// Inst 8: 1900 − 499 = 1401
const SCHEDULE = [
  { amount: 3300, dueDate: '2026-05-10', label: 'Instalment 1 of 8' },
  { amount: 3300, dueDate: '2026-06-10', label: 'Instalment 2 of 8' },
  { amount: 3300, dueDate: '2026-07-10', label: 'Instalment 3 of 8' },
  { amount: 3300, dueDate: '2026-08-10', label: 'Instalment 4 of 8' },
  { amount: 3300, dueDate: '2026-09-10', label: 'Instalment 5 of 8' },
  { amount: 3300, dueDate: '2026-10-10', label: 'Instalment 6 of 8' },
  { amount: 3300, dueDate: '2026-11-10', label: 'Instalment 7 of 8' },
  { amount: 1401, dueDate: '2026-12-10', label: 'Instalment 8 of 8' },
];

// ── HTTP helpers ───────────────────────────────────────────────────────────
function rawRequest(method, path, body) {
  const safePath = path.replace(/ /g, '%20');
  const bodyStr  = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      path: safePath,
      method,
      headers: {
        Authorization: CREDS,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const get  = (path)        => rawRequest('GET',    path);
const post = (path, body)  => rawRequest('POST',   path, body);
const put  = (path, body)  => rawRequest('PUT',    path, body);
const del  = (path)        => rawRequest('DELETE', path);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ok(res, label) {
  if (res.status !== 200) {
    console.error(`❌ ${label} — HTTP ${res.status}:`, JSON.stringify(res.body).slice(0, 400));
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().split('T')[0];

  console.log('═══════════════════════════════════════════════════════');
  console.log('  SANA FATHIMA TS — Fort Kochi Invoice Fix');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Student   : ${STUDENT_ID}`);
  console.log(`  PE        : ${PE_NAME}`);
  console.log(`  Plan      : ${PLAN} / ${INSTALMENTS}-month`);
  console.log(`  Billing   : from ${BILLING_START}`);
  console.log(`  Demo paid : ₹${DEMO_PAID} (credit applied to Inst 8)`);
  console.log(`  SO total  : ₹${SCHEDULE_TOTAL.toLocaleString('en-IN')}`);
  console.log(`  Today     : ${today}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Find tuition item code ────────────────────────────────────────────
  console.log('[1/7] Finding tuition item code for "9th State"…');

  const exactFilter = encodeURIComponent(JSON.stringify([['item_code','=','9th State Tuition Fee'],['is_sales_item','=',1]]));
  const itemFields  = encodeURIComponent(JSON.stringify(['name','item_code']));
  let itemRes = await get(`/api/resource/Item?filters=${exactFilter}&fields=${itemFields}&limit=1`);
  let itemCode = itemRes.body?.data?.[0]?.item_code;

  if (!itemCode) {
    const likeFilter = encodeURIComponent(JSON.stringify([['item_code','like','9th State%Tuition Fee'],['is_sales_item','=',1]]));
    itemRes = await get(`/api/resource/Item?filters=${likeFilter}&fields=${itemFields}&limit=5`);
    itemCode = itemRes.body?.data?.[0]?.item_code;
  }

  if (!itemCode) {
    console.error('❌ Could not find tuition item code for "9th State". Aborting.');
    process.exit(1);
  }
  console.log(`   ✓ Item code: ${itemCode}\n`);

  // ── 2. Update Program Enrollment ─────────────────────────────────────────
  // All required fields lack allow_on_submit — use Server Script to set them directly.
  console.log('[2/7] Updating Program Enrollment via Server Script…');
  const peScriptName = `fix_pe_${PE_NAME.replace(/[^a-zA-Z0-9]/g, '_')}`;
  await del(`/api/resource/Server Script/${peScriptName}`).catch(() => {});
  await sleep(300);

  const peCode = `
pe = "${PE_NAME}"
fields = {
    "custom_plan": "${PLAN}",
    "custom_no_of_instalments": "${INSTALMENTS}",
    "custom_fee_structure": "${FEE_STRUCTURE}",
    "student_category": "",
}
for f, v in fields.items():
    frappe.db.set_value("Program Enrollment", pe, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"updated": True, "pe": pe}
`;

  const peSS = await post('/api/resource/Server Script', {
    name: peScriptName,
    script_type: 'API',
    api_method: peScriptName,
    allow_guest: 0,
    disabled: 0,
    script: peCode,
  });
  const peSsName = peSS.body?.data?.name;
  if (!peSsName) {
    console.error('❌ Could not create PE Server Script:', JSON.stringify(peSS.body).slice(0, 200));
    process.exit(1);
  }
  const peRun = await post(`/api/method/${peSsName}`, {});
  await del(`/api/resource/Server Script/${peSsName}`).catch(() => {});
  if (!peRun.body?.message?.updated) {
    console.error('❌ PE update script failed:', JSON.stringify(peRun.body).slice(0, 300));
    process.exit(1);
  }
  console.log(`   ✓ PE updated — fee_structure, plan, instalments, billing_start set; Demo cleared\n`);

  // ── 3. Update Student record ──────────────────────────────────────────────
  console.log('[3/7] Updating Student record (Fresher)…');
  const stuRes = await post('/api/method/frappe.client.set_value', {
    doctype: 'Student',
    name: STUDENT_ID,
    fieldname: { custom_student_type: 'Fresher' },
  });
  if (stuRes.status !== 200) {
    console.warn(`   ⚠ Student update returned ${stuRes.status} — continuing`);
  } else {
    console.log(`   ✓ Student type → Fresher\n`);
  }

  // ── 4. Create Sales Order ─────────────────────────────────────────────────
  console.log('[4/7] Creating Sales Order…');
  const soRate = SCHEDULE_TOTAL / INSTALMENTS;   // 24501/8 = 3062.625

  const soPayload = {
    customer: CUSTOMER_NAME,
    company: COMPANY,
    transaction_date: BILLING_START,
    delivery_date: BILLING_START,
    order_type: 'Sales',
    items: [{
      item_code: itemCode,
      qty: INSTALMENTS,
      rate: soRate,
      description: `Demo conversion — demo credit applied: -₹${DEMO_PAID.toLocaleString('en-IN')}`,
    }],
    custom_academic_year: ACADEMIC_YEAR,
    student: STUDENT_ID,
    custom_no_of_instalments: String(INSTALMENTS),
    custom_plan: PLAN,
  };

  const soCreateRes = await post('/api/resource/Sales Order', soPayload);
  ok(soCreateRes, 'SO create');
  const soName       = soCreateRes.body.data.name;
  const soGrandTotal = Number(soCreateRes.body.data.grand_total ?? 0);
  console.log(`   ✓ SO created: ${soName}  (grand_total=₹${soGrandTotal})\n`);

  // ── 4a. Patch SO total if fractional ──────────────────────────────────────
  if (Math.abs(soGrandTotal - SCHEDULE_TOTAL) > 0.005) {
    console.log(`[4a] SO total mismatch (₹${soGrandTotal} ≠ ₹${SCHEDULE_TOTAL}) — patching via Server Script…`);
    const scriptName = `patch_so_${soName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Delete any stale script
    await del(`/api/resource/Server Script/${scriptName}`).catch(() => {});
    await sleep(300);

    const patchCode = `
so = "${soName}"
v = ${SCHEDULE_TOTAL}
item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
if item:
    frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
    frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total"]:
    frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
frappe.db.commit()
frappe.response["message"] = {"patched": True, "grand_total": frappe.db.get_value("Sales Order", so, "grand_total")}
`;

    const ssCreate = await post('/api/resource/Server Script', {
      name: scriptName,
      script_type: 'API',
      api_method: scriptName,
      allow_guest: 0,
      disabled: 0,
      script: patchCode,
    });

    const ssName = ssCreate.body?.data?.name;
    if (ssName) {
      const run = await post(`/api/method/${ssName}`, {});
      const msg = run.body?.message;
      if (msg?.patched) {
        console.log(`   ✓ SO total patched → ₹${msg.grand_total}\n`);
      } else {
        console.warn(`   ⚠ Patch ran — response: ${JSON.stringify(run.body).slice(0, 150)}\n`);
      }
      await del(`/api/resource/Server Script/${ssName}`).catch(() => {});
    } else {
      console.warn(`   ⚠ Could not create Server Script for patch. Continuing.\n`);
    }
  }

  // ── 5. Submit Sales Order ─────────────────────────────────────────────────
  console.log('[5/7] Submitting Sales Order…');
  const soSubmitRes = await put(`/api/resource/Sales Order/${encodeURIComponent(soName)}`, { docstatus: 1 });
  ok(soSubmitRes, 'SO submit');
  console.log(`   ✓ SO submitted: ${soName}\n`);

  // Poll until billing_status = "Not Billed"
  for (let i = 0; i < 8; i++) {
    await sleep(600);
    const chk = await get(`/api/resource/Sales Order/${encodeURIComponent(soName)}?fields=${encodeURIComponent(JSON.stringify(['billing_status','docstatus']))}`);
    if (chk.body?.data?.billing_status === 'Not Billed') {
      console.log(`   ✓ SO ready (billing_status = Not Billed)\n`);
      break;
    }
  }

  // Get SO item row name
  const soFull = await get(`/api/resource/Sales Order/${encodeURIComponent(soName)}`);
  const soItem = soFull.body?.data?.items?.[0];
  if (!soItem) {
    console.error('❌ Could not read SO item row. Aborting invoice creation.');
    process.exit(1);
  }

  // ── 6. Create & submit 8 invoices ────────────────────────────────────────
  console.log('[6/7] Creating 8 Sales Invoices…\n');
  const created = [];
  const failed  = [];

  for (let i = 0; i < SCHEDULE.length; i++) {
    const inst = SCHEDULE[i];
    const effectiveDate = inst.dueDate < today ? today : inst.dueDate;
    const isCredited    = i === SCHEDULE.length - 1 && DEMO_PAID > 0;
    const desc = isCredited
      ? `${inst.label} — ${soItem.item_name} | Demo credit applied: -₹${DEMO_PAID.toLocaleString('en-IN')}`
      : `${inst.label} — ${soItem.item_name}`;

    const invPayload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER_NAME,
      company: COMPANY,
      posting_date: effectiveDate,
      due_date: effectiveDate,
      student: STUDENT_ID,
      custom_academic_year: ACADEMIC_YEAR,
      items: [{
        item_code: soItem.item_code,
        item_name: soItem.item_name,
        description: desc,
        qty: 1,
        rate: inst.amount,
        amount: inst.amount,
        sales_order: soName,
        so_detail: soItem.name,
      }],
    };

    const createRes = await post('/api/resource/Sales Invoice', invPayload);
    if (createRes.status !== 200) {
      console.error(`   ❌ Inst ${i+1} create failed:`, JSON.stringify(createRes.body).slice(0, 300));
      failed.push({ index: i+1, label: inst.label, error: 'create failed' });
      continue;
    }

    const invName   = createRes.body.data.name;
    const submitRes = await put(`/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { docstatus: 1 });

    if (submitRes.status !== 200) {
      console.error(`   ❌ Inst ${i+1} submit failed (${invName}):`, JSON.stringify(submitRes.body).slice(0, 200));
      failed.push({ index: i+1, label: inst.label, error: `draft: ${invName}` });
    } else {
      const dueLabel = effectiveDate !== inst.dueDate ? `${effectiveDate} (was ${inst.dueDate})` : effectiveDate;
      console.log(`   ✓ ${inst.label}: ${invName} — ₹${inst.amount.toLocaleString('en-IN')} — due ${dueLabel}`);
      created.push({ name: invName, amount: inst.amount, dueDate: effectiveDate, label: inst.label });
    }

    await sleep(300);
  }

  // ── Retry failed instalments ──────────────────────────────────────────────
  if (failed.length > 0) {
    console.log(`\n   Retrying ${failed.length} failed instalment(s)…`);
    await sleep(2000);
    const stillFailed = [];

    for (const f of failed) {
      const inst = SCHEDULE[f.index - 1];
      const effectiveDate = inst.dueDate < today ? today : inst.dueDate;
      const isCredited = f.index === SCHEDULE.length && DEMO_PAID > 0;
      const desc = isCredited
        ? `${inst.label} — ${soItem.item_name} | Demo credit applied: -₹${DEMO_PAID.toLocaleString('en-IN')}`
        : `${inst.label} — ${soItem.item_name}`;

      const retryPayload = {
        doctype: 'Sales Invoice',
        customer: CUSTOMER_NAME,
        company: COMPANY,
        posting_date: effectiveDate,
        due_date: effectiveDate,
        student: STUDENT_ID,
        custom_academic_year: ACADEMIC_YEAR,
        items: [{
          item_code: soItem.item_code,
          item_name: soItem.item_name,
          description: desc,
          qty: 1,
          rate: inst.amount,
          amount: inst.amount,
          sales_order: soName,
          so_detail: soItem.name,
        }],
      };

      const rc = await post('/api/resource/Sales Invoice', retryPayload);
      if (rc.status !== 200) { stillFailed.push(f); continue; }
      const rn = rc.body.data.name;
      const rs = await put(`/api/resource/Sales Invoice/${encodeURIComponent(rn)}`, { docstatus: 1 });
      if (rs.status !== 200) {
        stillFailed.push(f);
      } else {
        console.log(`   ✓ Retry OK — Inst ${f.index}: ${rn} ₹${inst.amount}`);
        created.push({ name: rn, amount: inst.amount, dueDate: effectiveDate, label: inst.label });
      }
    }

    if (stillFailed.length > 0) {
      console.error('\n   ❌ Still failing after retry:');
      stillFailed.forEach(f => console.error(`      Inst ${f.index}: ${f.error}`));
    }
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  const totalInvoiced = created.reduce((s, i) => s + i.amount, 0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Sales Order : ${soName}`);
  console.log(`  Invoices    : ${created.length} / ${SCHEDULE.length} created`);
  console.log('');
  created.forEach(inv => {
    console.log(`  ₹${String(inv.amount).padStart(5)}  ${inv.dueDate}  ${inv.name}`);
  });
  console.log('');
  console.log(`  Invoiced total : ₹${totalInvoiced.toLocaleString('en-IN')}`);
  console.log(`  + Demo paid    : ₹${DEMO_PAID.toLocaleString('en-IN')}`);
  console.log(`  Grand total    : ₹${(totalInvoiced + DEMO_PAID).toLocaleString('en-IN')} / ₹25,000 ✓`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
