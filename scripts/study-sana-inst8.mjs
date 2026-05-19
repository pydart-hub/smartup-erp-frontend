import https from 'https';

function rawGet(path) {
  const safePath = path.replace(/ /g, '%20');
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'smartup.m.frappe.cloud',
      path: safePath,
      method: 'GET',
      headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ _raw: data.slice(0, 300) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== FKO 9th Advanced-8 — Per-Instalment Study ===\n');

  // 1. Check PE 137 for its fee structure settings
  console.log('--- 1. PE-137 custom fields ---');
  const pe137 = await rawGet('/api/resource/Program Enrollment/PEN-9th-Fortkochi 26-27-137');
  const p = pe137.data;
  if (p) {
    for (const [k, v] of Object.entries(p)) {
      if (k.startsWith('custom_') && v !== null && v !== '' && v !== undefined) {
        console.log(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
    console.log('  docstatus:', p.docstatus);
  } else {
    console.log('Error:', JSON.stringify(pe137));
  }

  // 2. SINV for STU-SU FKO-26-137
  console.log('\n--- 2. Invoices for FKO-26-137 ---');
  const sinv137 = await rawGet('/api/resource/Sales Invoice?filters=[["customer","=","STU-SU FKO-26-137"]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","status","docstatus"]&limit_page_length=20');
  console.log(JSON.stringify(sinv137.data, null, 2));
  if (sinv137.exception) console.log('Exc:', sinv137.exc_type);

  // 3. PE 135
  console.log('\n--- 3. PE-135 custom fields ---');
  const pe135 = await rawGet('/api/resource/Program Enrollment/PEN-9th-Fortkochi 26-27-135');
  const p135 = pe135.data;
  if (p135) {
    for (const [k, v] of Object.entries(p135)) {
      if (k.startsWith('custom_') && v !== null && v !== '' && v !== undefined) {
        console.log(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  // 4. SINV for 135
  console.log('\n--- 4. Invoices for FKO-26-135 ---');
  const sinv135 = await rawGet('/api/resource/Sales Invoice?filters=[["customer","=","STU-SU FKO-26-135"]]&fields=["name","grand_total","outstanding_amount","due_date","posting_date","status","docstatus"]&limit_page_length=20');
  console.log(JSON.stringify(sinv135.data, null, 2));
  if (sinv135.exception) console.log('Exc:', sinv135.exc_type);

  // 5. Check fee structure custom fields - full doc
  console.log('\n--- 5. SU FKO-9th State-Advanced-8 — All fields ---');
  const fs = await rawGet('/api/resource/Fee Structure/SU FKO-9th State-Advanced-8');
  if (fs.data) {
    for (const [k, v] of Object.entries(fs.data)) {
      if (v !== null && v !== undefined && v !== '' && !Array.isArray(v) && typeof v !== 'object') {
        console.log(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  // 6. Check PE of 091 full doc for all fields
  console.log('\n--- 6. PE-091 — ALL raw fields ---');
  const pe091 = await rawGet('/api/resource/Program Enrollment/PEN-9th-Fortkochi 26-27-091');
  if (pe091.data) {
    for (const [k, v] of Object.entries(pe091.data)) {
      if (v !== null && v !== undefined && v !== '' && !Array.isArray(v) && typeof v !== 'object') {
        console.log(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
