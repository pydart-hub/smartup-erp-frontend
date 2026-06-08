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
  const lower = text.toLowerCase();

  if (lower === '10 state' || lower === '10state') return '10 State';
  if (lower === '9 state' || lower === '9state') return '9 State';
  if (lower === '10 cbse' || lower === '10cbse') return '10 Cbse';
  if (lower === '9 cbse' || lower === '9cbse') return '9 Cbse';
  if (lower === 'plus one' || lower === 'plusone') return 'Plus One';
  if (lower === 'plus two' || lower === 'plustwo') return 'Plus Two';
  if (lower === 'physics') return 'Physics';
  if (lower === 'chemistry') return 'Chemistry';
  if (lower === 'maths') return 'Maths';
  if (lower === 'biology') return 'Biology';

  return text
    .replace(/^10\s+/i, '10 ')
    .replace(/^9\s+/i, '9 ')
    .replace(/\bphysics\b/i, 'Physics')
    .replace(/\bchemistry\b/i, 'Chemistry')
    .replace(/\bmaths\b/i, 'Maths')
    .replace(/\bbiology\b/i, 'Biology');
}

function buildEntry(branch, className, row, block) {
  const label = normalizeLabel(className);
  const base = {
    branch,
    plan: 'Advanced',
    class: label,
    annual_fee: toNumber(row[2]),
    early_bird: toNumber(row[3]),
    otp: toNumber(row[4]),
    quarterly_total: toNumber(row[5]),
    q1: toNumber(row[6]),
    q2: toNumber(row[7]),
    q3: toNumber(row[8]),
    q4: toNumber(row[9]),
  };

  if (block === 'inst') {
    return {
      branch,
      plan: 'Advanced',
      class: label,
      annual_fee: toNumber(row[2]),
      early_bird: toNumber(row[3]),
      otp: toNumber(row[4]),
      quarterly_total: toNumber(row[5]),
      q1: toNumber(row[6]),
      q2: toNumber(row[7]),
      q3: toNumber(row[8]),
      q4: toNumber(row[9]),
      inst6_total: toNumber(row[4]),
      inst6_per: toNumber(row[5]),
      inst6_last: toNumber(row[6]),
      inst8_total: toNumber(row[7]),
      inst8_per: toNumber(row[8]),
      inst8_last: toNumber(row[9]),
    };
  }

  return base;
}

function parseWorkBookMap() {
  const wb = XLSX.readFile(workbookPath);
  const quarterlyMap = {};
  const instMap = {};

  for (const sheetName of ['KADAVANTHARA', 'EDAPPALLY']) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    const branch = sheetName === 'KADAVANTHARA' ? 'Kadavanthara' : 'Edapally';

    let currentBlock = 'none';

    for (const row of rows) {
      const first = String(row[0] ?? '').trim();
      const second = String(row[1] ?? '').trim();
      const third = String(row[2] ?? '').trim();
      const fourth = String(row[3] ?? '').trim();
      const fifth = String(row[4] ?? '').trim();

      if (first === 'Class' && second === 'Annual Fees' && fifth.includes('Quarterly')) {
        currentBlock = 'quarterly';
        continue;
      }
      if (first === 'Class' && second === 'Annual Fees' && fourth.includes('6 Inst')) {
        currentBlock = 'inst';
        continue;
      }
      if (first === 'HSS' && second === 'Annual Fees' && fifth.includes('Quarterly')) {
        currentBlock = 'hss-quarterly';
        continue;
      }
      if (first === 'HSS' && second === 'Annual Fees' && fourth.includes('6 Inst')) {
        currentBlock = 'hss-inst';
        continue;
      }
      if (first.includes('10th sub') || first.includes('10th-subject')) {
        currentBlock = first.includes('10th sub') ? 'sub10-quarterly' : 'sub10-inst';
        continue;
      }

      const isDataRow = row.length >= 9 && first && !['Class', 'HSS', '10th sub-wise', '10th-subject wise'].includes(first) && !first.includes('Advanced');
      if (!isDataRow) continue;

      const label = normalizeLabel(first);
      const key = `${branch}|Advanced|${label}`;

      if (currentBlock === 'quarterly' || currentBlock === 'hss-quarterly' || currentBlock === 'sub10-quarterly') {
        quarterlyMap[key] = {
          annual_fee: toNumber(row[1]),
          early_bird: toNumber(row[2]),
          otp: toNumber(row[3]),
          quarterly_total: toNumber(row[4]),
          q1: toNumber(row[5]),
          q2: toNumber(row[6]),
          q3: toNumber(row[7]),
          q4: toNumber(row[8]),
        };
      }

      if (currentBlock === 'inst' || currentBlock === 'hss-inst' || currentBlock === 'sub10-inst') {
        instMap[key] = {
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

  return { quarterlyMap, instMap };
}

function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const { quarterlyMap, instMap } = parseWorkBookMap();

  let changed = 0;
  for (const key of Object.keys(data)) {
    if (!key.startsWith('Kadavanthara|Advanced|') && !key.startsWith('Edapally|Advanced|')) continue;
    if (!quarterlyMap[key] && !instMap[key]) continue;

    const updated = { ...data[key], ...(quarterlyMap[key] || {}), ...(instMap[key] || {}) };
    if (JSON.stringify(updated) !== JSON.stringify(data[key])) {
      data[key] = updated;
      changed++;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${changed} Advanced fee entries in docs/fee_structure_parsed.json`);
}

main();
