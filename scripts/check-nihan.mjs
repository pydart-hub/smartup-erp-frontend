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

async function checkNihan() {
  const stuRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU CHL-26-248`, { headers })).json();
  console.log('Student STU-SU CHL-26-248:', stuRes.data?.name, stuRes.data?.first_name, stuRes.data?.last_name, 'Customer:', stuRes.data?.customer);

  const customerId = stuRes.data?.customer || 'NIHAN P S';
  const stuId = stuRes.data?.name || 'STU-SU CHL-26-248';

  const pens = await (await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","${stuId}"]]&fields=["name","docstatus","custom_plan","custom_fee_structure","custom_no_of_instalments","academic_year"]`, { headers })).json();
  console.log('PENs:', pens.data);

  const sos = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${customerId}"]]&fields=["name","docstatus","grand_total","custom_plan","custom_no_of_instalments"]`, { headers })).json();
  console.log('SOs:', sos.data);

  const invs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${customerId}"]]&fields=["name","docstatus","grand_total","outstanding_amount","due_date","posting_date"]&order_by=due_date asc`, { headers })).json();
  console.log('Invoices:', invs.data);

  const pes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${customerId}"]]&fields=["name","docstatus","posting_date","paid_amount","mode_of_payment","reference_no","paid_to"]&order_by=posting_date asc`, { headers })).json();
  console.log('PEs:', pes.data);
}

checkNihan().catch(console.error);
