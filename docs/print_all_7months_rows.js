const xlsx = require('xlsx');
const fs = require('fs');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n================ ALL ROWS IN SHEET: ${sheetName} (Total: ${rows.length}) ================`);
  rows.forEach((row, i) => {
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  });
}
