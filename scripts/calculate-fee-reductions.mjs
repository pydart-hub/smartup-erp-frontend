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

const students = [
  { name: 'ADHEEB RILLAH K U', srr: '058', customer: 'ADHEEB RILLAH K U' },
  { name: 'AFRA NAVAS', srr: '053', customer: 'AFRA NAVAS' },
  { name: 'ALFONSA JENIFER', srr: '291', customer: 'ALFONSA JENIFER' },
  { name: 'FATHIMA SHASNA P S', srr: '068', customer: 'FATHIMA SHASNA P S' },
  { name: 'IRINE ANN MARY', srr: '092', customer: 'IRINE ANN MARY' },
  { name: 'JEBIN VARGHESE P J', srr: '179', customer: 'JEBIN VARGHESE P J' },
  { name: 'MARY ELSA', srr: '065', customer: 'MARY ELSA' },
  { name: 'LAMIA ASHKER BABU', srr: '095', customer: 'LAMIA ASHKER BABU' },
  { name: 'MEHREEN ASHKER BABU', srr: '096', customer: 'MEHREEN ASHKER BABU' },
  { name: 'SAYED MOHAMMED MANSUR ANSARI', srr: '024', customer: 'SAYED MOHAMMED MANSUR ANSARI' },
  { name: 'YOHAN ANTONY', srr: '060', customer: 'YOHAN ANTONY' },
  { name: 'PAVAN KUMAR', srr: '196', customer: 'PAVAN KUMAR' },
  { name: 'AALIYAH ZAHARA FASIK', srr: '237', customer: 'AALIYAH ZAHARA FASIK - 1' },
  { name: 'YASEEN T A', srr: '235', customer: 'YASEEN T A' },
  { name: 'RIZA FATHIMA P S', srr: '234', customer: 'RIZA FATHIMA P S' },
  { name: 'SHALMA MARY', srr: '229', customer: 'SHALMA MARY' },
  { name: 'AYESHA MINA K S', srr: '227', customer: 'AYESHA MINA K S' },
  { name: 'WAFA NAWAN', srr: '226', customer: 'WAFA NAWAN' },
  { name: 'JOHAAN JANSON K J', srr: '225', customer: 'JOHAAN JANSON K J' },
  { name: 'BAKI ANAS', srr: '245', customer: 'BAKI ANAS' },
  { name: 'BAHA ANAS', srr: '244', customer: 'BAHA ANAS' },
  { name: 'RAZIN HASSAN', srr: '242', customer: 'RAZIN HASSAN' },
  { name: 'IBNU SAHIL SIYAD', srr: '240', customer: 'IBNU SAHIL SIYAD' },
  { name: 'MUHAMMED AZHAB AKBAR', srr: '238', customer: 'MUHAMMED AZHAB AKBAR' },
  { name: 'MOHAMMED AMAL M A', srr: '255', customer: 'MOHAMMED AMAL M A' },
  { name: 'ADWIN SAM PAUL', srr: '254', customer: 'ADWIN SAM PAUL' },
  { name: 'IFFAH MANHA A M', srr: '249', customer: 'IFFAH MANHA A M' },
  { name: 'NIHAN P S', srr: '248', customer: 'NIHAN P S' },
  { name: 'MOHAMMED RAYHAN K M', srr: '246', customer: 'MOHAMMED RAYHAN K M' },
  { name: 'AMRA AMEENA', srr: '256', customer: 'AMRA AMEENA' }
];

async function calculateReductions() {
  const results = [];
  let totalOldSum = 0;
  let totalNewSum = 0;
  let totalReducedSum = 0;

  for (const st of students) {
    const soList = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order?filters=[["customer","=","${st.customer}"]]&fields=["name","docstatus","grand_total","amended_from"]&order_by=creation asc`, { headers })).json();
    
    const cancelledSO = soList.data?.find(s => s.docstatus === 2 && !s.amended_from);
    const activeSO = soList.data?.find(s => s.docstatus === 1);
    
    // Also check if cancelledSO is amended_from of activeSO
    let oldTotal = cancelledSO?.grand_total;
    if (!oldTotal && activeSO?.amended_from) {
      const orig = await (await fetchWithRetry(`${baseUrl}/api/resource/Sales Order/${encodeURIComponent(activeSO.amended_from)}`, { headers })).json();
      oldTotal = orig.data?.grand_total;
    }

    const newTotal = activeSO?.grand_total;
    const reduced = (oldTotal && newTotal) ? Math.round(oldTotal - newTotal) : 0;

    results.push({
      name: st.name,
      srr: st.srr,
      oldTotal: oldTotal || 'N/A',
      newTotal: newTotal || 'N/A',
      reduced: reduced
    });

    if (oldTotal && newTotal) {
      totalOldSum += oldTotal;
      totalNewSum += newTotal;
      totalReducedSum += reduced;
    }
  }

  console.log(JSON.stringify({ results, totalOldSum, totalNewSum, totalReducedSum }, null, 2));
}

calculateReductions().catch(console.error);
