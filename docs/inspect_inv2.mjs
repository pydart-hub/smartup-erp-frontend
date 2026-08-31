const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function inspectInvoice2() {
  try {
    const res = await fetch(`${base}/Sales Invoice/ACC-SINV-2026-02926`, { headers });
    const data = await res.json();
    console.log('Invoice 2 doc:', JSON.stringify(data.data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

inspectInvoice2();
