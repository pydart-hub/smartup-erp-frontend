import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const workbookPath = path.join(process.cwd(), 'docs/kadavanthra&EDAPPALLY fee structure newww.xlsx');
const jsonPath = path.join(process.cwd(), 'docs/fee_structure_parsed.json');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeLabel(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (text.toLowerCase() === '10 state') return '10 State';
  if (text.toLowerCase() === '9 state') return '9 State';
  if (text.toLowerCase() === '10 cbse') return '10 Cbse';
  if (text.toLowerCase() === '9 cbse') return '9 Cbse';
  if (text.toLowerCase() === 'plus one') return 'Plus One';
  if (text.toLowerCase() === 'plus two') return 'Plus Two';
  return text;
}

function main() {
  const wb = XLSX.readFile(workbookPath);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const expected = {};

  for (const sheetName of ['KADAVANTHARA', 'EDAPPALLY']) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    const branch = sheetName === 'KADAVANTHARA' ? 'Kadavanthara' : 'Edapally';
    let mode = 'none';

    for (const row of rows) {
      const first = String(row[0] ?? '').trim();
      const second = String(row[1] ?? '').trim();
      const third = String(row[2] ?? '').trim();
      const fourth = String(row[3] ?? '').trim();
      const fifth = String(row[4] ?? '').trim();

      if (first === 'Class' && second === 'Annual Fees' && fifth.includes('Quarterly')) mode = 'quarterly';
      if (first === 'Class' && second === 'Annual Fees' && fourth.includes('6 Inst')) mode = 'inst';
      if (first === 'HSS' || first.includes('10th sub') || first.includes('10th-subject')) continue;
      if (!first || first.includes('Advanced') || ['Class', 'HSS', '10th sub-wise', '10th-subject wise'].includes(first)) continue;

      const label = normalizeLabel(first);
      const key = `${branch}|Advanced|${label}`;

      if (mode === 'quarterly') {
        expected[key] = {
          annual_fee: toNumber(row[1]),
          early_bird: toNumber(row[2]),
          otp: toNumber(row[3]),
          quarterly_total: toNumber(row[4]),
          q1: toNumber(row[5]),
          q2: toNumber(row[6]),
          q3: toNumber(row[7]),
          q4: toNumber(row[8]),
        };
      } else if (mode === 'inst') {
        expected[key] = {
          ...(expected[key] || {}),
          inst6_total: toNumber(row[3]),
          inst6_per: toNumber(row[4]),
          inst6_last: toNumber(row[5]),
          inst8_total: toNumber(row[6]),
          inst8_per: toNumber(row[7]),
          inst8_last: toNumber(row[8]),
        };
      }
    }
  }

  let mismatches = 0;
  for (const [key, exp] of Object.entries(expected)) {
    const actual = data[key];
    if (!actual) continue;

    const diff = Object.entries(exp).filter(([field, value]) => actual[field] !== value);
    if (diff.length > 0) {
      mismatches++;
      console.log('MISMATCH', key, diff);
    }
  }

  console.log(`TOTAL_MISMATCHES=${mismatches}`);
}

main();
