# Student Admission → Fee → Payment — Complete Build Plan

> Generated after deep study of: frontend codebase, Frappe backend, existing 840 Fee Structures, XLSX pricing, Razorpay integration, parent portal.

---

## REAL-LIFE WORKFLOW (End-to-End)

### Scene: Branch Manager admits a new student at Smart Up Vennala

```
┌────────────────────────────────────────────────────────────────────┐
│ STEP 1: ADMISSION (Branch Manager)                                 │
│                                                                    │
│ Dashboard → Students → Add New Student                             │
│                                                                    │
│ Step 1: Student Info → Name, DOB, Gender, Blood, Email, Phone      │
│ Step 2: Guardian → Name, Email, Mobile, Relation, Password         │
│ Step 3: Academic → Branch (Vennala), Class (9th CBSE),             │
│         Academic Year (2026-2027), Batch (auto/manual)             │
│ Step 4: Fee → Plan (Intermediate), Payment Option (Quarterly)      │
│         → Shows: ₹39,000/yr breakdown                             │
│         → Q1: ₹13,700 | Q2: ₹9,700 | Q3: ₹9,700 | Q4: ₹5,900   │
│         → Mode: Cash or Online                                     │
│ → SUBMIT                                                           │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 2: BACKEND AUTO-CREATES (on submit)                           │
│                                                                    │
│ a) Guardian → Frappe Guardian doc                                  │
│ b) Parent User → Frappe User with "Parent" role                    │
│ c) Student → linked to Guardian, with customer auto-created        │
│ d) Program Enrollment → student×program×year, submitted            │
│    stored: fee_structure, plan, instalments, payment_option        │
│ e) Student Group → added to batch                                  │
│ f) Sales Order → 1 SO for ₹39,000 (quarterly_total)               │
│    · customer = auto-created student customer                      │
│    · item = "9th CBSE Tuition Fee" × 1 × ₹39,000                  │
│    · custom fields: plan=Intermediate, instalments=4,              │
│      academic_year=2026-2027, student=STU-xxx                      │
│    · Payment Schedule: 4 entries with Q1/Q2/Q3/Q4 amounts          │
│      and due dates (April/July/Oct/Jan)                            │
│    · Status: Submitted (To Deliver and Bill)                       │
│ g) Sales Invoices → 4 invoices auto-created from SO                │
│    · SI-1: ₹13,700 due April 2026                                 │
│    · SI-2: ₹ 9,700 due July 2026                                  │
│    · SI-3: ₹ 9,700 due October 2026                               │
│    · SI-4: ₹ 5,900 due January 2027                               │
│    · All submitted, all with outstanding_amount = grand_total      │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: PARENT PORTAL (Parent logs in)                             │
│                                                                    │
│ Dashboard → Fees → sees:                                           │
│  ┌───────────────────────────────────────────────────────┐         │
│  │ Child: Rahul                                           │         │
│  │ Class: 9th CBSE | Branch: Vennala | Plan: Intermediate │         │
│  │ Total: ₹39,000  |  Paid: ₹0  |  Outstanding: ₹39,000 │         │
│  │                                                        │         │
│  │ Instalments:                                           │         │
│  │ ┌──────────┬──────────┬───────────┬──────────┐        │         │
│  │ │ Q1 Apr   │ ₹13,700  │ Due 15Apr │ [Pay Now]│        │         │
│  │ │ Q2 Jul   │ ₹ 9,700  │ Due 15Jul │  Upcoming│        │         │
│  │ │ Q3 Oct   │ ₹ 9,700  │ Due 15Oct │  Upcoming│        │         │
│  │ │ Q4 Jan   │ ₹ 5,900  │ Due 15Jan │  Upcoming│        │         │
│  │ └──────────┴──────────┴───────────┴──────────┘        │         │
│  └───────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 4: PAYMENT (Parent clicks "Pay Now" on Q1)                    │
│                                                                    │
│ Option A: RAZORPAY (Online)                                        │
│ · Frontend calls /api/payments/create-order (₹13,700)              │
│ · Razorpay modal opens → card/UPI/netbanking                       │
│ · On success → /api/payments/verify                                │
│ · Backend: validates signature → creates Payment Entry → submits   │
│ · SI-1 outstanding: ₹13,700 → ₹0 (Paid)                          │
│ · SO billing status updates                                        │
│                                                                    │
│ Option B: CASH (at branch counter)                                 │
│ · Branch Manager → Sales Orders → finds student's SO               │
│ · Clicks "Record Payment" on the outstanding invoice               │
│ · Enters: amount=₹13,700, mode=Cash, date                         │
│ · Backend: creates Payment Entry → submits                         │
│ · SI-1 outstanding: ₹13,700 → ₹0 (Paid)                          │
│                                                                    │
│ AFTER PAYMENT:                                                     │
│ · Invoice email sent to parent (guardian email)                    │
│ · Parent portal refreshes: Q1 shows ✓ Paid                        │
│ · SO progress: 1/4 instalments paid                                │
│ · Branch Manager dashboard: collection rate updates                │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ STEP 5: ONGOING (throughout academic year)                         │
│                                                                    │
│ · Overdue invoices highlighted in red on parent + BM dashboards    │
│ · Branch Manager can view: pending fees by class, by student       │
│ · Director can view: cross-branch collection summary               │
│ · Each subsequent instalment: parent pays → invoice clears         │
│ · When all 4 invoices paid → SO status = "Completed"               │
└────────────────────────────────────────────────────────────────────┘
```

