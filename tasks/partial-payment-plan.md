# Partial Payment & Advance-Only Collection Plan

> **Goal**: Allow advance-only collection at admission, show remaining as pending,
> and let parents split any instalment into micro-payments across 3-4 days.

---

## 1  Current System — How It Works Today

### 1.1 Admission Flow (Branch Manager)
```
Step 1-3: Student / Guardian / Academic details
Step 4:   Select Fee Plan → Payment Option (1/4/6/8) → Mode (Cash/Online)
  └─ Submit → admitStudent() orchestrates:
       1. Create Guardian
       2. Create Parent User
       3. Create Student
       4. Create Program Enrollment + Student Group assignment
       5. Create Sales Order (SO) — qty = numInstalments, rate = perInstalmentRate
       6. Create Sales Invoices — one per instalment, each with:
            ├── qty=1, rate=instalment amount
            ├── due_date = instalment due date (April 15, July 15, etc.)
            └── linked back to SO via sales_order + so_detail
```

### 1.2 Payment Collection (Post-Admission)
```
PostAdmissionPayment dialog opens:
  ├── "Pay Now" → pays ONLY the 1st invoice
  │     ├── Online → RazorpayPayButton (full invoice amount)
  │     └── Cash → CashPaymentForm (full invoice amount)
  └── "Send to Parent" → emails parent with "Pay Now" link
```

### 1.3 Parent Payment
```
Parent Dashboard → Fee Status page:
  ├── Summary cards (Total / Paid / Outstanding)
  ├── InstalmentTimeline (visual cards per invoice)
  │     └── "Pay ₹X" button on first unpaid instalment
  └── Payment History table
```

### 1.4 Backend Payment Chain
```
Razorpay:  create-order → Razorpay modal → verify (HMAC-SHA256) → get_payment_entry → submit PE → send-receipt
Cash:      record-cash → get_payment_entry → submit PE → send-receipt
```

### 1.5 Key Constraint
- **Each invoice = one instalment = full amount required**
- No concept of partial payment against an invoice
- Parent MUST pay the full instalment amount at once
- At admission, BM can only collect 1st instalment in full or skip

---

## 2  Problem Statement

Real-world scenarios the current system cannot handle:

| # | Scenario | What Happens Today |
|---|----------|--------------------|
| 1 | Parent selects 8-instalment plan (₹6,000/month). Only has ₹2,000 at admission. | BM must either: skip payment entirely, or ask parent to come back with full ₹6,000. No way to collect ₹2,000 as advance. |
| 2 | Parent paid ₹2,000 advance. Remaining ₹4,000 of 1st instalment due. | No tracking. Invoice shows full ₹6,000 outstanding. BM has to remember manually. |
| 3 | Parent wants to pay ₹4,000 remaining in 2 parts (₹2,000 today, ₹2,000 in 3 days). | Not possible. Payment is all-or-nothing per invoice. |
| 4 | BM wants to see which students paid advance vs full 1st instalment. | No distinction. All 1st invoices look the same regardless of partial payment. |

---

## 3  Proposed Solution — Design Document

### 3.1 Core Principle: Leverage Frappe's Native Partial Payment

**Frappe already supports partial payments!**  
A Sales Invoice with `grand_total = 6000` can accept:
- Payment Entry 1: ₹2,000 → `outstanding_amount` becomes ₹4,000
- Payment Entry 2: ₹2,000 → `outstanding_amount` becomes ₹2,000
- Payment Entry 3: ₹2,000 → `outstanding_amount` becomes ₹0

The `get_payment_entry` method we already use accepts `party_amount` parameter — we just send the partial amount instead of the full amount. **No Frappe backend changes needed.**

### 3.2 Architecture Decision: No New Doctypes

We do NOT create new invoices for partial amounts. Instead:
- Keep the existing instalment invoices as-is (1 invoice per instalment)
- Allow multiple Payment Entries against the same invoice (Frappe native)
- Track partial state via `outstanding_amount` on the invoice itself
- Frontend displays payment progress per instalment

