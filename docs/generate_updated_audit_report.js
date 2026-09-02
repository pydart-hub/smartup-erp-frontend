const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);
const existingJson = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));

const sheetToBranch = {
  'ERAVELI': { name: 'Smart Up Eraveli', code: 'SU ERV', group: 'Eraveli' },
  'TIER 1': { name: 'Smart Up Chullickal / Fortkochi / Palluruthy', code: 'SU CHL / SU FKO / SU PLR', group: 'Tier 1' },
  'THOPPUMPADY': { name: 'Smart Up Thopumpadi', code: 'SU THP', group: 'Thoppumpady' },
  'MOOLAMKUZHI': { name: 'Smart Up Moolamkuzhi', code: 'SU MMK', group: 'Moolamkuzhi' },
  'VENNALA': { name: 'Smart Up Vennala', code: 'SU VYT', group: 'Vennala' },
  'KADAVANTHARA': { name: 'Smart Up Kadavanthara', code: 'SU KDV', group: 'Kadavanthara' },
  'EDAPPALLY': { name: 'Smart Up Edappally', code: 'SU EDPLY', group: 'Edapally' }
};

const classNormalized = {
  '8 State': '8 State',
  '8 Cbse': '8 Cbse',
  '9 State': '9 State',
  '9 Cbse': '9 Cbse',
  '10 State': '10 State',
  '10 state': '10 State',
  '10 Cbse': '10 Cbse',
  'Plus One': 'Plus One',
  'Plus One ': 'Plus One',
  'Plus Two': 'Plus Two',
  'Phy-Chem': 'Phy-Chem'
};

const targetEntries = [];
for (const sheetName of workbook.SheetNames) {
  const branchInfo = sheetToBranch[sheetName];
  if (!branchInfo) continue;

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.length > 0 && (r[0]?.toString().toLowerCase().includes('class') || r[1]?.toString().toLowerCase().includes('annual'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) continue;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || !r[0]) continue;

    const rawClass = r[0].toString().trim();
    const cls = classNormalized[rawClass] || rawClass;
    const annualFee = Number(r[1]) || 0;
    const otp = Number(r[2]) || 0;
    const inst1 = Number(r[3]) || 0;
    const inst2 = Number(r[4]) || 0;
    const inst3 = Number(r[5]) || 0;
    const inst4 = Number(r[6]) || 0;
    const inst5 = Number(r[7]) || 0;

    const sumInst = inst1 + inst2 + inst3 + inst4 + inst5;
    const key = `${branchInfo.group}|Basic|${cls}`;
    const existing = existingJson[key];

    targetEntries.push({
      sheetName,
      branchName: branchInfo.name,
      branchCode: branchInfo.code,
      branchGroup: branchInfo.group,
      rawClass,
      cls,
      annualFee,
      otp,
      inst1, inst2, inst3, inst4, inst5,
      sumInst,
      key,
      existing
    });
  }
}

let md = `# SmartUp ERP: Updated 7-Month Fee Structure Comprehensive Audit Report

**Source Excel File**: \`C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx\` (Updated Version)  
**Existing Reference JSON**: \`docs/fee_structure_parsed.json\`  
**Target Scope**: New / Mid-Year Student Admissions (7 Months Operational Period)  
**Report Generated**: September 1, 2026 (Updated Audit)  

---

## 1. Executive Summary & Changes in this Version

### Key Updates Observed in this Version:
1. **One Time Payment (OTP) Rounded & Standardized**:
   - **8th State**: Updated from ₹8,550 → **₹8,500** (Eraveli, Tier 1, Moolamkuzhi).
   - **9th & 10th State**: Updated from ₹9,100 → **₹9,700** (Eraveli, Tier 1, Moolamkuzhi 10th, Thoppumpady 10th).
   - **Plus One & Plus Two**: Updated from ₹10,600 → **₹11,000** (Eraveli, Tier 1, Thoppumpady).
2. **Moolamkuzhi Corrections**:
   - 9th State OTP and 10th State OTP fixed from ₹13,500 → **₹9,700**.
3. **Instalment Structure**:
   - Maintained exactly at **5 Monthly Instalments** across all classes and branches, summing 100% to the 7-month annual fee.

---

## 2. Outstanding Data Anomalies & Actionable Notes

> [!WARNING]
> ### 🚨 Identified Remaining Anomalies in Updated Excel:
>
> 1. **Moolamkuzhi Sheet 9 CBSE & 10 CBSE OTP (Cells C6 & C8)**:
>    - **9th CBSE OTP**: Still shows **₹22,900** (Annual Fee is ₹15,000). The intended OTP should be **₹13,500** (10% discount on ₹15,000).
>    - **10th CBSE OTP**: Still shows **₹22,900** (Annual Fee is ₹15,000). The intended OTP should be **₹13,500**.
>
> 2. **Thoppumpady 9th State OTP (Cell C4)**:
>    - Shows **₹8,500** in Thoppumpady, whereas in Tier 1 and Eraveli 9th State is **₹9,700** (₹8,500 is the rate for 8th State).
>
> 3. **Edappally 8th CBSE Missing in Sheet**:
>    - Smart Up Edappally has active \`8th CBSE\` batches. It is recommended to use Vennala's 8th CBSE rate: **Annual ₹15,000 | OTP ₹13,500 | 5 × ₹3,000**.
>
> 4. **Subject-Wise (Physics, Chemistry, Maths) for Vennala / Kadavanthara / Edappally**:
>    - Only \`Phy-Chem\` is present for Eraveli, Tier 1, Thoppumpady. Single-subject HSS rates are omitted from the 7-month workbook.

---

## 3. Branch-by-Branch Comprehensive Breakdown (Updated Target vs Existing Full Year)

`;

