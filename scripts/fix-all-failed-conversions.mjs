/**
 * fix-all-failed-conversions.mjs
 *
 * Batch fix for all 17 "Not Billed" SOs with no invoices.
 *
 * For each student:
 *   1. Cancel duplicate SOs (ADHIL ×5, HANAN ×1)
 *   2. Update PE via Server Script (plan, instalments, clear student_category)
 *   3. Create + submit N invoices from the SO
 *
 * Run dry-run first: node fix-all-failed-conversions.mjs --dry-run
 * Then execute:      node fix-all-failed-conversions.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('*** DRY RUN MODE — no changes will be made ***\n');

// ─── Students to fix ────────────────────────────────────────────────────────
//
// Sorted into two groups:
//  Group 1: PE still has student_category="Demo" — need PE update + invoices
//  Group 2: PE already updated — need invoices only
//
// For each: soName = the ONE SO to keep/use, dupSOs = list to cancel first
//
const STUDENTS = [
  // ── Group 1 — Full conversion failure (PE still Demo) ───────────────────
  {
    studentId: 'STU-SU FKO-26-094',
    name: 'MIZHAB TT',
    soName: 'SAL-ORD-2026-00950',
    dupSOs: [],
    plan: 'Basic',
    instalments: 4,
    peName: 'PEN-10th-Fortkochi 26-27-094',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-089',
    name: 'MOHAMMED AZUN VS',
    soName: 'SAL-ORD-2026-00933',
    dupSOs: [],
    plan: 'Basic',
    instalments: 4,
    peName: 'PEN-10th-Fortkochi 26-27-089',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-090',
    name: 'MOHAMMED ZIYAN CS',
    soName: 'SAL-ORD-2026-00937',
    dupSOs: [],
    plan: 'Basic',
    instalments: 1,
    peName: 'PEN-10th-Fortkochi 26-27-090',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-078',
    name: 'RIHAN VIJAY',
    soName: 'SAL-ORD-2026-00951',
    dupSOs: [],
    plan: 'Advanced',
    instalments: 6,
    peName: 'PEN-12sc state-Fortkochi 26-27-078',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-088',
    name: 'SANA FATHIMA KA',
    soName: 'SAL-ORD-2026-00954',
    dupSOs: [],
    plan: 'Basic',
    instalments: 4,
    peName: 'PEN-8th-Fortkochi 26-27-088',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-076',
    name: 'SHYAM JITH',
    soName: 'SAL-ORD-2026-00953',
    dupSOs: [],
    plan: 'Advanced',
    instalments: 8,
    peName: 'PEN-12sc state-Fortkochi 26-27-076',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-077',
    name: 'YOHAN VIJAY',
    soName: 'SAL-ORD-2026-00952',
    dupSOs: [],
    plan: 'Advanced',
    instalments: 6,
    peName: 'PEN-12sc state-Fortkochi 26-27-077',
    updatePE: true,
  },
  {
    studentId: 'STU-SU ERV-26-153',
    name: 'ADHIL P S',
    soName: 'SAL-ORD-2026-00922', // latest — keep this one
    dupSOs: [
      'SAL-ORD-2026-00895',
      'SAL-ORD-2026-00894',
      'SAL-ORD-2026-00887',
      'SAL-ORD-2026-00886',
      'SAL-ORD-2026-00885',
    ],
    plan: 'Basic',
    instalments: 8,
    peName: 'PEN-12sc state-Eraveli 26-27-153',
    updatePE: true,
  },
  {
    studentId: 'STU-SU FKO-26-099',
    name: 'HANAN SUDHEER',
    soName: 'SAL-ORD-2026-00860', // latest — keep this one
    dupSOs: ['SAL-ORD-2026-00859'],
    plan: 'Basic',
    instalments: 8,
    peName: 'PEN-10th-Fortkochi 26-27-099',
    updatePE: true,
  },

  // ── Group 2 — PE already updated, just need invoices ────────────────────
  {
    studentId: 'STU-SU CHL-26-014',
    name: 'AMINA M S',
    soName: 'SAL-ORD-2026-00737',
    dupSOs: [],
    plan: 'Advanced',
    instalments: 1, // SO qty=1 — single payment
    peName: 'PEN-10th-Chullickal 26-27-014',
    updatePE: false,
  },
  {
    studentId: 'STU-SU PLR-26-061',
    name: 'Sana Fathima Ismail',
    soName: 'SAL-ORD-2026-00688',
    dupSOs: [],
    plan: 'Basic',
    instalments: 1, // SO qty=1 — single payment
    peName: 'PEN-10th-Palluruthy 26-27-061',
    updatePE: false,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: AUTH } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`GET ${path} → ${r.status}: ${t.slice(0, 200)}`);
  }
  return (await r.json()).data;
}

async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`POST ${path} → ${r.status}: ${t.slice(0, 400)}`);
  }
  return (await r.json()).data;
}

async function put(path, body) {
  const r = await fetch(BASE + path, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`PUT ${path} → ${r.status}: ${t.slice(0, 400)}`);
  }
  return (await r.json()).data;
}

async function del(path) {
  const r = await fetch(BASE + path, { method: 'DELETE', headers });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`DELETE ${path} → ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.ok;
}

// ─── Cancel SO ───────────────────────────────────────────────────────────────

async function cancelSO(soName) {
  // Frappe cancel via method endpoint
  const r = await fetch(BASE + '/api/method/frappe.client.cancel', {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype: 'Sales Order', name: soName }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    // Try alternative: PUT with docstatus=2
    const r2 = await fetch(BASE + `/api/resource/Sales Order/${encodeURIComponent(soName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 2 }),
    });
    if (!r2.ok) {
      const t2 = await r2.text().catch(() => '');
      throw new Error(`Cancel SO ${soName} failed: ${r2.status}: ${t2.slice(0, 200)}`);
    }
    return (await r2.json()).data;
  }
  return (await r.json()).message || 'cancelled';
}

// ─── Update PE via Server Script ─────────────────────────────────────────────

async function updatePEViaServerScript(peName, plan, instalments) {
  const scriptName = `fix-pe-${peName.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`;
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

  // 1. Create server script
  const ss = await post('/api/resource/Server Script', {
    name: scriptName,
    script_type: 'API',
    api_method: scriptName,
    allow_guest: 0,
    disabled: 0,
    script: pyCode,
  });
  const ssName = ss.name || scriptName;

  // 2. Run it
  const r = await fetch(BASE + `/api/method/${ssName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doc_name: peName }),
  });
  const resp = await r.json().catch(() => ({}));

  // 3. Delete the script
  await del(`/api/resource/Server Script/${encodeURIComponent(ssName)}`).catch(() => {});

  if (!r.ok) {
    throw new Error(`Server script failed: ${JSON.stringify(resp)}`);
  }
  return resp;
}

// ─── Build instalment schedule ────────────────────────────────────────────────

function formatDate(y, m, d) {
  // m is 0-indexed (JavaScript month)
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildSchedule(grand_total, n, txnDate) {
  const todayObj = new Date();
  const today = formatDate(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  const parts = txnDate.split('-').map(Number); // [yyyy, mm, dd] where mm is 1-indexed
  // First due = 1st of the NEXT month after txn date (using local date arithmetic)
  const firstDueYear = parts[1] === 12 ? parts[0] + 1 : parts[0];
  const firstDueMonth = parts[1] === 12 ? 0 : parts[1]; // 0-indexed

  const perInstalment = Math.round((grand_total / n) * 100) / 100;
  const schedule = [];

  for (let i = 0; i < n; i++) {
    // Add i months to firstDue
    const rawMonth = firstDueMonth + i;
    const year = firstDueYear + Math.floor(rawMonth / 12);
    const month = rawMonth % 12; // 0-indexed
    const dueDate = formatDate(year, month, 1);

    // If due date is in the past, push both posting and due to today
    const postingDate = dueDate < today ? today : dueDate;
    const effectiveDueDate = dueDate < today ? today : dueDate;

    let amount = perInstalment;
    if (i === n - 1) {
      // Last instalment: absorb rounding difference
      const prev = Math.round(perInstalment * (n - 1) * 100) / 100;
      amount = Math.round((grand_total - prev) * 100) / 100;
    }

    schedule.push({
      label: n === 1 ? 'Full Payment' : `Instalment ${i + 1}`,
      amount,
      dueDate: effectiveDueDate,
      postingDate,
    });
  }

  return schedule;
}

// ─── Create + submit invoices ─────────────────────────────────────────────────

async function createInvoices(so, schedule) {
  const created = [];

  for (const entry of schedule) {
    const payload = {
      doctype: 'Sales Invoice',
      customer: so.customer,
      company: so.company,
      posting_date: entry.postingDate,
      due_date: entry.dueDate,
      student: so.student || undefined,
      custom_academic_year: so.custom_academic_year || '2026-2027',
      items: [{
        item_code: so.items[0].item_code,
        qty: 1,
        rate: entry.amount,
        amount: entry.amount,
        sales_order: so.name,
        so_detail: so.items[0].name,
      }],
      custom_instalment_label: entry.label,
      customer_address: so.customer_address || undefined,
    };

    const inv = await post('/api/resource/Sales Invoice', payload);
    const invName = inv.name;

    // Submit
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { docstatus: 1 });

    created.push({ name: invName, amount: entry.amount, dueDate: entry.dueDate });
    console.log(`    ✓ ${invName} | ₹${entry.amount} | due ${entry.dueDate}`);
  }

  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function processStudent(stu) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${stu.name} (${stu.studentId})`);
  console.log(`  SO: ${stu.soName} | ${stu.instalments} instalment(s) | PE: ${stu.peName}`);

  // Step 1: Cancel duplicate SOs
  if (stu.dupSOs.length > 0) {
    console.log(`  Cancelling ${stu.dupSOs.length} duplicate SO(s)...`);
    for (const dupName of stu.dupSOs) {
      if (!DRY_RUN) {
        await cancelSO(dupName);
      }
      console.log(`    ✓ Cancelled ${dupName}`);
    }
  }

  // Step 2: Fetch SO details
  const so = await get(`/api/resource/Sales Order/${encodeURIComponent(stu.soName)}`);
  if (so.docstatus !== 1) {
    console.log(`  ⚠ SO ${stu.soName} is not submitted (docstatus=${so.docstatus}). Skipping.`);
    return;
  }

  // Check if invoices already exist (guard against double-run)
  const invCheck = await fetch(
    BASE + '/api/resource/Sales Invoice?filters=' +
    encodeURIComponent(JSON.stringify([['sales_order', '=', stu.soName], ['docstatus', '!=', 2]])) +
    '&fields=' + encodeURIComponent(JSON.stringify(['name'])) +
    '&limit_page_length=5',
    { headers: { Authorization: AUTH } }
  );
  const invData = await invCheck.json();
  if (invData.data?.length > 0) {
    console.log(`  ⚠ Already has invoices (${invData.data.map(i => i.name).join(', ')}). Skipping invoice creation.`);
    return;
  }

  // Step 3: Update PE (if needed)
  if (stu.updatePE) {
    console.log(`  Updating PE ${stu.peName}...`);
    if (!DRY_RUN) {
      await updatePEViaServerScript(stu.peName, stu.plan, stu.instalments);
    }
    console.log(`    ✓ PE updated: plan=${stu.plan}, instalments=${stu.instalments}, category cleared`);
  }

  // Step 4: Build schedule
  const schedule = buildSchedule(so.grand_total, stu.instalments, so.transaction_date);
  const total = schedule.reduce((s, e) => s + e.amount, 0);
  console.log(`  Schedule (${stu.instalments} inst, total ₹${total.toFixed(2)}):`);
  schedule.forEach(e => console.log(`    ${e.label}: ₹${e.amount} | posting=${e.postingDate} | due=${e.dueDate}`));

  // Step 5: Create invoices
  if (!DRY_RUN) {
    console.log(`  Creating invoices...`);
    const created = await createInvoices(so, schedule);
    console.log(`  ✅ Created ${created.length} invoice(s)`);
  } else {
    console.log(`  [DRY RUN] Would create ${stu.instalments} invoice(s)`);
  }
}

async function main() {
  const errors = [];
  let success = 0;

  for (const stu of STUDENTS) {
    try {
      await processStudent(stu);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      errors.push({ student: stu.name, error: err.message });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done: ${success}/${STUDENTS.length} students processed`);
  if (errors.length) {
    console.log(`\nFailed students:`);
    errors.forEach(e => console.log(`  ✗ ${e.student}: ${e.error}`));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
