// diag-wa-error.mjs
const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const H = { Authorization: AUTH, 'Content-Type': 'application/json' };
const get = async (url) => { const r = await fetch(url, {headers:H}); return r.json(); };

// 1. Find IJAS instructor record
const ins = await get(BASE + '/api/resource/Instructor?filters=[["instructor_name","like","%IJAS%"]]&fields=["name","instructor_name"]&limit=5');
console.log('IJAS instructor:', JSON.stringify(ins.data));

// 2. Test WA query with a real instructor name if found
if (ins.data?.length) {
  const iName = ins.data[0].name;
  console.log('\nTesting WA query with instructor:', iName);
  const pf = encodeURIComponent(JSON.stringify([["docstatus","=",1],["Work Assignment Detail","instructor","=",iName]]));
  const ff = encodeURIComponent(JSON.stringify(["name","title","description","topic","deadline","for_branch"]));
  const r2 = await fetch(BASE + `/api/resource/Work Assignment?filters=${pf}&fields=${ff}&limit_page_length=200`, {headers:H});
  console.log('Status:', r2.status);
  const d2 = await r2.json();
  if (!r2.ok) console.log('Error body:', JSON.stringify(d2).slice(0, 500));
  else console.log('Count:', d2.data?.length, '| data:', JSON.stringify(d2.data).slice(0, 200));
}

// 3. Check Work Assignment Detail child table fields
const dt = await get(BASE + '/api/resource/DocType/Work Assignment');
const child = dt.data?.fields?.find(f => f.options === 'Work Assignment Detail');
console.log('\nChild table link field:', JSON.stringify(child));

// 4. Check what fields exist in Work Assignment Detail
const wd = await get(BASE + '/api/resource/DocType/Work Assignment Detail');
console.log('Work Assignment Detail fields:', JSON.stringify(wd.data?.fields?.map(f => f.fieldname)));
