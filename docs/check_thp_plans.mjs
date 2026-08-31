const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function fetchThpFeeStructures() {
  try {
    const fsFilter = encodeURIComponent(JSON.stringify([
      ["custom_branch_abbr", "=", "SU THP"],
      ["program", "=", "10th State"]
    ]));
    const resFS = await fetch(`${base}/Fee Structure?filters=${fsFilter}&fields=["*"]`, { headers });
    const fsData = await resFS.json();
    console.log('--- THP 10th State Fee Structures ---');
    console.log(JSON.stringify(fsData.data, null, 2));

    // Also fetch the Fee Component / Components table for each
    for (const fs of fsData.data || []) {
      const resDetail = await fetch(`${base}/Fee Structure/${fs.name}`, { headers });
      const detail = await resDetail.json();
      console.log(`=== FS: ${fs.name} (Plan: ${fs.custom_plan}, Installments: ${fs.custom_no_of_instalments}, Total: ${fs.total_amount}) ===`);
      console.log('Components:', detail.data.components);
    }
  } catch (e) {
    console.error(e);
  }
}

fetchThpFeeStructures();
