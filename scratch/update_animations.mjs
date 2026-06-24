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

  // 1. Update loading animation
  newContent = newContent.replace(/\/Logo%20Icon%20LOOK%20ALPHA\.mov/g, '/Logo%20Icon%20LOOK%20ALPHA.webm');
  newContent = newContent.replace(/type="video\/quicktime"/g, 'type="video/webm"');

  // 2. Update welcome animation (replace img with video)
  // Find <img src="/welcome.gif" ... /> and replace it with <video src="/Logo Icon Smile ALPHA.webm" autoPlay loop muted playsInline ... />
  // We need to keep the className and alt if any.
  newContent = newContent.replace(/<img([^>]*)src="\/welcome\.gif"([^>]*)(\/?)>/g, (match, p1, p2, p3) => {
    return `<video${p1}src="/Logo%20Icon%20Smile%20ALPHA.webm" autoPlay loop muted playsInline${p2} />`;
  });

  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    changedCount++;
    console.log('Updated animations in', file);
  }
}

console.log('Total files updated:', changedCount);
