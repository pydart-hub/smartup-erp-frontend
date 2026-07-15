import fs from 'fs';

try {
  const liveData = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));
  const proposedData = JSON.parse(fs.readFileSync('docs/new_fee_structure_parsed_proposed.json', 'utf8'));

  const liveKeys = Object.keys(liveData);
  const proposedKeys = Object.keys(proposedData);

  console.log('--- VERIFICATION ---');
  console.log(`Live fee database keys: ${liveKeys.length}`);
  console.log(`Proposed fee database keys: ${proposedKeys.length}`);

  let keysMatch = true;
  if (liveKeys.length !== proposedKeys.length) {
    keysMatch = false;
    console.error('❌ Keys count mismatch!');
  }

  for (const k of proposedKeys) {
    if (!liveData[k]) {
      keysMatch = false;
      console.error(`❌ Missing key in live database: ${k}`);
    } else {
      const liveVal = JSON.stringify(liveData[k]);
      const proposedVal = JSON.stringify(proposedData[k]);
      if (liveVal !== proposedVal) {
        keysMatch = false;
        console.error(`❌ Value mismatch for key: ${k}`);
      }
    }
  }

  if (keysMatch) {
    console.log('✅ Success: Live fee_structure_parsed.json is perfectly identical to the new proposed structure!');
  }

  // Validate that all entries have clean number values and no NaN values
  let cleanEntries = true;
  for (const [key, entry] of Object.entries(liveData)) {
    const numericFields = ['annual_fee', 'early_bird', 'otp', 'quarterly_total', 'q1', 'q2', 'q3', 'q4', 'inst6_total', 'inst6_per', 'inst6_last', 'inst8_total', 'inst8_per', 'inst8_last'];
    for (const field of numericFields) {
      if (typeof entry[field] !== 'number' || isNaN(entry[field])) {
        cleanEntries = false;
        console.error(`❌ Non-numeric value in key "${key}" for field "${field}":`, entry[field]);
      }
    }
  }

  if (cleanEntries) {
    console.log('✅ Success: All numeric fee fields are validated clean and have no NaN/undefined values.');
  }

} catch (err) {
  console.error('❌ Error during verification:', err);
}
