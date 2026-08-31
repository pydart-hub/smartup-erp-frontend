const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-003';

async function executeAngelinaConversion() {
  try {
    console.log('--- Step 1: Update Program Enrollment ---');
    const peName = 'PEN-10th-Thopumpadi 26-27-003';
    
    // 1. Cancel old PE
    const resCancelPE = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: 'Program Enrollment', name: peName })
    });
    console.log('Cancelled old PE:', await resCancelPE.json());

    // 2. Create amended PE
    const resCreatePE = await fetch(`${base}/Program Enrollment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        student: studentId,
        custom_student_srr: '003',
        student_name: 'Angelina rose',
        enrollment_date: '2026-03-30',
        program: '10th State',
        custom_program_abb: '10th',
        academic_year: '2026-2027',
        student_batch_name: 'Thopumpadi 26-27',
        custom_fee_structure: 'SU THP-10th State-Basic-4',
        custom_plan: 'Basic',
        custom_no_of_instalments: '4',
        amended_from: peName
      })
    });
    const createPEData = await resCreatePE.json();
    console.log('Created amended PE:', createPEData.data?.name || createPEData);

    if (createPEData.data?.name) {
      const resSubmitPE = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: createPEData.data })
      });
      console.log('Submitted amended PE:', await resSubmitPE.json());
    }

    console.log('--- Step 2: Handle Invoices ---');
    // Inst 2: ACC-SINV-2026-02176 -> 1800
    // Inst 3: ACC-SINV-2026-02177 -> 4200
    // Inst 4: ACC-SINV-2026-02178 -> 2600

    const targetMap = {
      'ACC-SINV-2026-02176': 1800,
      'ACC-SINV-2026-02177': 4200,
      'ACC-SINV-2026-02178': 2600
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
        remarks: invName === 'ACC-SINV-2026-02176'
          ? 'Adjusted for Basic-4 fee structure (₹2,400 credited from Inst 1).'
          : 'Converted from Advanced to Basic 4-installment fee structure.'
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

  } catch (e) {
    console.error(e);
  }
}

executeAngelinaConversion();
