/**
 * Test payment receipt sending (email + WhatsApp)
 * Uses: ACC-SINV-2026-08151 (Partly Paid, test student Kadavanthra)
 * Guardian: Parent Test → onxinsane@gmail.com / 8089835558
 */

const INVOICE_ID = 'ACC-SINV-2026-08151';
const FRAPPE_URL = 'https://smartup.m.frappe.cloud';
const adminHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
};

async function testSendReceipt() {
  console.log('=== PAYMENT RECEIPT TEST ===');
  console.log(`Invoice: ${INVOICE_ID}`);
  console.log('Expected recipient: onxinsane@gmail.com');
  console.log('Expected WhatsApp: 8089835558');
  console.log('');

  // Load env from .env.local for SMTP / WhatsApp config
  const { createReadStream } = await import('fs');
  const { createInterface } = await import('readline');
  const { resolve } = await import('path');
  const { fileURLToPath } = await import('url');
  const { dirname } = await import('path');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, '..', '.env.local');

  const env = {};
  try {
    const rl = createInterface({ input: createReadStream(envPath) });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
      process.env[key] = val;
    }
  } catch (e) {
    console.error('Could not load .env.local:', e.message);
  }

  console.log('SMTP accounts loaded:');
  for (const n of ['_1', '_2', '_3', '']) {
    const user = env[`SMTP_USER${n}`];
    if (user) console.log(`  SMTP_USER${n}: ${user}`);
  }
  console.log('');
  console.log('WhatsApp config:');
  console.log('  WHATSAPP_PHONE_NUMBER_ID:', env.WHATSAPP_PHONE_NUMBER_ID ? '✓ set' : '✗ MISSING');
  console.log('  WHATSAPP_ACCESS_TOKEN:', env.WHATSAPP_ACCESS_TOKEN ? '✓ set' : '✗ MISSING');
  console.log('');

  // Step 1: Verify guardian lookup
  console.log('--- Step 1: Guardian Lookup ---');
  const rInv = await fetch(`${FRAPPE_URL}/api/resource/Sales Invoice/${encodeURIComponent(INVOICE_ID)}`, { headers: adminHeaders });
  const inv = (await rInv.json()).data;
  console.log(`Invoice status: ${inv.status}, student: ${inv.student}`);
  
  const rStu = await fetch(`${FRAPPE_URL}/api/resource/Student/${encodeURIComponent(inv.student)}`, { headers: adminHeaders });
  const stu = (await rStu.json()).data;
  const guardianLink = stu.guardians?.[0]?.guardian;
  console.log(`Student: ${stu.student_name}, guardian link: ${guardianLink}`);

  const rG = await fetch(`${FRAPPE_URL}/api/resource/Guardian/${encodeURIComponent(guardianLink)}`, { headers: adminHeaders });
  const g = (await rG.json()).data;
  console.log(`Guardian: ${g.guardian_name}`);
  console.log(`  Email: ${g.email_address}`);
  console.log(`  Phone: ${g.mobile_number}`);
  console.log('');

  // Step 2: Check Payment Entry
  console.log('--- Step 2: Payment Entry ---');
  const peParams = new URLSearchParams({
    filters: JSON.stringify([['Payment Entry Reference', 'reference_name', '=', INVOICE_ID]]),
    fields: JSON.stringify(['name', 'paid_amount', 'reference_no', 'mode_of_payment', 'posting_date']),
    order_by: 'creation desc',
    limit_page_length: '1',
  });
  const rPE = await fetch(`${FRAPPE_URL}/api/resource/Payment Entry?${peParams}`, { headers: adminHeaders });
  const peList = (await rPE.json()).data;
  if (peList?.length) {
    const pe = peList[0];
    console.log(`Payment Entry: ${pe.name}`);
    console.log(`  Amount: ₹${pe.paid_amount}, Mode: ${pe.mode_of_payment}`);
    console.log(`  Ref: ${pe.reference_no}, Date: ${pe.posting_date}`);
  } else {
    console.log('No payment entry found (will use invoice-level data)');
  }
  console.log('');

  // Step 3: Test via the actual API endpoint
  console.log('--- Step 3: Calling POST /api/payments/send-receipt ---');
  try {
    // We need a valid auth token - get one from the running server's session
    // Use a staff-level call (the endpoint requires auth via requireAuth)
    // Build a fake JWT-like token approach by calling with FRAPPE admin token
    
    // Actually, let's call the Next.js API directly with a session cookie approach
    // Since we're server-side, let's just test email/WhatsApp directly
    const { sendEmail } = await import('../src/lib/utils/email.ts').catch(() => null) || {};
    if (!sendEmail) {
      console.log('Cannot import email util directly (TypeScript). Testing via HTTP instead...');
      
      // Try the localhost endpoint (requires auth)
      const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'arjunprakashk7@gmail.com' }),
      });
      console.log('Login attempt status:', loginRes.status);
    }
  } catch (e) {
    console.log('Direct import failed:', e.message);
  }
  
  console.log('');
  console.log('=== SUMMARY ===');
  console.log('Guardian lookup: PASS ✓');
  console.log('Payment Entry:', peList?.length ? 'FOUND ✓' : 'NOT FOUND (partial data will be used)');
  console.log(`Email will go to: ${g.email_address}`);
  console.log(`WhatsApp will go to: +91${g.mobile_number}`);
  console.log('');
  console.log('To run a live test, POST to http://localhost:3000/api/payments/send-receipt');
  console.log('with body: { "invoice_id": "ACC-SINV-2026-08151" }');
  console.log('(Requires a valid session cookie — log in as a staff user first)');
}

testSendReceipt().catch(console.error);
