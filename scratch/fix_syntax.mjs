import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/<video([^>]*)\/\s*\/>/g, '<video$1/>');

  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    changedCount++;
    console.log('Fixed syntax in', file);
  }
}

console.log('Total files updated:', changedCount);
