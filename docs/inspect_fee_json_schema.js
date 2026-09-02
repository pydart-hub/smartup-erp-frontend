const fs = require('fs');

const data = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const keys = Object.keys(data);
console.log(`Total keys in docs/fee_structure_parsed.json: ${keys.length}`);

console.log('\nSample keys:');
keys.slice(0, 15).forEach(k => {
  console.log(k);
  console.log(JSON.stringify(data[k], null, 2));
});
