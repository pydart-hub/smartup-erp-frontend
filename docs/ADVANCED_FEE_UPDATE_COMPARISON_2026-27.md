# Advanced Fee Structure — Existing vs New Comparison
**Date:** 2026-05-13  
**Source:** `docs/kadavanthra&EDAPPALLY fee structure newww.xlsx`  
**Admission Fee:** ₹1,000 is always a separate component in every plan (included in `total_amount`).  
**Per-instalment formula:** Old = uniform (`(total − 1000) / n`). New = workbook-specified (quarterly is front-loaded; 6/8-inst uses 5×+final / 7×+final split).

---

## KEY OBSERVATION

All existing Advanced fee structures are **significantly higher** than the new workbook prices.  
The old system used uniform instalment splits; the new structure uses **front-loaded quarterly** and **unequal final-instalment** splits.

---

## BRANCH: KADAVANTHRA

### 9th CBSE → workbook row: "9 Cbse"

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 50,400 | 1×49,400 | **29,500** | 1×28,500 | −20,900 |
| Quarterly (−4) | 52,300 | 4×12,825 (uniform) | **30,500** | Q1=10,300 / Q2=7,400 / Q3=7,400 / Q4=4,400 | −21,800 |
| 6-Inst (−6) | 53,600 | 6×8,767 (uniform) | **31,200** | 5×5,100 + 6th=4,700 | −22,400 |
| 8-Inst (−8) | 55,000 | 8×6,750 (uniform) | **32,000** | 7×4,000 + 8th=3,000 | −23,000 |

---

### 10th CBSE → workbook row: "10 Cbse"

> ⚠️ **MISSING docs in live system:** `-1` (OTP) and `-4` (Quarterly) plans do not exist. Need to be **CREATED**.

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | **NOT IN LIVE** | — | **29,500** | 1×28,500 | NEW DOC NEEDED |
| Quarterly (−4) | **NOT IN LIVE** | — | **30,500** | Q1=10,300 / Q2=7,400 / Q3=7,400 / Q4=4,400 | NEW DOC NEEDED |
| 6-Inst (−6) | 41,900 | 6×6,817 (uniform) | **31,200** | 5×5,100 + 6th=4,700 | −10,700 |
| 8-Inst (−8) | 43,000 | 8×5,250 (uniform) | **32,000** | 7×4,000 + 8th=3,000 | −11,000 |

---

### 10th State → workbook row: "10 State"

> ⚠️ **ENTIRELY MISSING from live system.** All plans need to be **CREATED**.  
> ⚠️ Workbook provides quarterly/OTP data but **6-inst and 8-inst** data for KDV 10th State is **absent** from the workbook. Confirm before creating.

| Plan | Old Total | New Total | New Instalment Breakdown | Status |
|---|---:|---:|---|---|
| OTP (−1) | NOT IN LIVE | **24,000** | 1×23,000 | NEW DOC NEEDED |
| Quarterly (−4) | NOT IN LIVE | **24,800** | Q1=8,300 / Q2=6,000 / Q3=6,000 / Q4=3,500 | NEW DOC NEEDED |
| 6-Inst (−6) | NOT IN LIVE | ❓ | No workbook data for KDV 10 State 6-inst | CONFIRM WITH MANAGEMENT |
| 8-Inst (−8) | NOT IN LIVE | ❓ | No workbook data for KDV 10 State 8-inst | CONFIRM WITH MANAGEMENT |

---

### 11th Science CBSE → workbook row: "Plus One"

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 55,900 | 1×54,900 | **34,000** | 1×33,000 | −21,900 |
| Quarterly (−4) | 57,900 | 4×14,225 (uniform) | **36,200** | Q1=12,300 / Q2=8,800 / Q3=8,800 / Q4=5,300 | −21,700 |
| 6-Inst (−6) | 59,500 | 6×9,750 (uniform) | **37,100** | 5×6,100 + 6th=5,600 | −22,400 |
| 8-Inst (−8) | 61,000 | 8×7,500 (uniform) | **38,000** | 7×4,700 + 8th=4,100 | −23,000 |

---

### 11th Science State → workbook row: "Plus One"

*Same workbook row as 11th Science CBSE — identical changes.*

