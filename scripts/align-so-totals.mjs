const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

const updates = [
  { so: 'SAL-ORD-2026-00165', v: 20500 },
  { so: 'SAL-ORD-2026-00122', v: 19600 },
  { so: 'SAL-ORD-2026-00539', v: 19300 },
  { so: 'SAL-ORD-2026-00743', v: 16910 },
  { so: 'SAL-ORD-2026-01377', v: 16000 },
  { so: 'SAL-ORD-2026-00991', v: 17800 },
  { so: 'SAL-ORD-2026-00949', v: 18700 },
  { so: 'SAL-ORD-2026-00180', v: 21400 }
];

async function run() {
  const scriptName = 'temp_align_so_totals';
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});

  const patchCode = `
import json
updates = ${JSON.stringify(updates)}
results = []
for u in updates:
    so = u["so"]
    v = u["v"]
    item = frappe.db.get_value("Sales Order Item", {"parent": so}, "name")
    if item:
        frappe.db.set_value("Sales Order Item", item, "amount", v, update_modified=False)
        frappe.db.set_value("Sales Order Item", item, "base_amount", v, update_modified=False)
        frappe.db.set_value("Sales Order Item", item, "rate", v / 8.0, update_modified=False)
        frappe.db.set_value("Sales Order Item", item, "base_rate", v / 8.0, update_modified=False)
        frappe.db.set_value("Sales Order Item", item, "billed_amt", v, update_modified=False)
    for f in ["grand_total","net_total","total","base_grand_total","base_net_total","base_total","rounded_total","base_rounded_total"]:
        frappe.db.set_value("Sales Order", so, f, v, update_modified=False)
    frappe.db.set_value("Sales Order", so, "per_billed", 100, update_modified=False)
    results.append({"so": so, "new_total": frappe.db.get_value("Sales Order", so, "grand_total")})
frappe.db.commit()
frappe.response["message"] = results
`;

  const createRes = await fetch(`${baseUrl}/api/resource/Server Script`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: scriptName,
      script_type: 'API',
      api_method: scriptName,
      allow_guest: 0,
      disabled: 0,
      script: patchCode
    })
  });
  const createData = await createRes.json();
  console.log('Script created:', createData.data?.name);

  const callRes = await fetch(`${baseUrl}/api/method/${scriptName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  const callData = await callRes.json();
  console.log('Script executed results:', callData.message);

  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers });
  console.log('Cleaned up script');
}

run().catch(console.error);
