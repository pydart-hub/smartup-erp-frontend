# Fee Structure — Complete XLSX Analysis

## Source
`docs/FINAL FEE STRUCTURE.xlsx` — 331 rows, single sheet, 9 columns (A–I).
Parsed into `docs/fee_structure_parsed.json` — **93 unique (branch, plan, class) entries**.

---

## 1. Dimensions

### Branches (6 pricing tiers)
| XLSX Name | Frappe Company | Classes Offered |
|-----------|---------------|-----------------|
| **Tier 1** (Chullikal, Fortkochi, Eraveli, Palluruthi) | Smart Up Chullickal, Smart Up Fortkochi, Smart Up Eraveli, Smart Up Palluruthi | 8 State, 9 State, 10 State, Plus One, Plus Two |
| **Thoppumpady** | Smart Up Thopumpadi | 9 State, 10 State, Plus One, Plus Two |
| **Moolamkuzhi** | Smart Up Moolamkuzhi | 9 State, 9 Cbse, 10 State, 10 Cbse |
| **Kadavanthra** | Smart Up Kadavanthra | 9 Cbse, 10 Cbse, Plus One, Plus Two |
| **Vennala** | Smart Up Vennala | ALL 8 classes |
| **Edappally** | Smart Up Edappally | 9 State, 9 Cbse, 10 State, 10 Cbse, Plus One, Plus Two |

### Plans (3)
Basic, Intermediate, Advanced

### Classes (8)
8 State, 8 Cbse, 9 State, 9 Cbse, 10 State, 10 Cbse, Plus One, Plus Two

### Payment Options (4)
| Option | Instalments | How amounts work |
|--------|-------------|-----------------|
| **OTP** (One Time Payment) | 1 | Single `otp` amount |
| **Quarterly** | 4 | Q1 + Q2 + Q3 + Q4 (NOT equal — ~35/25/25/15% split) |
| **6-Instalment** | 6 | First 5 × `inst6_per` + last 1 × `inst6_last` |
| **8-Instalment** | 8 | First 7 × `inst8_per` + last 1 × `inst8_last` |

---

## 2. Per-Entry Fields (14 numbers)

For each (branch, plan, class) combo, the XLSX defines:

```
annual_fee      — Base list price (never charged directly)
early_bird      — Discounted total for early enrollment
otp             — One-time-payment amount (best price)
quarterly_total — Sum of 4 quarterly payments
q1, q2, q3, q4  — Individual quarterly amounts (unequal)
inst6_total     — Sum of 6 instalment payments
inst6_per       — Per-instalment amount (instalments 1–5)
inst6_last      — Final instalment amount (instalment 6)
inst8_total     — Sum of 8 instalment payments
inst8_per       — Per-instalment amount (instalments 1–7)
inst8_last      — Final instalment amount (instalment 8)
```

---

## 3. Pricing Rules (approximate, NOT fixed percentages)

| Rule | Expected | Actual Range | Notes |
|------|----------|-------------|-------|
| Early Bird off Annual | ~10% | 6.6% – 11.3% | Varies per entry |
| OTP off Early Bird | ~8.5% | 7.93% – 9.2% | Mostly 8.3–8.4% |
| Quarterly off Early Bird | ~5% | 4.7% – 12.8% | **Kadavanthra Intermediate = 12.8% ANOMALY** |
| 6-Inst off Early Bird | ~2.5% | 2.1% – 2.8% | inst6_total ≈ 97.5% of EB (rounded) |
| 8-Inst off Early Bird | 0% | 0% – 2.5% | 8I-Total = EB for 91 of 93 entries |

**CRITICAL**: Discount percentages are NOT consistent. Amounts MUST be stored exactly as given — cannot be computed from rules.

---

## 4. Anomalies (need confirmation from management)

### A. Kadavanthra Intermediate — Quarterly Total < OTP
All 4 classes: Q-Total is 12.8% below EB, while OTP is only ~8.3% below EB.
This means quarterly is CHEAPER than OTP (which should be the cheapest option).

