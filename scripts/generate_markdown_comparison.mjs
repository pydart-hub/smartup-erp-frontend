import fs from 'fs';

const oldData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const newData = JSON.parse(fs.readFileSync('docs/new_fee_structure_parsed_proposed.json', 'utf8'));

const oldKeys = Object.keys(oldData);
const newKeys = Object.keys(newData);

const addedKeys = newKeys.filter(k => !oldKeys.includes(k));
const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
const commonKeys = oldKeys.filter(k => newKeys.includes(k));

let report = `# Detailed Fee Structure Comparison (Existing vs July 2026 New)\n\n`;

report += `This document lists the detailed comparison between the existing fee structure and the new 9-Month fee structure starting July 2026.\n\n`;

report += `## Summary of Changes\n\n`;
report += `| Metric | Count |\n`;
report += `| --- | --- |\n`;
report += `| Existing Total Keys | ${oldKeys.length} |\n`;
report += `| New Total Keys | ${newKeys.length} |\n`;
report += `| Added Keys | ${addedKeys.length} |\n`;
report += `| Removed Keys | ${removedKeys.length} |\n`;
report += `| Keys with Changed Amounts | ${commonKeys.filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])).length} |\n\n`;

report += `## Added Keys\n\n`;
if (addedKeys.length > 0) {
  addedKeys.forEach(k => {
    report += `- \`${k}\`\n`;
  });
} else {
  report += `None\n`;
}
report += `\n`;

report += `## Removed Keys\n\n`;
if (removedKeys.length > 0) {
  removedKeys.forEach(k => {
    report += `- \`${k}\`\n`;
  });
} else {
  report += `None\n`;
}
report += `\n`;

report += `## Price Comparison (For Keys Present in Both)\n\n`;

// Group by branch to make it readable
const byBranch = {};
for (const key of commonKeys) {
  const oldVal = oldData[key];
  const newVal = newData[key];
  
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue; // skip identical
  
  const branch = oldVal.branch;
  if (!byBranch[branch]) byBranch[branch] = [];
  
  byBranch[branch].push({ key, oldVal, newVal });
}

for (const [branch, diffs] of Object.entries(byBranch)) {
  report += `### Branch: ${branch}\n\n`;
  report += `| Class/Plan | Type | Annual Fee | Early Bird | OTP | Quarterly | 6-Inst | 8-Inst |\n`;
  report += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  
  diffs.forEach(({ key, oldVal, newVal }) => {
    const parts = key.split('|');
    const plan = parts[1];
    const cls = parts[2];
    
    // Existing values row
    report += `| **${cls} (${plan})** | Existing | ₹${oldVal.annual_fee} | ₹${oldVal.early_bird} | ₹${oldVal.otp} | ₹${oldVal.quarterly_total} | ₹${oldVal.inst6_total} | ₹${oldVal.inst8_total} |\n`;
    // New values row
    report += `| | New | ₹${newVal.annual_fee} | ₹${newVal.early_bird} | ₹${newVal.otp} | ₹${newVal.quarterly_total} | ₹${newVal.inst6_total} | ₹${newVal.inst8_total} |\n`;
    report += `| | *Diff* | *${newVal.annual_fee - oldVal.annual_fee}* | *${newVal.early_bird - oldVal.early_bird}* | *${newVal.otp - oldVal.otp}* | *${newVal.quarterly_total - oldVal.quarterly_total}* | *${newVal.inst6_total - oldVal.inst6_total}* | *${newVal.inst8_total - oldVal.inst8_total}* |\n`;
  });
  report += `\n`;
}

fs.writeFileSync('C:\\Users\\arjun\\.gemini\\antigravity-ide\\brain\\1b78fdd1-3f6a-4856-bd53-654d8af82842\\fee_comparison_details.md', report);
console.log('Wrote fee_comparison_details.md');
