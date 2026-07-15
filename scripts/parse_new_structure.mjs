import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = 'C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\9Month_Fee_Structure_Jul2026-Mar2027 (1).xlsx';

try {
  const wb = XLSX.readFile(excelPath);
  console.log('Sheet names:', wb.SheetNames);

  const result = {};

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    result[name] = rows;
  }

  fs.writeFileSync('docs/new_fee_structure_raw_jul2026.json', JSON.stringify(result, null, 2));
  console.log('Successfully wrote docs/new_fee_structure_raw_jul2026.json');
} catch (err) {
  console.error('Error reading excel:', err);
}
