import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, '../docs/fee_structure_parsed.json');
const data = JSON.parse(readFileSync(filePath, 'utf8'));

// ── Corrections ────────────────────────────────────────────────────────────────
// Actual Edappally Advanced fee structure totals (verified from Frappe):
//   9/10 CBSE:  1-inst=39400,  4-inst=40900,  6-inst=41900,  8-inst=43000
//   9/10 State: 1-inst=28400,  4-inst=29500,  6-inst=30200,  8-inst=31000
//   Plus 1/2:   1-inst=50400,  4-inst=52300,  6-inst=53600,  8-inst=55000

// ── 9 CBSE (same as 10 CBSE) ──────────────────────────────────────────────────
for (const key of ['Edapally|Advanced|9 Cbse', 'Edapally|Advanced|10 Cbse']) {
  data[key].otp = 39400;           // was 39500 (off by 100)
  // quarterly/6-inst/8-inst per-installment values verified correct (40900/41900/43000 ✓)
  console.log(`Fixed otp on ${key}`);
}

// ── 9 State (same as 10 State) ─────────────────────────────────────────────────
// Full rebuild: old values were for a different (higher) price tier
// 4-inst=29500: q1=10300, q2=7400, q3=7400, q4=4400 (sum=29500)
// 6-inst=30200: per=5100, last=4700 (5100*5+4700=30200)
// 8-inst=31000: per=4000, last=3000 (4000*7+3000=31000)
for (const key of ['Edapally|Advanced|9 State', 'Edapally|Advanced|10 State']) {
  data[key].otp = 28400;
  data[key].quarterly_total = 29500;
  data[key].q1 = 10300;
  data[key].q2 = 7400;
  data[key].q3 = 7400;
  data[key].q4 = 4400;
  data[key].inst6_total = 30200;
  data[key].inst6_per = 5100;
  data[key].inst6_last = 4700;
  data[key].inst8_total = 31000;
  data[key].inst8_per = 4000;
  data[key].inst8_last = 3000;
  console.log(`Rebuilt ${key}`);
}

// ── Plus One & Plus Two ────────────────────────────────────────────────────────
for (const key of ['Edapally|Advanced|Plus One', 'Edapally|Advanced|Plus Two']) {
  data[key].otp = 50400;           // was 50500 (off by 100)
  // quarterly/6-inst/8-inst per-installment values verified correct (52300/53600/55000 ✓)
  console.log(`Fixed otp on ${key}`);
}

// ── Verify sums ────────────────────────────────────────────────────────────────
const toCheck = [
  ['Edapally|Advanced|9 Cbse',    39400, 40900, 41900, 43000],
  ['Edapally|Advanced|10 Cbse',   39400, 40900, 41900, 43000],
  ['Edapally|Advanced|9 State',   28400, 29500, 30200, 31000],
  ['Edapally|Advanced|10 State',  28400, 29500, 30200, 31000],
  ['Edapally|Advanced|Plus One',  50400, 52300, 53600, 55000],
  ['Edapally|Advanced|Plus Two',  50400, 52300, 53600, 55000],
];

let allOk = true;
for (const [key, expOtp, exp4, exp6, exp8] of toCheck) {
  const e = data[key];
  const q4sum = e.q1 + e.q2 + e.q3 + e.q4;
  const i6sum = e.inst6_per * 5 + e.inst6_last;
  const i8sum = e.inst8_per * 7 + e.inst8_last;
  const ok = e.otp === expOtp && q4sum === exp4 && i6sum === exp6 && i8sum === exp8;
  console.log(`${ok ? '✓' : '✗'} ${key}: otp=${e.otp} q=${q4sum} i6=${i6sum} i8=${i8sum}`);
  if (!ok) allOk = false;
}

if (allOk) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log('\n✓ fee_structure_parsed.json updated successfully');
} else {
  console.error('\n✗ Verification failed — file NOT updated');
  process.exit(1);
}
