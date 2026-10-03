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

async function check() {
  const stu = await (await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU CHL-26-240`, { headers })).json();
  console.log('Student:', stu.data?.name, stu.data?.title, 'Customer:', stu.data?.customer);
  
  const pens = await (await fetchWithRetry(`${baseUrl}/api/resource/Program Enrollment?filters=[["student","=","STU-SU CHL-26-240"]]&fields=["name","docstatus","custom_plan","custom_fee_structure","custom_no_of_instalments"]`, { headers })).json();
  console.log('PENs:', pens.data);

  const sos = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${stu.data?.customer}"]]&fields=["name","docstatus","grand_total","custom_plan","custom_no_of_instalments"]`, { headers })).json();
  console.log('SOs:', sos.data);

  const invs = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Invoice?filters=[["customer","=","${stu.data?.customer}"]]&fields=["name","docstatus","grand_total","outstanding_amount","due_date"]&order_by=due_date asc`, { headers })).json();
  console.log('Invoices:', invs.data);

  const pes = await (await fetchWithRetry(`${baseUrl}/api/resource/Payment Entry?filters=[["party","=","${stu.data?.customer}"]]&fields=["name","docstatus","posting_date","paid_amount","mode_of_payment","reference_no","paid_to"]&order_by=posting_date asc`, { headers })).json();
  console.log('PEs:', pes.data);
}

check().catch(console.error);
