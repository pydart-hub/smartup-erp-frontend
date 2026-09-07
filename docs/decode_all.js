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

function parseCMap(cmapStr) {
  const map = {};
  // match bfchar: <0032> <004f>
  const bfCharRegex = /<([0-9a-fA-F]{4})>\s+<([0-9a-fA-F]{4})>/g;
  let m;
  while ((m = bfCharRegex.exec(cmapStr)) !== null) {
    const src = m[1].toLowerCase();
    const dest = String.fromCharCode(parseInt(m[2], 16));
    map[src] = dest;
  }
  // match bfrange: <0014> <0016> <0031> or <0014> <0016> [ <0031> <0032> <0033> ]
  const bfRangeRegex = /<([0-9a-fA-F]{4})>\s+<([0-9a-fA-F]{4})>\s+<([0-9a-fA-F]{4})>/g;
  while ((m = bfRangeRegex.exec(cmapStr)) !== null) {
    const start = parseInt(m[1], 16);
    const end = parseInt(m[2], 16);
    let destStart = parseInt(m[3], 16);
    for (let code = start; code <= end; code++) {
      const src = code.toString(16).padStart(4, '0').toLowerCase();
      map[src] = String.fromCharCode(destStart++);
    }
  }
  return map;
}

function extractPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const s = buf.toString('latin1');
  
  // 1. extract all streams
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
    let inflated = null;
    try {
      if (chunk.includes('<~') || /^[!-u\s]+~>/.test(chunk)) {
        inflated = zlib.inflateSync(decodeAscii85(chunk)).toString('latin1');
      } else {
        inflated = zlib.inflateSync(Buffer.from(chunk, 'binary')).toString('latin1');
      }
    } catch(e) {
      try {
        inflated = zlib.inflateSync(decodeAscii85(chunk)).toString('latin1');
      } catch(e2) {}
    }
    if (inflated) streams.push(inflated);
    offset = sEnd + 9;
  }

  // 2. build combined CMap
  const fullCMap = {};
  for (const st of streams) {
    if (st.includes('begincmap')) {
      const cm = parseCMap(st);
      Object.assign(fullCMap, cm);
    }
  }

  // 3. decode hex TJ tokens [<0032>0<0051>...] TJ or (literal) Tj
  const lines = [];
  for (const st of streams) {
    if (st.includes('begincmap')) continue;
    
    // Hex TJ blocks: [ ... ] TJ
    const hexTjRegex = /\[(.*?)\]\s*TJ/g;
    let m;
    while ((m = hexTjRegex.exec(st)) !== null) {
      const inside = m[1];
      let decodedStr = '';
      const hexParts = inside.match(/<([0-9a-fA-F]+)>/g);
      if (hexParts) {
        for (const hp of hexParts) {
          const rawHex = hp.replace(/[<>]/g, '').toLowerCase();
          // split every 4 chars
          for (let i = 0; i < rawHex.length; i += 4) {
            const token = rawHex.slice(i, i + 4);
            if (fullCMap[token]) {
              decodedStr += fullCMap[token];
            } else {
              // fallback
              decodedStr += String.fromCharCode(parseInt(token, 16));
            }
          }
        }
      }
      if (decodedStr.trim()) lines.push(decodedStr.trim());
    }

    // Literal Tj blocks: ( ... ) Tj
    const litTjRegex = /\((.*?)(?<!\\)\)\s*Tj/g;
    while ((m = litTjRegex.exec(st)) !== null) {
      let txt = m[1]
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\([()\\])/g, '$1');
      if (txt.trim()) lines.push(txt.trim());
    }
  }

  return lines;
}

const dir = 'C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam';
const files = [
  'Class8_Scholarship_Exam.pdf',
  'Complete_Class9_Scholarship_Exam.pdf',
  'Class10 Scholarship Exam Mcq 40 Questions.pdf',
  'Plus1 Scholarship Exam 40 Mcq Tough Level (1).pdf',
  'Plus Two Scholarship Exam 40 Mcqs (1).pdf'
];

const parsedExams = {};
for (const f of files) {
  const fullPath = path.join(dir, f);
  const lines = extractPdf(fullPath);
  parsedExams[f] = {
    lineCount: lines.length,
    header: lines.slice(0, 15),
    sampleQuestions: lines.filter(l => /^\d+[\.\)]/.test(l)).slice(0, 10),
    totalQuestionCount: lines.filter(l => /^\d+[\.\)]/.test(l)).length,
    answerKey: lines.filter(l => /Answer|Key|1-[A-D]|1\s*[\.:-]\s*[A-D]/i.test(l))
  };
}

fs.writeFileSync('C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/parsed_exams_summary.json', JSON.stringify(parsedExams, null, 2));
console.log('Finished parsing summary for all 5 exams!');
