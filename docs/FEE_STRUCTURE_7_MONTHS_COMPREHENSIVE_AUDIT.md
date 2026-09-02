# SmartUp ERP: 7-Month Fee Structure Comprehensive Audit & Structure Report

**Source Excel File**: `C:\Users\arjun\Downloads\SmartUp Documents\Fee Structures\FEES STRUCTURE 7 MONTHS.xlsx` (Fully Validated Version)  
**Existing Reference JSON**: `docs/fee_structure_parsed.json`  
**Target Scope**: New / Mid-Year Student Admissions (7 Months Duration)  
**Validation Status**: ✅ **100% Verified (All 41 entries validated — 0 formula/sum errors, 0 OTP anomalies)**  

---

## 1. Executive Summary & Core Pricing Logic

1. **Target Structure Scope**:
   - Designed for new/mid-year enrollments covering the **7 remaining academic months** (September to March).
2. **Pricing Formula Across All Classes**:
   $$\text{7-Month Annual Fee} = (\text{Monthly Tuition Fee} \times 7) + ₹1,000\text{ (Registration Fee)}$$
3. **Instalment Model**:
   - **One Time Payment (OTP)**: Upfront payment with ~10% to 11% discount.
   - **5 Monthly Instalments**: Structured payments (`1st`, `2nd`, `3rd`, `4th`, `5th`) where $\sum \text{Instalments} = \text{7-Month Annual Fee}$.
4. **Plan Coverage**:
   - The workbook defines pricing specifically for the **`Basic` Plan**.

---

## 2. Validation & Quality Check Results

| Check Item | Status | Finding & Confirmation |
| :--- | :---: | :--- |
| **Sum of 5 Instalments == Annual Fee** | ✅ **PASSED** | 100% match across all 41 entries (zero math discrepancy). |
| **OTP < Annual Fee** | ✅ **PASSED** | All OTP amounts are strictly lower than Annual Fees. |
| **Moolamkuzhi OTPs** | ✅ **CORRECTED** | 9th State (₹9,700), 10th State (₹9,700), 9th CBSE (₹13,500), 10th CBSE (₹13,500). |
| **Thoppumpady 9th State OTP** | ✅ **CORRECTED** | Updated to **₹9,700** (matches Tier 1 & Eraveli). |
| **Plus One & Plus Two OTPs** | ✅ **STANDARDIZED** | Tier 1, Eraveli, Thoppumpady set to **₹11,000**; Vennala, Kadavanthara, Edappally set to **₹19,800**. |

---

## 3. Branch-by-Branch Detailed Comparison (Target 7-Months vs Existing Full-Year)

### 🏢 Branch: Smart Up Eraveli (SU ERV)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8 State** | ₹9,400 | ₹8,500 | 2000 + 2000 + 1800 + 1800 + 1800 (= ₹9,400) | ₹11,900 | ₹9,500 | ₹10,700 |
| **9 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹13,850 | ₹11,050 | ₹12,500 |
| **10 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹13,850 | ₹11,050 | ₹12,500 |
| **Plus One** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹19,000 | ₹15,000 | ₹16,000 |
| **Plus Two** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹14,900 | ₹11,850 | ₹13,400 |
| **Phy-Chem** | ₹8,400 | ₹7,500 | 1800 + 1800 + 1800 + 1500 + 1500 (= ₹8,400) | ₹12,250 | ₹9,650 | ₹10,900 |


### 🏢 Branch: Smart Up Chullickal / Fortkochi / Palluruthy (SU CHL / SU FKO / SU PLR)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8 State** | ₹9,400 | ₹8,500 | 2000 + 2000 + 1800 + 1800 + 1800 (= ₹9,400) | ₹13,000 | ₹10,450 | ₹11,800 |
| **9 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **10 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **Plus One** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹19,000 | ₹15,000 | ₹16,000 |
| **Plus Two** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹16,000 | ₹12,850 | ₹14,500 |
| **Phy-Chem** | ₹8,400 | ₹7,500 | 1800 + 1800 + 1800 + 1500 + 1500 (= ₹8,400) | ₹13,100 | ₹10,450 | ₹11,800 |


