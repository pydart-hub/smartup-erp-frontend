const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.tsx', { cwd: process.cwd() });
let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // use [\s\S] to match across newlines inside <video ... >
    const newContent = content.replace(/(<video[\s\S]*?)(\s+alt=\"[^\"]*\")([\s\S]*?>)/g, '$1$3');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed ${file}`);
      fixedCount++;
    }
  }
});
console.log(`Fixed ${fixedCount} files`);
