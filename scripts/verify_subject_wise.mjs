import fs from 'fs';

const liveData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const keys = Object.keys(liveData);

// Find subject-wise keys
// These keys have class/subject names like Physics, Chemistry, Maths, Phy-Chem, Phy-Maths, Chem-Maths
// or prefixed with "10 Physics", "10 Biology", "10 Chemistry", "10 Maths"
const subjectWiseKeys = keys.filter(k => {
  const parts = k.split('|');
  const cls = parts[2];
  return ['Physics', 'Chemistry', 'Maths', 'Biology', 'Phy-Chem', 'Phy-Maths', 'Chem-Maths', '10 Physics', '10 Biology', '10 Chemistry', '10 Maths'].includes(cls);
});

console.log('--- SUBJECT-WISE KEYS FOUND ---');
console.log(`Total subject-wise keys: ${subjectWiseKeys.length}`);
console.log('\nKeys list:');
subjectWiseKeys.forEach(k => {
  console.log(`- ${k}: OTP = ₹${liveData[k].otp}, Annual = ₹${liveData[k].annual_fee}`);
});
