const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function checkSO() {
  const soRes = await (await fetch(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","MARY ELSA"]]&fields=["name","grand_total","status","custom_plan","custom_no_of_instalments","docstatus"]`, { headers })).json();
  console.log('All SOs for Mary Elsa:', soRes.data);
}

checkSO().catch(console.error);
