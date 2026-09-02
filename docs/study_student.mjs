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

  async function frappeGet(pathStr, params) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}/api/${pathStr}?${qs}`, {
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

  // 1. Search for Student Mohammed Bilal / SRR 103 / Thopumpadi
  console.log("--- Searching for Student ---");
  const studentRes = await frappeGet("resource/Student", {
    filters: JSON.stringify([
      ["student_name", "like", "%Mohammed Bilal%"]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "10"
  });
  console.log("Students found:", JSON.stringify(studentRes, null, 2));

  let student = studentRes.data && studentRes.data[0];
  if (!student) {
    console.log("Trying search by enrollment number or roll no...");
    const studentRes2 = await frappeGet("resource/Student", {
      filters: JSON.stringify([
        ["student_name", "like", "%Bilal%"]
      ]),
      fields: JSON.stringify(["*"]),
      limit_page_length: "10"
    });
    console.log("Students with Bilal:", JSON.stringify(studentRes2, null, 2));
    student = studentRes2.data && studentRes2.data[0];
  }

  if (!student) {
    console.log("Student not found!");
    return;
  }

  const studentId = student.name;
  const customerId = student.customer;
  console.log(`\nFound Student: ${studentId}, Student Name: ${student.student_name}, Customer: ${customerId}`);

  // Fetch full student doc
  const fullStudent = await frappeGet(`resource/Student/${studentId}`, {});
  console.log("\nFull Student Doc:", JSON.stringify(fullStudent, null, 2));

  // 2. Program Enrollment / Course Enrollment
  const progEnrollment = await frappeGet("resource/Program Enrollment", {
    filters: JSON.stringify([["student", "=", studentId]]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "20"
  });
  console.log("\nProgram Enrollment:", JSON.stringify(progEnrollment, null, 2));

  // 3. Sales Invoices
  const invoices = await frappeGet("resource/Sales Invoice", {
    filters: JSON.stringify([
      ["customer", "=", customerId]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "50"
  });
  console.log("\nSales Invoices:", JSON.stringify(invoices, null, 2));

  // Fetch detailed items for each invoice
  if (invoices.data) {
    for (const inv of invoices.data) {
      const invDoc = await frappeGet(`resource/Sales Invoice/${inv.name}`, {});
      console.log(`\nInvoice Detail (${inv.name}):`, JSON.stringify(invDoc, null, 2));
    }
  }

  // 4. Payment Entries
  const payments = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify([
      ["party", "=", customerId]
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "50"
  });
  console.log("\nPayment Entries:", JSON.stringify(payments, null, 2));

  // Fetch detailed references for each payment entry
  if (payments.data) {
    for (const pe of payments.data) {
      const peDoc = await frappeGet(`resource/Payment Entry/${pe.name}`, {});
      console.log(`\nPayment Entry Detail (${pe.name}):`, JSON.stringify(peDoc, null, 2));
    }
  }

  // 5. Fee Structures for 12th Science State / Thopumpadi Basic vs Advanced
  console.log("\n--- Checking Fee Structures / Fee Categories / Item / Programs ---");
  const feeStructures = await frappeGet("resource/Fee Structure", {
    filters: JSON.stringify([
      // Look for 12th Science or Thopumpadi or Basic
    ]),
    fields: JSON.stringify(["*"]),
    limit_page_length: "100"
  });
  console.log("Fee Structures:", JSON.stringify(feeStructures, null, 2));

  // Also check Item or Program or Courses or Fees
  const programs = await frappeGet("resource/Program", {
    fields: JSON.stringify(["*"]),
    limit_page_length: "100"
  });
  console.log("Programs:", JSON.stringify(programs, null, 2));
}

run();
