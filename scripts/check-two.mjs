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

async function checkTwo() {
  const s1 = await (await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU CHL-26-092`, { headers })).json();
  console.log('092 Student customer:', s1.data?.customer);
  const so1 = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${s1.data?.customer}"]]&fields=["name","docstatus","grand_total","amended_from"]`, { headers })).json();
  console.log('092 SOs:', so1.data);

  const s2 = await (await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU CHL-26-065`, { headers })).json();
  console.log('065 Student customer:', s2.data?.customer);
  const so2 = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${s2.data?.customer}"]]&fields=["name","docstatus","grand_total","amended_from"]`, { headers })).json();
  console.log('065 SOs:', so2.data);
}

checkTwo().catch(console.error);