### 3.3 "Advance" = Partial Payment on 1st Invoice

An "advance" is simply a partial Payment Entry against the 1st Sales Invoice.
- If 1st instalment is ₹6,000 and parent pays ₹2,000 → advance = ₹2,000
- Invoice outstanding becomes ₹4,000
- Both BM and parent see the split clearly

---

## 4  Feature Breakdown

### Feature A: Advance-Only Collection at Admission

**When**: Step 4 of admission wizard, after selecting payment plan  
**What**: BM can enter a custom advance amount (≤ 1st instalment amount)

#### UI Changes — Admission Wizard (Step 4)
```
Current:
  [Fee Plan] → [Payment Option] → [Mode: Cash/Online] → [Action: Pay Now / Send to Parent]

Proposed:
  [Fee Plan] → [Payment Option] → [Mode: Cash/Online] → [Action: Pay Now / Send to Parent]
                                                            │
                                                            ▼ (if "Pay Now")
                                                      [Advance Amount Input]
                                                        ├── Default: full 1st instalment
                                                        ├── Editable: any amount ≥ 1 
                                                        ├── Shows: "Advance: ₹2,000 of ₹6,000"
                                                        └── Shows: "Remaining: ₹4,000 (due within X days)"
```

#### API Changes
- `/api/payments/record-cash` — **already supports partial** (just send `amount: 2000` instead of `amount: 6000`)
- `/api/payments/create-order` — **already supports partial** (Razorpay order for ₹2,000)
- `/api/payments/verify` — needs minor tweak: currently overrides `allocated_amount` with full `amount`, which is correct for partial too

#### Data Flow
```
Admission Submit:
  1. Create SO + all instalment invoices (unchanged)
  2. PostAdmissionPayment opens with advance amount option
  3. If advance < full 1st instalment:
       ├── Create Payment Entry for advance amount only
       ├── 1st invoice: outstanding = instalment - advance
       └── Receipt email sent for advance amount
```

---

### Feature B: Instalment Splitting (Pay Remaining in Parts)

**When**: Parent dashboard OR BM payment collection  
**What**: Any unpaid/partially-paid instalment can accept incremental payments

#### UI Changes — Parent Dashboard (InstalmentTimeline)
```
Current per-instalment card:
  ┌─────────────────────────────────────┐
  │ Q1 — ₹6,000          [Pay ₹6,000]  │
  │ Due: Apr 15, 2026         Upcoming  │
  └─────────────────────────────────────┘

Proposed per-instalment card (partially paid):
  ┌─────────────────────────────────────────────┐
  │ Q1 — ₹6,000                                │
  │ Due: Apr 15, 2026                           │
  │                                             │
  │  ██████░░░░░░░░░░  ₹2,000 / ₹6,000 paid   │  ← mini progress bar
  │  Remaining: ₹4,000                         │
  │                                             │
  │  [Pay ₹4,000]  or  [Pay Custom Amount]     │  ← two options
  └─────────────────────────────────────────────┘
```

#### UI Changes — "Pay Custom Amount" Modal
```
  ┌──────────────────────────────────────────────┐
  │  Pay for: Q1 (Apr 15, 2026)                  │
  │                                              │
  │  Invoice Total:     ₹6,000                   │
  │  Already Paid:      ₹2,000                   │
  │  Outstanding:       ₹4,000                   │
  │                                              │
  │  Amount to Pay:  [₹________]                 │
  │    Min: ₹1  |  Max: ₹4,000                   │
  │                                              │
  │  [Cancel]              [Pay ₹_____ via Razorpay] │
  └──────────────────────────────────────────────┘
```

#### API Changes
- **No new endpoints needed**
- `create-order`: already takes any `amount`
- `verify`: already creates PE with `paid_amount = amount`
- `record-cash`: already creates PE with any `amount`
- Frontend just needs to pass the custom amount instead of `outstanding_amount`

