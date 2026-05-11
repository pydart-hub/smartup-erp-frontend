/**
 * fix-sibling-invoices.mjs
 * 
 * Fixes Aysha Neeya M S and Aysha Neha M S sibling discount invoices.
 * Moves discount from first invoice (credit note / wrong amount) to LAST invoice (₹110).
 * 
 * NEEYA (5 ops):
 *   1. Cancel Credit Note ACC-SINV-2026-07041
 *   2. Cancel PE-04867 (₹1510)
 *   3. Recreate PE at ₹2400 against Inv#1 (07025)
 *   4. Cancel Inv#8 ACC-SINV-2026-07032 (₹1000)
 *   5. Recreate Inv#8 at ₹110
 *
 * NEHA (8 ops):
 *   1. Cancel PE-04869 (₹890 against Inv#2)
 *   2. Cancel PE-04868 (₹1510 against Inv#1)
 *   3. Cancel Inv#1 ACC-SINV-2026-07033 (₹1510)
 *   4. Recreate Inv#1 at ₹2400
 *   5. Recreate PE ₹1510 (UTR 612871244823) against new Inv#1
 *   6. Recreate PE ₹890 (UTR 612820336831) against new Inv#1
 *   7. Cancel Inv#8 ACC-SINV-2026-07040 (₹1000)
 *   8. Recreate Inv#8 at ₹110
 */

import https from 'https';

