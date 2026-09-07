const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function parseAllCMaps(streams) {
  const map = {};
  for (const st of streams) {
    if (!st.includes('begincmap')) continue;
    // parse bfchar
    const bfCharRegex = /<([0-9a-fA-F]{4})>\s+<([0-9a-fA-F]+)>/g;
    let m;
    while ((m = bfCharRegex.exec(st)) !== null) {
      const src = m[1].toLowerCase();
      const destHex = m[2];
      let destStr = '';
      for (let i = 0; i < destHex.length; i += 4) {
        destStr += String.fromCharCode(parseInt(destHex.slice(i, i + 4), 16));
      }
      map[src] = destStr;
    }
  }
  return map;
}

function extractAllText(filePath) {
  const buf = fs.readFileSync(filePath);
  const s = buf.toString('latin1');
  
  const streams = [];
  let offset = 0;
  while (true) {
    const sStart = s.indexOf('stream', offset);
    if (sStart === -1) break;
    let dataStart = sStart + 6;
    if (s[dataStart] === '\r' && s[dataStart+1] === '\n') dataStart += 2;
    else if (s[dataStart] === '\n' || s[dataStart] === '\r') dataStart += 1;
    const sEnd = s.indexOf('endstream', dataStart);
    if (sEnd === -1) break;
    const chunk = s.substring(dataStart, sEnd);
    try {
      const inflated = zlib.inflateSync(Buffer.from(chunk, 'binary')).toString('latin1');
      streams.push(inflated);
    } catch(e) {}
    offset = sEnd + 9;
  }

  const cmap = parseAllCMaps(streams);
  
  const results = [];
  for (const st of streams) {
    if (st.includes('begincmap')) continue;
    
    // Look for TJ
    const tjRegex = /\[(.*?)\]\s*TJ/g;
    let tm;
    while ((tm = tjRegex.exec(st)) !== null) {
      const inside = tm[1];
      let str = '';
      const parts = inside.match(/<([0-9a-fA-F]+)>|(-?\d+)/g);
      if (parts) {
        for (const p of parts) {
          if (p.startsWith('<')) {
            const h = p.replace(/[<>]/g, '').toLowerCase();
            for (let i = 0; i < h.length; i += 4) {
              const code = h.slice(i, i + 4);
              str += cmap[code] || String.fromCharCode(parseInt(code, 16));
            }
          } else {
            const num = parseInt(p, 10);
            if (num < -150) str += ' ';
          }
        }
      }
      if (str.trim()) results.push(str.trim());
    }
  }
  return results;
}

const dir = 'C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam';
const files = [
  'Class10 Scholarship Exam Mcq 40 Questions.pdf',
  'Plus1 Scholarship Exam 40 Mcq Tough Level (1).pdf',
  'Plus Two Scholarship Exam 40 Mcqs (1).pdf'
];

for (const f of files) {
  const texts = extractAllText(path.join(dir, f));
  console.log('================', f, '================');
  console.log('Total texts:', texts.length);
  console.log(texts.slice(0, 35).join('\n'));
  fs.writeFileSync(path.join('docs', f.replace(/\.pdf$/, '_extracted.txt')), texts.join('\n'), 'utf8');
}