---

### Feature C: BM Partial Cash Collection

**When**: BM collects cash from parent for any instalment  
**What**: BM can enter exact amount received (even if less than instalment)

#### UI Changes — PostAdmissionPayment / SO Detail Page
```
Current CashPaymentForm:
  ├── Mode (Cash/UPI/Bank/Cheque)
  ├── Reference No
  └── Amount: fixed = invoice.outstanding_amount

Proposed CashPaymentForm:
  ├── Mode (Cash/UPI/Bank/Cheque)  
  ├── Reference No
  └── Amount: [₹________] (editable, max = invoice.outstanding_amount)
       └── Helper text: "Outstanding: ₹4,000. Enter amount received."
```

---

### Feature D: Enhanced Invoice Status Display

Everywhere invoices are shown, display partial-payment state:

#### Status Badges (enhanced)
```
Current:       Paid | Overdue | Due Today | Upcoming
Proposed:      Paid | Partially Paid | Overdue | Overdue (Partial) | Due Today | Upcoming
```

#### Color Coding
| Status | Color | Icon |
|--------|-------|------|
| Paid | Green | ✓ CheckCircle |
| Partially Paid | Amber/Yellow | ◐ CircleHalf |
| Overdue | Red | ⚠ AlertCircle |
| Overdue + Partial | Orange | ◐ + ⚠ |
| Due Today | Blue | ⏰ Clock |
| Upcoming | Gray | ○ CircleDot |

---

### Feature E: Payment History Per Instalment

Show all partial payments made against each instalment:

```
  ┌─────────────────────────────────────────────────────┐
  │ Q1 — ₹6,000                    Partially Paid      │
  │ Due: Apr 15, 2026                                   │
  │                                                     │
  │  Payments:                                          │
  │   ✓ ₹2,000  Cash   Mar 9, 2026    (Advance)       │
  │   ✓ ₹2,000  UPI    Mar 12, 2026   Ref: UTR123     │
  │                                                     │
  │  Remaining: ₹2,000                                 │
  │  [Pay ₹2,000]  or  [Pay Custom Amount]             │
  └─────────────────────────────────────────────────────┘
```

#### API for Payment History
New endpoint: `GET /api/fees/invoice-payments?invoice_id=ACC-SINV-2026-00050`
- Queries Frappe: `Payment Entry` where references has `reference_name = invoice_id`
- Returns: `[{ name, paid_amount, mode_of_payment, posting_date, reference_no }]`

---

## 5  Implementation Phases

### Phase 1: Backend — Partial Payment Support (Low Risk)
> Existing APIs already work. Only new endpoint needed.

| # | Task | File | Effort |
|---|------|------|--------|
| 1.1 | Create `GET /api/fees/invoice-payments` endpoint | `src/app/api/fees/invoice-payments/route.ts` | New file |
| 1.2 | Verify `record-cash` works with partial amounts | `src/app/api/payments/record-cash/route.ts` | Test only |
| 1.3 | Verify `create-order` + `verify` work with partial amounts | `src/app/api/payments/*.ts` | Test only |

### Phase 2: Admission Wizard — Advance Amount Input
> Add advance amount field + update PostAdmissionPayment to use it.

| # | Task | File | Effort |
|---|------|------|--------|
| 2.1 | Add "Advance Amount" input to Step 4 (visible when "Pay Now" selected) | `src/app/dashboard/branch-manager/students/new/page.tsx` | Edit |
| 2.2 | Pass advance amount to `PostAdmissionPayment` component | Same file | Edit |
| 2.3 | Update `PostAdmissionPayment` to use advance amount instead of full instalment | `src/components/payments/PostAdmissionPayment.tsx` | Edit |
| 2.4 | Update `CashPaymentForm` to accept editable amount | Same file | Edit |
| 2.5 | Update `RazorpayPayButton` call to use advance amount | Same file | Edit |
| 2.6 | Show advance summary: "₹2,000 advance of ₹6,000. Remaining: ₹4,000" | Same file | Edit |

