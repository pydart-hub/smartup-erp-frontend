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

// Extract all target rows
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

// Generate the Markdown file
let md = `# SmartUp ERP: 7-Month Fee Structure Comprehensive Audit & Comparison Report

**Source Excel File**: \`C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx\`  
**Existing Reference JSON**: \`docs/fee_structure_parsed.json\`  
**Target Scope**: New / Mid-Year Student Admissions (7 Months Duration)  
**Report Generated**: September 1, 2026  

---

## 1. Executive Summary & Critical Findings

### Key Highlights
1. **Target Structure Purpose**: Designed specifically for mid-year joiners across 7 remaining operational months.
2. **Standard Calculation Formula**: 
   $$\\text{7-Month Annual Fee} = (\\text{Monthly Tuition Rate} \\times 7) + ₹1,000\\text{ (Registration Fee)}$$
3. **Payment Model**:
   - **Option 1: One Time Payment (OTP)**: Full upfront payment with ~10% to 15.7% discount.
   - **Option 2: 5 Installments**: Distributed across 5 monthly payments relative to admission date.
4. **Plan Coverage**: The 7-month workbook defines **ONLY the \`Basic\` plan**.

---

## 2. Identified Discrepancies, Missing Items & Anomalies

> [!WARNING]
> ### 🚨 Critical Data Anomalies in Excel Workbook
>
> 1. **Moolamkuzhi Sheet OTP Typos (Cells C5, C6, C7, C8)**:
>    - **9th State OTP**: Excel shows **₹13,500** (higher than Annual Fee ₹10,800). Correct OTP should be **₹9,100** (matches Eraveli / Tier 1 9th State).
>    - **9th CBSE OTP**: Excel shows **₹22,900** (higher than Annual Fee ₹15,000). Correct OTP should be **₹13,500** (10% discount on ₹15,000).
>    - **10th State OTP**: Excel shows **₹13,500** (higher than Annual Fee ₹10,800). Correct OTP should be **₹9,100**.
>    - **10th CBSE OTP**: Excel shows **₹22,900** (higher than Annual Fee ₹15,000). Correct OTP should be **₹13,500**.
>
> 2. **Missing Active Program in Edappally**:
>    - **8th CBSE** has active batches and students at **Smart Up Edappally**, but \`8th CBSE\` is omitted from the \`EDAPPALLY\` sheet. (It can adopt Vennala's 8th CBSE rate: ₹15,000 / OTP ₹13,500 / 5×₹3,000).
>
> 3. **Missing Subject-Wise Single Subjects**:
>    - Full year has individual subjects (*Physics, Chemistry, Maths, Phy-Maths, Chem-Maths*) for Vennala, Kadavanthara, and Edappally.
>    - 7-Months sheet only defines **\`Phy-Chem\`** for Eraveli, Tier 1, and Thoppumpady.
>
> 4. **No Intermediate or Advanced Plans Defined**:
>    - All 7-month sheets only have \`Basic\` plan. If a new student requests Intermediate or Advanced, the system needs either a multiplier or fallback rule.

---

## 3. Branch-by-Branch Deep Comparison (Existing Full-Year vs Target 7-Months)

`;

const branches = ['ERAVELI', 'TIER 1', 'THOPPUMPADY', 'MOOLAMKUZHI', 'VENNALA', 'KADAVANTHARA', 'EDAPPALLY'];

