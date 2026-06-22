/**
 * Repair script for Likha K Nair (STU-SU EDPLY-26-013).
 *
 * Problem summary:
 * - Student exists, but live Program Enrollment / SO / invoices are missing.
 * - Historical cancelled PE proves the original first invoice existed:
 *   ACC-PAY-2026-05022 -> invoice ACC-SINV-2026-07627 for INR 10,300
 * - Student.customer was later shifted to "Likha K Nair - 1", while the
 *   historical accounting chain used "Likha K Nair".
 *
 * Intended structure (matched to existing Edappally 10th CBSE quarterly students):
 * - Program: 10th CBSE
 * - Branch: Smart Up Edappally
 * - Batch: Edappally 26-27
 * - Plan: Advanced
 * - Instalments: 4
 * - Fee structure: SU EDPLY-10th CBSE-Advanced-4
 * - Invoice schedule: 10,300 / 7,400 / 7,400 / 4,400
 * - Enrollment date anchor: 2026-05-15
 *
 * Usage:
 *   node scripts/fix-likha-k-nair.mjs            # dry run
 *   DRY_RUN=false node scripts/fix-likha-k-nair.mjs
 */

const BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const DRY_RUN = process.env.DRY_RUN !== "false";

const TARGET = {
  studentId: "STU-SU EDPLY-26-013",
  studentName: "Likha K Nair",
  customer: "Likha K Nair",
  alternateCustomer: "Likha K Nair - 1",
  branch: "Smart Up Edappally",
  company: "Smart Up Edappally",
  program: "10th CBSE",
  academicYear: "2026-2027",
  batch: "Edappally 26-27",
  feeStructure: "SU EDPLY-10th CBSE-Advanced-4",
  plan: "Advanced",
  instalments: "4",
  enrollmentDate: "2026-05-15",
  itemCode: "10th CBSE Tuition Fee",
  schedule: [
    { label: "Q1", amount: 10300, dueDate: "2026-05-15" },
    { label: "Q2", amount: 7400, dueDate: "2026-08-15" },
    { label: "Q3", amount: 7400, dueDate: "2026-11-15" },
    { label: "Q4", amount: 4400, dueDate: "2027-02-15" },
  ],
  payment: {
    oldCancelledName: "ACC-PAY-2026-05022",
    amount: 5000,
    postingDate: "2026-05-15",
    referenceNo: "S18319184",
    referenceDate: "2026-05-15",
    modeOfPayment: "Bank Transfer",
    paidFrom: "Debtors - SU EDPLY",
    paidTo: "COGNIVIEW LEARNING LLP - SU EDPLY",
  },
};

