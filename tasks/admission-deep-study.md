# Student Admission Flow — Deep Study & Issue Analysis

## Complete Admission Pipeline (7 Stages)

```
Form Submit → admitStudent() orchestrator
  │
  ├─ Stage 1: Create Guardian  (Frappe Guardian doctype)
  ├─ Stage 1.5: Create Parent User  (Frappe User with "Parent" role)
  ├─ Stage 2: Create Student  (pre-create User, then Student record)
  ├─ Stage 2.1: Link sibling group  (if sibling admission)
  ├─ Stage 2.5: Send welcome email  (non-blocking)
  ├─ Stage 3: Program Enrollment  (create + submit)
  ├─ Stage 4: Batch Assignment  (add to Student Group)
  ├─ Stage 5: Sales Order  (create + submit)
  ├─ Stage 6: Create Invoices  (POST /api/admission/create-invoices)
  └─ Stage 7: Sibling Discount  (if sibling, apply retroactive credit note)
```

---

## PRIMARY ISSUE: "Invoice Creation Failed"

### Root Cause Analysis

Stage 6 calls `POST /api/admission/create-invoices` which:
1. Fetches the Sales Order by name
2. For each instalment, creates a Sales Invoice draft, then submits it

**There are multiple potential failure points:**

### Failure Point 1: SO Rate Mismatch → Overbilling Error (MOST LIKELY)

**Location:** [src/lib/api/enrollment.ts](src/lib/api/enrollment.ts) lines 1040-1065

In Stage 5 (Sales Order creation), the rate is calculated as:
```typescript
const soRate = numInstalments > 1 && scheduleSum > 0
  ? scheduleSum / numInstalments
  : rate;
```

This divides the **total schedule sum** by the number of instalments to get a per-unit rate. The SO is created with `qty = numInstalments` and `rate = scheduleSum / numInstalments`.

**The problem:** Frappe's SO grand_total = `qty × rate`, which may not exactly match the schedule sum due to floating-point division. For example:
- Schedule total = ₹14,600 with 4 instalments
- SO rate = 14600/4 = 3650.00 → SO grand_total = 4 × 3650 = ₹14,600 ✓ (OK)
- But: Schedule total = ₹15,000 with 6 instalments
- SO rate = 15000/6 = 2500.00 → SO grand_total = 6 × 2500 = ₹15,000 ✓ (OK)
- But: Schedule total = ₹15,400 with 8 instalments
- SO rate = 15400/8 = 1925.00 → SO grand_total = 8 × 1925 = ₹15,400 ✓ (OK)

**However**, the actual schedule amounts are NOT evenly split:
- 6-instalment: inst1-5 = ₹2,600 each, inst6 = ₹2,000 → total = ₹15,000
- 8-instalment: inst1-7 = ₹2,000 each, inst8 = ₹1,400 → total = ₹15,400

Each invoice created against the SO bills `qty=1` at the **instalment-specific amount** (not the SO per-unit rate). The invoice links to the SO item via `so_detail`. Frappe then checks if total billed amount exceeds the SO item's amount.

**Frappe's overbilling check:** If the sum of all invoice amounts > SO grand_total (with a small tolerance), the invoice creation/submission FAILS with a validation error.

**When this breaks:**
- SO grand_total is computed as `qty × (scheduleSum / numInstalments)` with Frappe's rounding
- Invoice amounts are taken directly from the schedule: `[2600, 2600, 2600, 2600, 2600, 2000]`
- Sum of invoices = ₹15,000 (exact)
- If Frappe rounds `scheduleSum / numInstalments` differently, SO total could be ₹14,999.98 or similar
- Then invoices sum (₹15,000) > SO total → **OVERBILLING ERROR → INVOICE CREATION FAILS**

### Failure Point 2: Fee Structure Rate = 0 

**Location:** [src/lib/api/enrollment.ts](src/lib/api/enrollment.ts) lines 1022-1035

```typescript
if (form.fee_structure) {
  const { data: fsRes } = await apiClient.get(
    `/resource/Fee Structure/${encodeURIComponent(form.fee_structure)}?fields=["total_amount"]`
  );
  rate = fsRes.data?.total_amount ?? 0;
}
if (rate === 0) {
  rate = await getItemPriceRate(tuitionItem.item_code);
}
```

If **both** Fee Structure lookup and Item Price lookup return 0 (no fee structure configured for this branch/program/plan/instalments combo, AND no Item Price record):
- SO is created with `rate = 0`, `grand_total = 0`
- Invoice creation then tries to create invoices with actual instalment amounts
- These amounts > 0 against an SO total of 0 → **OVERBILLING** → fails

The code does warn: `"Fee rate resolved to ₹0"` but still proceeds to create the SO.

### Failure Point 3: SO Amount vs Schedule Amount Divergence

**The real discrepancy:** The SO rate comes from Fee Structure `total_amount` while the invoice amounts come from the **XLSX fee schedule** (`fee_structure_parsed.json`). These are TWO SEPARATE DATA SOURCES:

