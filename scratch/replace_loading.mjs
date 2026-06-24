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
  if (content.includes('loading.gif')) {
    // Replace <img src="/loading.gif" alt="Loading" className="w-20 h-20 object-contain" />
    // with <video src="/loading.mp4" autoPlay loop muted playsInline className="w-20 h-20 object-contain" />
    
    // First, generic replacement of src="loading.gif" to the video src with attributes
    let newContent = content.replace(/src="\/loading\.gif"/g, 'src="/loading.mp4" autoPlay loop muted playsInline');
    
    // Then replace the <img tag with <video
    newContent = newContent.replace(/<img([^>]*)src="\/loading\.mp4"/g, '<video$1src="/loading.mp4"');
    
    // In TSX, <video ... /> is valid
    if (newContent !== content) {
      fs.writeFileSync(file, newContent);
      changedCount++;
      console.log('Updated', file);
    }
  }
}

console.log('Total files updated:', changedCount);