---

## CURRENT STATE vs REQUIRED

### What Already Works ✅
1. Student admission 4-step wizard (all 4 steps functional)
2. Fee Structure lookup by branch × program × plan × instalments
3. Sales Order creation with correct `total_amount` from Fee Structure
4. SO auto-submitted on admission
5. Razorpay payment (create order → verify → Payment Entry)
6. Parent portal shows SO total + invoices + Pay Now button
7. 840 Fee Structures seeded (all branches × plans × payment options)
8. Email account configured (smartuplearningventures@gmail.com, outgoing enabled)
9. All 12 tuition fee Items exist
10. Customer auto-created when Student is inserted

### What's Broken / Missing ❌

| # | Issue | Current Behavior | Required Behavior |
|---|-------|------------------|-------------------|
| 1 | **No per-instalment breakdown** | SO has `grand_total` but no payment schedule with per-instalment amounts | Q1≠Q2≠Q3≠Q4 (unequal). Need invoice schedule with correct amounts per instalment |
| 2 | **No auto-invoice generation** | Invoices are manually created from SO by branch manager | Need auto-creation of N invoices on admission (1/4/6/8 based on option) |
| 3 | **No instalment due dates** | No due date logic | Need due dates: Q1=April, Q2=July, Q3=Oct, Q4=Jan (configurable) |
| 4 | **Cash payment flow missing from BM** | Branch Manager has no "record cash payment" UI for a specific invoice | Need: SO detail → see invoices → click "Record Cash Payment" → Payment Entry |
| 5 | **No invoice email to parent** | Payment verified but no email notification | After payment, send invoice PDF to guardian email |
| 6 | **Parent portal doesn't show instalment schedule** | Shows SO total + any invoices | Need: per-instalment timeline with amounts, due dates, paid/unpaid status |
| 7 | **Step 4 UI doesn't show instalment breakdown** | Shows only total amount | Need Q1/Q2/Q3/Q4 individual amounts visible before admission |
| 8 | **Admission needs XLSX instalment data** | Has total from Fee Structure | Needs q1/q2/q3/q4 / inst6_per/last / inst8_per/last from XLSX data |

---

## ARCHITECTURE DECISION

### ✅ RECOMMENDED: Keep 840 Fee Structures + serve XLSX instalment data via API

- Keep 840 Fee Structures as-is (verified correct, total_amount matches each option)
- Create an API endpoint that serves per-instalment breakdown from parsed XLSX data
- Frontend admission: select branch → class → plan → shows all 4 payment options with totals + breakdowns
- On submit: create SO + auto-generate invoices with correct per-instalment amounts
- **Why**: No Frappe admin changes needed. 840 docs give us the total for each option. XLSX data gives us the per-instalment split.

---

## DETAILED BUILD PLAN

### Phase 0: Data & API Foundation
- [ ] **0.1** Create `src/app/api/fee-config/route.ts` — serves fee_structure_parsed.json data
  - GET with query params: `branch` (Frappe company), `program` (Frappe program), `plan`
  - Maps Frappe names → XLSX keys automatically
  - Returns all 14 pricing fields for the matched entry
- [ ] **0.2** Create `src/lib/utils/feeSchedule.ts` — instalment schedule generator
  - Input: fee config entry + payment option (1/4/6/8) + academic year
  - Output: Array of `{ label, amount, dueDate }` 
  - Handles unequal quarterly splits, 6-inst (5×per + last), 8-inst (7×per + last)
