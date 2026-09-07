import fs from 'fs';

const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

async function main() {
  // 1. Check students with phone 8089239160
  const q1 = encodeURIComponent(JSON.stringify([["student_mobile_number", "=", "8089239160"]]));
  const r1 = await (await fetch(`${base}/Student?filters=${q1}&fields=["name","student_name","custom_branch","custom_srr_id"]`, { headers })).json();
  console.log('Students with same phone:', r1.data);

  // 2. Check all Fee Structures across ERP having total 28400
  const q2 = encodeURIComponent(JSON.stringify([["total_amount", "=", 28400]]));
  const r2 = await (await fetch(`${base}/Fee Structure?filters=${q2}&fields=["name","program","custom_branch_abbr","custom_plan","custom_no_of_instalments","total_amount"]`, { headers })).json();
  console.log('All Fee structures with 28400:', r2.data);

  // 3. Check all Fee Structures for 10th CBSE across branches
  const q3 = encodeURIComponent(JSON.stringify([["program", "=", "10th CBSE"]]));
  const r3 = await (await fetch(`${base}/Fee Structure?filters=${q3}&fields=["name","custom_branch_abbr","custom_plan","custom_no_of_instalments","total_amount"]`, { headers })).json();
  console.log('10th CBSE Fee structures:', r3.data);
}

main().catch(console.error);