| Plan | Old Total | New Total | Change |
|---|---:|---:|---:|
| OTP (−1) | 55,900 | **34,000** | −21,900 |
| Quarterly (−4) | 57,900 | **36,200** | −21,700 |
| 6-Inst (−6) | 59,500 | **37,100** | −22,400 |
| 8-Inst (−8) | 61,000 | **38,000** | −23,000 |

---

### 12th Science CBSE → workbook row: "Plus Two"

*Plus Two workbook values are identical to Plus One — same price tier.*

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 55,900 | 1×54,900 | **34,000** | 1×33,000 | −21,900 |
| Quarterly (−4) | 57,900 | 4×14,225 (uniform) | **36,200** | Q1=12,300 / Q2=8,800 / Q3=8,800 / Q4=5,300 | −21,700 |
| 6-Inst (−6) | 59,500 | 6×9,750 (uniform) | **37,100** | 5×6,100 + 6th=5,600 | −22,400 |
| 8-Inst (−8) | 61,000 | 8×7,500 (uniform) | **38,000** | 7×4,700 + 8th=4,100 | −23,000 |

---

### 12th Science State → workbook row: "Plus Two"

*Identical to 12th Science CBSE changes.*

| Plan | Old Total | New Total | Change |
|---|---:|---:|---:|
| OTP (−1) | 55,900 | **34,000** | −21,900 |
| Quarterly (−4) | 57,900 | **36,200** | −21,700 |
| 6-Inst (−6) | 59,500 | **37,100** | −22,400 |
| 8-Inst (−8) | 61,000 | **38,000** | −23,000 |

---

## BRANCH: EDAPPALLY

### 9th State → workbook row: "9 State"

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 28,400 | 1×27,400 | **24,000** | 1×23,000 | −4,400 |
| Quarterly (−4) | 29,500 | 4×7,125 (uniform) | **24,800** | Q1=8,300 / Q2=6,000 / Q3=6,000 / Q4=3,500 | −4,700 |
| 6-Inst (−6) | 30,200 | 6×4,867 (uniform) | **25,400** | 5×4,100 + 6th=3,900 | −4,800 |
| 8-Inst (−8) | 31,000 | 8×3,750 (uniform) | **26,000** | 7×3,200 + 8th=2,600 | −5,000 |

---

### 9th CBSE → workbook row: "9 Cbse"

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 39,400 | 1×38,400 | **29,500** | 1×28,500 | −9,900 |
| Quarterly (−4) | 40,900 | 4×9,975 (uniform) | **30,500** | Q1=10,300 / Q2=7,400 / Q3=7,400 / Q4=4,400 | −10,400 |
| 6-Inst (−6) | 41,900 | 6×6,817 (uniform) | **31,200** | 5×5,100 + 6th=4,700 | −10,700 |
| 8-Inst (−8) | 43,000 | 8×5,250 (uniform) | **32,000** | 7×4,000 + 8th=3,000 | −11,000 |

---

### 10th State → workbook row: "10 State"

*Same workbook values as 9th State.*

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 28,400 | 1×27,400 | **24,000** | 1×23,000 | −4,400 |
| Quarterly (−4) | 29,500 | 4×7,125 (uniform) | **24,800** | Q1=8,300 / Q2=6,000 / Q3=6,000 / Q4=3,500 | −4,700 |
| 6-Inst (−6) | 30,200 | 6×4,867 (uniform) | **25,400** | 5×4,100 + 6th=3,900 | −4,800 |
| 8-Inst (−8) | 31,000 | 8×3,750 (uniform) | **26,000** | 7×3,200 + 8th=2,600 | −5,000 |

---

### 10th CBSE → workbook row: "10 Cbse"

*Same workbook values as 9th CBSE.*

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 39,400 | 1×38,400 | **29,500** | 1×28,500 | −9,900 |
| Quarterly (−4) | 40,900 | 4×9,975 (uniform) | **30,500** | Q1=10,300 / Q2=7,400 / Q3=7,400 / Q4=4,400 | −10,400 |
| 6-Inst (−6) | 41,900 | 6×6,817 (uniform) | **31,200** | 5×5,100 + 6th=4,700 | −10,700 |
| 8-Inst (−8) | 43,000 | 8×5,250 (uniform) | **32,000** | 7×4,000 + 8th=3,000 | −11,000 |