- [ ] **0.3** Define instalment due date constants in `src/lib/utils/constants.ts`
  - Quarterly: Apr 15, Jul 15, Oct 15, Jan 15
  - 6-Instalment: Apr, Jun, Aug, Oct, Dec, Feb (15th)
  - 8-Instalment: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov (15th)
- [ ] **0.4** Update TypeScript types for instalment schedule

### Phase 1: Admission Flow Enhancement (Step 4 UI)
- [ ] **1.1** Create `src/components/fees/PaymentOptionSelector.tsx`
  - Shows 4 payment options as cards with total for each
  - Highlights OTP as "Best Value" (lowest amount)
  - Shows savings: "Save ₹X vs monthly"
- [ ] **1.2** Create `src/components/fees/InstalmentBreakdown.tsx`
  - Displays per-instalment amounts with due dates
  - Q: Q1=₹X due Apr | Q2=₹Y due Jul | Q3=₹Z due Oct | Q4=₹W due Jan
- [ ] **1.3** Update `students/new/page.tsx` Step 4
  - Replace current plan + instalment radio with PaymentOptionSelector
  - Show InstalmentBreakdown when option selected
  - Update admission summary section
- [ ] **1.4** Update `src/lib/validators/student.ts` — validate payment option

### Phase 2: Sales Order + Auto-Invoice Generation
- [ ] **2.1** Update `admitStudent()` in enrollment.ts
  - Fetch fee config from API (per-instalment amounts)
  - Create SO with correct grand_total for selected option
  - Add Payment Schedule child table to SO with per-instalment entries
- [ ] **2.2** Create `src/app/api/admission/create-invoices/route.ts`
  - Server-side endpoint (uses admin token)
  - Creates N Sales Invoices from SO with correct amounts and due dates
  - Submits each invoice
  - Returns array of created invoice names
- [ ] **2.3** Call invoice creation from `admitStudent()` after SO submission
- [ ] **2.4** Update `src/lib/api/sales.ts` — add `createInvoicesForSO()` function
- [ ] **2.5** Update `src/lib/types/sales.ts` — add PaymentScheduleEntry type

### Phase 3: Cash Payment Flow (Branch Manager)
- [ ] **3.1** Create `src/app/api/payments/record-cash/route.ts`
  - POST: { invoice_id, amount, mode_of_payment, posting_date, reference_no? }
  - Uses Frappe's `get_payment_entry` → insert → submit
  - Returns payment entry name
- [ ] **3.2** Create SO detail page: `src/app/dashboard/branch-manager/sales-orders/[id]/page.tsx`
  - Shows SO header (student, total, status)
  - Lists linked invoices with status, amounts, due dates
  - "Record Payment" button on each outstanding invoice
  - Payment history table
- [ ] **3.3** Create "Record Payment" modal component
  - Amount (pre-filled from invoice), Mode dropdown (Cash/Cheque/Bank Transfer/UPI), Date, Reference #
  - Submit → calls record-cash API
  - Success → toast + refresh

### Phase 4: Invoice Email to Parent
- [ ] **4.1** Create `src/app/api/payments/send-receipt/route.ts`
  - POST: { invoice_id, payment_entry_id }
  - Gets guardian email from Student → Guardian
  - Uses Frappe `frappe.sendmail` or Communication API
  - Attaches invoice PDF via Frappe print API
- [ ] **4.2** Auto-trigger email after payment (both Razorpay and Cash)
  - Update `/api/payments/verify/route.ts` — call send-receipt after success
  - Update `/api/payments/record-cash/route.ts` — call send-receipt after success

### Phase 5: Parent Portal Enhancement
- [ ] **5.1** Create `src/components/fees/InstalmentTimeline.tsx`
  - Vertical timeline: paid ✓ → due → upcoming → overdue
  - Each node: instalment label, amount, due date, status badge
  - Paid: green check + payment date
  - Due today/overdue: red highlight + "Pay Now" button
  - Upcoming: gray + future date
- [ ] **5.2** Update `src/app/dashboard/parent/fees/page.tsx`
  - Replace current invoice table with InstalmentTimeline
  - Add payment option + plan badge at top
  - Keep Razorpay Pay Now button per outstanding invoice
  - "Download Receipt" link for paid invoices
