const fs = require('fs');
const path = require('path');

const files = [
  'src/components/reports/AttendanceBranchSummary.tsx',
  'src/components/reports/AttendanceClassSummary.tsx',
  'src/components/reports/AttendanceClassDetail.tsx',
  'src/components/reports/AttendanceBranchDetail.tsx',
  'src/app/dashboard/parent/page.tsx',
  'src/app/dashboard/instructor/page.tsx',
  'src/app/dashboard/branch-manager/page.tsx',
  'src/app/dashboard/director/page.tsx',
  'src/app/dashboard/director/fee-followup/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/<video([^>]*?)alt="[^"]*"/g, '<video$1');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
