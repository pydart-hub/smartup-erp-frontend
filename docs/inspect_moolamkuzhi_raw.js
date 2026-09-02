const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\FEES STRUCTURE 7 MONTHS.xlsx';
const workbook = xlsx.readFile(excelPath);

const mSheet = workbook.Sheets['MOOLAMKUZHI'];
console.log('MOOLAMKUZHI raw sheet object:');
for (const cell in mSheet) {
  if (cell[0] !== '!') {
    console.log(`${cell}: v=${mSheet[cell].v}, w=${mSheet[cell].w}, f=${mSheet[cell].f || 'no formula'}`);
  }
}
