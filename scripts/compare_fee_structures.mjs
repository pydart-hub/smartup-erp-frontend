import fs from 'fs';

const oldData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const newData = JSON.parse(fs.readFileSync('docs/new_fee_structure_parsed_proposed.json', 'utf8'));

const oldKeys = Object.keys(oldData);
const newKeys = Object.keys(newData);

const addedKeys = newKeys.filter(k => !oldKeys.includes(k));
const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
const commonKeys = oldKeys.filter(k => newKeys.includes(k));

console.log('--- KEY METRICS ---');
console.log('Total Old Keys:', oldKeys.length);
console.log('Total New Keys:', newKeys.length);
console.log('Added Keys:', addedKeys.length);
console.log('Removed Keys:', removedKeys.length);
console.log('Common Keys:', commonKeys.length);

console.log('\n--- SAMPLE ADDED KEYS ---');
console.log(addedKeys.slice(0, 15));

console.log('\n--- SAMPLE REMOVED KEYS ---');
console.log(removedKeys.slice(0, 15));

let diffCount = 0;
const diffReport = [];

for (const key of commonKeys) {
  const oldVal = oldData[key];
  const newVal = newData[key];
  
  const fields = ['annual_fee', 'early_bird', 'otp', 'quarterly_total', 'q1', 'q2', 'q3', 'q4', 'inst6_total', 'inst6_per', 'inst6_last', 'inst8_total', 'inst8_per', 'inst8_last'];
  const fieldDiffs = {};
  let isDifferent = false;
  
  for (const f of fields) {
    if (oldVal[f] !== newVal[f]) {
      fieldDiffs[f] = { old: oldVal[f], new: newVal[f] };
      isDifferent = true;
    }
  }
  
  if (isDifferent) {
    diffCount++;
    diffReport.push({ key, diffs: fieldDiffs });
  }
}

console.log(`\nKeys with different values: ${diffCount} / ${commonKeys.length}`);
console.log('\n--- SAMPLE DIFFERENCES ---');
diffReport.slice(0, 10).forEach(d => {
  console.log(`\nKey: ${d.key}`);
  for (const [f, v] of Object.entries(d.diffs)) {
    console.log(`  ${f}: ${v.old} -> ${v.new}`);
  }
});

// Let's write the full diff report to a file so we can view it
fs.writeFileSync('C:\\Users\\arjun\\.gemini\\antigravity-ide\\brain\\1b78fdd1-3f6a-4856-bd53-654d8af82842\\scratch\\fee_comparison_report.json', JSON.stringify({
  addedKeys,
  removedKeys,
  diffReport
}, null, 2));
