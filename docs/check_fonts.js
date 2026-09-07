const fs = require('fs');

const f10 = 'C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam/Class10 Scholarship Exam Mcq 40 Questions.pdf';
const buf = fs.readFileSync(f10);
const s = buf.toString('latin1');

// find all font descriptors / Font dictionaries
const fontObjRegex = /\/BaseFont\s+\/([^\s/]+)/g;
let m;
const fonts = new Set();
while ((m = fontObjRegex.exec(s)) !== null) {
  fonts.add(m[1]);
}
console.log('Fonts in Class 10:', Array.from(fonts));

// Let's inspect objects in Class 10
const objRegex = /(\d+\s+\d+\s+obj[\s\S]*?endobj)/g;
let objM;
while ((objM = objRegex.exec(s)) !== null) {
  const o = objM[1];
  if (o.includes('/Font') || o.includes('/Encoding') || o.includes('/ToUnicode')) {
    console.log('--- Font/Encoding Object ---');
    console.log(o.slice(0, 300));
  }
}
