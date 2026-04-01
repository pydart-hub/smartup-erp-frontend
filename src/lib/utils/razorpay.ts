import Razorpay from "razorpay";

interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

/**
 * Sanitize company name → env var suffix.
 * "Smart Up Chullickal" → "SMART_UP_CHULLICKAL"
 */
function companyToEnvKey(company: string): string {
  return company
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+$/, "");
}

/**
 * Get Razorpay credentials for a specific branch (company).
 * Looks for RAZORPAY_KEY_ID_<BRANCH> / RAZORPAY_KEY_SECRET_<BRANCH>.
 * Falls back to DEFAULT keys if branch-specific keys not found.
 */
export function getRazorpayKeys(company: string): RazorpayKeys {
  const envKey = companyToEnvKey(company);

  const keyId =
    process.env[`RAZORPAY_KEY_ID_${envKey}`] ||
    process.env.RAZORPAY_KEY_ID_DEFAULT!;
  const keySecret =
    process.env[`RAZORPAY_KEY_SECRET_${envKey}`] ||
    process.env.RAZORPAY_KEY_SECRET_DEFAULT!;

  return { keyId, keySecret };
}

/**
 * Create a Razorpay SDK instance for a specific branch.
 */
export function createRazorpayInstance(company: string): Razorpay {
  const { keyId, keySecret } = getRazorpayKeys(company);
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Fetch the company (branch) for a Sales Invoice from Frappe.
 */
export async function getInvoiceCompany(
  invoiceId: string,
  frappeUrl: string,
  adminAuth: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${frappeUrl}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}?fields=["company"]`,
      { headers: { Authorization: adminAuth } },
    );
    if (res.ok) {
      const data = (await res.json()).data;
      return data?.company || null;
    }
  } catch {
    // Non-blocking
  }
  return null;
}

/**
 * Fetch the company (branch) for a Sales Order from Frappe.
 */
export async function getSalesOrderCompany(
  soName: string,
  frappeUrl: string,
  adminAuth: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${frappeUrl}/api/resource/Sales Order/${encodeURIComponent(soName)}?fields=["company"]`,
      { headers: { Authorization: adminAuth } },
    );
    if (res.ok) {
      const data = (await res.json()).data;
      return data?.company || null;
    }
  } catch {
    // Non-blocking
  }
  return null;
}