### Phase 3: Parent Dashboard — Partial Payment UI
> Update InstalmentTimeline to show partial state and allow custom amounts.

| # | Task | File | Effort |
|---|------|------|--------|
| 3.1 | Add partial-payment progress bar per instalment card | `src/components/fees/InstalmentTimeline.tsx` | Edit |
| 3.2 | Add "Partially Paid" status + amber badge | Same file | Edit |
| 3.3 | Create `PartialPaymentModal` — amount input + Razorpay | New component: `src/components/payments/PartialPaymentModal.tsx` | New file |
| 3.4 | Wire "Pay Custom Amount" button to open modal | `src/components/fees/InstalmentTimeline.tsx` | Edit |
| 3.5 | Add payment history section per instalment | Same file | Edit |
| 3.6 | Call `/api/fees/invoice-payments` to fetch per-invoice payments | Same file or parent page | Edit |

### Phase 4: BM Cash Collection — Editable Amount
> Let BM enter partial cash amounts.

| # | Task | File | Effort |
|---|------|------|--------|
| 4.1 | Make CashPaymentForm amount editable (bounded by outstanding) | `src/components/payments/PostAdmissionPayment.tsx` | Edit |
| 4.2 | Update BM fee/SO detail pages to show partial payment state | `src/app/dashboard/branch-manager/fees/page.tsx` | Edit |
| 4.3 | Add "Partially Paid" filter/badge to pending invoices table | Same file | Edit |

### Phase 5: Enhanced Status & Reporting
> Better visibility across dashboards.

| # | Task | File | Effort |
|---|------|------|--------|
| 5.1 | Update status logic everywhere: add "partially_paid" state | `src/components/fees/InstalmentTimeline.tsx`, fee pages | Edit |
| 5.2 | Update `class-summary` API to distinguish partial vs fully pending | `src/app/api/fees/class-summary/route.ts` | Edit |
| 5.3 | Director dashboard: show advance collection metrics | `src/app/dashboard/director/fees/page.tsx` | Edit |

---

## 6  Data Model — No Changes Needed

```
Sales Invoice (existing)
  ├── grand_total: 6000          ← never changes
  ├── outstanding_amount: 4000   ← decreases with each partial payment
  └── status: "Partly Paid"     ← Frappe auto-updates this!

Payment Entry (existing, multiple per invoice)
  ├── PE-00001: paid_amount=2000, mode=Cash, remarks="Advance at admission"
  ├── PE-00002: paid_amount=2000, mode=UPI, reference_no=UTR123
  └── PE-00003: paid_amount=2000, mode=Razorpay, reference_no=pay_xyz
```

Frappe's `Sales Invoice.status` auto-updates to:
- `"Unpaid"` → outstanding = grand_total
- `"Partly Paid"` → 0 < outstanding < grand_total
- `"Paid"` → outstanding = 0
- `"Overdue"` → outstanding > 0 AND due_date < today

**We can rely on `outstanding_amount` as the single source of truth.**

---

## 7  Edge Cases & Guards

| Case | Handling |
|------|----------|
| Advance = 0 (parent skips payment) | Allowed — all invoices stay as-is. "Send to Parent" or "Pay Later". |
| Advance = full 1st instalment | Works exactly like today. No change. |
| Advance > 1st instalment | Block in UI. Max = 1st instalment amount. Advance only applies to 1st instalment. |
| Two parents pay simultaneously via Razorpay | Frappe's `get_payment_entry` reads current `outstanding_amount`. Second payment would try to pay more than outstanding → Frappe rejects. Razorpay order is already created for a fixed amount, so this is safe. |
| BM enters 0 or negative amount | Validate: amount > 0 in frontend + backend. |
| Multiple small payments below Razorpay min (₹1) | Razorpay minimum is ₹1. Allow any amount ≥ ₹1. |
| Invoice already fully paid, pay button still visible | Check `outstanding_amount > 0` before showing pay button. Already done. |
| Refund/chargeback on partial payment | Manual process via Frappe. Out of scope for this feature. |

