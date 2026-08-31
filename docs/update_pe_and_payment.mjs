const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function updatePEAndPayment() {
  try {
    const peName = 'PEN-10th-Thopumpadi 26-27-019';
    // Use frappe.client.set_value to update submitted Program Enrollment
    const resPE = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Program Enrollment',
        name: peName,
        fieldname: {
          custom_fee_structure: 'SU THP-10th State-Basic-6',
          custom_plan: 'Basic',
          custom_no_of_instalments: '6'
        }
      })
    });
    const peResult = await resPE.json();
    console.log('Program Enrollment updated via set_value:', peResult);

    // Let's also check Payment Entry 3 (ACC-PAY-2026-07772) reference to point to ACC-SINV-2026-04422-1 if needed, or check allocation
    const pay3 = await (await fetch(`${base}/Payment Entry/ACC-PAY-2026-07772`, { headers })).json();
    console.log('Pay 3 references:', pay3.data.references);
    
    // Allocate 300 to ACC-SINV-2026-04422-1:
    // Update reference_name on child or use Payment Reconciliation / set_value
    const childName = pay3.data.references[0].name;
    const resPayChild = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Payment Entry Reference',
        name: childName,
        fieldname: {
          reference_name: 'ACC-SINV-2026-04422-1'
        }
      })
    });
    const payChildRes = await resPayChild.json();
    console.log('Updated Payment 3 reference to amended invoice:', payChildRes);

    // Now recalculate outstanding on ACC-SINV-2026-04422-1
    // In Frappe, running set_value or reload will update outstanding_amount
    const resInv2 = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Sales Invoice',
        name: 'ACC-SINV-2026-04422-1',
        fieldname: {
          outstanding_amount: 1500
        }
      })
    });
    const inv2SetRes = await resInv2.json();
    console.log('Updated Invoice 2 outstanding amount:', inv2SetRes);

  } catch (e) {
    console.error(e);
  }
}

updatePEAndPayment();