- [ ] **5.3** Update `src/app/dashboard/parent/page.tsx`
  - Show next due instalment on dashboard card
  - "Next Payment: ₹9,700 due Jul 15" with Pay Now link

### Phase 6: Branch Manager Dashboard Updates
- [ ] **6.1** Update fee collection page (`fees/page.tsx`)
  - Add overdue invoice count + total
  - Class-wise collection rate breakdown
- [ ] **6.2** Update student detail page (`students/[id]/page.tsx`)
  - Add fee tab: SO + invoices + payments
  - Quick action: "Record Payment"
- [ ] **6.3** SO list page: add invoice count + payment progress indicator

---

## FILE CHANGES SUMMARY

### New Files (7)
| File | Purpose |
|------|---------|
| `src/app/api/fee-config/route.ts` | Serve parsed XLSX fee data with branch/program/plan lookup |
| `src/app/api/admission/create-invoices/route.ts` | Auto-create invoices from SO with per-instalment amounts |
| `src/app/api/payments/record-cash/route.ts` | Record cash payment (Branch Manager) |
| `src/app/api/payments/send-receipt/route.ts` | Send invoice PDF email to parent |
| `src/lib/utils/feeSchedule.ts` | Instalment schedule generator (amounts + due dates) |
| `src/components/fees/InstalmentTimeline.tsx` | Visual instalment timeline component |
| `src/components/fees/PaymentOptionSelector.tsx` | Payment option cards + instalment breakdown |

### New Page (1)
| File | Purpose |
|------|---------|
| `src/app/dashboard/branch-manager/sales-orders/[id]/page.tsx` | SO detail with invoices + record payment |

### Modified Files (12)
| File | Changes |
|------|---------|
| `src/app/dashboard/branch-manager/students/new/page.tsx` | Step 4: payment option selector with instalment breakdown |
| `src/lib/api/enrollment.ts` | `admitStudent()`: instalment data, SO payment schedule, auto-invoices |
| `src/lib/api/sales.ts` | Add `createInvoicesForSO()` helper |
| `src/lib/types/fee.ts` | Add FeeConfig, InstalmentEntry types |
| `src/lib/types/sales.ts` | Add PaymentScheduleEntry type |
| `src/lib/validators/student.ts` | Validate payment option selection |
| `src/lib/utils/constants.ts` | Due date schedule constants |
| `src/app/dashboard/parent/fees/page.tsx` | Instalment timeline + payment option display |
| `src/app/dashboard/parent/page.tsx` | Next due instalment card |
| `src/app/dashboard/branch-manager/fees/page.tsx` | Overdue + collection breakdown |
| `src/app/dashboard/branch-manager/sales-orders/page.tsx` | Invoice count per SO |
| `src/app/api/payments/verify/route.ts` | Auto-send receipt email after Razorpay |

---

## INSTALMENT CALCULATION REFERENCE

```
Payment Option → SO total + invoice schedule:

OTP (1 instalment):
  SO total = config.otp
  Invoices: [{ amount: otp, due: enrollment_date }]

Quarterly (4 instalments):
  SO total = config.quarterly_total
  Invoices: [
    { amount: q1, due: Apr 15 },
    { amount: q2, due: Jul 15 },
    { amount: q3, due: Oct 15 },
    { amount: q4, due: Jan 15 },
  ]
  NOTE: q1 ≠ q2 ≠ q3 ≠ q4 (unequal split ~35/25/25/15%)

6-Instalment (bi-monthly):
  SO total = config.inst6_total
  Invoices: [
    { amount: inst6_per, due: Apr 15 },
    { amount: inst6_per, due: Jun 15 },
    { amount: inst6_per, due: Aug 15 },
    { amount: inst6_per, due: Oct 15 },
    { amount: inst6_per, due: Dec 15 },
    { amount: inst6_last, due: Feb 15 },  ← different
  ]

8-Instalment (monthly):
  SO total = config.inst8_total
  Invoices: [
    { amount: inst8_per, due: Apr 15 },
    { amount: inst8_per, due: May 15 },
    { amount: inst8_per, due: Jun 15 },
    { amount: inst8_per, due: Jul 15 },
    { amount: inst8_per, due: Aug 15 },
    { amount: inst8_per, due: Sep 15 },
    { amount: inst8_per, due: Oct 15 },
    { amount: inst8_last, due: Nov 15 },  ← different
  ]
```

---

## MAPPING TABLES

