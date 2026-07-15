import fs from 'fs';

const oldData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
const newData = JSON.parse(fs.readFileSync('docs/new_fee_structure_parsed_proposed.json', 'utf8'));

const commonKeys = Object.keys(oldData).filter(k => newData[k]);

let report = `# Detailed Installment-wise Fee Comparison (with One-Time Payment)\n\n`;
report += `This document compares each installment's value (including One-Time Payment) between the existing and new July 2026 structures.\n\n`;

// Group by branch
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
  report += `## Branch: ${branch}\n\n`;
  
  diffs.forEach(({ key, oldVal, newVal }) => {
    const parts = key.split('|');
    const plan = parts[1];
    const cls = parts[2];
    
    report += `### ${cls} (${plan})\n\n`;
    report += `| Plan / Installment | Structure | Total | Installment Breakdown |\n`;
    report += `| --- | --- | --- | --- |\n`;
    
    // One-Time Payment (OTP)
    report += `| **One-Time (OTP)** | Existing | ₹${oldVal.otp} | Paid upfront in full (₹${oldVal.otp}) |\n`;
    report += `| | New | ₹${newVal.otp} | Paid upfront in full (₹${newVal.otp}) |\n`;
    report += `| | *Diff* | *${newVal.otp - oldVal.otp}* | *${newVal.otp - oldVal.otp}* |\n`;

    // Quarterly
    report += `| **Quarterly** | Existing | ₹${oldVal.quarterly_total} | Q1: ₹${oldVal.q1} • Q2: ₹${oldVal.q2} • Q3: ₹${oldVal.q3} • Q4: ₹${oldVal.q4} |\n`;
    report += `| | New | ₹${newVal.quarterly_total} | Q1: ₹${newVal.q1} • Q2: ₹${newVal.q2} • Q3: ₹${newVal.q3} • Q4: ₹${newVal.q4} |\n`;
    report += `| | *Diff* | *${newVal.quarterly_total - oldVal.quarterly_total}* | Q1: *${newVal.q1 - oldVal.q1}* • Q2: *${newVal.q2 - oldVal.q2}* • Q3: *${newVal.q3 - oldVal.q3}* • Q4: *${newVal.q4 - oldVal.q4}* |\n`;
    
    // 6-Month
    if (oldVal.inst6_total > 0 || newVal.inst6_total > 0) {
      report += `| **6-Month** | Existing | ₹${oldVal.inst6_total} | M1-M5: ₹${oldVal.inst6_per} • M6: ₹${oldVal.inst6_last} |\n`;
      report += `| | New | ₹${newVal.inst6_total} | M1-M5: ₹${newVal.inst6_per} • M6: ₹${newVal.inst6_last} |\n`;
      report += `| | *Diff* | *${newVal.inst6_total - oldVal.inst6_total}* | M1-M5: *${newVal.inst6_per - oldVal.inst6_per}* • M6: *${newVal.inst6_last - oldVal.inst6_last}* |\n`;
    }
    
    // 8-Month
    if (oldVal.inst8_total > 0 || newVal.inst8_total > 0) {
      report += `| **8-Month** | Existing | ₹${oldVal.inst8_total} | M1-M7: ₹${oldVal.inst8_per} • M8: ₹${oldVal.inst8_last} |\n`;
      report += `| | New | ₹${newVal.inst8_total} | M1-M7: ₹${newVal.inst8_per} • M8: ₹${newVal.inst8_last} |\n`;
      report += `| | *Diff* | *${newVal.inst8_total - oldVal.inst8_total}* | M1-M7: *${newVal.inst8_per - oldVal.inst8_per}* • M8: *${newVal.inst8_last - oldVal.inst8_last}* |\n`;
    }
    
    report += `\n`;
  });
  
  report += `---\n\n`;
}

fs.writeFileSync('C:\\Users\\arjun\\.gemini\\antigravity-ide\\brain\\1b78fdd1-3f6a-4856-bd53-654d8af82842\\fee_installment_comparison.md', report);
console.log('Wrote fee_installment_comparison.md');
