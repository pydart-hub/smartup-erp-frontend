const auth = "token 03330270e330d49:9c2261ae11ac2d2";
const url = "https://smartup.m.frappe.cloud";

async function deepInvestigation() {
  console.log("Starting deep investigation on ₹1,50,79,003.00 vs ₹1,51,01,778.00...");

  // 1. Fetch ALL Payment Entries (docstatus=1, Receive)
  let start = 0;
  const peList = [];
  while (true) {
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "paid_amount", "company", "party_name", "posting_date", "creation", "mode_of_payment", "reference_no"]),
      filters: JSON.stringify([["docstatus", "=", 1], ["payment_type", "=", "Receive"]]),
      limit_page_length: "2000",
      limit_start: String(start)
    });
    const res = await fetch(`${url}/api/resource/Payment Entry?${params}`, { headers: { Authorization: auth } });
    const data = await res.json();
    const batch = data?.data || [];
    peList.push(...batch);
    if (batch.length < 2000) break;
    start += 2000;
  }

  // 2. Fetch ALL Sales Invoices (docstatus=1)
  start = 0;
  const siList = [];
  while (true) {
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "company", "student", "customer", "grand_total", "outstanding_amount", "posting_date", "creation", "due_date", "status", "is_return"]),
      filters: JSON.stringify([["docstatus", "=", 1]]),
      limit_page_length: "2000",
      limit_start: String(start)
    });
    const res = await fetch(`${url}/api/resource/Sales Invoice?${params}`, { headers: { Authorization: auth } });
    const data = await res.json();
    const batch = data?.data || [];
    siList.push(...batch);
    if (batch.length < 2000) break;
    start += 2000;
  }

  // Calculate PE total
  let totalPE = 0;
  for (const pe of peList) totalPE += (pe.paid_amount || 0);

  // Accounts page calculation:
  // branches = companies.filter(n => n !== "Smart Up")
  // bi = invoices.filter(inv => inv.company === branch && !inv.is_return && (Number(inv.grand_total) || 0) > 0)
  // totalFee = sum(grand_total)
  // pending = sum(outstanding_amount)
  // collected = totalFee - pending
  let accountsTotalCollected = 0;
  const accountsBranchCollected = {};
  for (const inv of siList) {
    if (inv.company !== "Smart Up" && !inv.is_return && (inv.grand_total || 0) > 0) {
      const col = (inv.grand_total || 0) - (inv.outstanding_amount || 0);
      accountsTotalCollected += col;
      accountsBranchCollected[inv.company] = (accountsBranchCollected[inv.company] || 0) + col;
    }
  }

  console.log(`Payment Entry total: ${totalPE}`);
  console.log(`Accounts Page total collected: ${accountsTotalCollected}`);

  // Look for records created recently (after user took screenshot or difference)
  // Screenshot PE: 15101778, Screenshot Accounts: 15079003. Diff = 22775.
  // Current PE: 15105178, Current Accounts: 15085203. Diff = 19975.
  // Let's inspect Payment Entries whose company is "Smart Up" or not linked to student, or advance payments!

  const peByCompany = {};
  for (const pe of peList) {
    peByCompany[pe.company] = (peByCompany[pe.company] || 0) + (pe.paid_amount || 0);
  }
  console.log("\nPE by Company:");
  for (const c of Object.keys(peByCompany)) {
    console.log(`  ${c}: ${peByCompany[c]}`);
  }

  // Check if there are Payment Entries for "Smart Up" HQ
  console.log(`PE for HQ ('Smart Up'): ${peByCompany['Smart Up'] || 0}`);

  // Fetch Payment Entry References to see if there are unallocated payments or payments without invoice
  start = 0;
  const peReferences = [];
  while (true) {
    const params = new URLSearchParams({
      fields: JSON.stringify(["parent", "reference_doctype", "reference_name", "allocated_amount"]),
      filters: JSON.stringify([["docstatus", "=", 1]]),
      limit_page_length: "2000",
      limit_start: String(start)
    });
    const res = await fetch(`${url}/api/resource/Payment Entry Reference?${params}`, { headers: { Authorization: auth } });
    const data = await res.json();
    const batch = data?.data || [];
    peReferences.push(...batch);
    if (batch.length < 2000) break;
    start += 2000;
  }
  console.log(`Total Payment Entry Reference rows: ${peReferences.length}`);

  let totalAllocatedToSINV = 0;
  let totalAllocatedOther = 0;
  for (const ref of peReferences) {
    if (ref.reference_doctype === "Sales Invoice") {
      totalAllocatedToSINV += (ref.allocated_amount || 0);
    } else {
      totalAllocatedOther += (ref.allocated_amount || 0);
    }
  }
  console.log(`Total Allocated to Sales Invoice: ${totalAllocatedToSINV}`);
  console.log(`Total Allocated to Other Doctype: ${totalAllocatedOther}`);
  console.log(`Unallocated PE Amount (totalPE - totalAllocatedToSINV - totalAllocatedOther): ${totalPE - totalAllocatedToSINV - totalAllocatedOther}`);

  // What about Credit Notes (return invoices)?
  let returnSum = 0;
  for (const inv of siList) {
    if (inv.is_return) {
      returnSum += (inv.grand_total || 0);
    }
  }
  console.log(`Sum of Credit Note / Return Invoices grand_total: ${returnSum}`);

  // Compare per branch:
  console.log("\nDetailed comparison per branch:");
  for (const branch of Object.keys(accountsBranchCollected).sort()) {
    const peComp = peByCompany[branch] || 0;
    const accComp = accountsBranchCollected[branch] || 0;
    console.log(`Branch: ${branch}`);
    console.log(`   PE Total: ${peComp}`);
    console.log(`   Accounts (Invoiced - Outstanding): ${accComp}`);
    console.log(`   Diff (PE - Accounts): ${peComp - accComp}`);
  }
}

deepInvestigation().catch(console.error);
