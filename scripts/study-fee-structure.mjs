const url = 'https://smartup.m.frappe.cloud';
const key = '03330270e330d49';
const sec = '9c2261ae11ac2d2';

async function main() {
  const headers = { 'Authorization': `token ${key}:${sec}` };
  const studentId = 'STU-SU PLR-26-033';

  // 1. Sales Invoices list with names
  const siRes = await fetch(`${url}/api/resource/Sales Invoice?filters=[["student","=","${studentId}"]]&fields=["name","posting_date","due_date","grand_total","outstanding_amount","status"]&order_by=posting_date asc`, { headers });
  const invoices = await siRes.json();
  console.log('--- SALES INVOICES ---');
  for (const inv of invoices.data) {
    console.log(`${inv.name} | Date: ${inv.posting_date} | Due: ${inv.due_date} | Total: ${inv.grand_total} | Outstanding: ${inv.outstanding_amount} | Status: ${inv.status}`);
  }

  // 2. Palluruthy Fee Structures
  const fsRes = await fetch(`${url}/api/resource/Fee Structure?filters=[["custom_branch_abbr","=","SU PLR"],["program","=","9th State"]]&fields=["name","custom_plan","custom_no_of_instalments","total_amount"]`, { headers });
  console.log('\n--- SU PLR 9th State Fee Structures ---');
  console.log(await fsRes.json());

  // SU PLR 9th State Basic 8 components
  const fsBasic8 = await fetch(`${url}/api/resource/Fee Structure/SU PLR-9th State-Basic-8`, { headers });
  const b8Data = await fsBasic8.json();
  console.log('\n--- SU PLR-9th State-Basic-8 Details ---');
  console.log('Total:', b8Data.data?.total_amount);
  console.log('Components:', b8Data.data?.components);

  // SU PLR 9th State Advanced 8 components
  const fsAdv8 = await fetch(`${url}/api/resource/Fee Structure/SU PLR-9th State-Advanced-8`, { headers });
  const advData = await fsAdv8.json();
  console.log('\n--- SU PLR-9th State-Advanced-8 Details ---');
  console.log('Total:', advData.data?.total_amount);
  console.log('Components:', advData.data?.components);

  // 3. Payment entries referencing Nourin's invoices
  console.log('\n--- PAYMENT ENTRIES ---');
  const invNames = invoices.data.map(i => i.name);
  for (const inv of invoices.data) {
    const peRefRes = await fetch(`${url}/api/resource/Payment Entry Reference?filters=[["reference_name","=","${inv.name}"]]&fields=["parent","allocated_amount"]`, { headers });
    const peRefs = await peRefRes.json();
    for (const ref of peRefs.data || []) {
      const peRes = await fetch(`${url}/api/resource/Payment Entry/${encodeURIComponent(ref.parent)}`, { headers });
      const pe = await peRes.json();
      console.log(`Invoice ${inv.name} paid by ${ref.parent}: Allocated=${ref.allocated_amount}, PE Date=${pe.data.posting_date}, Mode=${pe.data.mode_of_payment}, Status=${pe.data.status}`);
    }
  }
}

main().catch(console.error);
