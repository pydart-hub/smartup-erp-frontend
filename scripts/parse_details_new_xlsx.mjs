import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('docs/new_fee_structure_raw_jul2026.json', 'utf8'));

for (const sheetName of Object.keys(rawData)) {
  const rows = rawData[sheetName];
  console.log(`\n=========================================`);
  console.log(`SHEET: ${sheetName} | Total rows: ${rows.length}`);
  console.log(`=========================================`);
  
  // Find interesting rows (sections)
  rows.forEach((row, idx) => {
    const firstCell = String(row[0] ?? '').trim();
    if (firstCell.startsWith('▸') || firstCell.includes('LEVEL') || firstCell.includes('Plan') || firstCell.includes('Class') || firstCell.includes('Branch')) {
      console.log(`Row ${idx}:`, JSON.stringify(row.slice(0, 8)));
    }
  });
}