| Class | OTP | Q-Total | Q cheaper by |
|-------|-----|---------|-------------|
| 9 Cbse | 40,600 | 38,800 | ₹1,800 |
| 10 Cbse | 40,600 | 38,800 | ₹1,800 |
| Plus One | 57,300 | 54,700 | ₹2,600 |
| Plus Two | 57,300 | 54,700 | ₹2,600 |

### B. Edappally Intermediate — 8-Inst ≠ Early Bird
Normally `inst8_total = early_bird`. Two entries break this:

| Class | Early Bird | 8I-Total | Difference |
|-------|-----------|----------|-----------|
| 9 Cbse | 53,000 | 51,700 | −₹1,300 |
| 10 Cbse | 53,000 | 51,700 | −₹1,300 |

### C. 6-Instalment Rounding
ALL 93 entries: `inst6_total` differs from exact `early_bird × 0.975` by ₹15–₹75, confirming amounts are rounded (not formula-computed).

---

## 5. Annual Fee Table (Basic plan)

```
Class        Tier1    Thop    Moola   Kadav    Venn    Edap
8 State      17,000     —       —       —     21,000     —
8 Cbse          —       —       —       —     27,750     —
9 State      19,750  19,750  19,750     —     27,750  34,500
9 Cbse          —       —    27,750  48,500   34,500  47,500
10 State     19,750  19,750  19,750     —     27,750  34,500
10 Cbse         —       —    27,750  48,500   34,500  47,500
Plus One     21,000  21,000     —    68,500   41,000  61,000
Plus Two     21,000  21,000     —    68,500   41,000  61,000
```

Price range: ₹17,000 (Tier1 8 State Basic) → ₹81,000 (Kadavanthra Plus Two Advanced Annual)

---

## 6. Current System vs Required — Gap Analysis

### What `admitStudent()` currently does:
1. Creates Guardian + Parent User
2. Creates Student
3. Creates Program Enrollment (stored: `custom_fee_structure`, `custom_plan`, `custom_no_of_instalments`)
4. Adds to Student Group
5. Creates **1 Sales Order** with `rate = FeeStructure.total_amount` (single number)

### What FeeStructure currently stores:
- `total_amount` (ONE number)
- `custom_plan`, `custom_no_of_instalments`
- `program`, `company`, `academic_year`
- `components[]` (fee category breakdown)

### GAPS:

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No Annual / Early Bird / OTP distinction** | `total_amount` is ambiguous — which price is it? |
| 2 | **No per-instalment amounts** | Q1≠Q2≠Q3≠Q4, 6I first≠last, 8I first≠last — can't derive from total |
| 3 | **No instalment schedule child table** | No way to track per-instalment amount + due date |
| 4 | **Programs lack CBSE/State split** | "9th Grade" exists but not "9th Grade CBSE" vs "9th Grade State" |
| 5 | **Tier 1 branches share pricing** | 4 branches with identical prices need one Fee Structure shared or duplicated |
| 6 | **Class 8 only at some branches** | 8 State (Tier1+Vennala), 8 Cbse (Vennala only) — enrollment must validate |
| 7 | **Missing Item codes** | Need items like "8 State Tuition Fee", "9 Cbse Tuition Fee" etc. |
| 8 | **Sales Order rate is single line** | Needs to match the SPECIFIC payment option amount (OTP/Q-Total/6I-Total/8I-Total) |
| 9 | **No multi-invoice generation** | Quarterly/6I/8I needs multiple invoices with different amounts per instalment |
| 10 | **Quarterly split is unequal** | Q1~35%, Q2~25%, Q3~25%, Q4~15% — must store all 4 amounts |

---

## 7. Recommended Data Model

### Option A: One Fee Structure per (branch, plan, class) with ALL 14 fields