### 🏢 Branch: Smart Up Thopumpadi (SU THP)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **9 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **10 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **Plus One** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹19,000 | ₹15,000 | ₹16,000 |
| **Plus Two** | ₹12,200 | ₹11,000 | 2500 + 2500 + 2400 + 2400 + 2400 (= ₹12,200) | ₹16,000 | ₹12,850 | ₹14,500 |
| **Phy-Chem** | ₹8,400 | ₹7,500 | 1800 + 1800 + 1800 + 1500 + 1500 (= ₹8,400) | ₹13,100 | ₹10,450 | ₹11,800 |


### 🏢 Branch: Smart Up Moolamkuzhi (SU MMK)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8 State** | ₹9,400 | ₹8,500 | 2000 + 2000 + 1800 + 1800 + 1800 (= ₹9,400) | ₹13,000 | ₹10,450 | ₹11,800 |
| **9 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **9 Cbse** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | ₹21,050 | ₹16,750 | ₹19,000 |
| **10 State** | ₹10,800 | ₹9,700 | 2200 + 2200 + 2200 + 2200 + 2000 (= ₹10,800) | ₹15,050 | ₹12,050 | ₹13,600 |
| **10 Cbse** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | ₹21,050 | ₹16,750 | ₹19,000 |


### 🏢 Branch: Smart Up Vennala (SU VYT)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8 State** | ₹11,500 | ₹10,300 | 2500 + 2500 + 2500 + 2000 + 2000 (= ₹11,500) | ₹16,000 | ₹12,850 | ₹14,500 |
| **8 Cbse** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | ₹21,050 | ₹16,750 | ₹19,000 |
| **9 State** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | ₹21,050 | ₹16,750 | ₹19,000 |
| **9 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | ₹26,150 | ₹20,700 | ₹23,500 |
| **10 State** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | ₹21,050 | ₹16,750 | ₹19,000 |
| **10 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | ₹26,150 | ₹20,700 | ₹23,500 |
| **Plus One** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | ₹31,000 | ₹25,000 | ₹26,000 |
| **Plus Two** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | ₹31,000 | ₹24,650 | ₹28,000 |


### 🏢 Branch: Smart Up Kadavanthara (SU KDV)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **9 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | N/A | N/A | N/A |
| **10 State** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | N/A | N/A | N/A |
| **10 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | N/A | N/A | N/A |
| **Plus One** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | N/A | N/A | N/A |
| **Plus Two** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | N/A | N/A | N/A |


### 🏢 Branch: Smart Up Edappally (SU EDPLY)

| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **9 State** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | N/A | N/A | N/A |
| **9 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | N/A | N/A | N/A |
| **10 State** | ₹15,000 | ₹13,500 | 3000 + 3000 + 3000 + 3000 + 3000 (= ₹15,000) | N/A | N/A | N/A |
| **10 Cbse** | ₹18,500 | ₹16,600 | 3700 + 3700 + 3700 + 3700 + 3700 (= ₹18,500) | N/A | N/A | N/A |
| **Plus One** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | N/A | N/A | N/A |
| **Plus Two** | ₹22,000 | ₹19,800 | 4400 + 4400 + 4400 + 4400 + 4400 (= ₹22,000) | N/A | N/A | N/A |


---

## 4. Master 7-Month Matrix (All 41 Entries)

