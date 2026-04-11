# Fee Structure Migration: 2025-26 → 2026-27

## Study Date: April 11, 2026
## Status: ANALYSIS COMPLETE — Awaiting implementation command

---

## 1. CURRENT SYSTEM OVERVIEW

### How Fee Config Works Today

```
Admission Form (sales-user/admit or branch-manager/students/new)
    ↓ User selects: Branch (Frappe Company) + Program + Plan
    ↓
GET /api/fee-config?company=Smart Up Vennala&program=9th CBSE&plan=Basic
    ↓
route.ts: buildFeeConfigKey("Smart Up Vennala", "9th CBSE", "Basic")
    ↓ BRANCH_MAP["Smart Up Vennala"] → "Vennala"
    ↓ PROGRAM_MAP["9th CBSE"] → "9 Cbse"
    ↓ Returns: "Vennala|Basic|9 Cbse"
    ↓
Lookup fee_structure_parsed.json["Vennala|Basic|9 Cbse"] → FeeConfigEntry
    ↓
Return to frontend: { data: FeeConfigEntry }
    ↓
Frontend calls: getAllPaymentOptions(feeConfig, "2025-2026")
    ↓ Generates 4 options: OTP(1), Quarterly(4), Bi-Monthly(6), Monthly(8)
    ↓ Each with InstalmentEntry[] using INSTALMENT_DUE_DATES
    ↓
User selects payment option → admitStudent() creates SO + SIs
```

### Files That Touch Fee Config

| File | Role | What It Does |
|------|------|-------------|
| `docs/fee_structure_parsed.json` | **DATA SOURCE** | 139 entries, flat `branch\|plan\|class` keys → FeeConfigEntry |
| `src/app/api/fee-config/route.ts` | **API** | Imports JSON, serves via GET with key lookup |
| `src/lib/utils/feeSchedule.ts` | **CORE UTILITY** | Branch/program mappings, schedule generation, discount logic |
| `src/lib/utils/constants.ts` | **CONFIG** | Due date templates, payment labels |
| `src/lib/types/fee.ts` | **TYPES** | FeeConfigEntry, InstalmentEntry, PaymentOptionSummary |
| `src/app/dashboard/sales-user/admit/page.tsx` | **CONSUMER** | Standard admission — fetches fee-config, calls getAllPaymentOptions |
| `src/app/dashboard/sales-user/admit-subject/page.tsx` | **CONSUMER** | Subject-wise admission — subject-based fee-config lookup |
| `src/app/dashboard/branch-manager/students/new/page.tsx` | **CONSUMER** | BM admission — same flow as sales-user/admit |
| `src/app/api/transfer/execute/route.ts` | **CONSUMER** | Branch transfer — imports JSON directly, proportional scaling |
| `src/app/dashboard/branch-manager/sales-orders/[id]/page.tsx` | **CONSUMER** | Uses INSTALMENT_DUE_DATES only (no fee-config lookup) |

---

## 2. WHAT NEEDS TO CHANGE

### 2A. Data File: `fee_structure_parsed.json`

**Current:** 139 entries, 6 branches, flat format  
**Target:** 155 entries, 7 branches, same flat format (converted from new hierarchical JSON)

The system consumes a flat `Record<string, FeeConfigEntry>` keyed as `"branch|plan|class"`. 
The new JSON (`fee_structure_2026_27.json`) is hierarchical. We must **convert** it back to the same flat format the system expects, OR change the system to read the new format.

**Recommended approach:** Convert new JSON to flat format — minimal code changes.

### 2B. Branch Name Changes

| Old JSON Branch | New JSON Branch | Frappe Company | BRANCH_MAP Change |
|----------------|----------------|----------------|-------------------|
| `Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)` | `Tier 1` | Smart Up Chullickal, Smart Up Fortkochi, Smart Up Palluruthy | Map → `"Tier 1"` |
| *(part of Tier 1)* | `Eraveli` (NEW) | Smart Up Eraveli | Map → `"Eraveli"` |
| `Kadavanthra` | `Kadavanthara` | Smart Up Kadavanthara | Map → `"Kadavanthara"` |
| `Edappally` | `Edapally` | Smart Up Edappally | Map → `"Edapally"` |
| `Thoppumpady` | `Thoppumpady` | Smart Up Thopumpadi | No change |
| `Moolamkuzhi` | `Moolamkuzhi` | Smart Up Moolamkuzhi | No change |
| `Vennala` | `Vennala` | Smart Up Vennala | No change |

