const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  console.log(`\n================ SHEET: ${sheetName} ================`);
  for (const cell in sheet) {
    if (cell[0] !== '!') {
      const c = sheet[cell];
      if (c.f) {
        console.log(`${cell}: value=${c.v}, formula=${c.f}`);
      }
    }
  }
}
