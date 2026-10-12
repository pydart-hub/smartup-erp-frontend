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
  const stu = await (await fetch(frappeUrl + '/api/resource/Student/STU-SU KDV-26-001', { headers })).json();
  const nonNullKeys = {};
  for (const k of Object.keys(stu.data)) {
    if (stu.data[k] !== null && stu.data[k] !== '') {
      nonNullKeys[k] = stu.data[k];
    }
  }
  console.log('Student fields:', nonNullKeys);

  const pe = await (await fetch(frappeUrl + '/api/resource/Program Enrollment?filters=[["student","=","STU-SU KDV-26-001"]]&fields=["*"]', { headers })).json();
  console.log('Program Enrollment:', pe.data);
}

run();
