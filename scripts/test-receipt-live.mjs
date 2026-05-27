/**
 * LIVE test: sends a payment receipt for the test student
 * Invoice: ACC-SINV-2026-08151 (Partly Paid, ₹3100 paid of ₹6100)
 * Guardian email: onxinsane@gmail.com  |  WhatsApp: 8089835558
 *
 * Run: node scripts/test-receipt-live.mjs
 */

const INVOICE_ID = 'ACC-SINV-2026-08151';
const SERVER_URL = 'http://localhost:3000';

// Build a smartup_session cookie (base64 JSON) for admin
const sessionData = {
  email: 'arjunprakashk7@gmail.com',
  full_name: 'Arjun Prakash',
  roles: ['Administrator', 'System Manager', 'Branch Manager'],
};
const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');

async function main() {
  console.log('=== LIVE PAYMENT RECEIPT TEST ===');
  console.log(`Invoice: ${INVOICE_ID}`);
  console.log(`Server: ${SERVER_URL}`);
  console.log('');

  const res = await fetch(`${SERVER_URL}/api/payments/send-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `smartup_session=${sessionCookie}`,
    },
    body: JSON.stringify({ invoice_id: INVOICE_ID }),
  });

  const statusCode = res.status;
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }

  console.log(`Response: ${statusCode}`);
  console.log(JSON.stringify(body, null, 2));

  if (res.ok) {
    console.log('');
    console.log('✅ SUCCESS!');
    console.log(`Email sent to: ${body.recipient}`);
    console.log('WhatsApp attempted to: 8089835558 (+918089835558)');
  } else {
    console.log('');
    console.log('❌ FAILED');
  }
}

main().catch(console.error);