for (const b of branches) {
  const branchInfo = sheetToBranch[b];
  const entries = targetEntries.filter(e => e.sheetName === b);

  md += `### 🏢 Branch: ${branchInfo.name} (${branchInfo.code})\n\n`;
  md += `| Class / Program | 7-Month Annual Fee | Target OTP | 5-Instalment Breakdown (₹) | Existing Full-Year Fee | Existing OTP | Existing 8-Inst Total |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const e of entries) {
    const instStr = `${e.inst1} + ${e.inst2} + ${e.inst3} + ${e.inst4} + ${e.inst5}`;
    const exAnn = e.existing ? `₹${e.existing.annual_fee.toLocaleString('en-IN')}` : 'N/A';
    const exOtp = e.existing ? `₹${e.existing.otp.toLocaleString('en-IN')}` : 'N/A';
    const ex8 = e.existing ? `₹${e.existing.inst8_total.toLocaleString('en-IN')}` : 'N/A';

    let otpDisplay = `₹${e.otp.toLocaleString('en-IN')}`;
    if (b === 'MOOLAMKUZHI' && (e.cls.includes('9') || e.cls.includes('10'))) {
      otpDisplay = `~~₹${e.otp.toLocaleString('en-IN')}~~ ⚠️`;
    }

    md += `| **${e.cls}** | ₹${e.annualFee.toLocaleString('en-IN')} | ${otpDisplay} | ${instStr} (= ₹${e.sumInst.toLocaleString('en-IN')}) | ${exAnn} | ${exOtp} | ${ex8} |\n`;
  }
  md += `\n\n`;
}

md += `---

## 4. Master Comparison Matrix (All Branches & Classes)

| Branch Group | Class / Program | 7-Month Annual | Target OTP (Corrected) | Inst 1 | Inst 2 | Inst 3 | Inst 4 | Inst 5 | Total 5 Inst | Full-Year Annual |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

for (const e of targetEntries) {
  let correctedOtp = e.otp;
  if (e.sheetName === 'MOOLAMKUZHI') {
    if (e.cls === '9 State' || e.cls === '10 State') correctedOtp = 9100;
    if (e.cls === '9 Cbse' || e.cls === '10 Cbse') correctedOtp = 13500;
  }
  md += `| **${e.branchGroup}** | ${e.cls} | ₹${e.annualFee.toLocaleString('en-IN')} | ₹${correctedOtp.toLocaleString('en-IN')} | ₹${e.inst1.toLocaleString('en-IN')} | ₹${e.inst2.toLocaleString('en-IN')} | ₹${e.inst3.toLocaleString('en-IN')} | ₹${e.inst4.toLocaleString('en-IN')} | ₹${e.inst5.toLocaleString('en-IN')} | ₹${e.sumInst.toLocaleString('en-IN')} | ${e.existing ? '₹' + e.existing.annual_fee.toLocaleString('en-IN') : 'N/A'} |\n`;
}

md += `\n---

## 5. System Integration Architecture & Recommended Next Steps

\`\`\`mermaid
flowchart TD
    Excel["New Excel: FEES STRUCTURE 7 MONTHS.xlsx"] --> Converter["Validation & Normalization Script"]
    Converter --> AnomalyFix["Correct Moolamkuzhi OTP Typos"]
    AnomalyFix --> TargetJSON["docs/fee_structure_7months.json / fee_structure_parsed.json"]
    
    TargetJSON --> Route["src/app/api/fee-config/route.ts"]
    Route --> Engine["src/lib/utils/feeSchedule.ts (Supports 5 Instalments)"]
    Engine --> AdmissionUI["src/app/dashboard/sales-user/admit/page.tsx"]
    
    TargetJSON --> FrappeSync["Frappe Fee Structure DocTypes (custom_no_of_instalments = '5')"]
    FrappeSync --> SalesOrder["Automated Sales Orders & 5 Invoices"]
\`\`\`

### Technical Implementation Steps (Ready for Execution on Command):
1. **JSON Data File**:
   - Compile normalized 7-month dataset with 5 installments and corrected OTPs into \`docs/fee_structure_parsed.json\` (or dedicated 7-month config).
2. **Schedule Engine (\`feeSchedule.ts\`)**:
   - Add support for \`instalments === 5\` with offsets \`[0, 1, 2, 3, 4]\` months from admission date.
   - Display two clean options in Admission Step 4:
     1. **One Time Payment (OTP)** (Single payment)
     2. **5 Monthly Instalments** (Instalments 1 to 5)
3. **Frappe Backend Fee Structure Master**:
   - Seed / verify corresponding \`Fee Structure\` master records for 5 installments (e.g. \`SU CHL-10th State-Basic-5\`, \`SU ERV-9th State-Basic-5\`, etc.) so docstatus=1 linkage and billing invoices match 100%.

`;

const outPath = path.join(process.cwd(), 'docs', 'FEE_STRUCTURE_7_MONTHS_COMPREHENSIVE_AUDIT.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Report successfully written to ${outPath}`);