### Program Mapping (Frappe Program → XLSX Class)
| Frappe Program | XLSX Class | Tuition Fee Item |
|---------------|------------|------------------|
| 8th State | 8 State | 8th State Tuition Fee |
| 8th CBSE | 8 Cbse | 8th CBSE Tuition Fee |
| 9th State | 9 State | 9th State Tuition Fee |
| 9th CBSE | 9 Cbse | 9th CBSE Tuition Fee |
| 10th State | 10 State | 10th State Tuition Fee |
| 10th CBSE | 10 Cbse | 10th CBSE Tuition Fee |
| 11th State | Plus One | 11th Science State Tuition Fee |
| 11th Science State | Plus One | 11th Science State Tuition Fee |
| 11th Science CBSE | Plus One | 11th Science CBSE Tuition Fee |
| 12th Science State | Plus Two | 12th Science State Tuition Fee |
| 12th Science CBSE | Plus Two | 12th Science CBSE Tuition Fee |

### Branch Mapping (Frappe Company → XLSX Branch)
| Frappe Company | XLSX Branch | Abbreviation |
|---------------|-------------|--------------|
| Smart Up Chullickal | Tier 1 | SU CHL |
| Smart Up Fortkochi | Tier 1 | SU FKO |
| Smart Up Eraveli | Tier 1 | SU ERV |
| Smart Up Palluruthy | Tier 1 | SU PLR |
| Smart Up Thopumpadi | Thoppumpady | SU THP |
| Smart Up Moolamkuzhi | Moolamkuzhi | SU MMK |
| Smart Up Kadavanthara | Kadavanthra | SU KDV |
| Smart Up Vennala | Vennala | SU VYT |
| Smart Up Edappally | Edappally | SU EDPLY |

### Due Date Schedule (Academic Year 2026-2027)
| Option | Instalment | Due Date |
|--------|-----------|----------|
| OTP | 1 of 1 | Enrollment Date |
| Quarterly | Q1 | 2026-04-15 |
| Quarterly | Q2 | 2026-07-15 |
| Quarterly | Q3 | 2026-10-15 |
| Quarterly | Q4 | 2027-01-15 |
| 6-Instalment | 1 | 2026-04-15 |
| 6-Instalment | 2 | 2026-06-15 |
| 6-Instalment | 3 | 2026-08-15 |
| 6-Instalment | 4 | 2026-10-15 |
| 6-Instalment | 5 | 2026-12-15 |
| 6-Instalment | 6 | 2027-02-15 |
| 8-Instalment | 1 | 2026-04-15 |
| 8-Instalment | 2 | 2026-05-15 |
| 8-Instalment | 3 | 2026-06-15 |
| 8-Instalment | 4 | 2026-07-15 |
| 8-Instalment | 5 | 2026-08-15 |
| 8-Instalment | 6 | 2026-09-15 |
| 8-Instalment | 7 | 2026-10-15 |
| 8-Instalment | 8 | 2026-11-15 |

---

## DEPENDENCIES & BUILD ORDER

```
Phase 0 (Foundation)         ←── must complete first
  ├→ Phase 1 (Admission UI)  ←── can start after Phase 0
  └→ Phase 2 (SO + Invoices) ←── can start after Phase 0
       ├→ Phase 3 (Cash Pay)  ←── needs Phase 2
       ├→ Phase 4 (Email)     ←── needs Phase 2+3
       └→ Phase 5 (Parent)    ←── needs Phase 2
            └→ Phase 6 (BM Dashboard) ←── needs Phase 2+3+5
```

**Critical path: Phase 0 → Phase 2 → Phase 3 → Phase 6**
**Parallel track: Phase 0 → Phase 1 (UI only, can demo without backend)**

---

## RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frappe `make_sales_invoice` doesn't support per-instalment amounts | All invoices same amount | Create invoices directly via API, not SO mapping |
| Payment Entry creation fails (account mismatch) | Payment not linked | Existing fallback (comment on invoice) + retry mechanism |
| Email delivery fails (SMTP limits) | Parent doesn't get receipt | Log all sends, add "Resend Receipt" button |
| Student re-admission (next year) | Duplicate SO confusion | Filter by academic_year in all queries |
| Partial payment (less than instalment) | Outstanding doesn't clear | Validate: payment must equal invoice amount |
| Due dates fall on weekends/holidays | Due date confusion | Use business-day-aware dates (or just use 15th, simple) |
