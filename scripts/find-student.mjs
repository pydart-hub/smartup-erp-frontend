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

async function findStudent() {
  const s238 = await (await fetchWithRetry(`${baseUrl}/api/resource/Student/STU-SU CHL-26-238`, { headers })).json();
  console.log('Direct ID STU-SU CHL-26-238:', s238.data?.name, s238.data?.first_name, s238.data?.last_name, s238.data?.customer);

  const searchRes = await (await fetchWithRetry(`${baseUrl}/api/resource/Student?filters=[["first_name","like","%AZHAB%"]]&fields=["name","first_name","last_name","customer"]`, { headers })).json();
  console.log('Search AZHAB:', searchRes.data);

  const search2 = await (await fetchWithRetry(`${baseUrl}/api/resource/Student?filters=[["first_name","like","%AKBAR%"]]&fields=["name","first_name","last_name","customer"]`, { headers })).json();
  console.log('Search AKBAR:', search2.data);
}

findStudent().catch(console.error);
