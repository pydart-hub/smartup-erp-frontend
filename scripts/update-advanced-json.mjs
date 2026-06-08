import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const workbookPath = path.join(process.cwd(), 'docs/kadavanthra&EDAPPALLY fee structure newww.xlsx');
const jsonPath = path.join(process.cwd(), 'docs/fee_structure_parsed.json');

function normalizeClassName(value) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  if (lower === '10 state' || lower === '10state') return '10 State';
  if (lower === '9 state' || lower === '9state') return '9 State';
  if (lower === '10 cbse' || lower === '10cbse') return '10 Cbse';
  if (lower === '9 cbse' || lower === '9cbse') return '9 Cbse';
  if (lower === 'plus one') return 'Plus One';
  if (lower === 'plus two') return 'Plus Two';
  if (lower === '10 physics') return '10 Physics';
  if (lower === '10 biology') return '10 Biology';
  if (lower === '10 chemistry') return '10 Chemistry';
  if (lower === '10 maths') return '10 Maths';
  return cleaned;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const classMaps = {};

  for (const ws of wb.worksheets) {
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row) => rows.push(row.values));

    const branch = ws.name === 'KADAVANTHARA' ? 'Kadavanthara' : ws.name === 'EDAPPALLY' ? 'Edapally' : null;
    if (!branch) continue;

    for (const row of rows) {
      const className = normalizeClassName(row[2]);
      if (!className || className === 'Class') continue;

      const annualFee = toNumber(row[3]);
      const earlyBird = toNumber(row[4]);
      const otp = toNumber(row[5]);
      const quarterlyTotal = toNumber(row[6]);

      if (Number.isFinite(annualFee) && Number.isFinite(earlyBird) && otp < quarterlyTotal) {
        classMaps[branch + '|' + className] = {
          annual_fee: annualFee,
          early_bird: earlyBird,
          otp,
          quarterly_total: quarterlyTotal,
          q1: toNumber(row[7]),
          q2: toNumber(row[8]),
          q3: toNumber(row[9]),
          q4: toNumber(row[10]),
        };
      } else if (Number.isFinite(annualFee) && Number.isFinite(earlyBird) && otp > quarterlyTotal) {
        const existing = classMaps[branch + '|' + className] || {};
        classMaps[branch + '|' + className] = {
          ...existing,
          inst6_total: otp,
          inst6_per: quarterlyTotal,
          inst6_last: toNumber(row[7]),
          inst8_total: toNumber(row[8]),
          inst8_per: toNumber(row[9]),
          inst8_last: toNumber(row[10]),
        };
      }
    }
  }

  let changed = 0;
  for (const [key, entry] of Object.entries(data)) {
    if (!key.startsWith('Kadavanthara|Advanced|') && !key.startsWith('Edapally|Advanced|')) continue;
    const [branch, plan, className] = key.split('|');
    const mapping = classMaps[branch + '|' + className];
    if (!mapping) continue;

    const updated = { ...entry, ...mapping };
    if (JSON.stringify(updated) !== JSON.stringify(entry)) {
      data[key] = updated;
      changed++;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${changed} Advanced fee entries in docs/fee_structure_parsed.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