---

## 8  UX Flow Diagrams

### Admission with Advance
```
BM selects "8 instalments" plan
  → 1st instalment = ₹6,000
  → BM selects "Pay Now" + "Cash"
  → Advance Amount field appears: [₹6,000] (default)
  → BM changes to: [₹2,000]
  → "Pay ₹2,000 as advance" button
  → Cash recorded → PE created → Receipt sent
  → Summary: "Advance ₹2,000 collected. ₹4,000 remaining on 1st instalment."
  → All 8 invoices exist, 1st has outstanding = ₹4,000
```

### Parent Pays Remaining in Parts
```
Parent opens Fee Status page
  → InstalmentTimeline shows:
     Q1: ₹6,000 (₹2,000 paid, ₹4,000 remaining)  [Pay ₹4,000] [Custom]
  → Parent clicks [Custom]
  → Modal: "Pay ₹2,000" → Razorpay
  → After payment: Q1 now shows ₹4,000 paid, ₹2,000 remaining
  → Next day: Parent pays remaining ₹2,000
  → Q1: Fully Paid ✓
```

---

## 9  TODO Checklist

- [ ] **P1.1** Create `GET /api/fees/invoice-payments` endpoint
- [ ] **P1.2** Test `record-cash` with partial amount (manual test)
- [ ] **P1.3** Test `create-order` + `verify` with partial amount (manual test)
- [ ] **P2.1** Add advance amount input to admission Step 4
- [ ] **P2.2** Pass advance amount through to PostAdmissionPayment
- [ ] **P2.3** Update PostAdmissionPayment to handle advance < full amount
- [ ] **P2.4** Make CashPaymentForm amount editable (with max bound)
- [ ] **P2.5** Update RazorpayPayButton call with advance amount
- [ ] **P2.6** Show advance summary text in PostAdmissionPayment
- [ ] **P3.1** Add partial-payment progress bar in InstalmentTimeline
- [ ] **P3.2** Add "Partially Paid" status badge (amber)
- [ ] **P3.3** Create PartialPaymentModal component
- [ ] **P3.4** Wire "Pay Custom Amount" button in InstalmentTimeline
- [ ] **P3.5** Show per-instalment payment history
- [ ] **P3.6** Fetch invoice payments via new API
- [ ] **P4.1** Make CashPaymentForm amount editable for BM
- [ ] **P4.2** Update BM fee pages with partial payment state
- [ ] **P4.3** Add "Partially Paid" filter/badge to pending invoices
- [ ] **P5.1** Unify status logic across all views
- [ ] **P5.2** Update class-summary API for partial vs full pending
- [ ] **P5.3** Director dashboard advance collection metrics

---

## 10  Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Frappe `get_payment_entry` rejects partial amount | Test first. The `party_amount` parameter is designed for this. Low risk. |
| Outstanding amount goes negative | Frappe validates this natively. PE creation fails if amount > outstanding. |
| Razorpay order amount doesn't match verify amount | Razorpay validates order amount internally. Can't overpay an order. |
| Receipt email shows partial amount, confusing parent | Update email template to say "Partial payment of ₹X received. Remaining: ₹Y" |
| BM forgets to collect remaining | Dashboard shows "Partially Paid" status prominently. Auto-overdue logic still works. |

---

## 11  What We Do NOT Build

1. ~~Auto-splitting invoices~~ — We use Frappe's native partial payment instead
2. ~~New doctypes~~ — No "Advance Payment" or "Payment Plan" doctype needed
3. ~~Payment reminders/scheduler~~ — Out of scope (can be Phase 6)
4. ~~Refund handling~~ — Manual via Frappe admin
5. ~~EMI/credit system~~ — Not applicable; these are fee instalments, not loans
6. ~~Changes to Frappe backend~~ — Everything works with existing Frappe APIs
