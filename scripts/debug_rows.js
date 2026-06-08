const ExcelJS = require('exceljs');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('docs/kadavanthra&EDAPPALLY fee structure newww.xlsx');
  const ws = wb.getWorksheet('KADAVANTHARA');
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => rows.push(row.values));
  for (let i = 1; i <= 18; i++) {
    console.log('ROW', i, rows[i]);
  }
  console.log('\nSAMPLE_DATA', rows[2], rows[3], rows[11], rows[12]);
})();
