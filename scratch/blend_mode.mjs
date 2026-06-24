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
  let newContent = content;

  // For welcome.gif, ensure it has mix-blend-multiply
  // We can just add mix-blend-multiply if it's not already there.
  newContent = newContent.replace(/(<img[^>]*src="\/welcome\.gif"[^>]*className="[^"]*)(")/g, (match, p1, p2) => {
    if (!p1.includes('mix-blend-multiply')) {
      return `${p1} mix-blend-multiply${p2}`;
    }
    return match;
  });

  // Also handle loading.mp4 occurrences to have mix-blend-multiply
  newContent = newContent.replace(/(<video[^>]*src="\/loading\.mp4"[^>]*className="[^"]*)(")/g, (match, p1, p2) => {
    if (!p1.includes('mix-blend-multiply')) {
      return `${p1} mix-blend-multiply${p2}`;
    }
    return match;
  });

  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    changedCount++;
    console.log('Updated mix-blend-mode in', file);
  }
}

console.log('Total files updated for blend modes:', changedCount);
