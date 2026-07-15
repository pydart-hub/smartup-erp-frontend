import fs from 'fs';

const existingData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const existingKeys = Object.keys(existingData);

const kdvKeys = existingKeys.filter(k => k.toLowerCase().includes('kadavanthara'));
console.log('Kadavanthara keys:', kdvKeys);
console.log('Sample data for one key:', existingData[kdvKeys[0]]);
