# Director Expense Classification Structure (Approval Draft)

Date: 2026-05-02
Status: Draft for approval (no implementation yet)

## 1) Objective

Standardize all expense analytics into 4 business classes for every branch view:

1. Branch Variable Expense
2. Branch Fixed Expense
3. Head Office Fixed Expense
4. Head Office Variable Expense

This classification should be available as:
- a quick filter dropdown
- a grouped view mode
- transaction-level visibility of class

## 2) Current System (Observed)

Current grouping is based on Frappe account parent groups (dynamic labels), not strict business classes.

Backend:
- API builds category rows from Expense leaf accounts and resolves parent account as parentGroup.
- Group totals are then derived from parentGroup.

Frontend:
- Branch expense detail groups bars by parentGroup with expand/collapse.
- Transactions list does not expose business class directly.

Implication:
- Labels can vary by account naming and are not guaranteed to map to the 4 required classes.

## 3) Proposed Canonical Taxonomy

Define a single enum used across backend + frontend:

- BRANCH_VARIABLE
- BRANCH_FIXED
- HO_FIXED
- HO_VARIABLE
- UNMAPPED (temporary safety bucket)

Display labels:
- Branch Variable Expense
- Branch Fixed Expense
- Head Office Fixed Expense
- Head Office Variable Expense
- Unmapped (for data cleanup)

## 4) Mapping Rules (Deterministic)

Classification source of truth should be account-level mapping from expense account to class.

Priority order:
1. Explicit account mapping table (exact account name)
2. Parent group mapping table (parent account_name)
3. Keyword fallback (case-insensitive contains)
4. UNMAPPED

Suggested mapping structure:
- accountToClass: Record<string, ExpenseClass>
- parentToClass: Record<string, ExpenseClass>
- keywordRules: [{ includes: string[], class: ExpenseClass }]

Notes:
- Exact and parent mapping should be preferred over keyword rules.
- Keep mapping in code constants first; later can be moved to Frappe custom doctype if needed.

## 5) API Contract Changes (Planned)

For mode=branch-detail response, each category should include:
- expenseClass: ExpenseClass
- expenseClassLabel: string

Add class summaries:
- classTotals: [{ key, label, total, entryCount }]

Optional request params:
- class_filter=BRANCH_VARIABLE|BRANCH_FIXED|HO_FIXED|HO_VARIABLE
- view_mode=grouped|flat

Behavior:
- If class_filter is provided, categories and transactions are filtered accordingly.
- Existing fields remain for backward compatibility.

## 6) UI Structure (Branch Expense Detail)

A) Filter row
- Date From / To (existing)
- Class dropdown (All + 4 classes)
- View dropdown: Grouped by Class / Grouped by Category

B) KPI cards
- Total Expenses
- Journal Entries
- Avg Per Entry
- Active Class Count (instead of generic categories count)

C) Main breakdown panel
- Default: grouped by class (4 top bars)
- Expand class to see categories within the selected class
- Preserve current animation and style behavior

D) Transactions table
- Add Class column (badge)
- Respect class_filter
- Keep pagination behavior

## 7) Cross-Branch Consistency

The same taxonomy and dropdown options must be applied identically for all branches.

Branch pages should not derive class labels from branch-specific account parent names.

## 8) Data Quality and Safety

- Show UNMAPPED count/amount for transparency.
- Add a warning chip if UNMAPPED > 0: "Needs mapping update".
- Never alter backend accounting records from this feature; read-only classification.

## 9) Rollout Plan (After Approval)

1. Add shared classification constants + mapping utility.
2. Extend director expenses API to return class metadata and classTotals.
3. Add class dropdown + view dropdown to branch expense page.
4. Update breakdown UI to class-first grouping.
5. Add class badge/filter support in transactions table.
6. Type check and manual verification on multiple branches.

## 10) Acceptance Criteria

- Every expense category and transaction belongs to one of 4 classes or UNMAPPED.
- User can filter by any of 4 classes in branch expense detail.
- Grouped view clearly shows totals for all 4 classes.
- Behavior is consistent across branches.
- No destructive write calls to Frappe.