Add custom fields to Fee Structure doctype:
```
custom_annual_fee           (Currency)
custom_early_bird           (Currency)
custom_otp                  (Currency)
custom_quarterly_total      (Currency)
custom_q1                   (Currency)
custom_q2                   (Currency)
custom_q3                   (Currency)
custom_q4                   (Currency)
custom_inst6_total          (Currency)
custom_inst6_per            (Currency)
custom_inst6_last           (Currency)
custom_inst8_total          (Currency)
custom_inst8_per            (Currency)
custom_inst8_last           (Currency)
custom_payment_option       (Select: OTP/Quarterly/6-Instalment/8-Instalment)
```

This means: **93 Fee Structure documents** (one per branch×plan×class).
The payment option selection happens at admission, and the matching amounts are read from the single Fee Structure.

### Option B: One Fee Structure per (branch, plan, class, payment option)
Would need **372 documents** — more overhead, no benefit.

**Recommendation: Option A** — store all 14 fields, select payment option at admission.

### Programs needed (Frappe):
```
8th Grade State       (or "8 State")
8th Grade CBSE        (or "8 Cbse")
9th Grade State
9th Grade CBSE
10th Grade State
10th Grade CBSE
Plus One
Plus Two
```

### Items needed (Frappe):
One tuition fee item per program:
```
8 State Tuition Fee
8 Cbse Tuition Fee
9 State Tuition Fee
9 Cbse Tuition Fee
10 State Tuition Fee
10 Cbse Tuition Fee
Plus One Tuition Fee
Plus Two Tuition Fee
```
With branch-specific Item Prices (93 entries matching fee structures).

---

## 8. Admission Flow Changes

### Current: 4 inputs for fee
- Program, Branch, Plan, No. of Instalments → lookup Fee Structure → single `total_amount` → 1 SO

### Required: 5 inputs for fee
- Program (with State/CBSE), Branch, Plan, **Payment Option** (OTP/Quarterly/6-Inst/8-Inst)
- Lookup Fee Structure → read matching amount field(s)
- Create instalment schedule:
  - **OTP**: 1 SO × `otp` amount → 1 invoice
  - **Quarterly**: 1 SO × `quarterly_total` → 4 invoices (q1, q2, q3, q4 on due dates)
  - **6-Instalment**: 1 SO × `inst6_total` → 6 invoices (5 × per + 1 × last)
  - **8-Instalment**: 1 SO × `inst8_total` → 8 invoices (7 × per + 1 × last)

---

## 9. Implementation Steps (ordered)

### Phase 1: Frappe Backend (Admin)
1. Create missing Programs (8 State, 8 CBSE, 9 CBSE, 10 CBSE if not exist)
2. Add 14 custom currency fields to Fee Structure doctype
3. Create missing Items (8 tuition fee items)
4. Run seeding script: create 93 Fee Structure documents from `fee_structure_parsed.json`
5. Create branch-specific Item Prices (93 entries)

### Phase 2: Frontend Types & API
6. Update `FeeStructure` TypeScript interface (14 new fields)
7. Update `getFeeStructures()` to fetch new fields
8. Add `payment_option` to admission form and types

### Phase 3: Admission Flow
9. Update `admitStudent()`:
   - Look up Fee Structure by (branch, plan, class)
   - Read amount based on payment option selection
   - Create SO with correct total
   - Store payment option on SO/PE

### Phase 4: Invoice Generation
10. Build instalment schedule generator:
    - OTP → 1 invoice
    - Quarterly → 4 invoices with q1/q2/q3/q4 amounts + due dates
    - 6-Inst → 6 invoices (5 × per, 1 × last) + due dates
    - 8-Inst → 8 invoices (7 × per, 1 × last) + due dates

### Phase 5: Parent Portal
11. Show selected payment option + instalment breakdown
12. Show upcoming instalment amounts and due dates
13. Razorpay payment per instalment (not full amount)

---

## 10. Data Files

- `docs/FINAL FEE STRUCTURE.xlsx` — Source of truth
- `docs/fee_structure_parsed.json` — All 93 entries, machine-readable
- `docs/parse_xlsx.py` — Parser script
- `docs/analyze_rules.py` — Pricing rule analysis script
