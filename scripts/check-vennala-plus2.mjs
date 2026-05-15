const BASE = 'https://smartup.m.frappe.cloud';
const HEADERS = { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' };

// 1. Check Vennala students with Plus Two program
const params = new URLSearchParams({
  fields: JSON.stringify(['name','student_name','program','custom_branch','academic_year']),
  filters: JSON.stringify([['custom_branch','like','%ennala%'],['program','in',['12th Science State','12th Science CBSE']]]),
  limit_page_length: '3'
});
const res = await fetch(BASE + '/api/resource/Student?' + params, {headers: HEADERS});
const json = await res.json();
console.log('Vennala Plus Two students:', JSON.stringify(json, null, 2));

// 2. Check what custom fields exist on Student doctype
const dtRes = await fetch(BASE + '/api/resource/DocField?filters=' + encodeURIComponent(JSON.stringify([['parent','=','Student'],['fieldname','like','%old%']])) + '&fields=' + encodeURIComponent(JSON.stringify(['fieldname','label','fieldtype'])), {headers: HEADERS});
const dtJson = await dtRes.json();
console.log('\nStudent "old" fields:', JSON.stringify(dtJson, null, 2));

// 3. Check Sales Invoice custom fields
const siRes = await fetch(BASE + '/api/resource/DocField?filters=' + encodeURIComponent(JSON.stringify([['parent','=','Sales Invoice'],['fieldname','like','%discount%']])) + '&fields=' + encodeURIComponent(JSON.stringify(['fieldname','label','fieldtype'])), {headers: HEADERS});
const siJson = await siRes.json();
console.log('\nSales Invoice discount fields:', JSON.stringify(siJson, null, 2));
