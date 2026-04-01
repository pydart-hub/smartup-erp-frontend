export interface PaidToResult {
  account: string;
  accountType: "Bank" | "Cash";
}

/**
 * Resolves the "Account Paid To" (paid_to) and its account_type for a Payment Entry
 * by looking up the Mode of Payment → default_account mapping
 * configured in Frappe for the given company.
 *
 * Cash mode → account_type "Cash", all others → "Bank".
 */
export async function resolveAccountPaidTo(
  mode: string,
  company: string,
  frappeUrl: string,
  auth: string,
): Promise<PaidToResult | null> {
  try {
    const res = await fetch(
      `${frappeUrl}/api/resource/Mode of Payment/${encodeURIComponent(mode)}`,
      { headers: { Authorization: auth } },
    );
    if (!res.ok) return null;

    const data = (await res.json()).data;
    const mopType: string = data?.type ?? "Bank"; // "Bank" or "Cash"
    const accounts: { company: string; default_account: string }[] = data?.accounts ?? [];
    const match = accounts.find((a) => a.company === company);
    if (!match?.default_account) return null;

    return {
      account: match.default_account,
      accountType: mopType === "Cash" ? "Cash" : "Bank",
    };
  } catch {
    return null;
  }
}