- **Fee Structure** (Frappe): Has `total_amount` which is the total fee for the plan
- **Fee Config** (XLSX): Has specific amounts per instalment (e.g., q1=5100, q2=3600, q3=3600, q4=2300)

If the Fee Structure total doesn't match the sum of the XLSX schedule amounts, invoices will either overbill or underbill the SO.

**Example:**
- Fee Structure `total_amount` = ₹16,000 (configured in Frappe)
- XLSX quarterly_total = ₹14,600 (from parsed spreadsheet)
- SO is created with rate from Fee Structure: qty=4, rate=4000, total=₹16,000
- Invoices use XLSX amounts: 5100+3600+3600+2300 = ₹14,600
- Total invoiced (₹14,600) ≤ SO total (₹16,000) → works but leaves ₹1,400 unbilled

**OR worse:**
- Fee Structure `total_amount` = ₹14,000
- XLSX schedule total = ₹15,000
- Invoices try to bill ₹15,000 against ₹14,000 SO → **OVERBILLING → FAILS**

### Failure Point 4: SO Rate Calculation Path Issue

When `numInstalments > 1 && scheduleSum > 0`, the code uses:
```typescript
const soRate = scheduleSum / numInstalments;
```

But the Fee Structure-based `rate` is completely ignored in this path. The code prefers the schedule sum over the Fee Structure total_amount. This is actually correct (ensures SO matches invoices), BUT:

- If `form.instalmentSchedule` is undefined or empty (e.g., fee config not found, or frontend bug), `scheduleSum = 0`
- Then `soRate = rate` (from Fee Structure), creating the data source mismatch described above

### Failure Point 5: Network/Socket Errors to Frappe

**Location:** [src/app/api/admission/create-invoices/route.ts](src/app/api/admission/create-invoices/route.ts)

The `fetchRetry` wrapper only retries on `TypeError` or `UND_ERR_SOCKET` errors. Other Frappe errors (rate limiting, timeouts at load balancer, 502s) are not retried.

### Failure Point 6: SO Not Submitted

If `submitSalesOrder()` fails silently or the SO docstatus is 0 (draft), the create-invoices route checks:
```typescript
if (soData.docstatus !== 1) {
  return { error: "Sales Order is not submitted" };
}
```
This would return a 400 error, surfacing as "Invoice creation failed."

### Failure Point 7: Missing Tuition Fee Item

If `getTuitionFeeItem(form.program)` returns null:
- Stage 5 skips SO creation entirely (`salesOrderName` stays undefined)
- Stage 6 is skipped (no SO to invoice from)
- User sees admission "succeeded" but no invoices

---

## OTHER ISSUES IN THE ADMISSION FLOW

### Issue A: Dual Auth Pattern — Cookie vs Token

**apiClient** (used in enrollment.ts for Stages 1-5): Uses **user's session cookie** via the proxy. The proxy extracts session and uses either the user's own `api_key:api_secret` or falls back to admin credentials.

**create-invoices route** (Stage 6): Uses **admin `FRAPPE_API_KEY:FRAPPE_API_SECRET`** directly.

**Risk:** If the user's session cookie expires mid-admission (long form filling), Stages 1-5 (via apiClient → proxy) could fail with 401, but Stage 6 (server-side admin token) would work fine if it gets reached. The inverse is also true — if admin API keys are invalid/rotated, Stages 1-5 work but Stage 6 fails.

### Issue B: Non-Atomic Admission (Partial State)

The 7-stage pipeline is NOT transactional. If Stage 5 (SO) succeeds but Stage 6 (invoices) fails:
- Student is created ✓
- Program Enrollment is created ✓
- Sales Order exists and is submitted ✓
- But NO invoices exist ✗
- Guardian sees SO but no payment schedule

The admission reports as "success with warnings" but the invoices must be manually created later.

### Issue C: SRR ID Race Condition

```typescript
let srrId = form.custom_srr_id || await getNextSrrId(form.custom_branch);
```

Two concurrent admissions for the same branch will get the same SRR ID. The retry loop handles collisions (up to 10 retries), but under high concurrency this could exhaust retries.

### Issue D: Fee Config Key Mapping Gaps

`buildFeeConfigKey()` maps Frappe company + program names to XLSX keys using hardcoded `BRANCH_MAP` and `PROGRAM_MAP`. If a new branch or program is added to Frappe but NOT to these maps:
- `buildFeeConfigKey()` returns `null`
- `/api/fee-config` returns 404
- Frontend shows "No fee configuration found"
- User cannot proceed to Step 4 → **admission blocked**

### Issue E: Student Batch (Student Group) Missing

In Step 3, if no Student Group exists for the selected branch/program/year:
- `student_batch_name` field has no options
- Validation requires batch selection (`z.string().min(1, "Batch is required")`)
- User cannot submit → **admission blocked at form validation**

### Issue F: Customer Auto-Creation Timing

