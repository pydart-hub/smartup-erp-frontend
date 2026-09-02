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

  const headers = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  async function frappeGet(pathStr, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}/api/${pathStr}${qs ? '?' + qs : ''}`, {
      headers,
      cache: "no-store",
    });
    return res.json();
  }

  // 1. Search student: Sarosh VS / SRR 149 / Thopumpadi
  console.log("--- Searching Student ---");
  const srrRes = await frappeGet("resource/Student", {
    filters: JSON.stringify([
      ["student_name", "like", "%Sarosh%"]
    ]),
    fields: JSON.stringify(["*"])
  });
  console.log("Search by name 'Sarosh':", JSON.stringify(srrRes, null, 2));

  let student = srrRes.data && srrRes.data[0];
  if (!student) {
    const srrRes2 = await frappeGet("resource/Student", {
      filters: JSON.stringify([["custom_srr_id", "=", "149"]]),
      fields: JSON.stringify(["*"])
    });
    console.log("Search by SRR 149:", JSON.stringify(srrRes2, null, 2));
    student = srrRes2.data?.find(s => (s.custom_branch && s.custom_branch.includes("Thopumpadi")) || (s.student_name && s.student_name.toLowerCase().includes("sarosh")));
  }

  if (!student) {
    console.error("Student not found!");
    return;
  }

  const studentId = student.name;
  const customerName = student.customer;
  console.log(`\nFound Student: ${studentId}, Student Name: ${student.student_name}, Customer: ${customerName}`);

  // Fetch full student
  const fullStudent = await frappeGet(`resource/Student/${encodeURIComponent(studentId)}`);

  // Fetch program enrollments
  const peRes = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"])
  });

  // Fetch course enrollments
  const ceRes = await frappeGet("resource/Course Enrollment", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"])
  });

  // Fetch sales orders
  const soRes = await frappeGet("resource/Sales Order", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"])
  });

  // Fetch sales invoices
  const invRes = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([["customer", "=", customerName]]),
    fields: JSON.stringify(["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "docstatus"]),
    order_by: "posting_date asc"
  });

  const invoiceDetails = [];
  for (const inv of (invRes.data || [])) {
    const d = await frappeGet(`resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
    invoiceDetails.push(d.data);
  }

  // Fetch payment entries
  const payRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([["party", "=", customerName]]),
    fields: JSON.stringify(["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no", "reference_date", "docstatus"]),
    order_by: "posting_date asc"
  });

  const paymentDetails = [];
  for (const p of (payRes.data || [])) {
    const d = await frappeGet(`resource/Payment Entry/${encodeURIComponent(p.name)}`);
    paymentDetails.push(d.data);
  }

  // Fetch 11th Science State fee structures in SU THP
  const fsRes = await frappeGet("resource/Fee Structure", {
    filters: JSON.stringify([
      ["program", "like", "%11%"],
      ["custom_branch_abbr", "=", "SU THP"]
    ]),
    fields: JSON.stringify(["*"])
  });

  const output = {
    student: fullStudent.data,
    programEnrollments: peRes.data,
    courseEnrollments: ceRes.data,
    salesOrders: soRes.data,
    invoices: invoiceDetails,
    payments: paymentDetails,
    feeStructures: fsRes.data
  };

  fs.writeFileSync("docs/sarosh_analysis.json", JSON.stringify(output, null, 2), "utf-8");
  console.log("Analysis saved to docs/sarosh_analysis.json");
}

run();
