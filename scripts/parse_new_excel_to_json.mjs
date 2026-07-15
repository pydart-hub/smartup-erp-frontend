import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('docs/new_fee_structure_raw_jul2026.json', 'utf8'));

const BRANCH_NAME_MAPPING = {
  'ERAVELI': 'Eraveli',
  'TIER 1': 'Tier 1',
  'Thoppumpady': 'Thoppumpady',
  'Moolamkuzhi': 'Moolamkuzhi',
  'Vennala': 'Vennala',
  'Kadavanthara': 'Kadavanthara',
  'Edappally': 'Edapally' // Maps Edappally to Edapally
};

function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/,/g, '').replace(/₹/g, '').trim();
  if (str === '' || str === '—' || str === '-') return 0;
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function normalizeClassOrSubject(val, sectionType) {
  let name = String(val ?? '').trim().replace(/\s+/g, ' ');
  const lower = name.toLowerCase();

  // Subject-wise 10th class check first
  if (sectionType === '10th-sub-wise') {
    if (lower === 'physics') return '10 Physics';
    if (lower === 'biology') return '10 Biology';
    if (lower === 'chemistry') return '10 Chemistry';
    if (lower === 'maths') return '10 Maths';
  }

  // Normalize HSS level subjects
  if (lower === 'physics') return 'Physics';
  if (lower === 'chemistry' || lower === 'chemitry') return 'Chemistry';
  if (lower === 'maths') return 'Maths';
  if (lower === 'biology') return 'Biology';
  if (lower === 'phy-chem' || lower === 'phy - chem') return 'Phy-Chem';
  if (lower === 'phy-maths') return 'Phy-Maths';
  if (lower === 'chem-maths' || lower === 'chem- maths') return 'Chem-Maths';

  // Normalize classes
  if (lower === '8 state' || lower === '8state') return '8 State';
  if (lower === '8 cbse' || lower === '8cbse') return '8 Cbse';
  if (lower === '9 state' || lower === '9state') return '9 State';
  if (lower === '9 cbse' || lower === '9cbse') return '9 Cbse';
  if (lower === '10 state' || lower === '10state') return '10 State';
  if (lower === '10 cbse' || lower === '10cbse') return '10 Cbse';
  if (lower === 'plus one' || lower === 'plusone') return 'Plus One';
  if (lower === 'plus two' || lower === 'plustwo') return 'Plus Two';

  return name;
}


const parsedData = {};

for (const sheetKey of Object.keys(rawData)) {
  if (sheetKey === 'SUMMARY') continue;
  
  const branchName = BRANCH_NAME_MAPPING[sheetKey];
  if (!branchName) {
    console.warn(`Warning: Unknown sheet/branch key "${sheetKey}"`);
    continue;
  }

  const rows = rawData[sheetKey];
  let currentLevel = null; // Basic, Intermediate, Advanced
  let sectionType = 'standard'; // standard, HSS, 10th-sub-wise

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] ?? '').trim();
    if (firstCell === '') continue;

    // Detect level blocks
    if (firstCell.startsWith('▸')) {
      const lowerHeader = firstCell.toLowerCase();
      if (lowerHeader.includes('basic')) {
        currentLevel = 'Basic';
      } else if (lowerHeader.includes('intermediate')) {
        currentLevel = 'Intermediate';
      } else if (lowerHeader.includes('advanced')) {
        currentLevel = 'Advanced';
      }

      // Detect sub-sections
      if (lowerHeader.includes('subject-wise') || lowerHeader.includes('hss')) {
        sectionType = 'HSS';
      } else if (lowerHeader.includes('10th sub-wise')) {
        sectionType = '10th-sub-wise';
      } else {
        sectionType = 'standard';
      }
      continue;
    }

    // Skip headers
    if (
      firstCell.toLowerCase().includes('class') || 
      firstCell.toLowerCase().includes('hss') || 
      firstCell.toLowerCase().includes('branch') || 
      firstCell.toLowerCase().includes('subject') ||
      firstCell.toLowerCase().includes('10th sub-wise')
    ) {
      continue;
    }

    // If we have a level and this row seems like a data row (starts with a valid class/subject)
    if (currentLevel) {
      const className = normalizeClassOrSubject(firstCell, sectionType);
      
      let planName = currentLevel;
      if ((branchName === 'Edapally' || branchName === 'Kadavanthara') && planName === 'Basic') {
        planName = 'Advanced';
      }
      
      const key = `${branchName}|${planName}|${className}`;

      const entry = {
        branch: branchName,
        plan: planName,
        class: className,
        annual_fee: cleanNumber(row[1]),
        early_bird: cleanNumber(row[2]),
        otp: cleanNumber(row[3]),
        quarterly_total: cleanNumber(row[4]),
        q1: cleanNumber(row[5]),
        q2: cleanNumber(row[6]),
        q3: cleanNumber(row[7]),
        q4: cleanNumber(row[8]),
      };

      // Check for 6-Month plan columns (Total is row[9])
      if (row.length > 9 && row[9] !== '') {
        entry.inst6_total = cleanNumber(row[9]);
        entry.inst6_per = cleanNumber(row[10]);
        entry.inst6_last = cleanNumber(row[15]); // M6 (adj) is at col index 15
      }

      // Check for 8-Month plan columns (Total is row[16])
      if (row.length > 16 && row[16] !== '') {
        entry.inst8_total = cleanNumber(row[16]);
        entry.inst8_per = cleanNumber(row[17]);
        entry.inst8_last = cleanNumber(row[24]); // M8 (adj) is at col index 24
      }

      // Fill in defaults if installment columns don't exist in row
      if (entry.inst6_total === undefined) {
        entry.inst6_total = 0;
        entry.inst6_per = 0;
        entry.inst6_last = 0;
      }
      if (entry.inst8_total === undefined) {
        entry.inst8_total = 0;
        entry.inst8_per = 0;
        entry.inst8_last = 0;
      }

      parsedData[key] = entry;
    }
  }
}

fs.writeFileSync('docs/new_fee_structure_parsed_proposed.json', JSON.stringify(parsedData, null, 2) + '\n');
console.log(`Successfully parsed ${Object.keys(parsedData).length} entries into docs/new_fee_structure_parsed_proposed.json`);
