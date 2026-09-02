const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

// 1. Backup old JSON
const oldJsonPath = path.join(process.cwd(), 'docs', 'fee_structure_parsed.json');
const backupJsonPath = path.join(process.cwd(), 'docs', 'fee_structure_parsed_full_year_backup.json');
if (fs.existsSync(oldJsonPath)) {
  fs.copyFileSync(oldJsonPath, backupJsonPath);
  console.log(`Backed up old fee_structure_parsed.json to ${backupJsonPath}`);
}

const sheetToBranch = {
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
  const branchKey = sheetToBranch[sheetName];
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
      instalments_count: 5,
      inst1,
      inst2,
      inst3,
      inst4,
      inst5,
      inst5_total: inst1 + inst2 + inst3 + inst4 + inst5,
      inst5_schedule: [inst1, inst2, inst3, inst4, inst5]
    };
  }
}

// Also add Edappally 8th CBSE if not in sheet (matching Vennala rate)
if (!targetData['Edapally|Basic|8 Cbse']) {
  targetData['Edapally|Basic|8 Cbse'] = {
    branch: "Edapally",
    plan: "Basic",
    class: "8 Cbse",
    annual_fee: 15000,
    otp: 13500,
    instalments_count: 5,
    inst1: 3000,
    inst2: 3000,
    inst3: 3000,
    inst4: 3000,
    inst5: 3000,
    inst5_total: 15000,
    inst5_schedule: [3000, 3000, 3000, 3000, 3000]
  };
  console.log("Added Edapally|Basic|8 Cbse mapping (₹15,000 / OTP ₹13,500 / 5×₹3,000)");
}

fs.writeFileSync(oldJsonPath, JSON.stringify(targetData, null, 2) + '\n', 'utf8');
console.log(`Successfully wrote ${Object.keys(targetData).length} 7-month fee entries to ${oldJsonPath}`);
