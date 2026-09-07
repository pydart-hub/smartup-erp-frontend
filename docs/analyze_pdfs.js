const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function decodeAscii85(str) {
  str = str.replace(/<~|~>|\s/g, '');
  const out = [];
  for (let i = 0; i < str.length; i += 5) {
    if (str[i] === 'z') {
      out.push(0, 0, 0, 0);
      i -= 4;
      continue;
    }
    let chunk = str.slice(i, i + 5);
    const padding = 5 - chunk.length;
    chunk += 'uuuuu'.slice(0, padding);
    let val = 0;
    for (let j = 0; j < 5; j++) {
      val = val * 85 + (chunk.charCodeAt(j) - 33);
    }
    const b = [
      (val >>> 24) & 0xff,
      (val >>> 16) & 0xff,
      (val >>> 8) & 0xff,
      val & 0xff
    ];
    for (let j = 0; j < 4 - padding; j++) {
      out.push(b[j]);
    }
  }
  return Buffer.from(out);
}

const files = [
  'Class8_Scholarship_Exam.pdf',
  'Complete_Class9_Scholarship_Exam.pdf',
  'Class10 Scholarship Exam Mcq 40 Questions.pdf',
  'Plus1 Scholarship Exam 40 Mcq Tough Level (1).pdf',
  'Plus Two Scholarship Exam 40 Mcqs (1).pdf'
];

const results = {};

for (const file of files) {
  const filePath = path.join('C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam', file);
  const buf = fs.readFileSync(filePath);
  const s = buf.toString('latin1');
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  let fullText = '';
  while ((m = regex.exec(s)) !== null) {
    try {
      const a85 = decodeAscii85(m[1]);
      const inflated = zlib.inflateSync(a85).toString('utf8');
      fullText += '\n' + inflated;
    } catch(e) {
      try {
        const directInflated = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('utf8');
        fullText += '\n' + directInflated;
      } catch(e2) {}
    }
  }

  // Extract all text inside parentheses followed by Tj or ' or "
  const textMatches = [];
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let tm;
  while ((tm = tjRegex.exec(fullText)) !== null) {
    textMatches.push(tm[1]);
  }

  results[file] = {
    totalStrings: textMatches.length,
    sample: textMatches.slice(0, 40)
  };
}

fs.writeFileSync('C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/pdf_analysis.json', JSON.stringify(results, null, 2));
console.log('Done analysis!');
