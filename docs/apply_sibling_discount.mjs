const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function cancelAndAmend() {
  try {
    const invName = 'ACC-SINV-2026-02926';

    // 1. Fetch current invoice
    const resGet = await fetch(`${base}/Sales Invoice/${invName}`, { headers });
    const invData = await resGet.json();
    console.log('Fetched Invoice status:', invData.data.status, 'docstatus:', invData.data.docstatus);

    // 2. Cancel invoice (docstatus = 2)
    const resCancel = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doctype: 'Sales Invoice',
        name: invName
      })
    });
    const cancelData = await resCancel.json();
    console.log('Cancel result:', JSON.stringify(cancelData, null, 2));

    if (cancelData.exc) {
      console.error('Failed to cancel:', cancelData.exc);
      return;
    }

    // 3. Create amended invoice
    // In Frappe, amending creates a new copy with amended_from pointing to original
    const newDoc = {
      ...invData.data,
      docstatus: 0,
      amended_from: invName,
      status: 'Draft',
      items: invData.data.items.map(item => ({
        ...item,
        docstatus: 0,
        rate: 2510,
        amount: 2510,
        base_rate: 2510,
        base_amount: 2510,
        net_rate: 2510,
        net_amount: 2510,
        base_net_rate: 2510,
        base_net_amount: 2510,
        price_list_rate: 33300,
        discount_amount: 33300 - 2510
      })),
      remarks: 'Sibling discount (10% of total fee = ₹1,690) applied on 2nd installment.'
    };
    delete newDoc.name;
    delete newDoc.creation;
    delete newDoc.modified;
    delete newDoc.modified_by;
    delete newDoc.owner;
    delete newDoc.payment_schedule;

    const resCreate = await fetch(`${base}/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newDoc)
    });
    const createData = await resCreate.json();
    console.log('Create Amended Invoice result:', JSON.stringify(createData, null, 2));

    if (createData.data && createData.data.name) {
      const newInvName = createData.data.name;
      // 4. Submit the amended invoice (docstatus = 1)
      const resSubmit = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          doc: createData.data
        })
      });
      const submitData = await resSubmit.json();
      console.log('Submit result:', JSON.stringify(submitData, null, 2));
    }

    // 5. Update student sibling discount applied flag
    const resStud = await fetch(`${base}/Student/STU-SU THP-26-010`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        custom_sibling_discount_applied: 1
      })
    });
    const studResData = await resStud.json();
    console.log('Student update result:', JSON.stringify(studResData, null, 2));

  } catch (e) {
    console.error(e);
  }
}

cancelAndAmend();
