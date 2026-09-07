const fs = require('fs');
const zlib = require('zlib');

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

const file = 'C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam/Class10 Scholarship Exam Mcq 40 Questions.pdf';
const buf = fs.readFileSync(file);
const s = buf.toString('latin1');

// Look for ToUnicode CMap
const cmapMatches = s.match(/\/ToUnicode\s+(\d+\s+\d+\s+R)/g);
console.log('ToUnicode CMaps:', cmapMatches);

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
    if (inflated.includes('beginbfrange') || inflated.includes('beginbfchar')) {
      console.log('Found CMap stream!\n', inflated.slice(0, 1000));
    }
  } catch(e) {}
  offset = sEnd + 9;
}
