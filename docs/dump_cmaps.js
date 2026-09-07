const fs = require('fs');
const zlib = require('zlib');

const f10 = 'C:/Users/arjun/Downloads/SmartUp Documents/Scholarship Exam/Class10 Scholarship Exam Mcq 40 Questions.pdf';
const buf = fs.readFileSync(f10);
const s = buf.toString('latin1');

let offset = 0;
let count = 0;
while (true) {
  const sStart = s.indexOf('stream\r\n', offset);
  if (sStart === -1) {
    const sStart2 = s.indexOf('stream\n', offset);
    if (sStart2 === -1) break;
  }
  const streamKeyword = s.indexOf('stream', offset);
  if (streamKeyword === -1) break;
  
  let dataStart = streamKeyword + 6;
  if (s[dataStart] === '\r' && s[dataStart+1] === '\n') dataStart += 2;
  else if (s[dataStart] === '\n' || s[dataStart] === '\r') dataStart += 1;
  
  const sEnd = s.indexOf('endstream', dataStart);
  if (sEnd === -1) break;
  
  const chunk = s.substring(dataStart, sEnd);
  try {
    const uncompressed = zlib.inflateSync(Buffer.from(chunk, 'binary')).toString('latin1');
    count++;
    // check if it has /BaseFont or font definitions or cmap
    if (uncompressed.includes('/Font') || uncompressed.includes('/BaseFont') || uncompressed.includes('/Type /Font') || uncompressed.includes('FontDescriptor')) {
      console.log('Stream', count, 'contains Font reference:');
      console.log(uncompressed.slice(0, 500));
    }
    if (uncompressed.includes('begincmap')) {
      console.log('Stream', count, 'is CMap!');
      // print full cmap
      console.log(uncompressed);
    }
  } catch(e) {}
  
  offset = sEnd + 9;
}