| Branch Group | Class / Program | 7-Month Annual | Target OTP | Inst 1 | Inst 2 | Inst 3 | Inst 4 | Inst 5 | 5-Inst Total | Existing Full-Year |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Eraveli** | 8 State | ₹9,400 | ₹8,500 | ₹2,000 | ₹2,000 | ₹1,800 | ₹1,800 | ₹1,800 | ₹9,400 | ₹11,900 |
| **Eraveli** | 9 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹13,850 |
| **Eraveli** | 10 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹13,850 |
| **Eraveli** | Plus One | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹19,000 |
| **Eraveli** | Plus Two | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹14,900 |
| **Eraveli** | Phy-Chem | ₹8,400 | ₹7,500 | ₹1,800 | ₹1,800 | ₹1,800 | ₹1,500 | ₹1,500 | ₹8,400 | ₹12,250 |
| **Tier 1** | 8 State | ₹9,400 | ₹8,500 | ₹2,000 | ₹2,000 | ₹1,800 | ₹1,800 | ₹1,800 | ₹9,400 | ₹13,000 |
| **Tier 1** | 9 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Tier 1** | 10 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Tier 1** | Plus One | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹19,000 |
| **Tier 1** | Plus Two | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹16,000 |
| **Tier 1** | Phy-Chem | ₹8,400 | ₹7,500 | ₹1,800 | ₹1,800 | ₹1,800 | ₹1,500 | ₹1,500 | ₹8,400 | ₹13,100 |
| **Thoppumpady** | 9 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Thoppumpady** | 10 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Thoppumpady** | Plus One | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹19,000 |
| **Thoppumpady** | Plus Two | ₹12,200 | ₹11,000 | ₹2,500 | ₹2,500 | ₹2,400 | ₹2,400 | ₹2,400 | ₹12,200 | ₹16,000 |
| **Thoppumpady** | Phy-Chem | ₹8,400 | ₹7,500 | ₹1,800 | ₹1,800 | ₹1,800 | ₹1,500 | ₹1,500 | ₹8,400 | ₹13,100 |
| **Moolamkuzhi** | 8 State | ₹9,400 | ₹8,500 | ₹2,000 | ₹2,000 | ₹1,800 | ₹1,800 | ₹1,800 | ₹9,400 | ₹13,000 |
| **Moolamkuzhi** | 9 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Moolamkuzhi** | 9 Cbse | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | ₹21,050 |
| **Moolamkuzhi** | 10 State | ₹10,800 | ₹9,700 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,200 | ₹2,000 | ₹10,800 | ₹15,050 |
| **Moolamkuzhi** | 10 Cbse | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | ₹21,050 |
| **Vennala** | 8 State | ₹11,500 | ₹10,300 | ₹2,500 | ₹2,500 | ₹2,500 | ₹2,000 | ₹2,000 | ₹11,500 | ₹16,000 |
| **Vennala** | 8 Cbse | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | ₹21,050 |
| **Vennala** | 9 State | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | ₹21,050 |
| **Vennala** | 9 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | ₹26,150 |
| **Vennala** | 10 State | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | ₹21,050 |
| **Vennala** | 10 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | ₹26,150 |
| **Vennala** | Plus One | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | ₹31,000 |
| **Vennala** | Plus Two | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | ₹31,000 |
| **Kadavanthara** | 9 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | N/A |
| **Kadavanthara** | 10 State | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | N/A |
| **Kadavanthara** | 10 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | N/A |
| **Kadavanthara** | Plus One | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | N/A |
| **Kadavanthara** | Plus Two | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | N/A |
| **Edapally** | 9 State | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | N/A |
| **Edapally** | 9 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | N/A |
| **Edapally** | 10 State | ₹15,000 | ₹13,500 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹3,000 | ₹15,000 | N/A |
| **Edapally** | 10 Cbse | ₹18,500 | ₹16,600 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹3,700 | ₹18,500 | N/A |
| **Edapally** | Plus One | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | N/A |
| **Edapally** | Plus Two | ₹22,000 | ₹19,800 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹4,400 | ₹22,000 | N/A |

---

## 5. Technical Implementation & Data Schema

### A. Target JSON Schema (for `docs/fee_structure_parsed.json` / API lookup)
Each record in the lookup config will follow the standard structure:

```json
{
  "Tier 1|Basic|10 State": {
    "branch": "Tier 1",
    "plan": "Basic",
    "class": "10 State",
    "annual_fee": 10800,
    "otp": 9700,
    "instalments_count": 5,
    "inst1": 2200,
    "inst2": 2200,
    "inst3": 2200,
    "inst4": 2200,
    "inst5": 2000,
    "inst5_total": 10800,
    "inst5_schedule": [2200, 2200, 2200, 2200, 2000]
  }
}
```

### B. Implementation Workflow (Ready for Execution on Command):
1. **Fee Config Update**:
   - Populate `docs/fee_structure_parsed.json` with the 41 validated 7-month entries.
2. **Schedule Engine (`feeSchedule.ts`)**:
   - Update `generateInstalmentSchedule()` and `getAllPaymentOptions()` to output:
     - **Option 1**: One Time Payment (OTP)
     - **Option 2**: 5 Monthly Instalments (relative to student enrollment date: month +0, +1, +2, +3, +4).
3. **Frappe Backend Fee Structure Master**:
   - Ensure `Fee Structure` records exist for `custom_no_of_instalments = "5"` and `custom_plan = "Basic"` (e.g. `SU CHL-10th State-Basic-5`, `SU ERV-10th State-Basic-5`, etc.) so that auto-created Sales Orders and Invoices link seamlessly.

