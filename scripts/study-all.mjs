import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const frappeUrl = envConfig.NEXT_PUBLIC_FRAPPE_URL;
const apiKey = envConfig.FRAPPE_API_KEY;
const apiSecret = envConfig.FRAPPE_API_SECRET;

const headers = {
  'Authorization': 'token ' + apiKey + ':' + apiSecret,
  'Content-Type': 'application/json'
};

async function run() {
  const sinvs = await (await fetch(frappeUrl + '/api/resource/Sales%20Invoice?filters=[["student","=","STU-SU KDV-26-001"]]&fields=["name","docstatus","grand_total","outstanding_amount","posting_date","due_date"]', { headers })).json();
  console.log('All SINVs for Advaith:', sinvs.data);

  const pes = await (await fetch(frappeUrl + '/api/resource/Payment%20Entry?filters=[["party","=","Advaith Krishna S prabhu"]]&fields=["name","docstatus","paid_amount","posting_date","mode_of_payment","reference_no"]', { headers })).json();
  console.log('All PEs for Advaith:', pes.data);

  const sos = await (await fetch(frappeUrl + '/api/resource/Sales%20Order?filters=[["student","=","STU-SU KDV-26-001"]]&fields=["name","docstatus","grand_total","status"]', { headers })).json();
  console.log('All SOs for Advaith:', sos.data);
}

run();
