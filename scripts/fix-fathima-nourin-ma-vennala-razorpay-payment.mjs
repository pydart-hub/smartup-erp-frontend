/**
 * Record FATHIMA NOURIN MA's missing Razorpay payment against the correct invoice.
 *
 * Requested fix:
 * - Student: FATHIMA NOURIN MA
 * - Branch: Smart Up Vennala
 * - Amount: 3300
 * - Razorpay payment id: pay_SwLLJD834fK90w
 *
 * Safety:
 * - Abort if Razorpay reference already exists
 * - Abort unless the exact target invoice is submitted and outstanding 3300
 */

const BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json" };

const STUDENT = "FATHIMA NOURIN MA";
const COMPANY = "Smart Up Vennala";
const AMOUNT = 3300;
const RAZORPAY_ID = "pay_SwLLJD834fK90w";
const INVOICE = "ACC-SINV-2026-04789";
const POSTING_DATE = "2026-06-01";

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers || {}) },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return json.data;
}

async function listDocs(doctype, filters, fields, orderBy = "modified desc", limit = 20) {
  const qs = new URLSearchParams({
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
    order_by: orderBy,
    limit_page_length: String(limit),
  });
  return (await api(`/api/resource/${encodeURIComponent(doctype)}?${qs.toString()}`)) || [];
}

async function main() {
  console.log("== Step 1: Check duplicate Razorpay reference ==");
  const existing = await listDocs(
    "Payment Entry",
    [["reference_no", "=", RAZORPAY_ID]],
    ["name", "party", "paid_amount", "posting_date", "docstatus", "reference_no"],
    "posting_date desc",
    5,
  );
  if (existing.length > 0) {
    throw new Error(`Razorpay payment id ${RAZORPAY_ID} already exists: ${JSON.stringify(existing, null, 2)}`);
  }
  console.log("No duplicate Payment Entry found.");

  console.log("\n== Step 2: Validate target invoice ==");
  const invoice = await api(`/api/resource/Sales Invoice/${encodeURIComponent(INVOICE)}`);
  console.log(JSON.stringify({
    name: invoice.name,
    customer: invoice.customer,
    company: invoice.company,
    grand_total: invoice.grand_total,
    outstanding_amount: invoice.outstanding_amount,
    posting_date: invoice.posting_date,
    due_date: invoice.due_date,
    status: invoice.status,
    docstatus: invoice.docstatus,
  }, null, 2));
  if (invoice.customer !== STUDENT) {
    throw new Error(`Invoice ${INVOICE} belongs to ${invoice.customer}, expected ${STUDENT}`);
  }
  if (invoice.company !== COMPANY) {
    throw new Error(`Invoice ${INVOICE} company is ${invoice.company}, expected ${COMPANY}`);
  }
  if (invoice.docstatus !== 1) {
    throw new Error(`Invoice ${INVOICE} is not submitted (docstatus=${invoice.docstatus})`);
  }
  if (Number(invoice.outstanding_amount) !== AMOUNT) {
    throw new Error(`Invoice ${INVOICE} outstanding is ${invoice.outstanding_amount}, expected ${AMOUNT}`);
  }

  console.log("\n== Step 3: Resolve accounts ==");
  const receivableAccounts = await listDocs(
    "Account",
    [
      ["company", "=", COMPANY],
      ["account_type", "=", "Receivable"],
    ],
    ["name", "account_type"],
    "name asc",
    5,
  );
  const debtorsAccount = receivableAccounts[0]?.name;
  if (!debtorsAccount) {
    throw new Error(`No receivable account found for ${COMPANY}`);
  }

  const mop = await api(`/api/resource/Mode of Payment/${encodeURIComponent("Razorpay")}`);
  const paidTo = mop.accounts?.find((row) => row.company === COMPANY)?.default_account;
  if (!paidTo) {
    throw new Error(`No Razorpay account mapping found for ${COMPANY}`);
  }
  console.log(JSON.stringify({ paid_from: debtorsAccount, paid_to: paidTo }, null, 2));

  console.log("\n== Step 4: Create draft Payment Entry ==");
  const payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    posting_date: POSTING_DATE,
    company: COMPANY,
    party_type: "Customer",
    party: STUDENT,
    paid_from: debtorsAccount,
    paid_to: paidTo,
    mode_of_payment: "Razorpay",
    paid_amount: AMOUNT,
    received_amount: AMOUNT,
    source_exchange_rate: 1,
    target_exchange_rate: 1,
    reference_no: RAZORPAY_ID,
    reference_date: POSTING_DATE,
    remarks: `Razorpay payment ${RAZORPAY_ID} for ${invoice.name}`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: invoice.name,
        allocated_amount: AMOUNT,
      },
    ],
  };
  const created = await api("/api/resource/Payment Entry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`Created draft Payment Entry: ${created.name}`);

  console.log("\n== Step 5: Submit Payment Entry ==");
  await api(`/api/resource/Payment Entry/${encodeURIComponent(created.name)}`, {
    method: "PUT",
    body: JSON.stringify({ docstatus: 1 }),
  });
  console.log(`Submitted Payment Entry: ${created.name}`);

  console.log("\n== Step 6: Verify final state ==");
  const invoiceAfter = await api(`/api/resource/Sales Invoice/${encodeURIComponent(invoice.name)}`);
  const peAfter = await api(`/api/resource/Payment Entry/${encodeURIComponent(created.name)}`);
  console.log(JSON.stringify({
    payment_entry: {
      name: peAfter.name,
      posting_date: peAfter.posting_date,
      paid_amount: peAfter.paid_amount,
      mode_of_payment: peAfter.mode_of_payment,
      paid_to: peAfter.paid_to,
      reference_no: peAfter.reference_no,
      docstatus: peAfter.docstatus,
      status: peAfter.status,
    },
    invoice: {
      name: invoiceAfter.name,
      outstanding_amount: invoiceAfter.outstanding_amount,
      status: invoiceAfter.status,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error("\nFATAL:", error.message);
  process.exit(1);
});
