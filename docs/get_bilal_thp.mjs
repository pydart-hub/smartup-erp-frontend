import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const urlMatch = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/);
  const keyMatch = env.match(/FRAPPE_API_KEY=(.*)/);
  const secretMatch = env.match(/FRAPPE_API_SECRET=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : "";
  const key = keyMatch ? keyMatch[1].trim() : "";
  const secret = secretMatch ? secretMatch[1].trim() : "";
  const auth = `token ${key}:${secret}`;

  async function frappeGet(pathStr, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}/api/${pathStr}${qs ? '?' + qs : ''}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  const studentId = "STU-SU THP-26-103";
  const customerId = "Mohammed bilal";

  // 1. Get full Student document
  const studentDoc = await frappeGet(`resource/Student/${studentId}`);

  // 2. Program Enrollment
  const peRes = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"]),
  });

  // 3. Sales Invoices
  const invoicesRes = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([["customer", "=", customerId]]),
    fields: JSON.stringify(["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "docstatus"]),
    order_by: "posting_date asc"
  });

  const invoiceDetails = [];
  for (const inv of (invoicesRes.data || [])) {
    const detail = await frappeGet(`resource/Sales Invoice/${inv.name}`);
    invoiceDetails.push(detail.data);
  }

  // 4. Payment Entries
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([["party", "=", customerId]]),
    fields: JSON.stringify(["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no", "reference_date", "docstatus"]),
    order_by: "posting_date asc"
  });

  const paymentDetails = [];
  for (const pe of (paymentsRes.data || [])) {
    const detail = await frappeGet(`resource/Payment Entry/${pe.name}`);
    paymentDetails.push(detail.data);
  }

  // 5. Check Fee Structures for "12th Science State" / "SU THP" / "Basic" vs "Advanced"
  const feeStructures = await frappeGet("resource/Fee Structure", {
    filters: JSON.stringify([
      ["program", "like", "%12%"]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "100"
  });

  // Let's also check all Fee Structures in SU THP or 12th Science
  const feeStructuresAll = await frappeGet("resource/Fee Structure", {
    fields: JSON.stringify(["*"]),
    limit_page_length: "100"
  });

  // Also check other students in 12th Science State Thopumpadi to see their Fee Structure and Invoices
  const peers = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([
      ["student_batch_name", "like", "%Thopumpadi%"],
      ["program", "like", "%12%"]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "50"
  });

  const output = {
    studentDoc: studentDoc.data,
    programEnrollment: peRes.data,
    invoices: invoiceDetails.map(i => ({
      name: i.name,
      posting_date: i.posting_date,
      due_date: i.due_date,
      grand_total: i.grand_total,
      outstanding_amount: i.outstanding_amount,
      status: i.status,
      docstatus: i.docstatus,
      items: (i.items || []).map(it => ({
        item_code: it.item_code,
        item_name: it.item_name,
        qty: it.qty,
        rate: it.rate,
        amount: it.amount,
        description: it.description
      }))
    })),
    payments: paymentDetails.map(p => ({
      name: p.name,
      posting_date: p.posting_date,
      paid_amount: p.paid_amount,
      mode_of_payment: p.mode_of_payment,
      references: (p.references || []).map(r => ({
        reference_doctype: r.reference_doctype,
        reference_name: r.reference_name,
        total_amount: r.total_amount,
        outstanding_amount: r.outstanding_amount,
        allocated_amount: r.allocated_amount
      }))
    })),
    feeStructures: feeStructuresAll.data,
    peers: peers.data
  };

  fs.writeFileSync(path.join(process.cwd(), "docs/mohammed_bilal_thopumpadi.json"), JSON.stringify(output, null, 2), "utf-8");
  console.log("Written to docs/mohammed_bilal_thopumpadi.json");
}

run();
