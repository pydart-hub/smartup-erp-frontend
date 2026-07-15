import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('docs/new_fee_structure_raw_jul2026.json', 'utf8'));
const summary = rawData['SUMMARY'];

summary.forEach((row, idx) => {
  if (row.some(cell => cell !== '')) {
    console.log(`Row ${idx}:`, JSON.stringify(row));
  }
});