Stage 5 reads back the student to get the auto-created customer:
```typescript
const { data: freshStudent } = await apiClient.get(
  `/resource/Student/${encodeURIComponent(student.name)}?fields=["customer"]`
);
const customerName = freshStudent.data?.customer;
if (!customerName) throw new Error("No customer linked to student");
```

Frappe auto-creates a Customer when a Student is saved. But if there's a delay or the auto-creation fails (e.g., Customer naming series issue), `customerName` will be null → **SO creation fails → no invoices**.

### Issue G: Sibling Discount Data Inconsistency

For sibling admission:
1. New sibling's invoices use **frontend-discounted** amounts (5% off first instalment)
2. Existing sibling gets a **server-side Credit Note** via `/api/admission/apply-sibling-discount`
3. But the new sibling's Student record has `custom_sibling_discount_applied = 1` set during creation

The 5% discount on the NEW sibling is only reflected in invoice amounts — not tracked as a separate field on the Student or SO. If the SO is used for reporting, the discount is invisible.

### Issue H: Guardian Duplicate Handling

If a guardian with the same name/email already exists, Stage 1 will create a DUPLICATE Guardian record. The code doesn't check for existing guardians (except in sibling flow where `existingGuardianName` is passed).

### Issue I: Fee Structure Not Found

If `form.fee_structure` is empty (auto-resolution failed on frontend):
- SO rate falls back to Item Price
- Item Price may be stale or missing
- Invoice amounts (from XLSX) won't match SO total → **overbilling risk**

---

## DIAGNOSIS CHECKLIST FOR "Invoice Creation Failed"

To determine the exact cause, check:

1. **Browser console** — look for the HTTP response from `/api/admission/create-invoices`
2. **Server logs** — search for `[create-invoices]` log lines
3. **Sales Order check** — is the SO submitted? Does its `grand_total` match the sum of instalment amounts?
4. **Fee Structure vs XLSX** — do the Fee Structure `total_amount` and XLSX schedule amounts agree?
5. **Frappe validation errors** — look for "Over billing" or "Cannot overbill" in Frappe error messages
6. **Missing tuition item** — is there an Item with code `{program} Tuition Fee`?
7. **Rate = 0** — did the SO get created with a zero rate?

---

## FILE MAP

| File | Role |
|------|------|
| [src/lib/api/enrollment.ts](src/lib/api/enrollment.ts) | Main admission orchestrator (`admitStudent()`) |
| [src/app/api/admission/create-invoices/route.ts](src/app/api/admission/create-invoices/route.ts) | Stage 6: Invoice creation API |
| [src/app/api/admission/apply-sibling-discount/route.ts](src/app/api/admission/apply-sibling-discount/route.ts) | Stage 7: Sibling discount |
| [src/app/api/admission/search-sibling/route.ts](src/app/api/admission/search-sibling/route.ts) | Sibling search for sibling flow |
| [src/app/api/auth/create-parent-user/route.ts](src/app/api/auth/create-parent-user/route.ts) | Stage 1.5: Parent user creation |
| [src/app/api/fee-config/route.ts](src/app/api/fee-config/route.ts) | Fee config from XLSX data |
| [src/lib/api/sales.ts](src/lib/api/sales.ts) | SO/Item helpers (`createSalesOrder`, `getTuitionFeeItem`, etc.) |
| [src/lib/utils/feeSchedule.ts](src/lib/utils/feeSchedule.ts) | Instalment schedule generation, branch/program maps |
| [src/lib/validators/student.ts](src/lib/validators/student.ts) | Zod form validation |
| [src/lib/types/student.ts](src/lib/types/student.ts) | Student/Guardian/PE types |
| [src/lib/types/fee.ts](src/lib/types/fee.ts) | Fee types |
| [src/lib/types/sales.ts](src/lib/types/sales.ts) | SO types |
| [src/app/dashboard/branch-manager/students/new/page.tsx](src/app/dashboard/branch-manager/students/new/page.tsx) | BM admission form |
| [src/app/dashboard/sales-user/admit/page.tsx](src/app/dashboard/sales-user/admit/page.tsx) | Sales user admission form (w/ sibling) |
| [docs/fee_structure_parsed.json](docs/fee_structure_parsed.json) | XLSX-parsed fee data (static JSON) |

---

## RECOMMENDED FIXES (Priority Order)

1. **Fix SO rate to match schedule sum exactly** — Use `scheduleSum` directly as SO amount instead of `scheduleSum / numInstalments * numInstalments` to avoid rounding. Or use `qty=1, rate=scheduleSum`.

2. **Guard against Fee Structure/XLSX mismatch** — Always use `scheduleSum` for SO total when schedule is available, never mix data sources.

3. **Add robust error surfacing** — Surface the actual Frappe validation error message (especially overbilling) to the admin UI.

4. **Add pre-validation** — Before creating the SO, validate that Fee Structure total matches the XLSX schedule sum.

5. **Make invoice creation retryable** — Add a "Retry Invoice Creation" button on the SO detail page for cases where it fails.

6. **Fix Guardian deduplication** — Check for existing guardian by email before creating a new one.
