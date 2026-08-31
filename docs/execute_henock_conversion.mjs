const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function executeHenockConversion() {
  try {
    console.log('--- Step 1: Update Program Enrollment ---');
    const peName = 'PEN-10th-Thopumpadi 26-27-019';
    // Let's check PE docstatus and update fields
    const resPE = await fetch(`${base}/Program Enrollment/${peName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        custom_fee_structure: 'SU THP-10th State-Basic-6',
        custom_plan: 'Basic',
        custom_no_of_instalments: '6'
      })
    });
    const peResult = await resPE.json();
    console.log('PE Update Result:', peResult.data?.custom_fee_structure || peResult);

    console.log('--- Step 2: Handle Invoices ---');
    // Fetch all existing active invoices for Henock
    const resInv = await fetch(`${base}/Sales Invoice?filters=[["customer","=","Henock joseph"],["docstatus","!=",2]]&fields=["name","due_date","grand_total","outstanding_amount","status"]&order_by=due_date asc`, { headers });
    const invList = await resInv.json();
    console.log('Current Invoices:', invList.data);

    // Target amounts for Basic-6:
    // Inst 1: 3000 (15-Apr-2026) -> Paid
    // Inst 2: 3000 (15-Jun-2026) -> Overdue (300 paid currently, will receive credit adjustment)
    // Inst 3: 3000 (15-Aug-2026) -> Overdue
    // Inst 4: 3000 (15-Oct-2026) -> Unpaid
    // Inst 5: 3000 (15-Dec-2026) -> Unpaid
    // Inst 6: 2400 (15-Feb-2027) -> Unpaid

    // For unpaid/overdue unlinked invoices:
    // Inst 3 (ACC-SINV-2026-04423): 4200 -> 3000
    // Inst 4 (ACC-SINV-2026-04424): 4200 -> 3000
    // Inst 5 (ACC-SINV-2026-04425): 4200 -> 3000
    // Inst 6 (ACC-SINV-2026-04426): 3400 -> 2400

    const targetMap = {
      'ACC-SINV-2026-04423': 3000,
      'ACC-SINV-2026-04424': 3000,
      'ACC-SINV-2026-04425': 3000,
      'ACC-SINV-2026-04426': 2400
    };

    for (const [invName, targetAmount] of Object.entries(targetMap)) {
      console.log(`Processing ${invName} to ${targetAmount}...`);
      const getDoc = await (await fetch(`${base}/Sales Invoice/${invName}`, { headers })).json();
      
      // Cancel
      const cancelRes = await (await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ doctype: 'Sales Invoice', name: invName })
      })).json();
      console.log(`Cancelled ${invName}:`, cancelRes.message || 'OK');

      // Create Amended
      const newDoc = {
        ...getDoc.data,
        docstatus: 0,
        amended_from: invName,
        status: 'Draft',
        items: getDoc.data.items.map(item => ({
          ...item,
          docstatus: 0,
          rate: targetAmount,
          amount: targetAmount,
          base_rate: targetAmount,
          base_amount: targetAmount,
          net_rate: targetAmount,
          net_amount: targetAmount,
          base_net_rate: targetAmount,
          base_net_amount: targetAmount,
          price_list_rate: 33300,
          discount_amount: 33300 - targetAmount
        })),
        remarks: 'Converted from Advanced to Basic 6-installment fee structure.'
      };
      delete newDoc.name;
      delete newDoc.creation;
      delete newDoc.modified;
      delete newDoc.modified_by;
      delete newDoc.owner;
      delete newDoc.payment_schedule;

      const createRes = await (await fetch(`${base}/Sales Invoice`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newDoc)
      })).json();
      console.log(`Created amended doc:`, createRes.data?.name);

      if (createRes.data?.name) {
        const submitRes = await (await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.submit`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ doc: createRes.data })
        })).json();
        console.log(`Submitted:`, submitRes.data?.name);
      }
    }

    // Now let's inspect Inst 1 and Inst 2 and payments
    console.log('--- Step 3: Check Inst 1 & Inst 2 payments ---');
    const resPayments = await fetch(`${base}/Payment Entry?filters=[["party","=","Henock joseph"],["docstatus","=",1]]&fields=["*"]`, { headers });
    const payments = await resPayments.json();
    console.log('Payments:', payments.data.map(p => ({
      name: p.name,
      amount: p.paid_amount,
      references: p.references
    })));

  } catch (e) {
    console.error(e);
  }
}

executeHenockConversion();