**CRITICAL CHANGE — Eraveli Split:**
- OLD: `"Smart Up Eraveli"` mapped to `"Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"` (shared fees)
- NEW: `"Smart Up Eraveli"` must map to `"Eraveli"` (own fee structure, different prices)
- `"Smart Up Chullickal"`, `"Smart Up Fortkochi"`, `"Smart Up Palluruthy"` → `"Tier 1"`

### 2C. Class Name Typos in New Excel (Must Fix)

| New Excel Name | Correct Name | Affected Branches |
|---------------|-------------|-------------------|
| `Chemitry` | `Chemistry` | Vennala, Kadavanthara, Edapally (subject-wise) |
| `Phy - Chem` | `Phy-Chem` | Vennala, Kadavanthara, Edapally (subject-wise) |
| `Chem- maths` | `Chem-Maths` | Vennala, Kadavanthara, Edapally (Subject-wise Basic only) |

Note: `Chem-Maths` appears correctly in Subject-wise Advanced but as `Chem- maths` in Subject-wise Basic. Must normalize.

### 2D. Removed Class

| Class | Old | New | Impact |
|-------|-----|-----|--------|
| `10 Cbse Maths` | Present in Kadavanthra, Vennala, Edappally (Basic+Advanced) | **REMOVED** | Must remove from SUBJECT_BY_BRANCH, LEVEL_SUBJECTS |

### 2E. Subject-wise Category Reclassification

**OLD approach:** Subject entries stored under regular `Basic`/`Advanced` plans  
```
"Vennala|Basic|Physics" → FeeConfigEntry with plan="Basic"
"Vennala|Advanced|Physics" → FeeConfigEntry with plan="Advanced"
```

**NEW approach:** Dedicated `Subject-wise Basic` / `Subject-wise Advanced` categories  
```json
{ "fee_category": "Subject-wise Basic", "is_subject_wise": true, "classes": [...] }
```