const headers = {
  Authorization: AUTH,
  "Content-Type": "application/json",
};

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function get(path) {
  const res = await request("GET", path);
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status}: ${JSON.stringify(res.json).slice(0, 300)}`);
  }
  return res.json.data;
}

async function post(path, body) {
  const res = await request("POST", path, body);
  if (!res.ok) {
    throw new Error(`POST ${path} -> ${res.status}: ${JSON.stringify(res.json).slice(0, 400)}`);
  }
  return res.json;
}

async function put(path, body) {
  const res = await request("PUT", path, body);
  if (!res.ok) {
    throw new Error(`PUT ${path} -> ${res.status}: ${JSON.stringify(res.json).slice(0, 400)}`);
  }
  return res.json;
}

async function getExistingPE() {
  const filters = encodeURIComponent(JSON.stringify([["student", "=", TARGET.studentId]]));
  const fields = encodeURIComponent(
    JSON.stringify([
      "name",
      "student",
      "student_name",
      "program",
      "student_batch_name",
      "custom_fee_structure",
      "custom_plan",
      "custom_no_of_instalments",
      "enrollment_date",
      "docstatus",
    ]),
  );
  const data = await get(
    `/api/resource/Program Enrollment?filters=${filters}&fields=${fields}&order_by=creation desc&limit_page_length=20`,
  );
  return Array.isArray(data) ? data : [];
}

async function getExistingSOs() {
  const filters = encodeURIComponent(JSON.stringify([["customer", "=", TARGET.customer]]));
  const fields = encodeURIComponent(
    JSON.stringify(["name", "customer", "student", "grand_total", "docstatus", "billing_status", "creation"]),
  );
  const data = await get(
    `/api/resource/Sales Order?filters=${filters}&fields=${fields}&order_by=creation desc&limit_page_length=20`,
  );
  return Array.isArray(data) ? data : [];
}

async function getExistingInvoices() {
  const filters = encodeURIComponent(JSON.stringify([["customer", "=", TARGET.customer]]));
  const fields = encodeURIComponent(
    JSON.stringify(["name", "grand_total", "outstanding_amount", "posting_date", "due_date", "docstatus", "status"]),
  );
  const data = await get(
    `/api/resource/Sales Invoice?filters=${filters}&fields=${fields}&order_by=creation asc&limit_page_length=20`,
  );
  return Array.isArray(data) ? data : [];
}

async function getExistingPayments() {
  const filters = encodeURIComponent(JSON.stringify([["party_name", "=", TARGET.customer]]));
  const fields = encodeURIComponent(
    JSON.stringify(["name", "paid_amount", "docstatus", "posting_date", "reference_no", "remarks"]),
  );
  const data = await get(
    `/api/resource/Payment Entry?filters=${filters}&fields=${fields}&order_by=creation asc&limit_page_length=20`,
  );
  return Array.isArray(data) ? data : [];
}

async function submitDoc(doctype, name) {
  return post("/api/method/frappe.client.submit", { doc: await get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`) });
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n${"=".repeat(70)}`);
  console.log(`LIKHA K NAIR REPAIR`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`${"=".repeat(70)}\n`);

  const student = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const cancelledPayment = await get(`/api/resource/Payment Entry/${encodeURIComponent(TARGET.payment.oldCancelledName)}`);

  console.log(`[1] Current state`);
  console.log(`  Student:          ${student.student_name} (${student.name})`);
  console.log(`  Student.customer: ${student.customer}`);
  console.log(`  Branch:           ${student.custom_branch}`);
  console.log(`  Joining date:     ${student.joining_date}`);
  console.log(`  Cancelled PE:     ${cancelledPayment.name} | status=${cancelledPayment.status} | amount=${cancelledPayment.paid_amount}`);

  const existingPEs = await getExistingPE();
  const existingSOs = await getExistingSOs();
  const existingInvoices = await getExistingInvoices();
  const existingPayments = await getExistingPayments();

  console.log(`  Existing PEs:     ${existingPEs.length}`);
  console.log(`  Existing SOs:     ${existingSOs.length}`);
  console.log(`  Existing invoices:${existingInvoices.length}`);
  console.log(`  Existing payments:${existingPayments.length}`);

  if (existingInvoices.length || existingPayments.some((row) => row.docstatus === 1)) {
    throw new Error("Live invoice/payment records already exist for canonical customer. Aborting to avoid duplicates.");
  }

  console.log(`\n[2] Planned repair`);
  console.log(`  Canonical customer: ${TARGET.customer}`);
  console.log(`  Program Enrollment: ${TARGET.program} / ${TARGET.feeStructure} / ${TARGET.instalments} instalments`);
  console.log(`  Quarterly schedule: ${TARGET.schedule.map((row) => `₹${row.amount} on ${row.dueDate}`).join(" | ")}`);

  if (DRY_RUN) {
    console.log(`\nDry run complete. No changes made.\n`);
    return;
  }

  console.log(`\n[3] Re-link student to canonical customer`);
  if (student.customer !== TARGET.customer || student.custom_student_type !== "Fresher") {
    await post("/api/method/frappe.client.set_value", {
      doctype: "Student",
      name: TARGET.studentId,
      fieldname: { customer: TARGET.customer, custom_student_type: "Fresher" },
    });
  }
  console.log(`  OK student.customer -> ${TARGET.customer}`);

  console.log(`\n[4] Create Program Enrollment`);
  let peName = existingPEs[0]?.name;
  if (!peName) {
    const peCreate = await post("/api/resource/Program Enrollment", {
      student: TARGET.studentId,
      program: TARGET.program,
      enrollment_date: TARGET.enrollmentDate,
      academic_year: TARGET.academicYear,
      student_batch_name: TARGET.batch,
      custom_fee_structure: TARGET.feeStructure,
      custom_plan: TARGET.plan,
      custom_no_of_instalments: TARGET.instalments,
    });
    peName = peCreate.data?.name;
    if (!peName) throw new Error("Program Enrollment creation did not return a name");
    await submitDoc("Program Enrollment", peName);
  }
  console.log(`  OK ${peName}`);

  console.log(`\n[5] Create Sales Order`);
  let soName = existingSOs[0]?.name;
  if (!soName) {
    const soCreate = await post("/api/resource/Sales Order", {
      customer: TARGET.customer,
      company: TARGET.company,
      transaction_date: TARGET.enrollmentDate,
      delivery_date: TARGET.enrollmentDate,
      order_type: "Sales",
      student: TARGET.studentId,
      custom_academic_year: TARGET.academicYear,
      custom_no_of_instalments: TARGET.instalments,
      custom_plan: TARGET.plan,
      items: [
        {
          item_code: TARGET.itemCode,
          qty: Number(TARGET.instalments),
          rate: 7625,
          description: `${TARGET.program} Tuition Fee`,
        },
      ],
    });
    soName = soCreate.data?.name;
    if (!soName) throw new Error("Sales Order creation did not return a name");
    await put(`/api/resource/Sales Order/${encodeURIComponent(soName)}`, { docstatus: 1 });
  }
  const soDoc = await get(`/api/resource/Sales Order/${encodeURIComponent(soName)}`);
  const soItem = soDoc.items?.[0];
  if (!soItem) throw new Error("Submitted Sales Order has no item row");
  console.log(`  OK ${soName} | total=₹${soDoc.grand_total}`);

  console.log(`\n[6] Create quarterly invoices`);
  const createdInvoices = [];
  for (const entry of TARGET.schedule) {
    const effectiveDate = entry.dueDate < today ? today : entry.dueDate;
    const invCreate = await post("/api/resource/Sales Invoice", {
      doctype: "Sales Invoice",
      customer: TARGET.customer,
      company: TARGET.company,
      posting_date: effectiveDate,
      due_date: effectiveDate,
      student: TARGET.studentId,
      custom_academic_year: TARGET.academicYear,
      items: [
        {
          item_code: soItem.item_code,
          item_name: soItem.item_name,
          description: `${entry.label} - ${soItem.item_name}`,
          qty: 1,
          rate: entry.amount,
          amount: entry.amount,
          sales_order: soName,
          so_detail: soItem.name,
        },
      ],
    });
    const invName = invCreate.data?.name;
    if (!invName) throw new Error(`Invoice creation failed for ${entry.label}`);
    await put(`/api/resource/Sales Invoice/${encodeURIComponent(invName)}`, { docstatus: 1 });
    createdInvoices.push({ name: invName, ...entry, effectiveDate });
    console.log(`  OK ${entry.label}: ${invName} | ₹${entry.amount} | due ${effectiveDate}`);
  }

  console.log(`\n[7] Rebook the ₹5000 payment against Q1`);
  const firstInvoice = createdInvoices[0];
  const paymentCreate = await post("/api/resource/Payment Entry", {
    doctype: "Payment Entry",
    payment_type: "Receive",
    posting_date: TARGET.payment.postingDate,
    company: TARGET.company,
    mode_of_payment: TARGET.payment.modeOfPayment,
    party_type: "Customer",
    party: TARGET.customer,
    party_name: TARGET.customer,
    paid_from: TARGET.payment.paidFrom,
    paid_to: TARGET.payment.paidTo,
    paid_amount: TARGET.payment.amount,
    received_amount: TARGET.payment.amount,
    source_exchange_rate: 1,
    target_exchange_rate: 1,
    reference_no: TARGET.payment.referenceNo,
    reference_date: TARGET.payment.referenceDate,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: firstInvoice.name,
        allocated_amount: TARGET.payment.amount,
      },
    ],
    remarks: `Amount INR 5000.0 received from ${TARGET.customer}\nTransaction reference no ${TARGET.payment.referenceNo} dated ${TARGET.payment.referenceDate}\nAmount INR 5000.0 against Sales Invoice ${firstInvoice.name}`,
  });
  const paymentName = paymentCreate.data?.name;
  if (!paymentName) throw new Error("Payment Entry creation did not return a name");
  await put(`/api/resource/Payment Entry/${encodeURIComponent(paymentName)}`, { docstatus: 1 });
  console.log(`  OK ${paymentName} -> ${firstInvoice.name}`);

  console.log(`\n[8] Final verification`);
  const finalStudent = await get(`/api/resource/Student/${encodeURIComponent(TARGET.studentId)}`);
  const finalPEs = await getExistingPE();
  const finalSOs = await getExistingSOs();
  const finalInvoices = await getExistingInvoices();
  const finalPayments = await getExistingPayments();

  console.log(`  student.customer: ${finalStudent.customer}`);
  console.log(`  PE count:         ${finalPEs.length}`);
  console.log(`  SO count:         ${finalSOs.length}`);
  console.log(`  Invoice count:    ${finalInvoices.length}`);
  console.log(`  Payment count:    ${finalPayments.length}`);
  console.log(`\nRepair complete.\n`);
}

main().catch((err) => {
  console.error(`\nRepair failed: ${err.message}`);
  process.exit(1);
});
