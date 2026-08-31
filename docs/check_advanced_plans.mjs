const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function fetchAdvancedPlans() {
  try {
    const fsFilter = encodeURIComponent(JSON.stringify([
      ["custom_branch_abbr", "=", "SU THP"],
      ["program", "=", "10th State"],
      ["custom_plan", "=", "Advanced"]
    ]));
    const resFS = await fetch(`${base}/Fee Structure?filters=${fsFilter}&fields=["*"]`, { headers });
    const fsData = await resFS.json();
    console.log('--- THP 10th State Advanced Fee Structures ---');
    console.log(JSON.stringify(fsData.data, null, 2));

    // Also check other branches if THP has Advanced
    const allAdvFilter = encodeURIComponent(JSON.stringify([
      ["program", "=", "10th State"],
      ["custom_plan", "=", "Advanced"]
    ]));
    const resAllAdv = await fetch(`${base}/Fee Structure?filters=${allAdvFilter}&fields=["*"]`, { headers });
    const allAdvData = await resAllAdv.json();
    console.log('--- All Branches 10th State Advanced Fee Structures ---');
    console.log(JSON.stringify(allAdvData.data.map(d => ({ name: d.name, branch: d.custom_branch_abbr, installments: d.custom_no_of_instalments, total: d.total_amount })), null, 2));
  } catch (e) {
    console.error(e);
  }
}

fetchAdvancedPlans();
