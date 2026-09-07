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

const examAnalysis = {};

for (const file of files) {
  const filePath = path.join('C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam', file);
  const buf = fs.readFileSync(filePath);
  const s = buf.toString('latin1');
  
  let streamsText = '';
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
      if (chunk.includes('<~') || /^[!-u\s]+~>/.test(chunk)) {
        const a85 = decodeAscii85(chunk);
        streamsText += '\n' + zlib.inflateSync(a85).toString('latin1');
      } else {
        const bin = Buffer.from(chunk, 'latin1');
        streamsText += '\n' + zlib.inflateSync(bin).toString('latin1');
      }
    } catch (e) {
      try {
        const a85 = decodeAscii85(chunk);
        streamsText += '\n' + zlib.inflateSync(a85).toString('latin1');
      } catch(e2) {}
    }
    offset = sEnd + 9;
  }

  // Parse text snippets
  const textBlocks = [];
  // Match standard PDF string literals \( ... \) Tj or hex strings <...> Tj
  const literalRegex = /\((.*?)(?<!\\)\)\s*Tj/g;
  let lm;
  while ((lm = literalRegex.exec(streamsText)) !== null) {
    // clean octal escapes like \262
    let txt = lm[1]
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, '$1');
    textBlocks.push(txt.trim());
  }

  examAnalysis[file] = {
    length: streamsText.length,
    rawPreview: streamsText.slice(0, 1500),
    extractedTextCount: textBlocks.length,
    first50Texts: textBlocks.slice(0, 60),
    last50Texts: textBlocks.slice(-40)
  };
}

fs.writeFileSync('C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/all_exams_extracted.json', JSON.stringify(examAnalysis, null, 2));
console.log('All exams extracted successfully!');
