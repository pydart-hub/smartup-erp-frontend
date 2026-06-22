const BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json" };

const FIXES = [
  {
    label: "SONAKSHI",
    student: "SONAKSHI MOL K S",
    company: "Smart Up Chullickal",
    invoice: "ACC-SINV-2026-03374",
    amount: 1300,
    postingDate: "2026-06-16",
    razorpayId: "pay_SurXOhOfShoK0W",
  },
  {
    label: "ALPHONSA",
    student: "ALPHONSA HAIDUS SERA",
    company: "Smart Up Chullickal",
    invoice: "ACC-SINV-2026-06648",
    amount: 2500,
    postingDate: "2026-06-16",
    razorpayId: "pay_SvZdj8GLlPFB9T",
  },
];

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
    throw new Error(
      `${init.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 500)}`,
    );
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

async function resolveReceivableAccount(company) {
  const accounts = await listDocs(
    "Account",
    [
      ["company", "=", company],
      ["account_type", "=", "Receivable"],
    ],
    ["name", "account_type"],
    "name asc",
    5,
  );
  return accounts[0]?.name || null;
}

async function resolveRazorpayAccount(company) {
  const mop = await api(`/api/resource/Mode of Payment/${encodeURIComponent("Razorpay")}`);
  return mop.accounts?.find((row) => row.company === company)?.default_account || null;
}

async function applyFix(fix) {
  console.log(`\n===== ${fix.label} =====`);

  const duplicates = await listDocs(
    "Payment Entry",
    [["reference_no", "=", fix.razorpayId]],
    ["name", "party", "paid_amount", "posting_date", "docstatus", "reference_no"],
    "posting_date desc",
    5,
  );
  if (duplicates.length > 0) {
    throw new Error(
      `${fix.label}: Razorpay payment id already exists: ${JSON.stringify(duplicates, null, 2)}`,
    );
  }
  console.log("No duplicate Payment Entry found.");

  const invoice = await api(`/api/resource/Sales Invoice/${encodeURIComponent(fix.invoice)}`);
  console.log(
    JSON.stringify(
      {
        name: invoice.name,
        customer: invoice.customer,
        company: invoice.company,
        grand_total: invoice.grand_total,
        outstanding_amount: invoice.outstanding_amount,
        status: invoice.status,
        docstatus: invoice.docstatus,
        due_date: invoice.due_date,
      },
      null,
      2,
    ),
  );

  if (invoice.customer !== fix.student) {
    throw new Error(`${fix.label}: invoice belongs to ${invoice.customer}, expected ${fix.student}`);
  }
  if (invoice.company !== fix.company) {
    throw new Error(`${fix.label}: invoice company is ${invoice.company}, expected ${fix.company}`);
  }
  if (invoice.docstatus !== 1) {
    throw new Error(`${fix.label}: invoice is not submitted (docstatus=${invoice.docstatus})`);
  }
  if (Number(invoice.outstanding_amount) !== fix.amount) {
    throw new Error(
      `${fix.label}: invoice outstanding is ${invoice.outstanding_amount}, expected ${fix.amount}`,
    );
  }

  const paidFrom = await resolveReceivableAccount(fix.company);
  if (!paidFrom) {
    throw new Error(`${fix.label}: no receivable account found for ${fix.company}`);
  }

  const paidTo = await resolveRazorpayAccount(fix.company);
  if (!paidTo) {
    throw new Error(`${fix.label}: no Razorpay account mapping found for ${fix.company}`);
  }
  console.log(JSON.stringify({ paid_from: paidFrom, paid_to: paidTo }, null, 2));

  const payload = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    posting_date: fix.postingDate,
    company: fix.company,
    party_type: "Customer",
    party: fix.student,
    paid_from: paidFrom,
    paid_to: paidTo,
    mode_of_payment: "Razorpay",
    paid_amount: fix.amount,
    received_amount: fix.amount,
    source_exchange_rate: 1,
    target_exchange_rate: 1,
    reference_no: fix.razorpayId,
    reference_date: fix.postingDate,
    remarks: `Razorpay payment ${fix.razorpayId} for ${fix.invoice}`,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: fix.invoice,
        allocated_amount: fix.amount,
      },
    ],
  };

  const created = await api("/api/resource/Payment Entry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`Created draft Payment Entry: ${created.name}`);

  await api(`/api/resource/Payment Entry/${encodeURIComponent(created.name)}`, {
    method: "PUT",
    body: JSON.stringify({ docstatus: 1 }),
  });
  console.log(`Submitted Payment Entry: ${created.name}`);

  const invoiceAfter = await api(`/api/resource/Sales Invoice/${encodeURIComponent(fix.invoice)}`);
  const peAfter = await api(`/api/resource/Payment Entry/${encodeURIComponent(created.name)}`);
  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
}

for (const fix of FIXES) {
  await applyFix(fix);
}
