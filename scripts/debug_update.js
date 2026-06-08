const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

function normalizeClassName(value) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  if (lower === '10 state' || lower === '10state') return '10 State';
  if (lower === '9 state' || lower === '9state') return '9 State';
  if (lower === '10 cbse' || lower === '10cbse') return '10 Cbse';
  if (lower === '9 cbse' || lower === '9cbse') return '9 Cbse';
  if (lower === 'plus one') return 'Plus One';
  if (lower === 'plus two') return 'Plus Two';
  return cleaned;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('docs/kadavanthra&EDAPPALLY fee structure newww.xlsx');
  const rows = [];
  const ws = wb.getWorksheet('EDAPPALLY');
  ws.eachRow({ includeEmpty: true }, (row) => rows.push(row.values));
  const classMaps = {};
  for (let i = 2; i <= 6; i++) {
    const row = rows[i] || [];
    const className = normalizeClassName(row[2]);
    classMaps['Edapally|' + className] = { annual_fee: row[3], otp: row[5], quarterly_total: row[6], q1: row[7], q2: row[8], q3: row[9], q4: row[10] };
  }
  console.log('MAP', classMaps);
  const data = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
  const key = 'Edapally|Advanced|9 Cbse';
  console.log('ENTRY', data[key]);
  console.log('MATCH', classMaps['Edapally|9 Cbse']);
})();
