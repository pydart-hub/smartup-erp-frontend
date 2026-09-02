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

  async function frappeGet(pathStr) {
    const res = await fetch(`${url}/api/${pathStr}`, { headers });
    return res.json();
  }

  async function frappePost(pathStr, body) {
    const res = await fetch(`${url}/api/${pathStr}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }

  const payload = {
    doctype: "Sales Invoice",
    customer: "Mohammed bilal",
    company: "Smart Up Thopumpadi",
    posting_date: "2026-06-03",
    set_posting_time: 1,
    posting_time: "10:00:00",
    due_date: "2026-06-03",
    student: "STU-SU THP-26-103",
    custom_academic_year: "2026-2027",
    debit_to: "Debtors - SU THP",
    items: [
      {
        item_code: "12th Science State Tuition Fee",
        item_name: "12th Science State Tuition Fee",
        description: `Inst 1 — 12th Science State Tuition Fee`,
        qty: 1,
        rate: 2500,
        amount: 2500,
        sales_order: "SAL-ORD-2026-01772",
        so_detail: "96gfn1b2om"
      }
    ]
  };

  const res = await frappePost("resource/Sales Invoice", payload);
  console.log("Result with set_posting_time:", JSON.stringify(res, null, 2));
}

run();
