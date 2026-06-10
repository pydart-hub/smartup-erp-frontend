import { getInvoiceCompany, getSalesOrderCompany } from "@/lib/utils/razorpay";
import { resolveAccountPaidTo } from "@/lib/utils/accountMapping";

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

interface PaymentEntryLookup {
  name: string;
  docstatus?: number;
}

interface InvoiceState {
  outstanding_amount?: number;
  status?: string;
}

interface ReconcileInput {
  invoiceId?: string;
  orderId: string;
  paymentId: string;
  amount: number;
  studentName?: string;
  parentEmail?: string;
  company?: string;
  salesOrder?: string;
  source?: string;
}

interface ReconcileResult {
  status: "recorded" | "already_recorded" | "skipped";
  payment_entry?: string;
  invoice_id?: string;
  invoice_outstanding_amount?: number | null;
  message?: string;
}

export async function reconcileRazorpayPayment(
  input: ReconcileInput,
): Promise<ReconcileResult> {
  const invoiceId = input.invoiceId;
  if (!invoiceId || !input.paymentId || !input.orderId || !input.amount) {
    return {
      status: "skipped",
      message: "Missing required Razorpay payment context for reconciliation.",
    };
  }

  const adminAuth = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
  const headers = {
    Authorization: adminAuth,
    "Content-Type": "application/json",
  };

  const resolvedCompany =
    input.company ||
    (await getInvoiceCompany(invoiceId, FRAPPE_URL!, adminAuth)) ||
    (input.salesOrder ? await getSalesOrderCompany(input.salesOrder, FRAPPE_URL!, adminAuth) : null);

  const existing = await findPaymentEntryByReference(headers, input.paymentId);
  if (existing) {
    const invoiceState = await fetchInvoiceState(headers, invoiceId);
    return {
      status: "already_recorded",
      payment_entry: existing.name,
      invoice_id: invoiceId,
      invoice_outstanding_amount: invoiceState?.outstanding_amount ?? null,
      message: "Payment entry already exists for this Razorpay payment.",
    };
  }

  const isSalesInvoice = invoiceId.startsWith("ACC-SINV") || invoiceId.startsWith("SINV");
  const referenceDoctype = isSalesInvoice ? "Sales Invoice" : "Fees";

  const getPeRes = await fetch(
    `${FRAPPE_URL}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        dt: referenceDoctype,
        dn: invoiceId,
        party_amount: input.amount,
        bank_amount: input.amount,
      }),
    },
  );

  if (!getPeRes.ok) {
    const errText = await getPeRes.text();
    throw new Error(`get_payment_entry failed: ${getPeRes.status} - ${errText.slice(0, 500)}`);
  }

  const mappedPE = (await getPeRes.json()).message;
  mappedPE.mode_of_payment = "Razorpay";
  mappedPE.reference_no = input.paymentId;
  mappedPE.reference_date = new Date().toISOString().split("T")[0];
  mappedPE.remarks =
    `Webhook reconciliation via Razorpay. Order: ${input.orderId}, Payment: ${input.paymentId}. Student: ${input.studentName || ""}. Source: ${input.source || "webhook"}`;

  if (resolvedCompany) {
    const resolved = await resolveAccountPaidTo("Razorpay", resolvedCompany, FRAPPE_URL!, adminAuth);
    if (resolved) {
      mappedPE.paid_to = resolved.account;
      mappedPE.paid_to_account_type = resolved.accountType;
    }
  }

  if (mappedPE.references && Array.isArray(mappedPE.references)) {
    for (const ref of mappedPE.references as Array<{ reference_name: string; allocated_amount: number }>) {
      if (ref.reference_name === invoiceId) {
        ref.allocated_amount = input.amount;
      }
    }
  }

  mappedPE.paid_amount = input.amount;
  mappedPE.received_amount = input.amount;

  const insertRes = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry`, {
    method: "POST",
    headers,
    body: JSON.stringify(mappedPE),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`PE insert failed: ${insertRes.status} - ${errText.slice(0, 500)}`);
  }

  const insertData = await insertRes.json();
  const paymentEntryName = insertData.data?.name;
  if (!paymentEntryName) {
    throw new Error("Payment Entry insert succeeded but no name was returned");
  }

  const submitRes = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(paymentEntryName)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ docstatus: 1 }),
    },
  );

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`PE submit failed: ${submitRes.status} - ${errText.slice(0, 500)}`);
  }

  const paymentEntryAfterSubmit = await fetchPaymentEntry(headers, paymentEntryName);
  const invoiceState = await fetchInvoiceState(headers, invoiceId);

  return {
    status: "recorded",
    payment_entry: paymentEntryName,
    invoice_id: invoiceId,
    invoice_outstanding_amount: invoiceState?.outstanding_amount ?? null,
    message:
      paymentEntryAfterSubmit?.docstatus === 1
        ? "Payment entry recorded from Razorpay webhook."
        : "Payment entry created but submission status could not be confirmed.",
  };
}

async function findPaymentEntryByReference(
  headers: Record<string, string>,
  referenceNo: string,
): Promise<PaymentEntryLookup | null> {
  const filters = encodeURIComponent(JSON.stringify([["reference_no", "=", referenceNo]]));
  const fields = encodeURIComponent(JSON.stringify(["name", "docstatus"]));
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry?filters=${filters}&fields=${fields}&limit_page_length=1`,
    { headers },
  );
  if (!res.ok) return null;
  const data = (await res.json()).data as PaymentEntryLookup[] | undefined;
  const existing = data?.[0];
  return existing?.docstatus === 1 ? existing : null;
}

async function fetchPaymentEntry(
  headers: Record<string, string>,
  name: string,
): Promise<PaymentEntryLookup | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Payment Entry/${encodeURIComponent(name)}?fields=["name","docstatus"]`,
    { headers },
  );
  if (!res.ok) return null;
  return (await res.json()).data as PaymentEntryLookup;
}

async function fetchInvoiceState(
  headers: Record<string, string>,
  invoiceId: string,
): Promise<InvoiceState | null> {
  const res = await fetch(
    `${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}?fields=["outstanding_amount","status"]`,
    { headers },
  );
  if (!res.ok) return null;
  return (await res.json()).data as InvoiceState;
}
