import fs from 'fs';

const existingData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const existingKeys = Object.keys(existingData);

console.log('Total existing keys in fee_structure_parsed.json:', existingKeys.length);
console.log('Sample existing keys:', existingKeys.slice(0, 10));

// Count by branch
const branchCount = {};
const planCount = {};
const classCount = {};

for (const key of existingKeys) {
  const entry = existingData[key];
  branchCount[entry.branch] = (branchCount[entry.branch] || 0) + 1;
  planCount[entry.plan] = (planCount[entry.plan] || 0) + 1;
  classCount[entry.class] = (classCount[entry.class] || 0) + 1;
}

console.log('\nExisting Branches:', branchCount);
console.log('\nExisting Plans:', planCount);
console.log('\nSample Classes:', Object.keys(classCount).slice(0, 20));