**For the flat JSON conversion**, subject-wise entries should keep using `"Basic"` and `"Advanced"` as the plan key (since that's what the code passes as `plan` parameter). The fee_category name is just metadata — the code doesn't use it for lookups.

### 2F. New Field: `6_installment.early_bird`

The new JSON has an `early_bird` field inside the `6_installment` object.  
Analysis shows: **`6_installment.early_bird` === top-level `early_bird` in ALL 155 entries**.  
This is informational only — NOT needed by the `FeeConfigEntry` type.

### 2G. Field Name Mapping (New → Old Flat Format)

| New JSON Path | Old FeeConfigEntry Field |
|--------------|-------------------------|
| `annual_fees` | `annual_fee` |
| `payment_plans.early_bird` | `early_bird` |
| `payment_plans.one_time_payment` | `otp` |
| `payment_plans.quarterly.total_after_5pct_discount` | `quarterly_total` |
| `payment_plans.quarterly.quarter_1` | `q1` |
| `payment_plans.quarterly.quarter_2` | `q2` |
| `payment_plans.quarterly.quarter_3` | `q3` |
| `payment_plans.quarterly.quarter_4` | `q4` |
| `payment_plans.6_installment.total_after_2_5pct_discount` | `inst6_total` |
| `payment_plans.6_installment.installment_1_to_5` | `inst6_per` |
| `payment_plans.6_installment.installment_6_final` | `inst6_last` |
| `payment_plans.8_installment.total` | `inst8_total` |
| `payment_plans.8_installment.installment_1_to_7` | `inst8_per` |
| `payment_plans.8_installment.installment_8_final` | `inst8_last` |

---

## 3. INSTALLMENT COMPARISON: OLD vs NEW

### Discount Tiers (UNCHANGED between years)

| Payment Option | Discount | Calculation |
|---------------|----------|-------------|
| **Annual Fee** | 0% | Base price |
| **Early Bird** | ~10% off annual | Reference ceiling |
| **8-Installment** | = Early Bird | `8-inst total == early_bird` (confirmed both years) |
| **6-Installment** | ~2.5% off early bird | `6_inst total ≈ early_bird * 0.975` |
| **Quarterly** | ~5% more off | `quarterly_total < 6_inst_total` |
| **OTP** | ~17-18% off annual | Deepest discount |

### Schedule Templates (UNCHANGED)

| Option | Count | Due Dates |
|--------|-------|-----------|
| OTP | 1 | Enrollment date (or Q1 default) |
| Quarterly | 4 | Apr 15, Jul 15, Oct 15, Jan 15 |
| 6-Installment | 6 | Apr 15, Jun 15, Aug 15, Oct 15, Dec 15, Feb 15 |
| 8-Installment | 8 | Apr 15, May 15, Jun 15, Jul 15, Aug 15, Sep 15, Oct 15, Nov 15 |

### Installment Split Pattern (UNCHANGED)

- **Quarterly:** Unequal — Q1 > Q2 = Q3 > Q4 (front-loaded)
- **6-Installment:** inst_1_to_5 equal, inst_6 different (rounding adjustment)
- **8-Installment:** inst_1_to_7 equal, inst_8 different (rounding adjustment)
- **OTP:** Single payment

### Math Verification

Both old and new: installment sums match totals exactly.
- Quarterly: q1 + q2 + q3 + q4 == quarterly_total ✓
- 6-Inst: (inst_per × 5) + inst_last == inst6_total ✓  
- 8-Inst: (inst_per × 7) + inst_last == inst8_total ✓

### Price Direction: ALL DECREASING

Every matched entry shows a fee decrease in 2026-27:
- 0 price increases across any of the 49 matched entries
- Average annual fee decrease: ₹8,746 (-16.7%)
- Largest: Kadavanthara/Intermediate/10 Cbse: ₹59,000 → ₹41,100 (-30.3%)
- Smallest: Tier 1/Intermediate/10 State: ₹25,750 → ₹25,500 (-1.0%)

---

## 4. COMPLETE CHANGE LIST FOR IMPLEMENTATION

### Step 1: Convert New JSON to Flat Format

Create a conversion script to transform `fee_structure_2026_27.json` into the existing flat `branch|plan|class` key format that `fee_structure_parsed.json` uses, fixing typos during conversion:

- `Chemitry` → `Chemistry`
- `Phy - Chem` → `Phy-Chem`  
- `Chem- maths` → `Chem-Maths`

Subject-wise entries: map `"Subject-wise Basic"` → plan `"Basic"`, `"Subject-wise Advanced"` → plan `"Advanced"` (maintaining existing lookup behavior).

Replace `docs/fee_structure_parsed.json` with the new flat data.

### Step 2: Update BRANCH_MAP in `feeSchedule.ts`

```
BEFORE:
  "Smart Up Chullickal" → "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"
  "Smart Up Fortkochi"  → "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"
  "Smart Up Eraveli"    → "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"
  "Smart Up Palluruthy" → "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)"
  "Smart Up Kadavanthara" → "Kadavanthra"
  "Smart Up Edappally"    → "Edappally"

AFTER:
  "Smart Up Chullickal" → "Tier 1"
  "Smart Up Fortkochi"  → "Tier 1"
  "Smart Up Eraveli"    → "Eraveli"            ← SPLIT OUT
  "Smart Up Palluruthy" → "Tier 1"
  "Smart Up Kadavanthara" → "Kadavanthara"      ← SPELLING FIX
  "Smart Up Edappally"    → "Edapally"          ← SPELLING FIX
```

### Step 3: Update SUBJECT_BY_BRANCH in `feeSchedule.ts`

```
BEFORE:
  "Kadavanthra": ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"]
  "Vennala":     ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"]
  "Edappally":   ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"]
  "Thoppumpady": ["Phy-Chem"]
  "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)": ["Phy-Chem"]

AFTER:
  "Kadavanthara": ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"]
  "Vennala":      ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"]
  "Edapally":     ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths"]
  "Thoppumpady":  ["Phy-Chem"]
  "Tier 1":       ["Phy-Chem"]
  "Eraveli":      ["Phy-Chem"]                  ← NEW ENTRY
```

Changes:
- Remove `"10 Cbse Maths"` from all branches (class removed in 2026-27)
- Update branch name spellings
- Add Eraveli with `["Phy-Chem"]`

### Step 4: Update LEVEL_SUBJECTS in `feeSchedule.ts`

```
BEFORE:
  "10 CBSE": ["10 Cbse Maths"]

AFTER:
  Remove "10 CBSE" level entirely (no subject-wise entries for 10 CBSE)
```

### Step 5: Update HSS_PROGRAMS & LEVEL_PROGRAMS in `feeSchedule.ts`

Remove `"10 CBSE"` from LEVEL_PROGRAMS and `"10th CBSE"` from HSS_PROGRAMS (no longer has subject-wise admission).

### Step 6: No Changes Needed

These files need **NO changes**:
- `src/lib/types/fee.ts` — FeeConfigEntry interface stays the same
- `src/lib/utils/constants.ts` — Due dates and labels unchanged
- `src/app/api/fee-config/route.ts` — Same import path and lookup logic
- `src/app/dashboard/sales-user/admit/page.tsx` — Same API consumption
- `src/app/dashboard/branch-manager/students/new/page.tsx` — Same flow
- `src/lib/api/fees.ts` — No fee-config dependency

### Step 7: Verify Transfer Route

`src/app/api/transfer/execute/route.ts` also imports `fee_structure_parsed.json` directly. After Step 1 replaces the file, transfers will automatically use new pricing. The `buildFeeConfigKey` call will use updated mappings from Step 2.

---

## 5. RISK ASSESSMENT

### Low Risk
- FeeConfigEntry type is unchanged → no TypeScript breaks
- Installment schedule generation logic is unchanged → same due dates, same split pattern
- Payment pages (parent, branch-manager) don't reference fee config directly

### Medium Risk  
- **Eraveli split**: Students at "Smart Up Eraveli" will now get different pricing than Chullickal/Fortkochi/Palluruthy. Existing 2025-26 students with old SOs won't be affected (their invoices are already created). New 2026-27 admissions will use Eraveli pricing.
- **Branch transfers**: A student transferring FROM/TO Eraveli will now be looked up against the new Eraveli fee config instead of Tier 1.

### Potential Issue
- **Phy-Chem in Thoppumpady**: OLD has `Phy-Chem` under both Basic and Advanced. NEW has `Phy-Chem` under Basic and Advanced only — but Intermediate is MISSING. If a Thoppumpady Intermediate Phy-Chem lookup happens, it will return 404. (The old file also had no Intermediate Phy-Chem for Thoppumpady, so this is consistent.)
- **Eraveli Phy-Chem**: New data has Eraveli with Phy-Chem entries under Basic/Intermediate/Advanced. The `SUBJECT_BY_BRANCH` map needs Eraveli added.

---

## 6. IMPLEMENTATION ORDER (when commanded)

1. **Create conversion script** — `docs/convert_to_flat.py`
2. **Run conversion** — Generate new `fee_structure_parsed.json` 
3. **Verify conversion** — Cell-by-cell check against new hierarchical JSON
4. **Update `feeSchedule.ts`** — BRANCH_MAP, SUBJECT_BY_BRANCH, LEVEL_SUBJECTS, LEVEL_PROGRAMS, HSS_PROGRAMS
5. **Type check** — `npx tsc --noEmit`
6. **Build test** — `npx next build`
7. **Manual smoke test** — Fee config API returns correct data for each branch+program+plan combo

---

## 7. ENTRY COUNT SUMMARY

| Branch | Old Entries | New Entries | Change |
|--------|-----------|-----------|--------|
| Tier 1 (combined) | 17 | — | Removed |
| Tier 1 (new) | — | 18 | New |
| Eraveli | — | 18 | New (split from Tier 1) |
| Thoppumpady | 14 | 14 | Same count |
| Moolamkuzhi | 15 | 15 | Same count |
| Vennala | 38 | 38 | Same count |
| Kadavanthra/Kadavanthara | 38 | 26 | -12 (10 Cbse Maths removed) |
| Edappally/Edapally | 38 | 32 | -6 (10 Cbse Maths removed) |
| **TOTAL** | **~158** | **155** | |

Note: Old total counted as 139 unique keys but some analysis scripts counted 158 rows including subject-wise entries. The canonical count is 139 keys in the JSON file.
