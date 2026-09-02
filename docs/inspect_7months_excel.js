const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

console.log('=== WORKBOOK SHEET NAMES ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n================ SHEET: ${sheetName} (Rows: ${rows.length}) ================`);
  // Print first 20 rows
  rows.slice(0, 25).forEach((row, i) => {
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  });
}