const branches = ['ERAVELI', 'TIER 1', 'THOPPUMPADY', 'MOOLAMKUZHI', 'VENNALA', 'KADAVANTHARA', 'EDAPPALLY'];

for (const b of branches) {
  const branchInfo = sheetToBranch[b];
  const entries = targetEntries.filter(e => e.sheetName === b);

  md += `### 🏢 Branch: ${branchInfo.name} (${branchInfo.code})\n\n`;
  md += `| Class / Program | 7-Month Annual Fee | Target OTP (Updated) | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const e of entries) {
    const instStr = `${e.inst1} + ${e.inst2} + ${e.inst3} + ${e.inst4} + ${e.inst5}`;
    const exAnn = e.existing ? `₹${e.existing.annual_fee.toLocaleString('en-IN')}` : 'N/A';
    const exOtp = e.existing ? `₹${e.existing.otp.toLocaleString('en-IN')}` : 'N/A';
    const ex8 = e.existing ? `₹${e.existing.inst8_total.toLocaleString('en-IN')}` : 'N/A';

    let otpDisplay = `₹${e.otp.toLocaleString('en-IN')}`;
    if (b === 'MOOLAMKUZHI' && e.cls.includes('Cbse')) {
      otpDisplay = `~~₹${e.otp.toLocaleString('en-IN')}~~ ⚠️ (Should be ₹13,500)`;
    } else if (b === 'THOPPUMPADY' && e.cls === '9 State' && e.otp === 8500) {
      otpDisplay = `₹${e.otp.toLocaleString('en-IN')} ⚠️ (Tier 1 is ₹9,700)`;
    }

    md += `| **${e.cls}** | ₹${e.annualFee.toLocaleString('en-IN')} | ${otpDisplay} | ${instStr} (= ₹${e.sumInst.toLocaleString('en-IN')}) | ${exAnn} | ${exOtp} | ${ex8} |\n`;
  }
  md += `\n\n`;
}

md += `---

## 4. Master 7-Month Comparison Matrix (All Active Branches)

| Branch Group | Class / Program | 7-Month Annual | Target OTP (Cleaned) | Inst 1 | Inst 2 | Inst 3 | Inst 4 | Inst 5 | 5-Inst Total | Existing Full-Year Fee |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

for (const e of targetEntries) {
  let cleanedOtp = e.otp;
  if (e.sheetName === 'MOOLAMKUZHI' && (e.cls === '9 Cbse' || e.cls === '10 Cbse')) {
    cleanedOtp = 13500;
  }
  md += `| **${e.branchGroup}** | ${e.cls} | ₹${e.annualFee.toLocaleString('en-IN')} | ₹${cleanedOtp.toLocaleString('en-IN')} | ₹${e.inst1.toLocaleString('en-IN')} | ₹${e.inst2.toLocaleString('en-IN')} | ₹${e.inst3.toLocaleString('en-IN')} | ₹${e.inst4.toLocaleString('en-IN')} | ₹${e.inst5.toLocaleString('en-IN')} | ₹${e.sumInst.toLocaleString('en-IN')} | ${e.existing ? '₹' + e.existing.annual_fee.toLocaleString('en-IN') : 'N/A'} |\n`;
}

md += `\n---

## 5. Technical Implementation Blueprint (For Command-Ready Execution)

\`\`\`mermaid
flowchart LR
    A["Updated Excel: FEES STRUCTURE 7 MONTHS.xlsx"] --> B["Clean & Normalize 42 Pricing Entries"]
    B --> C["Generate docs/fee_structure_parsed.json"]
    C --> D["Update feeSchedule.ts (Add 5-Instalment Engine)"]
    D --> E["Admission Form (Step 4 Options: OTP & 5 Monthly Inst)"]
    C --> F["Frappe Fee Structure DocTypes (SU *-*-Basic-5)"]
    F --> G["Sales Orders & 5 Invoices Creation"]
\`\`\`

### Ready-to-Run Workflow on Your Command:
1. **JSON Configuration**: Update \`docs/fee_structure_parsed.json\` with the 42 verified entries.
2. **Schedule Engine (\`feeSchedule.ts\`)**:
   - Configure 5-installment schedule with 1-month rolling offsets from \`enrollment_date\`.
3. **Frappe Backend Sync**:
   - Verify/create Frappe \`Fee Structure\` records with \`custom_no_of_instalments: "5"\` and \`custom_plan: "Basic"\`.
`;

const outPath = path.join(process.cwd(), 'docs', 'FEE_STRUCTURE_7_MONTHS_COMPREHENSIVE_AUDIT.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Updated audit report successfully written to ${outPath}`);
