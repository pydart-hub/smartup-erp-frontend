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
    const start = Date.now();
    const res = await fetch(`${url}/api/${pathStr}?${qs}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    console.log(`  GET ${pathStr} took ${Date.now() - start}ms, returned ${data.data?.length ?? 0} items`);
    return data;
  }

  console.log("Measuring optimized chunked student query (large date range: June 1st to July 1st)...");
  const t0 = Date.now();

  // 1. Payment Entry
  const payStart = Date.now();
  const paymentFilters = [
    ["Payment Entry", "payment_type", "=", "Receive"],
    ["Payment Entry", "docstatus", "=", 1],
    ["Payment Entry", "party_type", "=", "Customer"],
    ["Payment Entry", "posting_date", ">=", "2026-06-01"],
    ["Payment Entry", "posting_date", "<=", "2026-07-01"],
  ];
  const paymentsRes = await frappeGet("resource/Payment Entry", {
    filters: JSON.stringify(paymentFilters),
    fields: JSON.stringify(["name", "party", "party_name", "company", "paid_amount", "posting_date"]),
    limit_page_length: "5000",
  });
  const payments = paymentsRes.data ?? [];
  console.log(`Payment Entry query took: ${Date.now() - payStart}ms`);

  // 2. Chunked Student query
  const optStudStart = Date.now();
  const customerIds = Array.from(new Set(payments.map(p => p.party).filter(Boolean)));
  console.log(`Number of unique customer IDs in payments: ${customerIds.length}`);
  
  const students = [];
  if (customerIds.length > 0) {
    const chunkSize = 150;
    const chunks = [];
    for (let i = 0; i < customerIds.length; i += chunkSize) {
      chunks.push(customerIds.slice(i, i + chunkSize));
    }
    
    console.log(`Chunking into ${chunks.length} requests...`);
    const studentsPromises = chunks.map((chunk) => {
      const chunkFilters = [["Student", "customer", "in", chunk]];
      return frappeGet("resource/Student", {
        filters: JSON.stringify(chunkFilters),
        fields: JSON.stringify(["name", "customer", "student_name"]),
        limit_page_length: "5000",
      });
    });
    
    const studentsResponses = await Promise.all(studentsPromises);
    for (const res of studentsResponses) {
      if (res.data) {
        students.push(...res.data);
      }
    }
  }
  console.log(`Optimized chunked Student query took: ${Date.now() - optStudStart}ms, fetched ${students.length} students`);
  console.log(`Total test run took: ${Date.now() - t0}ms`);
}
run();
