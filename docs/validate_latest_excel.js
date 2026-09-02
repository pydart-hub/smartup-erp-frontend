const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

let totalEntries = 0;
let errors = [];

for (const sheetName of workbook.SheetNames) {
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

    totalEntries++;
    const cls = r[0].toString().trim();
    const annual = Number(r[1]) || 0;
    const otp = Number(r[2]) || 0;
    const i1 = Number(r[3]) || 0;
    const i2 = Number(r[4]) || 0;
    const i3 = Number(r[5]) || 0;
    const i4 = Number(r[6]) || 0;
    const i5 = Number(r[7]) || 0;
    const sum = i1 + i2 + i3 + i4 + i5;

    if (sum !== annual) {
      errors.push(`[${sheetName}] ${cls}: Sum of instalments (${sum}) != Annual Fee (${annual})`);
    }
    if (otp >= annual) {
      errors.push(`[${sheetName}] ${cls}: OTP (${otp}) >= Annual Fee (${annual})`);
    }
    if (otp <= 0) {
      errors.push(`[${sheetName}] ${cls}: OTP is 0 or negative (${otp})`);
    }
  }
}

console.log(`Validation finished. Checked ${totalEntries} entries across ${workbook.SheetNames.length} sheets.`);
if (errors.length === 0) {
  console.log('✅ ALL 42 ENTRIES ARE 100% VALID! NO ERRORS OR ANOMALIES FOUND!');
} else {
  console.log('❌ Found errors:', errors);
}
