const fs = require('fs');
const zlib = require('zlib');

function decodeAscii85(str) {
  // ReportLab ascii85
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

const buf = fs.readFileSync('C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam/Class8_Scholarship_Exam.pdf');
const s = buf.toString('latin1');
const streamStart = s.indexOf('stream\n');
const streamEnd = s.indexOf('endstream');
console.log({ streamStart, streamEnd });
const rawStream = s.substring(streamStart + 7, streamEnd);
console.log('rawStream len:', rawStream.length);
try {
  const a85 = decodeAscii85(rawStream);
  console.log('a85 len:', a85.length);
  const inflated = zlib.inflateSync(a85);
  console.log('inflated len:', inflated.length);
  console.log('inflated content:\n', inflated.toString('utf8'));
} catch (e) {
  console.error('Error:', e);
}
