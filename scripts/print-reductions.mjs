import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function fetchWithRetry(url, options = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.log(`Fetch error (attempt ${i + 1}/${retries}): ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

const students = [
  { name: 'ADHEEB RILLAH K U', srr: '058', customer: 'ADHEEB RILLAH K U', old: 31000, new: 19000 },
  { name: 'AFRA NAVAS', srr: '053', customer: 'AFRA NAVAS', old: 31000, new: 19000 },
  { name: 'ALFONSA JENIFER', srr: '291', customer: 'ALFONSA JENIFER', old: 21000, new: 16000 },
  { name: 'FATHIMA SHASNA P S', srr: '068', customer: 'FATHIMA SHASNA P S', old: 24400, new: 18200 },
  { name: 'IRINE ANN MARY', srr: '092', customer: 'IRINE ANN MARYY', old: 25000, new: 19000 },
  { name: 'JEBIN VARGHESE P J', srr: '179', customer: 'JEBIN VARGHESE P J', old: 23700, new: 18000 },
  { name: 'MARY ELSA', srr: '065', customer: 'MARY ELSA', old: 25000, new: 19000 },
  { name: 'LAMIA ASHKER BABU', srr: '095', customer: 'LAMIA ASHKER BABU', old: 23700, new: 17700 },
  { name: 'MEHREEN ASHKER BABU', srr: '096', customer: 'MEHREEN ASHKER BABU', old: 21330, new: 17700 },
  { name: 'SAYED MOHAMMED MANSUR ANSARI', srr: '024', customer: 'SAYED MOHAMMED MANSUR ANSARI', old: 25000, new: 19600 },
  { name: 'YOHAN ANTONY', srr: '060', customer: 'YOHAN ANTONY', old: 31000, new: 19000 },
  { name: 'PAVAN KUMAR', srr: '196', customer: 'PAVAN KUMAR', old: 24400, new: 18500 },
  { name: 'AALIYAH ZAHARA FASIK', srr: '237', customer: 'AALIYAH ZAHARA FASIK - 1', old: 16900, new: 14250 },
  { name: 'YASEEN T A', srr: '235', customer: 'YASEEN T A', old: 17800, new: 15000 },
  { name: 'RIZA FATHIMA P S', srr: '234', customer: 'RIZA FATHIMA P S', old: 16900, new: 14250 },
  { name: 'SHALMA MARY', srr: '229', customer: 'SHALMA MARY', old: 16900, new: 14250 },
  { name: 'AYESHA MINA K S', srr: '227', customer: 'AYESHA MINA K S', old: 17800, new: 15000 },
  { name: 'WAFA NAWAN', srr: '226', customer: 'WAFA NAWAN', old: 25000, new: 21000 },
  { name: 'JOHAAN JANSON K J', srr: '225', customer: 'JOHAAN JANSON K J', old: 17300, new: 14600 },
  { name: 'BAKI ANAS', srr: '245', customer: 'BAKI ANAS', old: 14630, new: 12350 },
  { name: 'BAHA ANAS', srr: '244', customer: 'BAHA ANAS', old: 15400, new: 12350 },
  { name: 'RAZIN HASSAN', srr: '242', customer: 'RAZIN HASSAN', old: 16900, new: 14250 },
  { name: 'IBNU SAHIL SIYAD', srr: '240', customer: 'IBNU SAHIL SIYAD', old: 15400, new: 13000 },
  { name: 'MUHAMMED AZHAB AKBAR', srr: '238', customer: 'MUHAMMED AZHAB AKBAR', old: 17800, new: 15000 },
  { name: 'MOHAMMED AMAL M A', srr: '255', customer: 'MOHAMMED AMAL M A', old: 17800, new: 15000 },
  { name: 'ADWIN SAM PAUL', srr: '254', customer: 'ADWIN SAM PAUL', old: 25000, new: 21000 },
  { name: 'IFFAH MANHA A M', srr: '249', customer: 'IFFAH MANHA A M', old: 15400, new: 12350 },
  { name: 'NIHAN P S', srr: '248', customer: 'NIHAN P S', old: 15400, new: 13000 },
  { name: 'MOHAMMED RAYHAN K M', srr: '246', customer: 'MOHAMMED RAYHAN K M', old: 17800, new: 15000 },
  { name: 'AMRA AMEENA', srr: '256', customer: 'AMRA AMEENA', old: 15000, new: 12650 }
];

let totalOld = 0;
let totalNew = 0;
let totalDiff = 0;

console.log('| # | Student Name | SRR | Old Fee | Converted Fee | Fee Reduced |');
console.log('|:---:|:---|:---:|:---:|:---:|:---:|');
students.forEach((s, idx) => {
  const diff = s.old - s.new;
  totalOld += s.old;
  totalNew += s.new;
  totalDiff += diff;
  console.log(`| ${idx + 1} | ${s.name} | ${s.srr} | ₹${s.old.toLocaleString('en-IN')} | ₹${s.new.toLocaleString('en-IN')} | **₹${diff.toLocaleString('en-IN')}** |`);
});

console.log(`\nTOTAL OLD: ₹${totalOld.toLocaleString('en-IN')}`);
console.log(`TOTAL NEW: ₹${totalNew.toLocaleString('en-IN')}`);
console.log(`TOTAL REDUCED: ₹${totalDiff.toLocaleString('en-IN')}`);
