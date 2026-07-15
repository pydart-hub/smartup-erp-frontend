import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('docs/new_fee_structure_raw_jul2026.json', 'utf8'));
const rows = rawData['Kadavanthara'];

rows.forEach((row, i) => {
  console.log(`Row ${i}: ${JSON.stringify(row)}`);
});
