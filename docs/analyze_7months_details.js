const xlsx = require('xlsx');
const fs = require('fs');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

console.log('=== DETAILED ROW-BY-ROW ANALYSIS OF 7 MONTHS EXCEL ===');

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n------------------------------------------------------------`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`------------------------------------------------------------`);

  let headerRow = null;
  let headerIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.length > 0 && (r[0]?.toString().toLowerCase().includes('class') || r[1]?.toString().toLowerCase().includes('annual'))) {
      headerRow = r;
      headerIndex = i;
      break;
    }
  }

  console.log(`Header (Row ${headerIndex}):`, headerRow);

  if (headerIndex !== -1) {
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0 || !r[0]) continue;

      const className = r[0];
      const annualFee = Number(r[1]) || 0;
      const otp = Number(r[2]) || 0;
      const inst1 = Number(r[3]) || 0;
      const inst2 = Number(r[4]) || 0;
      const inst3 = Number(r[5]) || 0;
      const inst4 = Number(r[6]) || 0;
      const inst5 = Number(r[7]) || 0;

      const sumInst = inst1 + inst2 + inst3 + inst4 + inst5;
      const diffFromAnnual = sumInst - annualFee;
      const otpDiscount = annualFee - otp;
      const otpDiscountPct = annualFee > 0 ? ((otpDiscount / annualFee) * 100).toFixed(1) : 0;

      console.log(`Class: "${className.trim()}" | Annual: ₹${annualFee} | OTP: ₹${otp} (-${otpDiscountPct}%) | 5 Inst: [${inst1}, ${inst2}, ${inst3}, ${inst4}, ${inst5}] | Sum: ₹${sumInst} (Diff: ${diffFromAnnual})`);
    }
  }
}
