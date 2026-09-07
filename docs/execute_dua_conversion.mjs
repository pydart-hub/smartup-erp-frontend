import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function executeDuaConversion() {
  try {
    console.log('=== STARTING CONVERSION FOR MOHAMMED DUA ZAIN (OPTION A) ===');

    // 1. Cancel and Amend ACC-SINV-2026-02296 (was 13,000, new 5,000)
    const inv1Name = 'ACC-SINV-2026-02296';
    console.log(`Processing ${inv1Name} -> target amount: 5000...`);
    const inv1Res = await (await fetch(`${base}/Sales Invoice/${inv1Name}`, { headers })).json();
    const inv1Data = inv1Res.data;

    // Cancel
    const cancel1 = await (await fetch('https://smartup.m.frappe.cloud/api/method/frappe.client.cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: 'Sales Invoice', name: inv1Name })
    })).json();
    console.log(`Cancelled ${inv1Name}:`, cancel1.message || 'OK');

    // Create Amended Doc
    const newDoc1 = {
      ...inv1Data,
      docstatus: 0,
      amended_from: inv1Name,
      status: 'Draft',
      items: inv1Data.items.map(item => ({
        ...item,
        docstatus: 0,
        rate: 5000,
        amount: 5000,
        base_rate: 5000,
        base_amount: 5000,
        net_rate: 5000,
        net_amount: 5000,
        base_net_rate: 5000,
        base_net_amount: 5000,
        description: 'Q2 — 10th CBSE Tuition Fee (Revised to ₹5,000 for ₹28,400 plan)'
      })),
      remarks: 'Restructured fee to ₹28,400 total plan. Inst 2 amended to ₹5,000.'
    };
    delete newDoc1.name;
    delete newDoc1.creation;
    delete newDoc1.modified;
    delete newDoc1.modified_by;
    delete newDoc1.owner;
    delete newDoc1.payment_schedule;

    const create1 = await (await fetch(`${base}/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newDoc1)
    })).json();
    console.log('Created amended doc 1:', create1.data?.name);

    if (create1.data?.name) {
      const submit1 = await (await fetch('https://smartup.m.frappe.cloud/api/method/frappe.client.submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: create1.data })
      })).json();
      console.log('Submitted doc 1:', submit1.data?.name);
    }

    // 2. Cancel and Amend ACC-SINV-2026-07532 (was 4,280, new 5,000)
    const inv2Name = 'ACC-SINV-2026-07532';
    console.log(`Processing ${inv2Name} -> target amount: 5000...`);
    const inv2Res = await (await fetch(`${base}/Sales Invoice/${inv2Name}`, { headers })).json();
    const inv2Data = inv2Res.data;

    // Cancel
    const cancel2 = await (await fetch('https://smartup.m.frappe.cloud/api/method/frappe.client.cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: 'Sales Invoice', name: inv2Name })
    })).json();
    console.log(`Cancelled ${inv2Name}:`, cancel2.message || 'OK');

    // Create Amended Doc
    const newDoc2 = {
      ...inv2Data,
      docstatus: 0,
      amended_from: inv2Name,
      status: 'Draft',
      items: inv2Data.items.map(item => ({
        ...item,
        docstatus: 0,
        rate: 5000,
        amount: 5000,
        base_rate: 5000,
        base_amount: 5000,
        net_rate: 5000,
        net_amount: 5000,
        base_net_rate: 5000,
        base_net_amount: 5000,
        description: 'Q3 — 10th CBSE Tuition Fee (Revised to ₹5,000 for ₹28,400 plan)'
      })),
      remarks: 'Restructured fee to ₹28,400 total plan. Inst 3 amended to ₹5,000.'
    };
    delete newDoc2.name;
    delete newDoc2.creation;
    delete newDoc2.modified;
    delete newDoc2.modified_by;
    delete newDoc2.owner;
    delete newDoc2.payment_schedule;

    const create2 = await (await fetch(`${base}/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newDoc2)
    })).json();
    console.log('Created amended doc 2:', create2.data?.name);

    if (create2.data?.name) {
      const submit2 = await (await fetch('https://smartup.m.frappe.cloud/api/method/frappe.client.submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: create2.data })
      })).json();
      console.log('Submitted doc 2:', submit2.data?.name);
    }

    console.log('=== STEP 3: UPDATE PROGRAM ENROLLMENT ===');
    const peName = 'PEN--Edappally 26-27-002-1';
    const resPE = await fetch('https://smartup.m.frappe.cloud/api/method/frappe.client.set_value', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Program Enrollment',
        name: peName,
        fieldname: {
          custom_no_of_instalments: '3'
        }
      })
    });
    console.log('Updated PE installments to 3:', await resPE.json());

    console.log('CONVERSION COMPLETED SUCCESSFULLY!');
  } catch (e) {
    console.error('Error during conversion:', e);
  }
}

executeDuaConversion();