---

### 11th Science CBSE / 11th Science State / 11th State → workbook row: "Plus One"

> ℹ️ All three program variants map to the same "Plus One" workbook row and currently have identical old totals.

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 50,400 | 1×49,400 | **34,000** | 1×33,000 | −16,400 |
| Quarterly (−4) | 52,300 | 4×12,825 (uniform) | **36,200** | Q1=12,300 / Q2=8,800 / Q3=8,800 / Q4=5,300 | −16,100 |
| 6-Inst (−6) | 53,600 | 6×8,767 (uniform) | **37,100** | 5×6,100 + 6th=5,600 | −16,500 |
| 8-Inst (−8) | 55,000 | 8×6,750 (uniform) | **38,000** | 7×4,700 + 8th=4,100 | −17,000 |

---

### 12th Science CBSE / 12th Science State → workbook row: "Plus Two"

*Plus Two workbook = same values as Plus One.*

| Plan | Old Total | Old Per-Inst | New Total | New Instalment Breakdown | Change |
|---|---:|---|---:|---|---:|
| OTP (−1) | 50,400 | 1×49,400 | **34,000** | 1×33,000 | −16,400 |
| Quarterly (−4) | 52,300 | 4×12,825 (uniform) | **36,200** | Q1=12,300 / Q2=8,800 / Q3=8,800 / Q4=5,300 | −16,100 |
| 6-Inst (−6) | 53,600 | 6×8,767 (uniform) | **37,100** | 5×6,100 + 6th=5,600 | −16,500 |
| 8-Inst (−8) | 55,000 | 8×6,750 (uniform) | **38,000** | 7×4,700 + 8th=4,100 | −17,000 |

---

## GAP ANALYSIS — Missing Docs (Need to CREATE)

### Kadavanthra

| Doc to Create | New Total | Instalment Breakdown |
|---|---:|---|
| SU KDV-10th CBSE-Advanced-1 | 29,500 | 1×28,500 (OTP) |
| SU KDV-10th CBSE-Advanced-4 | 30,500 | Q1=10,300 / Q2=7,400 / Q3=7,400 / Q4=4,400 |
| SU KDV-10th State-Advanced-1 | 24,000 | 1×23,000 (OTP) |
| SU KDV-10th State-Advanced-4 | 24,800 | Q1=8,300 / Q2=6,000 / Q3=6,000 / Q4=3,500 |
| SU KDV-10th State-Advanced-6 | ❓ | No 6-inst data in workbook for KDV 10 State — **needs confirmation** |
| SU KDV-10th State-Advanced-8 | ❓ | No 8-inst data in workbook for KDV 10 State — **needs confirmation** |

### Edappally

No missing docs — all 36 Advanced plans exist in the live system.

---

## UPDATE ACTION SUMMARY

### Existing docs to UPDATE (total_amount changes)

**Kadavanthra (20 existing docs, all need reduction):**
- 9 CBSE: 4 docs
- 10 CBSE: 2 docs (only -6 and -8 exist)
- 11th Science CBSE/State, 12th Science CBSE/State: 16 docs

**Edappally (36 existing docs, all need reduction):**
- 9 State, 9 CBSE, 10 State, 10 CBSE: 4 classes × 4 plans = 16 docs
- 11th Science CBSE, 11th Science State, 11th State: 3 variants × 4 plans = 12 docs
- 12th Science CBSE, 12th Science State: 2 variants × 4 plans = 8 docs

### Instalment behavior change
- **Quarterly (-4):** Old system used **uniform** quarterly amounts. New structure uses **front-loaded unequal** quarterly amounts (Q1 highest, Q4 lowest).
- **6-inst (-6):** Old = uniform. New = five equal payments + smaller final.
- **8-inst (-8):** Old = uniform. New = seven equal payments + smaller final.

> ⚠️ **IMPORTANT:** Frappe submitted Fee Structure docs cannot have `total_amount` changed directly via the REST API (`UpdateAfterSubmitError`). The update strategy must be: **cancel + amend** existing docs, OR **create new versions** and re-link Program Enrollments. Confirm preferred approach before proceeding.