const HOST = 'smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST,
      path,
      method,
      headers: {
        'Authorization': AUTH,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} on ${method} ${path}: ${raw.substring(0, 600)}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error(`Parse error on ${method} ${path}: ${raw.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const get  = (path) => apiCall('GET', path, null);
const put  = (dt, name, data) => apiCall('PUT',  `/api/resource/${encodeURIComponent(dt)}/${encodeURIComponent(name)}`, data);
const post = (dt, data)       => apiCall('POST', `/api/resource/${encodeURIComponent(dt)}`, data);

function log(msg) { console.log(`[${new Date().toISOString().substring(11, 19)}]`, msg); }

async function cancelDoc(doctype, name, desc) {
  log(`Cancelling ${desc} (${name})…`);
  await put(doctype, name, { docstatus: 2 });
  log(`  ✓ Cancelled ${name}`);
}

// ── Build a new Sales Invoice payload from an existing one, with overrides ──
function buildInvoicePayload(orig, itemOverrides, rateOverride, descSuffix) {
  const origItem = (orig.items || [])[0] || {};
  return {
    doctype: 'Sales Invoice',
    customer: orig.customer,
    company: orig.company,
    posting_date: orig.posting_date,
    due_date: orig.due_date,
    is_return: 0,
    ...(orig.custom_academic_year ? { custom_academic_year: orig.custom_academic_year } : {}),
    items: [{
      item_code: origItem.item_code,
      item_name: origItem.item_name,
      description: descSuffix
        ? `${origItem.description || origItem.item_name} | ${descSuffix}`
        : (origItem.description || origItem.item_name),
      qty: 1,
      rate: rateOverride,
      amount: rateOverride,
      uom: origItem.uom || origItem.stock_uom || 'Nos',
      income_account: origItem.income_account,
      cost_center: origItem.cost_center,
      ...(origItem.sales_order ? { sales_order: origItem.sales_order } : {}),
      ...(origItem.so_detail   ? { so_detail:   origItem.so_detail   } : {}),
      ...itemOverrides,
    }],
  };
}

// ── Build a new Payment Entry payload from an existing one, with overrides ──
function buildPEPayload(orig, amount, invoiceName, utrOverride) {
  return {
    doctype: 'Payment Entry',
    payment_type: orig.payment_type,
    party_type: orig.party_type,
    party: orig.party,
    party_name: orig.party_name,
    posting_date: orig.posting_date,
    company: orig.company,
    mode_of_payment: orig.mode_of_payment,
    reference_no: utrOverride || orig.reference_no,
    reference_date: orig.reference_date || orig.posting_date,
    paid_from: orig.paid_from,
    paid_to: orig.paid_to,
    paid_amount: amount,
    received_amount: amount,
    target_exchange_rate: 1,
    source_exchange_rate: 1,
    references: [{
      reference_doctype: 'Sales Invoice',
      reference_name: invoiceName,
      allocated_amount: amount,
    }],
    remarks: `Amount INR ${amount}.0 received from ${orig.party_name || orig.party}\nTransaction reference no ${utrOverride || orig.reference_no} dated ${orig.posting_date}\nAmount INR ${amount}.0 against Sales Invoice ${invoiceName}`,
  };
}

async function createAndSubmit(doctype, payload, desc) {
  log(`Creating ${desc}…`);
  const draft = (await post(doctype, payload)).data;
  log(`  Draft created: ${draft.name}`);
  await put(doctype, draft.name, { docstatus: 1 });
  log(`  ✓ Submitted: ${draft.name}`);
  return draft;
}

// ══════════════════════════════════════════════════════════════
async function main() {
  log('Fetching all required documents…');

  const [
    neeya_inv1, neeya_inv8,
    neha_inv1,  neha_inv8,
    pe4867, pe4868, pe4869,
  ] = await Promise.all([
    get('/api/resource/Sales%20Invoice/ACC-SINV-2026-07025').then(r => r.data),
    get('/api/resource/Sales%20Invoice/ACC-SINV-2026-07032').then(r => r.data),
    get('/api/resource/Sales%20Invoice/ACC-SINV-2026-07033').then(r => r.data),
    get('/api/resource/Sales%20Invoice/ACC-SINV-2026-07040').then(r => r.data),
    get('/api/resource/Payment%20Entry/ACC-PAY-2026-04867').then(r => r.data),
    get('/api/resource/Payment%20Entry/ACC-PAY-2026-04868').then(r => r.data),
    get('/api/resource/Payment%20Entry/ACC-PAY-2026-04869').then(r => r.data),
  ]);

  log('All documents fetched. Starting operations…\n');

  // ════════════════════════════════
  log('════ NEEYA FIXES ════');

  // 1. Cancel Credit Note
  await cancelDoc('Sales Invoice', 'ACC-SINV-2026-07041', 'Credit Note -₹890');

  // 2. Cancel old PE ₹1510
  await cancelDoc('Payment Entry', 'ACC-PAY-2026-04867', 'Neeya PE ₹1510');

  // 3. Recreate PE at ₹2400 against Inv#1
  const neeya_new_pe = await createAndSubmit(
    'Payment Entry',
    buildPEPayload(pe4867, 2400, 'ACC-SINV-2026-07025'),
    'Neeya PE ₹2400 against Inv#1',
  );

  // 4. Cancel Inv#8 ₹1000
  await cancelDoc('Sales Invoice', 'ACC-SINV-2026-07032', 'Neeya Inv#8 ₹1000');

  // 5. Recreate Inv#8 at ₹110
  const neeya_new_inv8 = await createAndSubmit(
    'Sales Invoice',
    buildInvoicePayload(neeya_inv8, {}, 110, 'Sibling discount: -₹890'),
    'Neeya Inv#8 ₹110',
  );

  log('');
  // ════════════════════════════════
  log('════ NEHA FIXES ════');

  // 1. Cancel PE-04869 (₹890 against Inv#2)
  await cancelDoc('Payment Entry', 'ACC-PAY-2026-04869', 'Neha PE ₹890');

  // 2. Cancel PE-04868 (₹1510 against Inv#1)
  await cancelDoc('Payment Entry', 'ACC-PAY-2026-04868', 'Neha PE ₹1510');

  // 3. Cancel Inv#1 ₹1510
  await cancelDoc('Sales Invoice', 'ACC-SINV-2026-07033', 'Neha Inv#1 ₹1510');

  // 4. Recreate Inv#1 at ₹2400
  const neha_new_inv1 = await createAndSubmit(
    'Sales Invoice',
    buildInvoicePayload(neha_inv1, {}, 2400, null),
    'Neha Inv#1 ₹2400',
  );

  // 5. Recreate PE ₹1510 (UTR 612871244823) against new Inv#1
  const neha_new_pe1 = await createAndSubmit(
    'Payment Entry',
    buildPEPayload(pe4868, 1510, neha_new_inv1.name, '612871244823'),
    'Neha PE ₹1510 against new Inv#1',
  );

  // 6. Recreate PE ₹890 (UTR 612820336831) against new Inv#1
  const neha_new_pe2 = await createAndSubmit(
    'Payment Entry',
    buildPEPayload(pe4869, 890, neha_new_inv1.name, '612820336831'),
    'Neha PE ₹890 against new Inv#1',
  );

  // 7. Cancel Inv#8 ₹1000
  await cancelDoc('Sales Invoice', 'ACC-SINV-2026-07040', 'Neha Inv#8 ₹1000');

  // 8. Recreate Inv#8 at ₹110
  const neha_new_inv8 = await createAndSubmit(
    'Sales Invoice',
    buildInvoicePayload(neha_inv8, {}, 110, 'Sibling discount: -₹890'),
    'Neha Inv#8 ₹110',
  );

  log('');
  log('════ ALL DONE ════');
  log('NEEYA:');
  log(`  New PE (₹2400):    ${neeya_new_pe.name}`);
  log(`  New Inv#8 (₹110):  ${neeya_new_inv8.name}`);
  log('NEHA:');
  log(`  New Inv#1 (₹2400): ${neha_new_inv1.name}`);
  log(`  New PE1 (₹1510):   ${neha_new_pe1.name}`);
  log(`  New PE2 (₹890):    ${neha_new_pe2.name}`);
  log(`  New Inv#8 (₹110):  ${neha_new_inv8.name}`);
}

main().catch(e => {
  console.error('\n❌ FATAL ERROR (operations may be partially complete):', e.message);
  process.exit(1);
});
