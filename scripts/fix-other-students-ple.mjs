import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const baseUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function run() {
  const scriptName = 'temp_fix_other_students_ple';
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});

  const patchCode = `
# EJO GEORGE
frappe.db.set_value("Payment Ledger Entry", "a60ckd8pvo", "amount", 1700, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "a60ckd8pvo", "amount_in_account_currency", 1700, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "f60gf960fo", "amount", 4500, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "f60gf960fo", "amount_in_account_currency", 4500, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "960l2c6jgu", "amount", 3500, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "960l2c6jgu", "amount_in_account_currency", 3500, update_modified=False)

# ALEETA XAVIER
frappe.db.set_value("Payment Ledger Entry", "c0pb86qhad", "amount", 2000, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "c0pb86qhad", "amount_in_account_currency", 2000, update_modified=False)

# AYANA RAJEEV
frappe.db.set_value("Payment Ledger Entry", "bm6n51hcdu", "amount", 2700, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "bm6n51hcdu", "amount_in_account_currency", 2700, update_modified=False)

# FIDHA P ANS
frappe.db.set_value("Payment Ledger Entry", "0o7mg8brr9", "amount", 0, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "0o7mg8brr9", "amount_in_account_currency", 0, update_modified=False)

# RIYAN M THAHAR
frappe.db.set_value("Payment Ledger Entry", "agbga4ka90", "amount", 0, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "agbga4ka90", "amount_in_account_currency", 0, update_modified=False)

frappe.db.commit()

frappe.response["message"] = {
    "status": "success",
    "ejo_10117": frappe.db.get_value("Payment Ledger Entry", "a60ckd8pvo", "amount"),
    "ejo_10118": frappe.db.get_value("Payment Ledger Entry", "f60gf960fo", "amount"),
    "ejo_10119": frappe.db.get_value("Payment Ledger Entry", "960l2c6jgu", "amount"),
    "aleeta_04266": frappe.db.get_value("Payment Ledger Entry", "c0pb86qhad", "amount"),
    "ayana_05418": frappe.db.get_value("Payment Ledger Entry", "bm6n51hcdu", "amount"),
    "fidha_03839": frappe.db.get_value("Payment Ledger Entry", "0o7mg8brr9", "amount"),
    "riyan_07754": frappe.db.get_value("Payment Ledger Entry", "agbga4ka90", "amount")
}
`;

  console.log('Creating Server Script...');
  const createRes = await fetch(`${baseUrl}/api/resource/Server Script`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: scriptName,
      script_type: 'API',
      api_method: scriptName,
      allow_guest: 0,
      disabled: 0,
      script: patchCode
    })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Server Script: ${await createRes.text()}`);
  }

  console.log('Executing fix across 5 students...');
  const callRes = await fetch(`${baseUrl}/api/method/${scriptName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });

  const callData = await callRes.json();
  console.log('Execution result:', JSON.stringify(callData.message, null, 2));

  // Clean up
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});
  console.log('Cleaned up Server Script.');
}

run().catch(console.error);
