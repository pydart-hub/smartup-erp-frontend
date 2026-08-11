/**
 * Sanitize company name -> env var suffix.
 * "Smart Up Kadavanthra" -> "SMART_UP_KADAVANTHRA"
 */
function companyToEnvKey(company: string): string {
  return company
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+$/, "");
}

/**
 * Get CoFee branch ID for a specific branch (company).
 * Looks for COFEE_BRANCH_ID_<BRANCH>.
 * Falls back to Kadavanthra sandbox branch ID if not defined.
 */
export function getCofeeBranchId(company: string): string {
  const envKey = companyToEnvKey(company);
  let branchId = process.env[`COFEE_BRANCH_ID_${envKey}`];

  // Resilient fallback for common spelling variations
  if (!branchId) {
    if (envKey === "SMART_UP_PALLURUTHY") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_PALLURUTHI;
    } else if (envKey === "SMART_UP_PALLURUTHI") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_PALLURUTHY;
    } else if (envKey === "SMART_UP_THOPUMPADI") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_THOPPUMPADI;
    } else if (envKey === "SMART_UP_THOPPUMPADI") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_THOPUMPADI;
    } else if (envKey === "SMART_UP_CHULLICKAL") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_CHULLICKA;
    } else if (envKey === "SMART_UP_CHULLICKA") {
      branchId = process.env.COFEE_BRANCH_ID_SMART_UP_CHULLICKAL;
    }
  }

  return branchId || "";
}

interface CreateOrderParams {
  company: string;
  amount: number;
  invoiceId: string;
  studentName: string;
  customerName: string;
  parentEmail?: string;
  parentPhone?: string;
  redirectUrl: string;
}

interface CoFeeOrderResponse {
  status: string;
  message?: string;
  data?: {
    order_id: string;
    payment_link: string;
    amount: number;
    currency: string;
  };
}

interface CoFeeStatusResponse {
  status: string;
  message?: string;
  data?: {
    order_id: string;
    order_status: "success" | "pending" | "failed" | string;
    amount: number;
    currency: string;
    merchant_order_id: string;
  };
}

/**
 * Create a payment order on CoFee
 */
export async function createCofeeOrder(params: CreateOrderParams): Promise<CoFeeOrderResponse> {
  const token = process.env.COFEE_API_TOKEN;
  const baseUrl = process.env.COFEE_API_URL || "https://partner-api.sandbox.cofee.life/v1";

  if (!token) {
    throw new Error("COFEE_API_TOKEN is not configured");
  }

  const branchId = getCofeeBranchId(params.company);
  if (!branchId) {
    throw new Error("CoFee Branch ID is not configured for this company");
  }

  const safeCustomerName = (params.customerName || "CUST001").replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 30);
  const safeStudentName = (params.studentName || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const safeInvoiceId = (params.invoiceId || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  
  let safePurpose = `Fee ${safeStudentName}`.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (safePurpose.length < 3) safePurpose = "Fee Payment";
  if (safePurpose.length > 30) safePurpose = safePurpose.substring(0, 30).trim();

  let validPhone = (params.parentPhone || "").replace(/\D/g, "");
  if (validPhone.length !== 10 || validPhone.match(/^(\d)\1{9}$/)) {
    validPhone = "9895012345";
  }
  
  // CoFee might require E.164 format or country code
  if (validPhone.length === 10) {
    validPhone = `+91${validPhone}`;
  }

  const payload = {
    branch_id: branchId,
    amount: params.amount,
    currency: "INR",
    merchant_order_id: `${params.invoiceId}_${Date.now()}`,
    order_purpose: safePurpose,
    customer_details: {
      customer_reference_id: safeCustomerName,
      name: params.customerName || "Customer",
      email: params.parentEmail || "no-reply@smartup.in",
      mobile: validPhone,
    },
    redirect_url: params.redirectUrl,
  };

  const response = await fetch(`${baseUrl}/payment-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[cofee] Order creation failed:", response.status, errText);
    throw new Error(`CoFee API error: ${response.status} - ${errText}`);
  }

  return response.json();
}

export async function getCofeeOrderStatus(orderId: string): Promise<CoFeeStatusResponse> {
  const token = process.env.COFEE_API_TOKEN;
  const baseUrl = process.env.COFEE_API_URL || "https://partner-api.sandbox.cofee.life/v1";

  if (!token) {
    throw new Error("COFEE_API_TOKEN is not configured");
  }

  const response = await fetch(`${baseUrl}/payment-order/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "x-api-key": token,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[cofee] Order lookup failed:", response.status, errText);
    throw new Error(`CoFee status check failed: ${response.status} - ${errText}`);
  }

  return response.json();
}
