const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function run() {
  const scriptName = 'temp_align_mary_debug';
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});

  const patchCode = `
so = "SAL-ORD-2026-00388"
v = 19000
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
frappe.db.set_value("Sales Order", so, "status", "To Deliver", update_modified=False)
frappe.db.commit()
frappe.response["message"] = frappe.db.get_value("Sales Order", so, "grand_total")
`;

  const createRes = await (await fetch(`${baseUrl}/api/resource/Server Script`, {
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
  })).json();
  console.log('Create res:', createRes);

  const callRes = await (await fetch(`${baseUrl}/api/method/${scriptName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  })).json();
  console.log('Call res:', callRes);

  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers });
}

run().catch(console.error);
