type MinimalSalesOrder = {
  name: string;
  grand_total?: number;
  transaction_date?: string;
  creation?: string;
  modified?: string;
  per_billed?: number;
  custom_plan?: string;
  custom_no_of_instalments?: string;
};

const REGULAR_PLANS = new Set(["Basic", "Intermediate", "Advanced"]);

function parseTime(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function isRegularPlan(plan?: string): boolean {
  return REGULAR_PLANS.has((plan ?? "").trim());
}

export function sortSalesOrdersForDisplay<T extends MinimalSalesOrder>(orders: T[] | undefined | null): T[] {
  return [...(orders ?? [])].sort((a, b) => {
    const regularDiff = Number(isRegularPlan(b.custom_plan)) - Number(isRegularPlan(a.custom_plan));
    if (regularDiff !== 0) return regularDiff;

    const billedDiff = (b.per_billed ?? 0) - (a.per_billed ?? 0);
    if (billedDiff !== 0) return billedDiff;

    const transactionDiff = parseTime(b.transaction_date) - parseTime(a.transaction_date);
    if (transactionDiff !== 0) return transactionDiff;

    const creationDiff = parseTime(b.creation) - parseTime(a.creation);
    if (creationDiff !== 0) return creationDiff;

    const modifiedDiff = parseTime(b.modified) - parseTime(a.modified);
    if (modifiedDiff !== 0) return modifiedDiff;

    return (b.grand_total ?? 0) - (a.grand_total ?? 0);
  });
}

export function selectPrimarySalesOrder<T extends MinimalSalesOrder>(orders: T[] | undefined | null): T | undefined {
  return sortSalesOrdersForDisplay(orders)[0];
}
