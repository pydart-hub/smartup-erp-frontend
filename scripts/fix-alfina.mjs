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
  const scriptName = 'temp_fix_alfina_ple';
  // Delete existing if any
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});

  const patchCode = `
frappe.db.set_value("Payment Ledger Entry", "8i7i4ecevv", "amount", 3300, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "8i7i4ecevv", "amount_in_account_currency", 3300, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "3i7m38fhtr", "amount", 3300, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "3i7m38fhtr", "amount_in_account_currency", 3300, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "di7qh9ujuj", "amount", 3300, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "di7qh9ujuj", "amount_in_account_currency", 3300, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "6i7tkkpdei", "amount", 3300, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "6i7tkkpdei", "amount_in_account_currency", 3300, update_modified=False)

frappe.db.set_value("Payment Ledger Entry", "4i817gk4u3", "amount", 3200, update_modified=False)
frappe.db.set_value("Payment Ledger Entry", "4i817gk4u3", "amount_in_account_currency", 3200, update_modified=False)

frappe.db.set_value("Sales Invoice", "ACC-SINV-2026-13544", "outstanding_amount", 0, update_modified=False)
frappe.db.set_value("Sales Invoice", "ACC-SINV-2026-13544", "status", "Paid", update_modified=False)

ps_name = frappe.db.get_value("Payment Schedule", {"parent": "ACC-SINV-2026-13544"}, "name")
if ps_name:
    frappe.db.set_value("Payment Schedule", ps_name, "outstanding", 0, update_modified=False)
    frappe.db.set_value("Payment Schedule", ps_name, "paid_amount", 3300, update_modified=False)

pe_ref = frappe.db.get_value("Payment Entry Reference", {"parent": "ACC-PAY-2026-10858", "reference_name": "ACC-SINV-2026-13544"}, "name")
if pe_ref:
    frappe.db.set_value("Payment Entry Reference", pe_ref, "outstanding_amount", 0, update_modified=False)

frappe.db.commit()

frappe.response["message"] = {
  "status": "success",
  "inv1_status": frappe.db.get_value("Sales Invoice", "ACC-SINV-2026-13544", ["status", "outstanding_amount"], as_dict=True),
  "ple_13544": frappe.db.get_value("Payment Ledger Entry", "8i7i4ecevv", "amount"),
  "ple_13545": frappe.db.get_value("Payment Ledger Entry", "3i7m38fhtr", "amount"),
  "ple_13548": frappe.db.get_value("Payment Ledger Entry", "4i817gk4u3", "amount")
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

  console.log('Executing Server Script...');
  const callRes = await fetch(`${baseUrl}/api/method/${scriptName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });

  const callData = await callRes.json();
  console.log('Execution result:', callData);

  // Clean up server script
  await fetch(`${baseUrl}/api/resource/Server Script/${scriptName}`, { method: 'DELETE', headers }).catch(() => {});
  console.log('Cleaned up Server Script.');
}

run().catch(console.error);

