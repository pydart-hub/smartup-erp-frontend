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

  const log = (msg) => console.log(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);

  // Search student
  const studentRes = await frappeGet("resource/Student", {
    filters: JSON.stringify([["student_name", "like", "%Mohammed Bilal%"]]),
    fields: JSON.stringify(["*"]),
  });
  
  const student = studentRes.data && studentRes.data[0];
  if (!student) {
    console.log("Not found");
    return;
  }

  const customerId = student.customer;
  const studentId = student.name;

  // Invoices
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

  // Payments
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

  // Program Enrollment
  const peRes = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"]),
  });

  // Fee structures / plans
  // Let's find other students in "Thopumpadi" "12th Science State" Basic vs Advanced to see exact fee structure
  const otherStudents = await frappeGet("resource/Student", {
    filters: JSON.stringify([
      ["custom_branch", "like", "%Thopumpadi%"],
      ["custom_batch", "like", "%12%"]
    ]),
    fields: JSON.stringify(["name", "student_name", "custom_branch", "custom_batch", "custom_course", "customer"]),
    limit_page_length: "20"
  });

  const output = {
    student,
    programEnrollments: peRes.data,
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
    otherStudentsSample: otherStudents.data
  };

  fs.writeFileSync(path.join(process.cwd(), "docs/student_analysis.json"), JSON.stringify(output, null, 2), "utf-8");
  console.log("Analysis saved to docs/student_analysis.json");
}

run();
