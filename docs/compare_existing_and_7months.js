const xlsx = require('xlsx');
const fs = require('fs');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

const existingJson = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));

console.log('================ COMPREHENSIVE EXISTING VS 7-MONTH TARGET COMPARISON ================');

const sheetToBranchKey = {
  'ERAVELI': 'Eraveli',
  'TIER 1': 'Tier 1',
  'THOPPUMPADY': 'Thoppumpady',
  'MOOLAMKUZHI': 'Moolamkuzhi',
  'VENNALA': 'Vennala',
  'KADAVANTHARA': 'Kadavanthara',
  'EDAPPALLY': 'Edapally'
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

const targetData = {};

for (const sheetName of workbook.SheetNames) {
  const branchKey = sheetToBranchKey[sheetName];
  if (!branchKey) continue;

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

    const key = `${branchKey}|Basic|${cls}`;
    targetData[key] = {
      branch: branchKey,
      plan: "Basic",
      class: cls,
      annual_fee: annualFee,
      otp: otp,
      inst1, inst2, inst3, inst4, inst5,
      inst5_total: inst1 + inst2 + inst3 + inst4 + inst5,
      inst5_schedule: [inst1, inst2, inst3, inst4, inst5]
    };
  }
}

console.log(`Extracted ${Object.keys(targetData).length} target Basic entries from 7-Months Excel.`);

console.log('\n--- DETAILED COMPARISON TABLE ---');
for (const key of Object.keys(targetData).sort()) {
  const target = targetData[key];
  const existing = existingJson[key];

  console.log(`\nKey: [${key}]`);
  console.log(`  Target (7 Months):`);
  console.log(`    Annual Fee: ₹${target.annual_fee}`);
  console.log(`    OTP:        ₹${target.otp}`);
  console.log(`    5 Inst:     ${JSON.stringify(target.inst5_schedule)} = Total: ₹${target.inst5_total}`);

  if (existing) {
    console.log(`  Existing (Full Year):`);
    console.log(`    Annual Fee: ₹${existing.annual_fee}`);
    console.log(`    OTP:        ₹${existing.otp}`);
    console.log(`    Quarterly:  [${existing.q1}, ${existing.q2}, ${existing.q3}, ${existing.q4}] = ₹${existing.quarterly_total}`);
    console.log(`    6 Inst:     (5 × ₹${existing.inst6_per}) + ₹${existing.inst6_last} = ₹${existing.inst6_total}`);
    console.log(`    8 Inst:     (7 × ₹${existing.inst8_per}) + ₹${existing.inst8_last} = ₹${existing.inst8_total}`);
  } else {
    console.log(`  Existing: NOT FOUND in existing JSON!`);
  }
}
