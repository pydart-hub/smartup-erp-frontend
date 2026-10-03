const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function cancelAndAmend() {
  const cancelRes = await fetch(`${baseUrl}/api/resource/Sales Order/SAL-ORD-2026-00388`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 2 })
  });
  console.log('Cancel status:', cancelRes.status, await cancelRes.text());

  const amendedSOPayload = {
    doctype: 'Sales Order',
    docstatus: 0,
    amended_from: 'SAL-ORD-2026-00388',
    naming_series: 'SAL-ORD-.YYYY.-',
    customer: 'MARY ELSA',
    customer_name: 'MARY ELSA',
    company: 'Smart Up Chullickal',
    student: 'STU-SU CHL-26-065',
    custom_academic_year: '2026-2027',
    transaction_date: '2026-04-12',
    delivery_date: '2026-04-12',
    order_type: 'Sales',
    custom_plan: 'Basic',
    custom_no_of_instalments: '8',
    items: [
      {
        item_code: '12th Science State Tuition Fee',
        item_name: '12th Science State Tuition Fee',
        description: '12th State Tuition Fee',
        qty: 8,
        uom: 'Nos',
        stock_uom: 'Nos',
        conversion_factor: 1,
        rate: 2375,
        amount: 19000,
        delivery_date: '2026-04-12',
        cost_center: 'Main - SU CHL'
      }
    ],
    payment_schedule: [
      { due_date: '2026-04-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-05-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-06-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-07-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-08-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-09-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-10-15', invoice_portion: 13.15789, payment_amount: 2500 },
      { due_date: '2026-11-15', invoice_portion: 7.89477, payment_amount: 1500 }
    ]
  };

  const res = await fetch(`${baseUrl}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(amendedSOPayload)
  });
  const data = await res.json();
  console.log('Create response:', data);
  if (data.data?.name) {
    const sub = await (await fetch(`${baseUrl}/api/resource/Sales Order/${data.data.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    })).json();
    console.log('Submitted:', sub.data?.name);
  }
}

cancelAndAmend().catch(console.error);
