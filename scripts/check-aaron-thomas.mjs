import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const getVal = (k) => lines.find(l => l.startsWith(k))?.split('=')[1]?.trim();
const baseUrl = getVal('NEXT_PUBLIC_FRAPPE_URL');
const key = getVal('FRAPPE_API_KEY');
const sec = getVal('FRAPPE_API_SECRET');
const headers = { 'Authorization': `token ${key}:${sec}`, 'Content-Type': 'application/json' };

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      try {
        return { ok: res.ok, status: res.status, json: JSON.parse(text) };
      } catch (e) {
        return { ok: res.ok, status: res.status, text };
      }
    } catch (err) {
      console.log(`Fetch error (attempt ${i + 1}/${retries}): ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function run() {
  console.log('Base URL:', baseUrl);
  
  // Try fetching invoice ACC-SINV-2026-11051 directly
  const invRes = await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice/ACC-SINV-2026-11051`, { headers });
  console.log('Invoice 11051 response status:', invRes.status);
  console.log('Invoice 11051 data:', JSON.stringify(invRes.json?.data, null, 2));

  // Try fetching student STU PLR 26 235 or STU-SU PLR-26-235
  const stuRes1 = await fetchWithRetry(`${baseUrl}/api/resource/Student/STU PLR 26 235`, { headers });
  console.log('Student STU PLR 26 235:', stuRes1.status, stuRes1.json?.data?.name || stuRes1.json);

  const stuRes2 = await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU PLR-26-235`, { headers });
  console.log('Student STU-SU PLR-26-235:', stuRes2.status, stuRes2.json?.data?.name || stuRes2.json);

  // If customer found from invoice
  const customer = invRes.json?.data?.customer;
  console.log('Customer from invoice:', customer);
  
  if (customer) {
    const pes = await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customer}"]]&fields=["name","docstatus","posting_date","paid_amount","received_amount","payment_type","reference_no","reference_date","creation","modified"]&limit_page_length=50`, { headers });
    console.log('Payment entries count:', pes.json?.data?.length);
    console.log('Payment entries:', JSON.stringify(pes.json?.data, null, 2));

    for (const pe of pes.json?.data || []) {
      const peDetail = await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry/${pe.name}`, { headers });
      console.log(`\n================= PE: ${pe.name} (docstatus: ${pe.docstatus}) =================`);
      console.log('Posting Date:', peDetail.json?.data?.posting_date, 'Creation:', peDetail.json?.data?.creation);
      console.log('Paid Amount:', peDetail.json?.data?.paid_amount);
      console.log('References:', JSON.stringify(peDetail.json?.data?.references, null, 2));
      console.log('Remarks:', peDetail.json?.data?.remarks);
    }
  }
}

run().catch(console.error);
