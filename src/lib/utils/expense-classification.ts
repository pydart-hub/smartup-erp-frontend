export type ExpenseClassKey =
  | "BRANCH_VARIABLE"
  | "BRANCH_FIXED"
  | "HO_FIXED"
  | "HO_VARIABLE"
  | "UNMAPPED";

export const EXPENSE_CLASS_LABELS: Record<ExpenseClassKey, string> = {
  BRANCH_VARIABLE: "Branch Variable Expense",
  BRANCH_FIXED: "Branch Fixed Expense",
  HO_FIXED: "Head Office Fixed Expense",
  HO_VARIABLE: "Head Office Variable Expense",
  UNMAPPED: "Unmapped",
};

export const EXPENSE_CLASS_ORDER: ExpenseClassKey[] = [
  "BRANCH_VARIABLE",
  "BRANCH_FIXED",
  "HO_FIXED",
  "HO_VARIABLE",
  "UNMAPPED",
];

const CLASS_SET = new Set<ExpenseClassKey>(EXPENSE_CLASS_ORDER);

const PARENT_EXACT_MAP: Record<string, ExpenseClassKey> = {
  "VARIABLE EXPENSE BRANCH": "BRANCH_VARIABLE",
  "BRANCH VARIABLE EXPENSE": "BRANCH_VARIABLE",
  "FIXED EXPENSE BRANCH": "BRANCH_FIXED",
  "BRANCH FIXED EXPENSE": "BRANCH_FIXED",
  "VARIABLE EXPENSE HEADOFFICE": "HO_VARIABLE",
  "HEADOFFICE VARIABLE EXPENSE": "HO_VARIABLE",
  "VARIABLE EXPENSE HEAD OFFICE": "HO_VARIABLE",
  "HEAD OFFICE VARIABLE EXPENSE": "HO_VARIABLE",
  "FIXED EXPENSE HEADOFFICE": "HO_FIXED",
  "HEADOFFICE FIXED EXPENSE": "HO_FIXED",
  "FIXED EXPENSE HEAD OFFICE": "HO_FIXED",
  "HEAD OFFICE FIXED EXPENSE": "HO_FIXED",
};

const ACCOUNT_EXACT_MAP: Record<string, ExpenseClassKey> = {
  ...PARENT_EXACT_MAP,
};

const KEYWORD_RULES: Array<{ key: ExpenseClassKey; allOf: string[] }> = [
  { key: "BRANCH_VARIABLE", allOf: ["VARIABLE", "BRANCH"] },
  { key: "BRANCH_FIXED", allOf: ["FIXED", "BRANCH"] },
  { key: "HO_VARIABLE", allOf: ["VARIABLE", "HEADOFFICE"] },
  { key: "HO_VARIABLE", allOf: ["VARIABLE", "HEAD OFFICE"] },
  { key: "HO_FIXED", allOf: ["FIXED", "HEADOFFICE"] },
  { key: "HO_FIXED", allOf: ["FIXED", "HEAD OFFICE"] },
];

function normalizeLabel(input?: string | null): string {
  if (!input) return "";
  return input
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchKeywordRule(text: string): ExpenseClassKey | null {
  if (!text) return null;
  for (const rule of KEYWORD_RULES) {
    if (rule.allOf.every((part) => text.includes(part))) {
      return rule.key;
    }
  }
  return null;
}

export function isExpenseClassKey(value: string | null | undefined): value is ExpenseClassKey {
  if (!value) return false;
  return CLASS_SET.has(value as ExpenseClassKey);
}

export function classifyExpense(options: {
  parentGroupName?: string | null;
  accountName?: string | null;
}): { key: ExpenseClassKey; label: string } {
  const parent = normalizeLabel(options.parentGroupName);
  const account = normalizeLabel(options.accountName);

  const exact = PARENT_EXACT_MAP[parent] ?? ACCOUNT_EXACT_MAP[account];
  if (exact) {
    return { key: exact, label: EXPENSE_CLASS_LABELS[exact] };
  }

  const parentKeyword = matchKeywordRule(parent);
  if (parentKeyword) {
    return { key: parentKeyword, label: EXPENSE_CLASS_LABELS[parentKeyword] };
  }

  const accountKeyword = matchKeywordRule(account);
  if (accountKeyword) {
    return { key: accountKeyword, label: EXPENSE_CLASS_LABELS[accountKeyword] };
  }

  return { key: "UNMAPPED", label: EXPENSE_CLASS_LABELS.UNMAPPED };
}
