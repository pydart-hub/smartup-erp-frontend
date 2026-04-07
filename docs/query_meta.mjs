const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function getDocTypeMeta(doctype) {
  const r = await fetch(BASE + '/api/resource/DocType/' + encodeURIComponent(doctype), { headers });
  const j = await r.json();
  if (!j.data) return null;
  // Just return field definitions
  return (j.data.fields || []).map(f => ({
    fieldname: f.fieldname,
    fieldtype: f.fieldtype,
    label: f.label,
    options: f.options,
    reqd: f.reqd,
  }));
}

async function main() {
  console.log('=== TOPIC DOCTYPE ===');
  const topic = await getDocTypeMeta('Topic');
  console.log(JSON.stringify(topic, null, 2));

  console.log('\n=== COURSE ACTIVITY DOCTYPE ===');
  const ca = await getDocTypeMeta('Course Activity');
  console.log(JSON.stringify(ca, null, 2));

  console.log('\n=== COURSE TOPIC CHILD ===');
  const ct = await getDocTypeMeta('Course Topic');
  console.log(JSON.stringify(ct, null, 2));

  console.log('\n=== STUDENT GROUP INSTRUCTOR CHILD ===');
  const sgi = await getDocTypeMeta('Student Group Instructor');
  console.log(JSON.stringify(sgi, null, 2));

  console.log('\n=== STUDENT BRANCH TRANSFER ===');
  const sbt = await getDocTypeMeta('Student Branch Transfer');
  console.log(JSON.stringify(sbt, null, 2));

  console.log('\n=== INSTRUCTOR LOG CHILD ===');
  const il = await getDocTypeMeta('Instructor Log');
  console.log(JSON.stringify(il, null, 2));
}

main().catch(e => console.error(e));
